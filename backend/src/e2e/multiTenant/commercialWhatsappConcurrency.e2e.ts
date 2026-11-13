import assert from 'node:assert/strict';
import { createHash, randomUUID } from 'node:crypto';
import test, { after } from 'node:test';
import {
  prisma, runtimePrisma, resetTenantE2EDatabase, seedTenantE2EFixture,
} from './tenantE2EHarness.js';
import { resumeUnansweredCustomerHandoffs } from '../../modules/salesLeads/services/CommercialWhatsappHandoffRecoveryService.js';
import {
  deliverPlatformWhatsappOutbox,
  processPlatformEvolutionInbound,
  setCommercialWhatsappConversationMode,
} from '../../modules/salesLeads/services/CommercialWhatsappService.js';

after(async () => {
  await prisma.$disconnect();
  await runtimePrisma.$disconnect();
});

test('WhatsApp comercial: replay, corrida entre workers e falha ambígua em PostgreSQL isolado',
  { timeout: 90_000 }, async (t) => {
    await resetTenantE2EDatabase();
    await seedTenantE2EFixture();
    const oldAi = process.env.COMMERCIAL_WHATSAPP_AI_ENABLED;
    const oldUrl = process.env.EVOLUTION_PLATFORM_API_URL;
    const oldKey = process.env.EVOLUTION_PLATFORM_API_KEY;
    const oldFetch = globalThis.fetch;
    const secret = 'webhook-e2e-secret-synthetic';
    const phone = '5511999999888';
    const hours = Array.from({ length: 7 }, (_, weekday) => ({
      weekday, enabled: true, periods: [
        { enabled: true, start: '00:00', end: '23:59' },
        { enabled: false, start: '00:00', end: '00:01' },
      ],
    }));
    try {
      process.env.COMMERCIAL_WHATSAPP_AI_ENABLED = 'true';
      process.env.EVOLUTION_PLATFORM_API_URL = 'http://127.0.0.1:9';
      process.env.EVOLUTION_PLATFORM_API_KEY = 'synthetic-api-key';
      await prisma.platformSettings.upsert({
        where: { id: 1 },
        update: { commercialWhatsappEnabled: true, commercialWhatsappHours: hours, timezone: 'America/Sao_Paulo' },
        create: { id: 1, commercialWhatsappEnabled: true, commercialWhatsappHours: hours, timezone: 'America/Sao_Paulo' },
      });
      await prisma.platformWhatsappConnection.create({
        data: {
          id: 1,
          externalInstanceId: 'gastronexa-platform',
          webhookSecretHash: createHash('sha256').update(secret).digest('hex'),
          instanceTokenCiphertext: 'synthetic-token-never-used-in-production',
          status: 'DISCONNECTED',
        },
      });

      await t.test('oito webhooks simultâneos têm apenas um inbound e uma resposta na fila', async () => {
        const payload = {
          event: 'messages.upsert',
          data: {
            key: { remoteJid: phone + '@s.whatsapp.net', id: 'provider-e2e-one', fromMe: false },
            message: { conversation: 'Como funciona a GastroNexa?' },
          },
        };
        const calls = await Promise.all(
          Array.from({ length: 8 }, () =>
            processPlatformEvolutionInbound('gastronexa-platform', secret, payload)),
        );
        assert.ok(calls.every((call) => call.accepted === true));
        assert.equal(calls.filter((call) => call.queued === true).length, 1);
        assert.equal(await prisma.salesLeadWhatsappMessage.count({
          where: { providerMessageId: 'provider-e2e-one' },
        }), 1);
        assert.equal(await prisma.salesLeadWhatsappOutbox.count(), 1);
        const missing = await processPlatformEvolutionInbound('gastronexa-platform', secret, {
          event: 'messages.upsert',
          data: {
            key: { remoteJid: phone + '@s.whatsapp.net', fromMe: false },
            message: { conversation: 'Mensagem sem ID não pode ser processada.' },
          },
        });
        assert.equal(missing.queued, false);
        assert.equal(await prisma.salesLeadWhatsappMessage.count(), 1);
      });

      await t.test('takeover humano suprime resposta pendente da IA', async () => {
        const conversation = await prisma.salesLeadWhatsappConversation.findUniqueOrThrow({
          where: { phone },
        });
        await setCommercialWhatsappConversationMode(conversation.id, 'HUMAN');
        assert.equal(await prisma.salesLeadWhatsappOutbox.count({
          where: { kind: 'AI_REPLY', status: 'SUPPRESSED' },
        }), 1);
        await setCommercialWhatsappConversationMode(conversation.id, 'BOT');
      });

      await t.test('mensagem manual pelo WhatsApp comercial ativa HUMAN sem resposta da IA', async () => {
        const conversation = await prisma.salesLeadWhatsappConversation.findUniqueOrThrow({
          where: { phone },
        });
        const makeManual = (id: string, message: string) => ({
          event: 'messages.upsert',
          data: {
            key: { remoteJid: phone + '@s.whatsapp.net', id, fromMe: true },
            message: { conversation: message },
          },
        });
        const first = await processPlatformEvolutionInbound(
          'gastronexa-platform', secret, makeManual('manual-one-e2e', 'O proprietário assumiu o atendimento'),
        );
        assert.equal(first.queued, false);
        assert.equal((await prisma.salesLeadWhatsappConversation.findUniqueOrThrow({
          where: { id: conversation.id },
        })).automationMode, 'HUMAN');
        assert.equal(await prisma.salesLeadWhatsappOutbox.count({
          where: { conversationId: conversation.id, status: 'PENDING', kind: 'AI_REPLY' },
        }), 0);
        const firstTimer = (await prisma.salesLeadWhatsappConversation.findUniqueOrThrow({
          where: { id: conversation.id },
        })).handoffRequestedAt;
        assert.ok(firstTimer);

        const customer = await processPlatformEvolutionInbound('gastronexa-platform', secret, {
          event: 'messages.upsert',
          data: {
            key: { remoteJid: phone + '@s.whatsapp.net', id: 'customer-during-human-e2e', fromMe: false },
            message: { conversation: 'Ainda estou aqui, podem me ajudar?' },
          },
        });
        assert.equal(customer.queued, false);
        assert.equal(await prisma.salesLeadWhatsappOutbox.count({
          where: { conversationId: conversation.id, status: 'PENDING', kind: 'AI_REPLY' },
        }), 0);
        const second = await processPlatformEvolutionInbound(
          'gastronexa-platform', secret, makeManual('manual-two-e2e', 'Outra resposta humana'),
        );
        assert.equal(second.queued, false);
        const renewed = (await prisma.salesLeadWhatsappConversation.findUniqueOrThrow({
          where: { id: conversation.id },
        })).handoffRequestedAt;
        assert.ok(renewed);
        assert.ok(renewed.getTime() >= firstTimer.getTime());
        // Replayed echo of the same manual message does not extend the timeout.
        const replay = await processPlatformEvolutionInbound(
          'gastronexa-platform', secret, makeManual('manual-two-e2e', 'Outra resposta humana'),
        );
        assert.equal(replay.queued, false);
        assert.equal((await prisma.salesLeadWhatsappConversation.findUniqueOrThrow({
          where: { id: conversation.id },
        })).handoffRequestedAt?.getTime(), renewed.getTime());
        assert.equal(await resumeUnansweredCustomerHandoffs(() => {
          throw new Error('não pode retomar antes de 10 minutos de inatividade humana');
        }, new Date(renewed.getTime() + 9 * 60_000)), 0);
        assert.equal(await resumeUnansweredCustomerHandoffs(() => undefined,
          new Date(renewed.getTime() + 10 * 60_000)), 1);
      });

      await t.test('áudio manual sem texto também ativa HUMAN', async () => {
        const conversation = await prisma.salesLeadWhatsappConversation.findUniqueOrThrow({
          where: { phone },
        });
        await setCommercialWhatsappConversationMode(conversation.id, 'BOT');
        const audio = await processPlatformEvolutionInbound('gastronexa-platform', secret, {
          event: 'messages.upsert',
          data: {
            key: { remoteJid: phone + '@s.whatsapp.net', id: 'manual-audio-e2e', fromMe: true },
            message: { audioMessage: { mimetype: 'audio/ogg' } },
          },
        });
        assert.equal(audio.queued, false);
        assert.equal((await prisma.salesLeadWhatsappConversation.findUniqueOrThrow({
          where: { id: conversation.id },
        })).automationMode, 'HUMAN');
      });

      await t.test('eco de mensagem automática própria não ativa HUMAN', async () => {
        const conversation = await prisma.salesLeadWhatsappConversation.findUniqueOrThrow({
          where: { phone },
        });
        await setCommercialWhatsappConversationMode(conversation.id, 'BOT');
        await prisma.salesLeadWhatsappOutbox.create({
          data: {
            id: randomUUID(),
            conversationId: conversation.id,
            deduplicationKey: createHash('sha256').update('echo-e2e').digest('hex'),
            kind: 'AI_REPLY',
            body: 'Resposta gerada pelo sistema - somente teste',
            status: 'UNCERTAIN',
            availableAt: new Date(),
          },
        });
        const echo = await processPlatformEvolutionInbound('gastronexa-platform', secret, {
          event: 'messages.upsert',
          data: {
            key: { remoteJid: phone + '@s.whatsapp.net', id: 'automatic-echo-e2e', fromMe: true },
            message: { conversation: 'Resposta gerada pelo sistema - somente teste' },
          },
        });
        assert.equal(echo.queued, false);
        assert.equal((await prisma.salesLeadWhatsappConversation.findUniqueOrThrow({
          where: { id: conversation.id },
        })).automationMode, 'BOT');
      });

      await t.test('retomada de 10 minutos é única; takeover humano manual nunca expira', async () => {
        const current = await prisma.salesLeadWhatsappConversation.findUniqueOrThrow({
          where: { phone },
        });
        const requestedAt = new Date(Date.now() - 11 * 60_000);
        await prisma.salesLeadWhatsappConversation.update({
          where: { id: current.id },
          data: { automationMode: 'HUMAN', handoffRequestedAt: requestedAt },
        });
        const notifications: string[] = [];
        const resumed = await Promise.all([
          resumeUnansweredCustomerHandoffs((id) => notifications.push(id)),
          resumeUnansweredCustomerHandoffs((id) => notifications.push(id)),
        ]);
        assert.equal(resumed.reduce((sum, count) => sum + count, 0), 1);
        assert.equal(notifications.length, 1);
        assert.equal(await prisma.salesLeadWhatsappOutbox.count({
          where: { conversationId: current.id, kind: 'AI_TIMEOUT' },
        }), 0, 'bot retorna silenciosamente sem mensagem automática inesperada');

        // A new human message resets the ten-minute window. Customer messages
        // must not extend the human inactivity deadline.
        await setCommercialWhatsappConversationMode(current.id, 'HUMAN');
        const updated = await prisma.salesLeadWhatsappConversation.findUniqueOrThrow({
          where: { id: current.id },
        });
        assert.ok(updated.handoffRequestedAt);
        assert.equal(await resumeUnansweredCustomerHandoffs(() => {
          throw new Error('não pode retomar antes de dez minutos');
        }, new Date(updated.handoffRequestedAt.getTime() + 9 * 60_000)), 0);
        assert.equal(await resumeUnansweredCustomerHandoffs(() => undefined,
          new Date(updated.handoffRequestedAt.getTime() + 10 * 60_000)), 1);
        await setCommercialWhatsappConversationMode(current.id, 'BOT');
      });

      const conversation = await prisma.salesLeadWhatsappConversation.findUniqueOrThrow({
        where: { phone },
      });
      const enqueue = async (suffix: string) => {
        return prisma.salesLeadWhatsappOutbox.create({
          data: {
            id: randomUUID(),
            conversationId: conversation.id,
            kind: 'GREETING',
            body: 'Mensagem fictícia ' + suffix,
            deduplicationKey: createHash('sha256').update('e2e:' + suffix).digest('hex'),
            availableAt: new Date(Date.now() - 1000),
          },
        });
      };
      process.env.COMMERCIAL_WHATSAPP_AI_ENABLED = 'false';
      await prisma.platformWhatsappConnection.update({
        where: { id: 1 }, data: { status: 'CONNECTED', nextAutomaticSendAt: null },
      });

      await t.test('erro do provedor cria UNCERTAIN e não repete o envio', async () => {
        const item = await enqueue('ambiguous');
        let attempts = 0;
        globalThis.fetch = (async () => {
          attempts++;
          return new Response('unavailable', { status: 503 });
        }) as typeof fetch;
        await deliverPlatformWhatsappOutbox();
        await prisma.platformWhatsappConnection.update({
          where: { id: 1 }, data: { nextAutomaticSendAt: null },
        });
        await deliverPlatformWhatsappOutbox();
        assert.equal(attempts, 1);
        const state = await prisma.salesLeadWhatsappOutbox.findUniqueOrThrow({
          where: { id: item.id },
        });
        assert.equal(state.status, 'UNCERTAIN');
        assert.equal(state.attempts, 1);
      });

      await t.test('sucesso remoto com falha no commit fica UNCERTAIN e não duplica', async () => {
        const item = await enqueue('remote-accepted-db-failure');
        await prisma.platformWhatsappConnection.update({
          where: { id: 1 }, data: { nextAutomaticSendAt: null },
        });
        let remoteDeliveries = 0;
        globalThis.fetch = (async () => {
          remoteDeliveries++;
          return new Response('{}', { status: 200 });
        }) as typeof fetch;
        // A trigger injects a DB failure after the fake provider accepted
        // the send. No actual provider or production data is contacted.
        await prisma.$executeRawUnsafe(`
          CREATE FUNCTION commercial_wa_e2e_fail_outbound() RETURNS trigger AS $$
          BEGIN
            IF NEW."direction" = 'OUTBOUND' THEN
              RAISE EXCEPTION 'synthetic_outbound_commit_failure';
            END IF;
            RETURN NEW;
          END;
          $$ LANGUAGE plpgsql
        `);
        await prisma.$executeRawUnsafe(`
          CREATE TRIGGER commercial_wa_e2e_fail_outbound_trigger
          BEFORE INSERT ON "SalesLeadWhatsappMessage"
          FOR EACH ROW EXECUTE FUNCTION commercial_wa_e2e_fail_outbound()
        `);
        try {
          await deliverPlatformWhatsappOutbox();
          await prisma.platformWhatsappConnection.update({
            where: { id: 1 }, data: { nextAutomaticSendAt: null },
          });
          await deliverPlatformWhatsappOutbox();
          assert.equal(remoteDeliveries, 1);
          assert.equal((await prisma.salesLeadWhatsappOutbox.findUniqueOrThrow({
            where: { id: item.id },
          })).status, 'UNCERTAIN');
        } finally {
          await prisma.$executeRawUnsafe(
            'DROP TRIGGER IF EXISTS commercial_wa_e2e_fail_outbound_trigger ON "SalesLeadWhatsappMessage"',
          );
          await prisma.$executeRawUnsafe(
            'DROP FUNCTION IF EXISTS commercial_wa_e2e_fail_outbound()',
          );
        }
      });

      await t.test('dois workers não podem enviar a mesma mensagem', async () => {
        const item = await enqueue('concurrent');
        await prisma.platformWhatsappConnection.update({
          where: { id: 1 }, data: { nextAutomaticSendAt: null },
        });
        let started!: () => void;
        let release!: () => void;
        const entered = new Promise<void>((resolve) => { started = resolve; });
        const gate = new Promise<void>((resolve) => { release = resolve; });
        let requests = 0;
        globalThis.fetch = (async () => {
          requests++;
          started();
          await gate;
          return new Response('{}', { status: 200 });
        }) as typeof fetch;
        const first = deliverPlatformWhatsappOutbox();
        await entered;
        try {
          await deliverPlatformWhatsappOutbox();
        } finally {
          release();
        }
        await first;
        assert.equal(requests, 1);
        assert.equal((await prisma.salesLeadWhatsappOutbox.findUniqueOrThrow({
          where: { id: item.id },
        })).status, 'SENT');
      });
    } finally {
      globalThis.fetch = oldFetch;
      if (oldAi === undefined) delete process.env.COMMERCIAL_WHATSAPP_AI_ENABLED;
      else process.env.COMMERCIAL_WHATSAPP_AI_ENABLED = oldAi;
      if (oldUrl === undefined) delete process.env.EVOLUTION_PLATFORM_API_URL;
      else process.env.EVOLUTION_PLATFORM_API_URL = oldUrl;
      if (oldKey === undefined) delete process.env.EVOLUTION_PLATFORM_API_KEY;
      else process.env.EVOLUTION_PLATFORM_API_KEY = oldKey;
    }
  });