import { celcoinJson, isCelcoinOpenFinanceConfigured } from '../../payments/providers/celcoinOpenFinance.js';

type Brand = {
  id?: string;
  CustomerFriendlyName?: string;
  CustomerFriendlyLogoUri?: string;
  OrganisationName?: string;
  ApiFamilyType?: { 'payments-pix'?: boolean };
  settings?: { uptimeStatus?: string };
};

type BrandsResponse = {
  data?: Brand[];
  meta?: { totalPages?: number };
};

class ListOpenFinanceInstitutionsService {
  async execute() {
    if (!isCelcoinOpenFinanceConfigured()) {
      throw new Error('Open Finance ainda não está configurado pela plataforma.');
    }

    const institutions: Array<{ id: string; name: string; logo?: string | null }> = [];

    for (let page = 1; page <= 10; page += 1) {
      const result = await celcoinJson<BrandsResponse>(
        'GET',
        '/baas/v1/open/itp/participants/brands',
        {
          params: { type: 'PAYMENT', page, pageSize: 100 },
          timeoutMs: 10_000,
        },
      );

      if (result.status < 200 || result.status >= 300) {
        throw new Error('Não foi possível carregar os bancos do Open Finance.');
      }

      for (const brand of Array.isArray(result.data?.data) ? result.data.data : []) {
        const id = String(brand?.id || '').trim();
        const name = String(
          brand?.CustomerFriendlyName || brand?.OrganisationName || '',
        ).trim();
        const supportsPix = brand?.ApiFamilyType?.['payments-pix'] !== false;
        const operational =
          !brand?.settings?.uptimeStatus ||
          String(brand.settings.uptimeStatus).toUpperCase() === 'OPERATIONAL';

        if (!id || !name || !supportsPix || !operational) continue;
        institutions.push({
          id,
          name,
          logo: String(brand?.CustomerFriendlyLogoUri || '').trim() || null,
        });
      }

      const totalPages = Number(result.data?.meta?.totalPages || 1);
      if (!Number.isFinite(totalPages) || page >= totalPages) break;
    }

    return institutions
      .filter(
        (institution, index, list) =>
          list.findIndex((candidate) => candidate.id === institution.id) === index,
      )
      .sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'));
  }
}

export default new ListOpenFinanceInstitutionsService();
