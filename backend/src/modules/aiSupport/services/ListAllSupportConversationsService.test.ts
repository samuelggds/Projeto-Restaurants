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
