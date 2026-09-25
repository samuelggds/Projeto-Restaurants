import {
  efiOpenFinanceConfigured,
  efiOpenFinanceRequest,
  type EfiOpenFinanceParticipant,
} from '../../payments/providers/efiOpenFinance.js';

class ListOpenFinanceInstitutionsService {
  async execute() {
    if (!efiOpenFinanceConfigured()) {
      throw new Error('Open Finance Efí ainda não está configurado pela plataforma.');
    }

    const result = await efiOpenFinanceRequest<{ participantes?: EfiOpenFinanceParticipant[] }>(
      'GET',
      '/v1/participantes',
      { params: { organizacao: false, modalidade: 'pagamentos' } },
    );

    if (result.status < 200 || result.status >= 300) {
      throw new Error('Não foi possível carregar os bancos disponíveis no Open Finance.');
    }

    return (Array.isArray(result.data?.participantes) ? result.data.participantes : [])
      .map((participant) => ({
        id: String(participant.identificador || '').trim(),
        name: String(participant.nome || '').trim(),
        logo: String(participant.logo || '').trim() || null,
      }))
      .filter((participant) => participant.id && participant.name)
      .sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'));
  }
}

export default new ListOpenFinanceInstitutionsService();
