import assert from 'node:assert/strict';
import test from 'node:test';
import nodemailer from 'nodemailer';
import { deliverSalesLeadEmails } from './SalesLeadEmailOutboxService.js';
import {
  createSalesLeadEmailSender,
  salesLeadEmailConfiguration,
} from './salesLeadEmailTransport.js';

type Database = Parameters<typeof deliverSalesLeadEmails>[0];
const lead = {
  id: 'ad9ff77a-1c45-442f-978a-a07b0b7c0e61',
  name: 'Joana',
  restaurantName: 'Bistrô Teste',
  email: 'joana@example.test',
  phone: '11999998888',
  city: 'São Paulo',
  state: 'SP',
  businessType: 'Restaurante',
  channels: ['TABLE'],
  planInterest: 'PREMIUM',
  message: '<script>fictício</script>',
};
const smtp = {
  SMTP_HOST: 'smtp.example.test',
  SMTP_USER: 'mailer@example.test',
  SMTP_PASS: 'test-only',
  SMTP_AUTH_TYPE: 'basic',
  SALES_CONTACT_NOTIFICATION_EMAIL: 'sales@example.test',
  SALES_CONTACT_EMAIL_FROM: 'GastroNexa <mailer@example.test>',
};

test('sem SMTP válido a fila permanece intocada', async () => {
  assert.equal(salesLeadEmailConfiguration({}), null);
  assert.equal(salesLeadEmailConfiguration({ ...smtp, SMTP_PORT: '0' }), null);
  assert.equal(
    salesLeadEmailConfiguration({ ...smtp, SALES_CONTACT_NOTIFICATION_EMAIL: 'invalid' }),
    null,
  );
  assert.equal(
    salesLeadEmailConfiguration({ ...smtp, SALES_CONTACT_EMAIL_FROM: 'sender\r\nBcc: other@test' }),
    null,
  );
  assert.ok(salesLeadEmailConfiguration(smtp));
  assert.deepEqual(await deliverSalesLeadEmails({} as Database, null), {
    processed: 0,
    sent: 0,
    configured: false,
  });
});

test('aviso usa destinatário fixo, corpo textual e Message-ID estável; rejeição SMTP não conta como envio', async (t) => {
  for (const [key, value] of Object.entries(smtp)) {
    const previous = process.env[key];
    process.env[key] = value;
    t.after(() => {
      if (previous === undefined) delete process.env[key];
      else process.env[key] = previous;
    });
  }
  const messages: nodemailer.SendMailOptions[] = [];
  let reject = false;
  t.mock.method(nodemailer, 'createTransport', (() => ({
    sendMail: async (options: nodemailer.SendMailOptions) => {
      messages.push(options);
      return {
        accepted: reject ? [] : ['sales@example.test'],
        rejected: reject ? ['sales@example.test'] : [],
      };
    },
  })) as typeof nodemailer.createTransport);
  const send = createSalesLeadEmailSender()!;
  await send(lead);
  await send(lead);
  assert.equal(messages[0].to, smtp.SALES_CONTACT_NOTIFICATION_EMAIL);
  assert.equal(messages[0].replyTo, lead.email);
  assert.equal(messages[0].html, undefined);
  assert.equal(messages[0].messageId, messages[1].messageId);
  assert.equal(messages[0].subject, 'Novo contato comercial — GastroNexa');
  reject = true;
  await assert.rejects(send(lead), /não aceitou/);
});

test('falha de envio agenda nova tentativa; oitava falha fica visível; lease protege conclusão', async () => {
  const updates: unknown[][] = [];
  const db = {
    $queryRaw: async () => [
      { id: 'first', leadId: lead.id, attempts: 1 },
      { id: 'last', leadId: lead.id, attempts: 8 },
    ],
    $executeRaw: async (_sql: TemplateStringsArray, ...values: unknown[]) => {
      updates.push(values);
      return 1;
    },
    salesLead: { findUnique: async () => lead },
  } as unknown as Database;
  const result = await deliverSalesLeadEmails(db, async () => {
    throw new Error('SMTP offline');
  });
  assert.equal(result.sent, 0);
  assert.deepEqual(
    updates.map((values) => values[0]),
    ['PENDING', 'FAILED'],
  );
  assert.equal(updates[0][1], 60_000);
  assert.equal(updates[1][1], 3_600_000);
  assert.equal(updates[0].at(-1), updates[1].at(-1));
});

test('worker que perdeu a posse não marca o aviso como enviado', async () => {
  const db = {
    $queryRaw: async () => [{ id: 'first', leadId: lead.id, attempts: 1 }],
    $executeRaw: async () => 0,
    salesLead: { findUnique: async () => lead },
  } as unknown as Database;
  assert.equal((await deliverSalesLeadEmails(db, async () => undefined)).sent, 0);
});
