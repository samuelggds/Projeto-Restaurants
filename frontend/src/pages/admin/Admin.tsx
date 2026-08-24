/* eslint-disable react-refresh/only-export-components -- os mapeadores exportados são contratos puros cobertos por testes. */
import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { useAuth } from '../../contexts/authContext';
import restaurantSettingsService from '../../Services/restaurantSettingsService';
import employeesService from '../../Services/employeesService';
import ordersService from '../../Services/ordersService';
import productsService from '../../Services/productsService';
import categoriesService from '../../Services/categoriesService';
import ingredientsService from '../../Services/ingredientsService';
import promotionsService from '../../Services/promotionsService';
import { AdminPage } from './AdminPage';
import { adminMockSettings, adminMockEmployees, defaultBusinessHours } from './data';
import { resolveEditableBusinessHours, serializeBusinessHours } from './domain/businessHours';
import type {
  AdminCategory,
  AdminCoupon,
  AdminIngredient,
  AdminOrder,
  AdminProduct,
  AdminProductOptionGroup,
  AdminSettings,
  Employee,
  EmployeeFormPayload,
} from './types';
import { isPersistentImageSource } from '../../utils/persistentImage';
import bannerService, { type BannerRecord } from '../../Services/bannerService';
import {
  connectSocket,
  disconnectSocket,
  waitForSocketConnection,
} from '../../Services/socketService';
import { getStoredAccessToken } from '../../modules/auth/session/authSession';
import { playOrderNotificationSound } from './domain/orderNotificationSound';

const BANNER_TITLES = {
  main: 'Banner principal',
} as const;

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' ? (value as Record<string, unknown>) : {};
}

function mapOrder(value: unknown): AdminOrder {
  const raw = asRecord(value);
  const user = asRecord(raw.user ?? raw.customer);
  const numericId = Number(raw.id ?? 0);
  return {
    id: String(raw.orderNumber ?? `#${numericId}`),
    numericId,
    userId: String(raw.userId ?? user.id ?? '') || undefined,
    customerName: String(user.name ?? raw.customerName ?? 'Cliente'),
    customerEmail: String(user.email ?? raw.customerEmail ?? '') || undefined,
    status: String(raw.status ?? 'PENDENTE'),
    total: Number(raw.total ?? raw.totalAmount ?? 0),
    paid: Boolean(raw.paid ?? raw.paymentConfirmed),
    type: String(raw.type ?? raw.orderType ?? ''),
    paymentMethod: String(raw.paymentMethod ?? '') || undefined,
    payOnDelivery: Boolean(raw.payOnDelivery),
    payOnDeliveryMethod: String(raw.payOnDeliveryMethod ?? '') || undefined,
    createdAt: String(raw.createdAt ?? '') || undefined,
  };
}

