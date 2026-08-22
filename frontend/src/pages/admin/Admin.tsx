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
import { AdminPage } from './AdminPage';
import { adminMockSettings, adminMockEmployees, defaultBusinessHours } from './data';
import { normalizeBusinessHours } from './domain/businessHours';
import type {
  AdminCategory,
  AdminIngredient,
  AdminOrder,
  AdminProduct,
  AdminProductOptionGroup,
  AdminSettings,
  Employee,
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

function mapSettingsFromApi(
  raw: Record<string, unknown>,
  banners: BannerRecord[] = [],
): AdminSettings {
  const r = (raw?.restaurant as Record<string, unknown>) ?? {};
  const logoCandidate = r?.logo ?? raw?.restaurantLogo ?? adminMockSettings.logoUrl ?? '';
  const coverCandidate =
    r?.coverImage ?? raw?.restaurantCoverImage ?? adminMockSettings.coverImageUrl ?? '';
  const banner = (title: string) => banners.find((item) => item.title === title);
  const mainBanner = banner(BANNER_TITLES.main);
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
    businessHours: normalizeBusinessHours(raw?.businessHours, defaultBusinessHours),
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
    instagram: String(raw?.instagram ?? adminMockSettings.instagram),
    facebook: String(raw?.facebook ?? adminMockSettings.facebook),
    minimumOrder: Number(raw?.minimumOrder ?? adminMockSettings.minimumOrder),
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

function mapSettingsToApi(settings: AdminSettings): Record<string, unknown> {
  return {
    restaurantName: settings.restaurantName,
    legalDocumentType: settings.legalDocumentType,
    companyLegalName: settings.companyLegalName.trim(),
    companyDocument: settings.companyDocument.replace(/\D/g, ''),
    ownerPhone: settings.businessPhone.replace(/\D/g, ''),
    ownerEmail: settings.businessEmail.trim().toLowerCase(),
    restaurantZipCode: settings.businessZipCode.replace(/\D/g, ''),
    restaurantAddress: settings.businessAddress.trim(),
    restaurantAddressNumber: settings.businessAddressNumber.trim(),
    restaurantAddressComplement: settings.businessAddressComplement.trim(),
    restaurantAddressDistrict: settings.businessAddressDistrict.trim(),
    restaurantCity: settings.businessCity.trim(),
    restaurantState: settings.businessState.trim().toUpperCase(),
    businessHours: settings.businessHours,
    isOpenForOrders: settings.isOpenForOrders,
    restaurantLogo: settings.logoUrl,
    restaurantCoverImage: settings.coverImageUrl,
    primaryColor: settings.primaryColor,
    description: settings.description,
    restaurantDescription: settings.description,
    whatsapp: settings.whatsapp,
    instagram: settings.instagram,
    facebook: settings.facebook,
    minimumOrder: settings.minimumOrder,
    averageDeliveryTime: settings.deliveryTime,
    autoAcceptOrders: settings.autoAcceptOrders,
    trackingRequiresLogin: settings.trackingRequiresLogin,
    soundNotifications: settings.soundNotifications,
    maxConcurrentOrders: settings.maxConcurrentOrders,
    tableOrderingEnabled: settings.tableOrderingEnabled,
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
  if (sub === 'COZINHA') role = 'COOK';
  else if (sub === 'GARCOM') role = 'WAITER';
  return {
    id: String(raw?.id ?? ''),
    name: String(raw?.name ?? ''),
    email: String(raw?.email ?? ''),
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
      ingredientData.map(mapIngredient).filter((ingredient) => ingredient.id > 0 && ingredient.name),
    );
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
      const persisted = await Promise.all(
        slots
          .filter((slot) => Boolean(slot.image))
          .map((slot) =>
            slot.id
              ? bannerService.update(slot.id, { title: slot.title, image: String(slot.image) })
              : bannerService.create({ title: slot.title, image: String(slot.image) }),
          ),
      );
      setSettings((current) => ({
        ...current,
        mainBannerId:
          persisted.find((item) => item.title === BANNER_TITLES.main)?.id ?? current.mainBannerId,
      }));
    } catch (error) {
      console.error('Não foi possível salvar as configurações.', error);
      throw error;
    }
  }

  async function handleCreateEmployee(employee: Omit<Employee, 'id'>) {
    try {
      const created = await employeesService.createEmployee({
        name: employee.name,
        email: employee.email,
        role: 'FUNCIONARIO',
        subRole: subRoleMap[employee.role],
      });
      const mappedEmployee = mapEmployee(created as Record<string, unknown>);
      setEmployees((prev) => [...prev, mappedEmployee]);
      return mappedEmployee;
    } catch (error) {
      console.error('Não foi possível criar o funcionário.', error);
      throw error;
    }
  }

  async function handleUpdateEmployee(employee: Employee) {
    try {
      await employeesService.updateEmployee(employee.id, {
        name: employee.name,
        email: employee.email,
        subRole: subRoleMap[employee.role],
      });
      setEmployees((prev) => prev.map((e) => (e.id === employee.id ? employee : e)));
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
      key={`${settingsId}-${employees.length}`}
      initialSettings={settings}
      initialEmployees={employees}
      initialOrders={orders}
      initialProducts={products}
      initialCategories={categories}
      initialIngredients={ingredients}
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
        setEmployees((current) =>
          current.map((employee) =>
            employee.id === id ? { ...employee, active: false } : employee,
          ),
        );
      }}
      onReactivateEmployee={async (id) => {
        await employeesService.reactivateEmployee(id);
        setEmployees((current) =>
          current.map((employee) =>
            employee.id === id ? { ...employee, active: true } : employee,
          ),
        );
      }}
      onViewStore={() => navigate('/')}
      onLogout={() => {
        logout();
        navigate('/login');
      }}
    />
  );
}
