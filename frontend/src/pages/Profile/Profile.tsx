import { lazy, Suspense, useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import { ThemeProvider } from "styled-components";
import {
  Utensils,
  Sun,
  Moon,
  LogOut,
  ArrowLeft,
  ClipboardList,
} from "lucide-react";
import { useAuth } from "../../contexts/authContext";
import authService from "../../Services/authService";
import * as S from "./styles";

const ProfilePersonalCard = lazy(
  () => import("./components/ProfilePersonalCard"),
);
const ProfileAddressesAndOrders = lazy(
  () => import("./components/ProfileAddressesAndOrders"),
);

const ADDRESS_STORAGE_KEY = "@PecaJaFood:enderecos";
const ADDRESS_SELECTED_KEY = "@PecaJaFood:enderecoSelecionadoId";

function readJsonStorage(key, fallback) {
  const raw = localStorage.getItem(key);
  if (!raw) {
    return fallback;
  }

  try {
    return JSON.parse(raw);
  } catch {
    return fallback;
  }
}

function buildAddressFromUser(user) {
  if (!user?.address && !user?.district && !user?.city) {
    return null;
  }

  return {
    id: user?.defaultAddressId || 1,
    rotulo: user?.defaultAddressLabel || "Principal",
    rua: user?.address || "",
    numero: user?.number || "",
    bairro: user?.district || "",
    cidade: user?.city || "",
    estado: user?.state || "",
    cep: user?.zipCode || "",
    complemento: user?.complement || "",
  };
}

function normalizeAddress(address) {
  return {
    id: Number(address?.id || Date.now()),
    rotulo: String(address?.rotulo || "Principal"),
    rua: String(address?.rua || ""),
    numero: String(address?.numero || ""),
    bairro: String(address?.bairro || ""),
    cidade: String(address?.cidade || ""),
    estado: String(address?.estado || ""),
    cep: String(address?.cep || ""),
    complemento: String(address?.complemento || ""),
  };
}

function getStoredUser() {
  return readJsonStorage("user", null);
}

function getInitialAddresses(user) {
  const storedAddresses = readJsonStorage(ADDRESS_STORAGE_KEY, null);

  if (Array.isArray(storedAddresses) && storedAddresses.length > 0) {
    return storedAddresses.map(normalizeAddress);
  }

  const userAddress = buildAddressFromUser(user);

  return userAddress ? [normalizeAddress(userAddress)] : [];
}

function getInitialSelectedAddressId(addresses) {
  const storedSelected = Number(
    localStorage.getItem(ADDRESS_SELECTED_KEY) || 0,
  );

  if (
    storedSelected &&
    addresses.some((address) => address.id === storedSelected)
  ) {
    return storedSelected;
  }

  return addresses[0]?.id || null;
}

export default function Profile() {
  const navigate = useNavigate();
  const { user, login } = useAuth();
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [isEditing, setIsEditing] = useState(true);

  const storedUser = user || getStoredUser();
  const isAdmin = storedUser?.role === "ADMIN";

  // Estados dos dados do usuário
  const [name, setName] = useState(storedUser?.name || "");
  const [email, setEmail] = useState(storedUser?.email || "");
  const [phone, setPhone] = useState(storedUser?.phone || "");

  // --- NOVOS ESTADOS: Gerenciamento de Endereços ---
  const [enderecos, setEnderecos] = useState(() =>
    getInitialAddresses(storedUser),
  );
  const [selectedAddressId, setSelectedAddressId] = useState(() =>
    getInitialSelectedAddressId(getInitialAddresses(storedUser)),
  );

  const [novoEndereco, setNovoEndereco] = useState({
    rotulo: "",
    rua: "",
    numero: "",
    bairro: "",
    cidade: storedUser?.city || "Fortaleza",
    estado: storedUser?.state || "CE",
    cep: "",
    complemento: "",
  });

  // Atualiza o localStorage sempre que os endereços mudarem
  useEffect(() => {
    localStorage.setItem(ADDRESS_STORAGE_KEY, JSON.stringify(enderecos));
  }, [enderecos]);

  useEffect(() => {
    if (selectedAddressId) {
      localStorage.setItem(ADDRESS_SELECTED_KEY, String(selectedAddressId));
    } else {
      localStorage.removeItem(ADDRESS_SELECTED_KEY);
    }
  }, [selectedAddressId]);

  const selectedAddress =
    enderecos.find((endereco) => endereco.id === selectedAddressId) ||
    enderecos[0] ||
    null;

  useEffect(() => {
    if (storedUser?.name) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setName(storedUser.name);
    }
    if (storedUser?.email) {
      setEmail(storedUser.email);
    }
    if (storedUser?.phone) {
      setPhone(storedUser.phone);
    }
  }, [storedUser]);

  const handleLogout = () => {
    localStorage.removeItem("token");
    toast.info("Você saiu da sua conta.");
    navigate("/login");
  };

  const handleSave = async (e) => {
    e.preventDefault();
    try {
      if (!name.trim() || !email.trim() || !phone.trim()) {
        toast.warning("Preencha nome, e-mail e telefone antes de salvar.");
        return;
      }

      const token = localStorage.getItem("token");
      const currentUser = getStoredUser() || {};

      const payload = {
        name,
        email,
        phone,
        address: selectedAddress?.rua || currentUser.address || "",
        number: selectedAddress?.numero || currentUser.number || "",
        district: selectedAddress?.bairro || currentUser.district || "",
        city: selectedAddress?.cidade || currentUser.city || "",
        state: selectedAddress?.estado || currentUser.state || "",
        zipCode: selectedAddress?.cep || currentUser.zipCode || "",
        complement:
          selectedAddress?.complemento || currentUser.complement || "",
        defaultAddressId:
          selectedAddress?.id || currentUser.defaultAddressId || null,
        defaultAddressLabel:
          selectedAddress?.rotulo ||
          currentUser.defaultAddressLabel ||
          "Principal",
      };

      const updatedUser = token
        ? await authService.updateProfile(payload)
        : payload;

      const nextUser = {
        ...currentUser,
        ...updatedUser,
      };

      if (token) {
        login(nextUser, token);
      } else {
        localStorage.setItem("user", JSON.stringify(nextUser));
      }

      setIsEditing(false);
      toast.success("Perfil atualizado com sucesso!");
    } catch {
      toast.error("Erro ao atualizar dados.");
    }
  };

  // --- NOVAS FUNÇÕES: Adicionar e Deletar Endereços ---
  const handleAddEndereco = (e) => {
    e.preventDefault();
    if (!novoEndereco.rotulo || !novoEndereco.rua || !novoEndereco.numero) {
      toast.warning("Por favor, preencha os campos principais do endereço.");
      return;
    }

    const item = {
      ...normalizeAddress({
        ...novoEndereco,
        cidade: novoEndereco.cidade || storedUser?.city || "Fortaleza",
        estado: novoEndereco.estado || storedUser?.state || "CE",
      }),
    };

    setEnderecos((prev) => [...prev, item]);
    setSelectedAddressId(item.id);
    setNovoEndereco({
      rotulo: "",
      rua: "",
      numero: "",
      bairro: "",
      cidade: storedUser?.city || "Fortaleza",
      estado: storedUser?.state || "CE",
      cep: "",
      complemento: "",
    });
    toast.success("Endereço salvo com sucesso!");
  };

  const handleDeleteEndereco = (id) => {
    setEnderecos((prev) => prev.filter((end) => end.id !== id));
    setSelectedAddressId((current) => {
      if (current !== id) {
        return current;
      }

      const nextAddresses = enderecos.filter((end) => end.id !== id);
      return nextAddresses[0]?.id || null;
    });
    toast.info("Endereço removido.");
  };

  const handleSelectEndereco = (id) => {
    setSelectedAddressId(id);
    const selected = enderecos.find((endereco) => endereco.id === id);

    if (selected) {
      setNovoEndereco({
        rotulo: selected.rotulo || "",
        rua: selected.rua || "",
        numero: selected.numero || "",
        bairro: selected.bairro || "",
        cidade: selected.cidade || storedUser?.city || "Fortaleza",
        estado: selected.estado || storedUser?.state || "CE",
        cep: selected.cep || "",
        complemento: selected.complemento || "",
      });
    }
  };

  return (
    <ThemeProvider theme={isDarkMode ? S.darkTheme : S.lightTheme}>
      <S.ProfileLayout>
        {/* NAVBAR PADRÃO */}
        <S.Navbar>
          <S.Brand onClick={() => navigate("/")} style={{ cursor: "pointer" }}>
            <Utensils size={22} strokeWidth={2.5} />
            <span>Peça já food</span>
          </S.Brand>

          <S.NavRight>
            <S.BackButton onClick={() => navigate("/")}>
              <ArrowLeft size={18} />
              <span>Voltar</span>
            </S.BackButton>

            {isAdmin && (
              <S.AdminButton onClick={() => navigate("/admin")}>
                <ClipboardList size={18} />
                <span>Painel Admin</span>
              </S.AdminButton>
            )}

            <S.ThemeToggleButton onClick={() => setIsDarkMode(!isDarkMode)}>
              {isDarkMode ? <Sun size={18} /> : <Moon size={18} />}
            </S.ThemeToggleButton>

            <S.LogoutButton onClick={handleLogout}>
              <LogOut size={18} />
              <span>Sair</span>
            </S.LogoutButton>
          </S.NavRight>
        </S.Navbar>

        {/* CORPO DO PERFIL */}
        <S.MainContainer>
          <S.GridContainer>
            <Suspense fallback={null}>
              <ProfilePersonalCard
                name={name}
                email={email}
                phone={phone}
                isEditing={isEditing}
                onNameChange={setName}
                onEmailChange={setEmail}
                onPhoneChange={setPhone}
                onSubmit={handleSave}
                onEnableEditing={() => setIsEditing(true)}
              />
            </Suspense>

            <Suspense fallback={null}>
              <ProfileAddressesAndOrders
                enderecos={enderecos}
                novoEndereco={novoEndereco}
                onNovoEnderecoChange={setNovoEndereco}
                onAddEndereco={handleAddEndereco}
                onSelectEndereco={handleSelectEndereco}
                onDeleteEndereco={handleDeleteEndereco}
                onNavigateOrders={() => navigate("/profile/orders")}
              />
            </Suspense>
          </S.GridContainer>
        </S.MainContainer>
      </S.ProfileLayout>
    </ThemeProvider>
  );
}