function mapProduct(value: unknown): AdminProduct {
  const raw = asRecord(value);
  const category = asRecord(raw.category);
  const discount = asRecord(raw.discount);
  const pricing = asRecord(raw.pricing);
  const optionGroups = (Array.isArray(raw.optionGroups) ? raw.optionGroups : []).map(
    (groupValue): AdminProductOptionGroup => {
      const group = asRecord(groupValue);
      const options = (Array.isArray(group.options) ? group.options : [])
        .map((optionValue) => {
          const option = asRecord(optionValue);
          return {
            id: Number(option.id ?? 0) || undefined,
            ingredientId: Number(option.ingredientId ?? asRecord(option.ingredient).id ?? 0),
            active: option.active !== false,
          };
        })
        .filter((option) => option.ingredientId > 0);
      const minSelections = Math.max(0, Number(group.minSelections ?? 0));
      return {
        id: Number(group.id ?? 0) || undefined,
        name: String(group.name ?? ''),
        description: String(group.description ?? ''),
        required: group.required === true || minSelections > 0,
        selectionType: group.selectionType === 'MULTIPLE' ? 'MULTIPLE' : 'SINGLE',
        minSelections,
        maxSelections: Math.max(1, Number(group.maxSelections ?? 1)),
        options,
      };
    },
  );
  const basePrice = Number(
    pricing.basePrice ?? pricing.originalPrice ?? pricing.originalBasePrice ?? raw.price ?? 0,
  );
  const finalPrice = Number(
    pricing.finalPrice ??
      pricing.discountedPrice ??
      pricing.effectivePrice ??
      pricing.effectiveBasePrice ??
      raw.price ??
      0,
  );
  const hasDiscountRecord = Object.keys(discount).length > 0;
  const hasPricingRecord = Object.keys(pricing).length > 0;
  return {
    id: String(raw.id ?? ''),
    categoryId: Number(raw.categoryId ?? category.id ?? 0),
    name: String(raw.name ?? 'Produto'),
    category: String(category.name ?? raw.categoryName ?? 'Sem categoria'),
    price: Number(raw.price ?? 0),
    image: String(raw.image ?? raw.imageUrl ?? ''),
    description: String(raw.description ?? ''),
    stock: raw.stock === null || raw.stock === undefined ? null : Number(raw.stock),
    active: raw.active !== false,
    saleMode: 'BUILDABLE',
    optionGroups,
    discount: hasDiscountRecord
      ? {
          type: discount.type === 'FIXED' || discount.kind === 'FIXED' ? 'FIXED' : 'PERCENTAGE',
          value: Number(discount.value ?? 0),
          badgeLabel: String(
            discount.badgeLabel ?? discount.label ?? pricing.badgeLabel ?? 'Oferta especial',
          ),
          active: discount.active !== false,
          startsAt: discount.startsAt ? String(discount.startsAt) : null,
          endsAt: discount.endsAt ? String(discount.endsAt) : null,
        }
      : null,
    pricing: hasPricingRecord
      ? {
          basePrice,
          finalPrice,
          discountAmount: Number(pricing.discountAmount ?? Math.max(0, basePrice - finalPrice)),
          discountPercentage: Number(pricing.discountPercentage ?? 0),
          hasDiscount:
            pricing.hasDiscount === true ||
            pricing.discounted === true ||
            pricing.active === true ||
            finalPrice < basePrice,
        }
      : null,
  };
}

function mapCoupon(value: unknown): AdminCoupon {
  const raw = asRecord(value);
  return {
    id: String(raw.id ?? ''),
    code: String(raw.code ?? ''),
    title: String(raw.title ?? ''),
    description: String(raw.description ?? ''),
    discountType: raw.discountType === 'FIXED' ? 'FIXED' : 'PERCENTAGE',
    discount: Number(raw.discount ?? 0),
    minimumSubtotal: Number(raw.minimumSubtotal ?? 0),
    maxDiscount:
      raw.maxDiscount === null || raw.maxDiscount === undefined ? null : Number(raw.maxDiscount),
    loyaltyPurchasesRequired: Number(raw.loyaltyPurchasesRequired ?? 1),
    perCustomerLimit: Number(raw.perCustomerLimit ?? 1),
    redemptionValidityDays: Number(raw.redemptionValidityDays ?? 30),
    active: raw.active !== false,
    expiration: raw.expiration ? String(raw.expiration) : null,
  };
}

function mapIngredient(value: unknown): AdminIngredient {
  const raw = asRecord(value);
  return {
    id: Number(raw.id ?? 0),
    name: String(raw.name ?? ''),
    price: Number(raw.price ?? 0),
    category: String(raw.category ?? 'Outros').trim() || 'Outros',
    active: raw.active !== false,
  };
}

