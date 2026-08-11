import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../../Services/api";
import ordersService from "../../Services/ordersService";
import restaurantSettingsService from "../../Services/restaurantSettingsService";
import favoritesService from "../../Services/favoritesService";
import customerAddressService, { type CustomerAddressInput } from "../../Services/customerAddressService";
import { useAuth } from "../../contexts/authContext";
import { ProfilePage } from "./ProfilePage";
import { buildProfileData } from "../profile/adapters/profileDataAdapter";
import { AddressModal } from "./components/AddressModal";


function resizeToSquareBase64(
  file: File,
  size: number,
  quality: number,
): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = size;
      canvas.height = size;
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        reject(new Error("Canvas not supported"));
        return;
      }
      const scale = Math.max(size / img.width, size / img.height);
      const sw = img.width * scale;
      const sh = img.height * scale;
      ctx.drawImage(img, (size - sw) / 2, (size - sh) / 2, sw, sh);
      URL.revokeObjectURL(url);
      resolve(canvas.toDataURL("image/jpeg", quality));
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Falha ao carregar imagem"));
    };
    img.src = url;
  });
}

export default function Profile() {
  const { user, logout, login } = useAuth();
  const navigate = useNavigate();
  const [orders, setOrders] = useState<Record<string, unknown>[]>([]);
  const [favorites, setFavorites] = useState<Record<string, unknown>[]>([]);
  const [addresses, setAddresses] = useState<Record<string, unknown>[]>([]);
  const [addressModalOpen, setAddressModalOpen] = useState(false);
  const [settings, setSettings] = useState<Record<string, unknown> | null>(
    null,
  );
  const [localAvatar, setLocalAvatar] = useState("");
  // Derived: prefer a locally-uploaded photo until the auth context reflects the new avatar
  const avatarUrl =
    localAvatar || String((user as Record<string, unknown>)?.avatar || "");

  // Brand info from public settings of the user's restaurant
  useEffect(() => {
    const rid = Number(
      (user as Record<string, unknown>)?.restaurantId ||
        localStorage.getItem("menuRestaurantId") ||
        0,
    );
    if (!rid) return;
    let active = true;
    restaurantSettingsService
      .getPublicSettings(rid)
      .then((d) => {
        if (active) setSettings(d ?? null);
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, [user]);

  // User's orders
  useEffect(() => {
    let active = true;
    ordersService
      .listMyOrders()
      .then((raw: unknown) => {
        if (!active) return;
        const list = Array.isArray(raw)
          ? raw
          : Array.isArray((raw as Record<string, unknown>)?.orders)
            ? ((raw as Record<string, unknown>).orders as unknown[])
            : [];
        setOrders(list as Record<string, unknown>[]);
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    let active = true;
    customerAddressService.list().then((items) => { if (active) setAddresses(items); }).catch(() => {});
    return () => { active = false; };
  }, []);

  useEffect(() => {
    let active = true;
    favoritesService.list().then((items) => {
      if (active) setFavorites(items as Record<string, unknown>[]);
    }).catch(() => {});
    return () => { active = false; };
  }, []);

  const data = useMemo(
    () =>
      buildProfileData({
        user: (user as Record<string, unknown> | null) || null,
        settings,
        orders,
        favorites,
        addresses,
        avatarUrl,
      }),
    [user, settings, orders, favorites, addresses, avatarUrl],
  );

  const handleLogout = useCallback(() => {
    logout();
    navigate("/login");
  }, [logout, navigate]);

  const handleUploadAvatar = useCallback(
    async (file: File) => {
      const base64 = await resizeToSquareBase64(file, 160, 0.8);
      await api.put("/auth/profile", { avatar: base64 });
      setLocalAvatar(base64);
      const token = localStorage.getItem("token") || "";
      if (token) login({ ...(user ?? {}), avatar: base64 }, token);
    },
    [user, login],
  );

  const handleSavePersonalData = useCallback(
    async (payload: { name: string; email: string; phone: string }) => {
      const { data: updated } = await api.put("/auth/profile", payload);
      // Sync auth context immediately so useMemo recomputes without a refresh
      const token = localStorage.getItem("token") || "";
      if (token && updated) login({ ...(user ?? {}), ...updated }, token);
    },
    [user, login],
  );

  const handleChangePassword = useCallback(
    async (payload: { currentPassword: string; newPassword: string }) => {
      await api.put("/auth/password", payload);
    },
    [],
  );

  const saveAddress = useCallback(async (payload: CustomerAddressInput) => {
    const created = await customerAddressService.create(payload);
    setAddresses((current) => [created, ...current].map((item) => ({ ...item, isDefault: created.isDefault ? String(item.id) === String(created.id) : Boolean(item.isDefault) })));
  }, []);

  const selectAddress = useCallback(async (id: string) => {
    const selected = await customerAddressService.makeDefault(Number(id));
    setAddresses((current) => current.map((item) => ({ ...item, isDefault: String(item.id) === String(selected.id) })));
    localStorage.setItem("selectedCustomerAddressId", String(selected.id));
  }, []);

  return <>
    <ProfilePage
      data={data}
      cartCount={0}
      onGoHome={() => navigate("/")}
      onOpenMenu={() => navigate("/")}
      onLogout={handleLogout}
      onUploadAvatar={handleUploadAvatar}
      onSavePersonalData={handleSavePersonalData}
      onChangePassword={handleChangePassword}
      onNewAddress={() => setAddressModalOpen(true)}
      onSelectAddress={selectAddress}
      onToggleFavorite={async (productId) => {
        await favoritesService.remove(productId);
        setFavorites((current) => current.filter((item) => String(item.id) !== productId));
      }}
      onTrackOrder={(orderId) =>
        navigate(`/orders/${String(orderId).replace(/^#/, "")}/tracking`)
      }
    />
    {addressModalOpen && <AddressModal onClose={() => setAddressModalOpen(false)} onSave={saveAddress} />}
  </>;
}
