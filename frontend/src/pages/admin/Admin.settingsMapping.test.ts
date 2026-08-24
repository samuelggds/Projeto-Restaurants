import { describe, expect, it } from 'vitest';
import { adminMockSettings } from './data';
import { mapSettingsFromApi, mapSettingsToApi } from './Admin';

describe('mapeamento das configurações administrativas', () => {
  it('mantém marca, negócio, endereço e regras de pedidos no ciclo API/interface', () => {
    const settings = mapSettingsFromApi({
      companyLegalName: 'Restaurante Exemplo LTDA',
      legalDocumentType: 'CNPJ',
      companyDocument: '11222333000181',
      ownerPhone: '85999991234',
      ownerEmail: 'CONTATO@EXEMPLO.COM.BR',
      primaryColor: '#123456',
      averageDeliveryTime: '45',
      autoAcceptOrders: true,
      trackingRequiresLogin: false,
      soundNotifications: false,
      maxConcurrentOrders: 75,
      restaurant: {
        name: 'Restaurante Exemplo',
        logo: 'https://cdn.example.com/logo.webp',
        coverImage: 'https://cdn.example.com/capa.webp',
        description: 'Descrição pública.',
        address: 'Rua das Flores',
        addressNumber: '120',
        addressComplement: 'Loja 2',
        addressDistrict: 'Centro',
        city: 'Fortaleza',
        state: 'CE',
        zipCode: '60000000',
      },
    });

    expect(settings).toMatchObject({
      restaurantName: 'Restaurante Exemplo',
      companyLegalName: 'Restaurante Exemplo LTDA',
      companyDocument: '11222333000181',
      businessPhone: '85999991234',
      businessEmail: 'CONTATO@EXEMPLO.COM.BR',
      businessAddress: 'Rua das Flores',
      businessState: 'CE',
      deliveryTime: 45,
      autoAcceptOrders: true,
      trackingRequiresLogin: false,
      soundNotifications: false,
      maxConcurrentOrders: 75,
    });

    expect(mapSettingsToApi(settings)).toMatchObject({
      restaurantName: 'Restaurante Exemplo',
      companyLegalName: 'Restaurante Exemplo LTDA',
      companyDocument: '11222333000181',
      ownerPhone: '85999991234',
      ownerEmail: 'contato@exemplo.com.br',
      restaurantAddress: 'Rua das Flores',
      restaurantAddressNumber: '120',
      restaurantState: 'CE',
      restaurantLogo: 'https://cdn.example.com/logo.webp',
      restaurantCoverImage: 'https://cdn.example.com/capa.webp',
      restaurantDescription: 'Descrição pública.',
      averageDeliveryTime: 45,
      autoAcceptOrders: true,
      trackingRequiresLogin: false,
      soundNotifications: false,
      maxConcurrentOrders: 75,
    });
  });

  it('mantém os campos de canais, WhatsApp, redes e aparência no ciclo API/interface', () => {
    const settings = mapSettingsFromApi({
      id: 4,
      deliveryFee: 8.5,
      minimumOrder: 25,
      freeShippingMinimum: 90,
      acceptsDelivery: false,
      acceptsPickup: true,
      acceptsPix: false,
      acceptsCard: true,
      tableOrderingEnabled: true,
      waiterCallEnabled: false,
      billRequestEnabled: true,
      whatsapp: '5585999999999',
      whatsappEnabled: true,
      whatsappDisplayName: 'Atendimento da casa',
      whatsappDefaultMessage: 'Olá, preciso de ajuda.',
      receiveOrdersOnWhatsapp: false,
      receiveStatusNotifications: true,
      instagram: '@restaurante',
      facebook: 'restaurante',
      tiktok: '@restaurante',
      youtube: 'https://youtube.com/@restaurante',
      primaryColor: '#112233',
      fontFamily: 'Manrope',
      seoTitle: 'Restaurante do Bairro',
      seoDescription: 'Peça online com segurança.',
      restaurant: { name: 'Restaurante do Bairro' },
    });

    const payload = mapSettingsToApi(settings);

    expect(payload).toMatchObject({
      deliveryFee: 8.5,
      minimumOrder: 25,
      freeShippingMinimum: 90,
      acceptsDelivery: false,
      acceptsPickup: true,
      acceptsPix: false,
      acceptsCard: true,
      tableOrderingEnabled: true,
      waiterCallEnabled: false,
      billRequestEnabled: true,
      whatsapp: '5585999999999',
      whatsappEnabled: true,
      whatsappDisplayName: 'Atendimento da casa',
      whatsappDefaultMessage: 'Olá, preciso de ajuda.',
      receiveStatusNotifications: true,
      tiktok: '@restaurante',
      youtube: 'https://youtube.com/@restaurante',
      primaryColor: '#112233',
      fontFamily: 'Manrope',
      seoTitle: 'Restaurante do Bairro',
      seoDescription: 'Peça online com segurança.',
    });
  });

  it('não envia blocos obrigatórios vazios ao salvar outra seção pela primeira vez', () => {
    const payload = mapSettingsToApi({
      ...adminMockSettings,
      restaurantName: 'Restaurante novo',
      acceptsDelivery: false,
    });

    expect(payload.acceptsDelivery).toBe(false);
    expect(payload).not.toHaveProperty('companyLegalName');
    expect(payload).not.toHaveProperty('companyDocument');
    expect(payload).not.toHaveProperty('restaurantAddress');
    expect(payload).not.toHaveProperty('restaurantZipCode');
  });
});