export function mapSettingsFromApi(
  raw: Record<string, unknown>,
  banners: BannerRecord[] = [],
): AdminSettings {
  const r = (raw?.restaurant as Record<string, unknown>) ?? {};
  const logoCandidate = r?.logo ?? raw?.restaurantLogo ?? adminMockSettings.logoUrl ?? '';
  const coverCandidate =
    r?.coverImage ?? raw?.restaurantCoverImage ?? adminMockSettings.coverImageUrl ?? '';
  const banner = (title: string) => banners.find((item) => item.title === title);
  const mainBanner = banner(BANNER_TITLES.main);
  const businessHoursState = resolveEditableBusinessHours(raw?.businessHours, defaultBusinessHours);
  return {
    restaurantName: String(r?.name ?? raw?.restaurantName ?? adminMockSettings.restaurantName),
    companyLegalName: String(raw?.companyLegalName ?? ''),
    legalDocumentType:
      String(raw?.legalDocumentType ?? 'CNPJ').toUpperCase() === 'CPF' ? 'CPF' : 'CNPJ',
    companyDocument: String(raw?.companyDocument ?? ''),
    businessPhone: String(raw?.ownerPhone ?? ''),
    businessEmail: String(raw?.ownerEmail ?? ''),
    businessZipCode: String(r?.zipCode ?? ''),
    businessAddress: String(r?.address ?? ''),
    businessAddressNumber: String(r?.addressNumber ?? ''),
    businessAddressComplement: String(r?.addressComplement ?? ''),
    businessAddressDistrict: String(r?.addressDistrict ?? ''),
    businessCity: String(r?.city ?? ''),
    businessState: String(r?.state ?? ''),
    ...businessHoursState,
    isOpenForOrders: raw?.isOpenForOrders !== false,
    logoUrl: isPersistentImageSource(logoCandidate) ? String(logoCandidate) : '',
    coverImageUrl: isPersistentImageSource(coverCandidate) ? String(coverCandidate) : '',
    primaryColor: String(raw?.primaryColor ?? adminMockSettings.primaryColor),
    description: String(
      r?.description ??
        raw?.restaurantDescription ??
        raw?.description ??
        adminMockSettings.description,
    ),
    whatsapp: String(raw?.whatsapp ?? adminMockSettings.whatsapp),
    whatsappDisplayName: String(
      raw?.whatsappDisplayName ?? adminMockSettings.whatsappDisplayName,
    ),
    whatsappDefaultMessage: String(
      raw?.whatsappDefaultMessage ?? adminMockSettings.whatsappDefaultMessage,
    ),
    whatsappEnabled: raw?.whatsappEnabled === true,
    receiveOrdersOnWhatsapp: raw?.receiveOrdersOnWhatsapp === true,
    receiveStatusNotifications: raw?.receiveStatusNotifications === true,
    instagram: String(raw?.instagram ?? adminMockSettings.instagram),
    facebook: String(raw?.facebook ?? adminMockSettings.facebook),
    tiktok: String(raw?.tiktok ?? adminMockSettings.tiktok),
    youtube: String(raw?.youtube ?? adminMockSettings.youtube),
    minimumOrder: Number(raw?.minimumOrder ?? adminMockSettings.minimumOrder),
    deliveryFee: Number(raw?.deliveryFee ?? adminMockSettings.deliveryFee),
    freeShippingMinimum: Number(
      raw?.freeShippingMinimum ?? adminMockSettings.freeShippingMinimum,
    ),
    acceptsDelivery: raw?.acceptsDelivery !== false,
    acceptsPickup: raw?.acceptsPickup !== false,
    acceptsPix: raw?.acceptsPix !== false,
    acceptsCard: raw?.acceptsCard !== false,
    deliveryTime: Number(raw?.averageDeliveryTime ?? adminMockSettings.deliveryTime),
    autoAcceptOrders: raw?.autoAcceptOrders === true,
    trackingRequiresLogin: raw?.trackingRequiresLogin !== false,
    soundNotifications: raw?.soundNotifications !== false,
    maxConcurrentOrders: Math.max(
      1,
      Number(raw?.maxConcurrentOrders ?? adminMockSettings.maxConcurrentOrders),
    ),
    tableOrderingEnabled: Boolean(
      raw?.tableOrderingEnabled ?? adminMockSettings.tableOrderingEnabled,
    ),
    waiterCallEnabled: raw?.waiterCallEnabled !== false,
    billRequestEnabled: raw?.billRequestEnabled !== false,
    fontFamily: String(raw?.fontFamily ?? adminMockSettings.fontFamily),
    seoTitle: String(raw?.seoTitle ?? adminMockSettings.seoTitle),
    seoDescription: String(raw?.seoDescription ?? adminMockSettings.seoDescription),
    pixProvider: String(raw?.pixProvider ?? 'MERCADO_PAGO'),
    pixKey: String(raw?.pixKey ?? ''),
    cardGateway: String(raw?.cardGateway ?? ''),
    stripeSecretKey: '',
    stripeSecretKeyConfigured: Boolean(raw?.stripeSecretKeyConfigured),
    stripeWebhookSecret: '',
    stripeWebhookSecretConfigured: Boolean(raw?.stripeWebhookSecretConfigured),
    mercadoPagoAccessToken: '',
    mercadoPagoAccessTokenConfigured: Boolean(raw?.mercadoPagoAccessTokenConfigured),
    asaasAccessToken: '',
    asaasAccessTokenConfigured: Boolean(raw?.asaasAccessTokenConfigured),
    pagbankEmail: String(raw?.pagbankEmail ?? ''),
    pagbankToken: '',
    pagbankTokenConfigured: Boolean(raw?.pagbankTokenConfigured),
    mainBannerId: mainBanner?.id,
    mainBannerUrl: mainBanner?.image ?? '',
  };
}

