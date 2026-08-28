import { notFound } from '../domain/superAdminErrors.js';
import { decimalToNumber, deriveTenantStatus, toIso } from '../domain/superAdminMappings.js';
import superAdminRepository, {
  type SuperAdminRepository,
} from '../repositories/SuperAdminRepository.js';
import {
  presentAdministrator,
  presentInvoice,
  presentSubscription,
} from './superAdminPresenters.js';

export class GetSuperAdminRestaurantService {
  constructor(private readonly repository: SuperAdminRepository = superAdminRepository) {}

  async execute(id: number) {
    const { restaurant, orderStatistics } = await this.repository.getRestaurantDetails(id);
    if (!restaurant) throw notFound('Restaurante não encontrado.');

    const plan = restaurant.subscription
      ? await this.repository.findPlan(restaurant.subscription.plan)
      : null;
    const hasOverdueInvoice = restaurant.invoices.some((invoice) => invoice.status === 'ATRASADO');

    return {
      id: restaurant.id,
      name: restaurant.name,
      slug: restaurant.slug,
      email: restaurant.email,
      phone: restaurant.phone,
      whatsapp: restaurant.whatsapp,
      cnpj: restaurant.cnpj,
      logo: restaurant.logo,
      coverImage: restaurant.coverImage,
      description: restaurant.description,
      address: {
        street: restaurant.address,
        number: restaurant.addressNumber,
        complement: restaurant.addressComplement,
        district: restaurant.addressDistrict,
        city: restaurant.city,
        state: restaurant.state,
        zipCode: restaurant.zipCode,
      },
      openingHours: restaurant.openingHours,
      active: restaurant.active,
      status: deriveTenantStatus({
        active: restaurant.active,
        subscriptionStatus: restaurant.subscription?.status,
        hasOverdueInvoice,
      }),
      createdAt: restaurant.createdAt.toISOString(),
      updatedAt: restaurant.updatedAt.toISOString(),
      monthlyFee: decimalToNumber(plan?.monthlyFee),
      subscription: presentSubscription(restaurant.subscription),
      administrators: restaurant.users.map((administrator) =>
        presentAdministrator(administrator, restaurant.name),
      ),
      invoices: restaurant.invoices.map((invoice) =>
        presentInvoice({ ...invoice, restaurantId: restaurant.id }, restaurant.name),
      ),
      supportMessages: restaurant.supportChatMessages
        .slice()
        .reverse()
        .map((message) => ({
          id: message.id,
          restaurantId: restaurant.id,
          message: message.message,
          senderRole: message.senderRole,
          senderUserId: message.senderUserId,
          senderLabel: message.senderLabel,
          sentAt: message.sentAt.toISOString(),
        })),
      statistics: {
        orders: orderStatistics._count.id,
        paidOrderRevenue: decimalToNumber(orderStatistics._sum.total),
        platformFeesGenerated: decimalToNumber(orderStatistics._sum.systemFee),
        products: restaurant._count.products,
        users: restaurant._count.users,
        tables: restaurant._count.tables,
      },
    };
  }
}

export default new GetSuperAdminRestaurantService();

