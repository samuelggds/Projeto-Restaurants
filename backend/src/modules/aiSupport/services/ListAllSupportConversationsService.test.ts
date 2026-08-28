import assert from 'node:assert/strict';
import test from 'node:test';
import type { SupportConversationRepository } from '../repositories/SupportConversationRepository.js';
import { ListAllSupportConversationsService } from './ListAllSupportConversationsService.js';

test('lista conversas com status derivado sem fabricar prioridade, SLA ou responsável', async () => {
  const repository = {
    listLatest: async () => [
      {
        id: 12,
        restaurantId: 4,
        restaurantName: 'Restaurante Teste',
        message: 'Retorno do suporte',
        subject: 'Não consigo acessar o painel',
        senderRole: 'SUPER_ADMIN',
        issueStatus: null,
        sentAt: new Date('2026-08-28T10:00:00.000Z'),
        messageCount: 5,
      },
    ],
  } as Pick<SupportConversationRepository, 'listLatest'>;

  const result = await new ListAllSupportConversationsService(repository).execute();

  assert.deepEqual(result, [
    {
      id: 12,
      restaurantId: 4,
      restaurant: 'Restaurante Teste',
      subject: 'Não consigo acessar o painel',
      status: 'WAITING_CUSTOMER',
      messageCount: 5,
      lastMessageAt: '2026-08-28T10:00:00.000Z',
      lastSenderRole: 'SUPER_ADMIN',
    },
  ]);
  assert.equal('priority' in result[0], false);
  assert.equal('responsible' in result[0], false);
  assert.equal('sla' in result[0], false);
});

test('persiste encerramento e reabre quando o ADMIN envia uma nova mensagem', async () => {
  const repository = {
    listLatest: async () => [
      {
        id: 14,
        restaurantId: 4,
        restaurantName: 'Restaurante Teste',
        message: 'Atendimento concluído.',
        subject: 'Configuração do gateway',
        senderRole: 'SUPER_ADMIN',
        issueStatus: 'CLOSED',
        sentAt: new Date('2026-08-28T11:00:00.000Z'),
        messageCount: 6,
      },
      {
        id: 15,
        restaurantId: 5,
        restaurantName: 'Outro Restaurante',
        message: 'O problema voltou.',
        subject: 'Falha de pagamento',
        senderRole: 'ADMIN',
        issueStatus: null,
        sentAt: new Date('2026-08-28T12:00:00.000Z'),
        messageCount: 7,
      },
    ],
  } as Pick<SupportConversationRepository, 'listLatest'>;

  const result = await new ListAllSupportConversationsService(repository).execute();

  assert.equal(result[0].status, 'CLOSED');
  assert.equal(result[1].status, 'OPEN');
});