export function mapSettingsToApi(settings: AdminSettings): Record<string, unknown> {
  const hasBusinessIdentity = [
    settings.companyLegalName,
    settings.companyDocument,
    settings.businessPhone,
    settings.businessEmail,
  ].some((value) => String(value || '').trim());
  const hasEstablishmentAddress = [
    settings.businessZipCode,
    settings.businessAddress,
    settings.businessAddressNumber,
    settings.businessAddressDistrict,
    settings.businessCity,
    settings.businessState,
  ].some((value) => String(value || '').trim());

  return {
    restaurantName: settings.restaurantName,
    ...(hasBusinessIdentity
      ? {
          legalDocumentType: settings.legalDocumentType,
          companyLegalName: settings.companyLegalName.trim(),
          companyDocument: settings.companyDocument.replace(/\D/g, ''),
          ownerPhone: settings.businessPhone.replace(/\D/g, ''),
          ownerEmail: settings.businessEmail.trim().toLowerCase(),
        }
      : {}),
    ...(hasEstablishmentAddress
      ? {
          restaurantZipCode: settings.businessZipCode.replace(/\D/g, ''),
          restaurantAddress: settings.businessAddress.trim(),
          restaurantAddressNumber: settings.businessAddressNumber.trim(),
          restaurantAddressComplement: settings.businessAddressComplement.trim(),
          restaurantAddressDistrict: settings.businessAddressDistrict.trim(),
          restaurantCity: settings.businessCity.trim(),
          restaurantState: settings.businessState.trim().toUpperCase(),
        }
      : {}),
    ...serializeBusinessHours(settings.businessHours, settings.businessHoursConfigured),
    isOpenForOrders: settings.isOpenForOrders,
    restaurantLogo: settings.logoUrl,
    restaurantCoverImage: settings.coverImageUrl,
    primaryColor: settings.primaryColor,
    description: settings.description,
    restaurantDescription: settings.description,
    whatsapp: settings.whatsapp,
    whatsappDisplayName: settings.whatsappDisplayName,
    whatsappDefaultMessage: settings.whatsappDefaultMessage,
    whatsappEnabled: settings.whatsappEnabled,
    receiveOrdersOnWhatsapp: settings.receiveOrdersOnWhatsapp,
    receiveStatusNotifications: settings.receiveStatusNotifications,
    instagram: settings.instagram,
    facebook: settings.facebook,
    tiktok: settings.tiktok,
    youtube: settings.youtube,
    minimumOrder: settings.minimumOrder,
    deliveryFee: settings.deliveryFee,
    freeShippingMinimum:
      settings.freeShippingMinimum > 0 ? settings.freeShippingMinimum : null,
    acceptsDelivery: settings.acceptsDelivery,
    acceptsPickup: settings.acceptsPickup,
    acceptsPix: settings.acceptsPix,
    acceptsCard: settings.acceptsCard,
    averageDeliveryTime: settings.deliveryTime,
    autoAcceptOrders: settings.autoAcceptOrders,
    trackingRequiresLogin: settings.trackingRequiresLogin,
    soundNotifications: settings.soundNotifications,
    maxConcurrentOrders: settings.maxConcurrentOrders,
    tableOrderingEnabled: settings.tableOrderingEnabled,
    waiterCallEnabled: settings.waiterCallEnabled,
    billRequestEnabled: settings.billRequestEnabled,
    fontFamily: settings.fontFamily,
    seoTitle: settings.seoTitle,
    seoDescription: settings.seoDescription,
    pixProvider: settings.pixProvider,
    pixKey: settings.pixKey,
    cardGateway: settings.cardGateway,
    pagbankEmail: settings.pagbankEmail,
    ...(settings.stripeSecretKey ? { stripeSecretKey: settings.stripeSecretKey } : {}),
    ...(settings.stripeWebhookSecret ? { stripeWebhookSecret: settings.stripeWebhookSecret } : {}),
    ...(settings.mercadoPagoAccessToken
      ? { mercadoPagoAccessToken: settings.mercadoPagoAccessToken }
      : {}),
    ...(settings.asaasAccessToken ? { asaasAccessToken: settings.asaasAccessToken } : {}),
    ...(settings.pagbankToken ? { pagbankToken: settings.pagbankToken } : {}),
  };
}

function mapEmployee(raw: Record<string, unknown>): Employee {
  const sub = String(raw?.subRole ?? '');
  let role: Employee['role'] = 'ATTENDANT';
  if (String(raw?.role ?? '') === 'MOTOQUEIRO') role = 'COURIER';
  else if (sub === 'COZINHA') role = 'COOK';
  else if (sub === 'GARCOM') role = 'WAITER';
  return {
    id: String(raw?.id ?? ''),
    name: String(raw?.name ?? ''),
    email: String(raw?.email ?? ''),
    phone: String(raw?.phone ?? '') || undefined,
    role,
    active: raw?.active !== false,
    permissions: {
      viewOrders: true,
      updateOrderStatus: true,
      manageQrTables: Boolean((raw?.permissions as Record<string, unknown>)?.manageQrTables),
    },
  };
}

const subRoleMap: Record<Employee['role'], string | null> = {
  COOK: 'COZINHA',
  WAITER: 'GARCOM',
  ATTENDANT: null,
  COURIER: null,
};

export default function Admin() {
  const navigate = useNavigate();
  const { logout } = useAuth();

  const [settings, setSettings] = useState<AdminSettings>(adminMockSettings);
  const [settingsId, setSettingsId] = useState<number | null>(null);
  const [employees, setEmployees] = useState<Employee[]>(adminMockEmployees);
  const [orders, setOrders] = useState<AdminOrder[]>([]);
  const [products, setProducts] = useState<AdminProduct[]>([]);
  const [categories, setCategories] = useState<AdminCategory[]>([]);
  const [ingredients, setIngredients] = useState<AdminIngredient[]>([]);
  const [coupons, setCoupons] = useState<AdminCoupon[]>([]);
  const [promotionsLoading, setPromotionsLoading] = useState(true);
  const [promotionsError, setPromotionsError] = useState('');
  const soundNotificationsRef = useRef(settings.soundNotifications);

  useEffect(() => {
    soundNotificationsRef.current = settings.soundNotifications;
  }, [settings.soundNotifications]);

  async function loadOperations() {
    const [orderData, productData, categoryData, ingredientData] = await Promise.all([
      ordersService.listRestaurantOrders(),
      productsService.listProducts(),
      categoriesService.listCategories(),
      ingredientsService.listIngredients(),
    ]);
    setOrders(orderData.map(mapOrder));
    setProducts(productData.map(mapProduct));
    setCategories(
      categoryData.map((value: unknown) => {
        const raw = asRecord(value);
        return { id: Number(raw.id), name: String(raw.name), active: raw.active !== false };
      }),
    );
    setIngredients(
      ingredientData
        .map(mapIngredient)
        .filter((ingredient) => ingredient.id > 0 && ingredient.name),
    );
  }

  async function loadCoupons() {
    setPromotionsLoading(true);
    setPromotionsError('');
    try {
      const couponData = await promotionsService.listCoupons();
      setCoupons(couponData.map(mapCoupon).filter((coupon) => coupon.id && coupon.code));
    } catch (error) {
      console.error('Não foi possível carregar os descontos e cupons.', error);
      setPromotionsError('Não foi possível carregar os cupons deste restaurante.');
    } finally {
      setPromotionsLoading(false);
    }
  }

  useEffect(() => {
    let mounted = true;
    Promise.resolve()
      .then(async () => {
        if (mounted) await loadOperations();
      })
      .catch((error) => console.error('Não foi possível carregar a operação.', error));
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    void Promise.resolve().then(loadCoupons);
  }, []);

  useEffect(() => {
    const token = getStoredAccessToken();
    if (!token) return;

    const socket = connectSocket(token, 'admin-orders');
    const refreshOrders = () => {
      void loadOperations().catch((error) =>
        console.error('Não foi possível atualizar os pedidos em tempo real.', error),
      );
    };
    const onNewOrder = () => {
      if (soundNotificationsRef.current) playOrderNotificationSound();
      refreshOrders();
    };
    const onEmployeeIssue = (issue: { issueStatus?: string | null; senderLabel?: string }) => {
      if (issue.issueStatus === 'OPEN') {
        toast.info(`Novo relato da equipe: ${issue.senderLabel || 'funcionário'}.`);
        window.dispatchEvent(new CustomEvent('employee-issues-unread'));
      }
    };

    socket.on('new-order', onNewOrder);
    socket.on('order:payment-confirmed', refreshOrders);
    socket.on('order:status-changed', refreshOrders);
    socket.on('support:chat-message', onEmployeeIssue);

    return () => {
      socket.off('new-order', onNewOrder);
      socket.off('order:payment-confirmed', refreshOrders);
      socket.off('order:status-changed', refreshOrders);
      socket.off('support:chat-message', onEmployeeIssue);
      disconnectSocket();
    };
  }, []);

  useEffect(() => {
    let mounted = true;
    Promise.all([restaurantSettingsService.getMySettings(), bannerService.list()])
      .then(([data, banners]) => {
        if (!mounted) return;
        setSettingsId(Number((data as Record<string, unknown>)?.id ?? 0) || null);
        setSettings(mapSettingsFromApi(data as Record<string, unknown>, banners));
      })
      .catch((error) => {
        console.error('Não foi possível carregar as configurações.', error);
      });
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    let mounted = true;
    employeesService
      .listEmployees()
      .then((data) => {
        if (!mounted) return;
        if (Array.isArray(data) && data.length > 0)
          setEmployees(data.map((e) => mapEmployee(e as Record<string, unknown>)));
      })
      .catch((error) => {
        console.error('Não foi possível carregar os funcionários.', error);
      });
    return () => {
      mounted = false;
    };
  }, []);

  async function handleSaveSettings(updated: AdminSettings) {
    const payload = mapSettingsToApi(updated);
    try {
      if (settingsId) {
        await restaurantSettingsService.updateSettings(settingsId, payload);
      } else {
        const created = await restaurantSettingsService.createSettings(payload);
        setSettingsId(Number((created as Record<string, unknown>)?.id ?? 0) || null);
      }
      const slots = [
        { id: updated.mainBannerId, title: BANNER_TITLES.main, image: updated.mainBannerUrl },
      ];
      await Promise.all(
        slots
          .filter((slot) => Boolean(slot.image))
          .map((slot) =>
            slot.id
              ? bannerService.update(slot.id, { title: slot.title, image: String(slot.image) })
              : bannerService.create({ title: slot.title, image: String(slot.image) }),
          ),
      );
      const [refreshed, refreshedBanners] = await Promise.all([
        restaurantSettingsService.getMySettings(),
        bannerService.list(),
      ]);
      const refreshedRecord = refreshed as Record<string, unknown>;
      setSettingsId(Number(refreshedRecord?.id ?? 0) || null);
      setSettings(mapSettingsFromApi(refreshedRecord, refreshedBanners));
    } catch (error) {
      console.error('Não foi possível salvar as configurações.', error);
      throw error;
    }
  }

  async function handleCreateEmployee(employee: EmployeeFormPayload) {
    try {
      const created = await employeesService.createEmployee({
        name: employee.name,
        email: employee.email,
        phone: employee.phone,
        password: employee.password,
        confirmPassword: employee.confirmPassword,
        role: employee.role === 'COURIER' ? 'MOTOQUEIRO' : 'FUNCIONARIO',
        subRole: subRoleMap[employee.role],
      });
      const mappedEmployee = mapEmployee(created as Record<string, unknown>);
      return mappedEmployee;
    } catch (error) {
      console.error('Não foi possível criar o funcionário.', error);
      throw error;
    }
  }

  async function handleUpdateEmployee(employee: EmployeeFormPayload & { id: string }) {
    try {
      await employeesService.updateEmployee(employee.id, {
        name: employee.name,
        email: employee.email,
        ...(employee.phone ? { phone: employee.phone } : {}),
        role: employee.role === 'COURIER' ? 'MOTOQUEIRO' : 'FUNCIONARIO',
        subRole: subRoleMap[employee.role],
      });
      return employee;
    } catch (error) {
      console.error('Não foi possível atualizar o funcionário.', error);
      throw error;
    }
  }

  async function handleReportSupport(payload: { subject: string; message: string }) {
    const token = getStoredAccessToken();
    if (!token) throw new Error('Sessão não encontrada.');

    const socket = connectSocket(token, 'admin-help');
    await waitForSocketConnection();
    await new Promise<void>((resolve, reject) => {
      socket.emit(
        'support:chat-send',
        { message: `[${payload.subject}] ${payload.message}` },
        (result: { ok?: boolean; error?: string }) => {
          if (result?.ok) resolve();
          else reject(new Error(result?.error || 'Não foi possível enviar o relato.'));
        },
      );
    });
  }

  return (
    <AdminPage
      initialSettings={settings}
      initialEmployees={employees}
      initialOrders={orders}
      initialProducts={products}
      initialCategories={categories}
      initialIngredients={ingredients}
      initialCoupons={coupons}
      promotionsLoading={promotionsLoading}
      promotionsError={promotionsError}
      onUpdateOrderStatus={async (id, status) => {
        await ordersService.updateStatus(id, status);
        await loadOperations();
      }}
      onConfirmOrderPayment={async (id) => {
        await ordersService.confirmPayment(id);
        await loadOperations();
      }}
      onCancelOrder={async (id) => {
        await ordersService.refundOrder(id);
        await loadOperations();
      }}
      onSaveProduct={async (product) => {
        const activeFromStock =
          product.stock === null || product.stock === undefined || product.stock > 0;
        const payload = {
          name: product.name,
          description: product.description || '',
          image: product.image || '',
          price: product.price,
          categoryId: product.categoryId,
          active: activeFromStock,
          featured: false,
          preparationTime: 20,
          stock: product.stock ?? null,
          saleMode: 'BUILDABLE',
          optionGroups: product.optionGroups || [],
        };
        if (product.id) await productsService.updateProduct(product.id, payload);
        else await productsService.createProduct(payload);
        await loadOperations();
      }}
      onDeleteProduct={async (id) => {
        await productsService.deleteProduct(id);
        await loadOperations();
      }}
      onCreateCategory={async (name) => {
        await categoriesService.createCategory({ name, active: true });
        await loadOperations();
      }}
      onUpdateCategory={async (id, name) => {
        await categoriesService.updateCategory(id, { name });
        await loadOperations();
      }}
      onDeleteCategory={async (id) => {
        await categoriesService.deleteCategory(id);
        await loadOperations();
      }}
      onCreateIngredient={async (ingredient) => {
        await ingredientsService.createIngredient(ingredient);
        await loadOperations();
      }}
      onUpdateIngredient={async (ingredient) => {
        await ingredientsService.updateIngredient(ingredient.id, {
          name: ingredient.name,
          price: ingredient.price,
          category: ingredient.category,
          active: ingredient.active,
        });
        await loadOperations();
      }}
      onDeleteIngredient={async (id) => {
        await ingredientsService.deleteIngredient(id);
        await loadOperations();
      }}
      onApplyProductDiscount={async (productId, payload) => {
        await promotionsService.applyProductDiscount(productId, payload);
        await loadOperations();
      }}
      onDeleteProductDiscount={async (productId) => {
        await promotionsService.deleteProductDiscount(productId);
        await loadOperations();
      }}
      onCreateCoupon={async (payload) => {
        await promotionsService.createCoupon(payload);
        await loadCoupons();
      }}
      onUpdateCoupon={async (id, payload) => {
        await promotionsService.updateCoupon(id, payload);
        await loadCoupons();
      }}
      onDeleteCoupon={async (id) => {
        await promotionsService.deleteCoupon(id);
        await loadCoupons();
      }}
      onReloadPromotions={async () => {
        await Promise.all([loadOperations(), loadCoupons()]);
      }}
      onSaveSettings={handleSaveSettings}
      onReportSupport={handleReportSupport}
      onConnectMercadoPago={async () => {
        const result = await restaurantSettingsService.startMercadoPagoOAuth();
        const authorizationUrl = String(
          (result as Record<string, unknown>)?.authorizationUrl || '',
        );
        if (!/^https:\/\//i.test(authorizationUrl)) {
          throw new Error('O Mercado Pago não retornou uma URL segura de autorização.');
        }
        window.location.assign(authorizationUrl);
      }}
      onConnectPagBank={async () => {
        const result = await restaurantSettingsService.startPagBankOAuth();
        const authorizationUrl = String(
          (result as Record<string, unknown>)?.authorizationUrl || '',
        );
        if (!/^https:\/\//i.test(authorizationUrl)) {
          throw new Error('O PagBank não retornou uma URL segura de autorização.');
        }
        window.location.assign(authorizationUrl);
      }}
      onOnboardAsaas={async (payload) => {
        await restaurantSettingsService.onboardAsaas(payload);
        const refreshed = await restaurantSettingsService.getMySettings();
        setSettings(mapSettingsFromApi(refreshed as Record<string, unknown>));
      }}
      onCreateEmployee={handleCreateEmployee}
      onUpdateEmployee={handleUpdateEmployee}
      onDeactivateEmployee={async (id) => {
        await employeesService.deactivateEmployee(id);
      }}
      onReactivateEmployee={async (id) => {
        await employeesService.reactivateEmployee(id);
      }}
      onViewStore={() => navigate('/')}
      onLogout={() => {
        logout();
        navigate('/login');
      }}
    />
  );
}
