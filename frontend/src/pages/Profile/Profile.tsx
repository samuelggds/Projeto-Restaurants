import { lazy, Suspense, useState, useEffect, useMemo, useRef } from "react";
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
import {
  findSavedCard,
  getEmptyCardDraft,
  getSavedCardFieldErrors,
  persistCardWallet,
  readCardWallet,
  sanitizeCardDraft,
  validateSavedCardInput,
} from "../../config/cardPaymentWallet";
import { useAuth } from "../../contexts/authContext";
import authService from "../../Services/authService";
import {
  extractCepDigits,
  fetchAddressByCep,
  normalizeCepInput,
} from "../../Services/cepService";
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
    pontoReferencia: "",
  };
}

function normalizeAddress(address) {
  const parsedId = Number(address?.id);
  const safeId =
    Number.isInteger(parsedId) && parsedId > 0
      ? parsedId
      : Date.now() + Math.floor(Math.random() * 1000);

  return {
    id: safeId,
    rotulo: String(address?.rotulo || "Principal"),
    rua: String(address?.rua || ""),
    numero: String(address?.numero || ""),
    bairro: String(address?.bairro || ""),
    cidade: String(address?.cidade || ""),
    estado: String(address?.estado || ""),
    cep: String(address?.cep || ""),
    complemento: String(address?.complemento || ""),
    pontoReferencia: String(address?.pontoReferencia || ""),
  };
}

function mergeComplementAndReference(
  complemento: string | null | undefined,
  pontoReferencia: string | null | undefined,
) {
  const normalizedComplemento = String(complemento || "").trim();
  const normalizedReference = String(pontoReferencia || "").trim();

  if (normalizedComplemento && normalizedReference) {
    return `${normalizedComplemento} | Ref.: ${normalizedReference}`;
  }

  if (normalizedComplemento) {
    return normalizedComplemento;
  }

  if (normalizedReference) {
    return `Ref.: ${normalizedReference}`;
  }

  return "";
}

function getStoredUser() {
  return readJsonStorage("user", null);
}

function getInitialAddresses(user) {
  const storedAddresses = readJsonStorage(ADDRESS_STORAGE_KEY, null);

  if (Array.isArray(storedAddresses)) {
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

function sameAddressId(left, right) {
  return String(left ?? "") === String(right ?? "");
}

export default function Profile() {
  const navigate = useNavigate();
  const { user, login } = useAuth();
  const initialCardWallet = readCardWallet();
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
    pontoReferencia: "",
  });
  const lastCepLookupRef = useRef("");
  const [isCepLookupLoading, setIsCepLookupLoading] = useState(false);
  const [savedCards, setSavedCards] = useState(initialCardWallet.cards);
  const [selectedSavedCardId, setSelectedSavedCardId] = useState(
    initialCardWallet.selectedCardId,
  );
  const [defaultSavedCardId, setDefaultSavedCardId] = useState(
    initialCardWallet.defaultCardId,
  );
  const [cardPaymentDraft, setCardPaymentDraft] = useState(() => {
    const selectedCard = findSavedCard(
      initialCardWallet.cards,
      initialCardWallet.selectedCardId,
    );

    return selectedCard ? sanitizeCardDraft(selectedCard) : getEmptyCardDraft();
  });
  const [showCardFieldFeedback, setShowCardFieldFeedback] = useState(false);

  const cardFieldErrors = useMemo(() => {
    if (!showCardFieldFeedback) {
      return {};
    }

    return getSavedCardFieldErrors(cardPaymentDraft);
  }, [showCardFieldFeedback, cardPaymentDraft]);

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

  useEffect(() => {
    persistCardWallet(savedCards, selectedSavedCardId, defaultSavedCardId);
  }, [savedCards, selectedSavedCardId, defaultSavedCardId]);

  const selectedAddress =
    enderecos.find((endereco) =>
      sameAddressId(endereco.id, selectedAddressId),
    ) ||
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
          mergeComplementAndReference(
            selectedAddress?.complemento,
            selectedAddress?.pontoReferencia,
          ) ||
          currentUser.complement ||
          "",
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
      pontoReferencia: "",
    });
    toast.success("Endereço salvo com sucesso!");
  };

  const handleDeleteEndereco = (id) => {
    const nextAddresses = enderecos.filter((end) => !sameAddressId(end.id, id));

    setEnderecos(nextAddresses);
    setSelectedAddressId((current) => {
      if (!sameAddressId(current, id)) {
        return current;
      }

      return nextAddresses[0]?.id || null;
    });

    if (nextAddresses.length === 0) {
      const token = localStorage.getItem("token");
      const currentUser = getStoredUser() || {};
      const nextUser = {
        ...currentUser,
        address: "",
        number: "",
        district: "",
        city: "",
        state: "",
        zipCode: "",
        complement: "",
        defaultAddressId: null,
        defaultAddressLabel: null,
      };

      if (token) {
        login(nextUser, token);
      } else {
        localStorage.setItem("user", JSON.stringify(nextUser));
      }
    }

    toast.info("Endereço removido.");
  };

  const handleSelectEndereco = (id) => {
    setSelectedAddressId(id);
    const selected = enderecos.find((endereco) =>
      sameAddressId(endereco.id, id),
    );

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
        pontoReferencia: selected.pontoReferencia || "",
      });
    }
  };

  const handleNovoEnderecoChange = (value) => {
    const normalizedCep = normalizeCepInput(value?.cep || "");
    const cepDigits = extractCepDigits(normalizedCep);

    if (cepDigits.length < 8) {
      lastCepLookupRef.current = "";
    }

    setNovoEndereco({
      ...value,
      cep: normalizedCep,
    });
  };

  useEffect(() => {
    const cepDigits = extractCepDigits(novoEndereco.cep);

    if (cepDigits.length !== 8) {
      return;
    }

    if (lastCepLookupRef.current === cepDigits) {
      return;
    }

    let cancelled = false;

    async function fillAddressFromCep() {
      try {
        setIsCepLookupLoading(true);
        const viaCepAddress = await fetchAddressByCep(cepDigits);

        if (cancelled) {
          return;
        }

        lastCepLookupRef.current = cepDigits;
        setNovoEndereco((prev) => ({
          ...prev,
          cep: normalizeCepInput(prev.cep),
          rua: viaCepAddress.logradouro || prev.rua,
          bairro: viaCepAddress.bairro || prev.bairro,
          cidade: viaCepAddress.localidade || prev.cidade,
          estado: viaCepAddress.uf || prev.estado,
        }));
      } catch (error) {
        if (cancelled) {
          return;
        }

        lastCepLookupRef.current = cepDigits;
        toast.warning(
          error instanceof Error
            ? error.message
            : "Nao foi possivel preencher o endereco por CEP.",
        );
      } finally {
        if (!cancelled) {
          setIsCepLookupLoading(false);
        }
      }
    }

    fillAddressFromCep();

    return () => {
      cancelled = true;
    };
  }, [novoEndereco.cep]);

  const handleCardPaymentDraftChange = (field, value) => {
    setCardPaymentDraft((prev) => ({
      ...prev,
      [field]:
        field === "lastFour"
          ? String(value || "")
              .replace(/\D/g, "")
              .slice(0, 4)
          : value,
    }));
  };

  const handleSelectSavedCard = (cardId) => {
    const selectedCard = findSavedCard(savedCards, cardId);

    if (!selectedCard) {
      return;
    }

    setSelectedSavedCardId(selectedCard.id);
    setCardPaymentDraft(sanitizeCardDraft(selectedCard));
    setShowCardFieldFeedback(false);
  };

  const handleSetDefaultSavedCard = (cardId) => {
    const selectedCard = findSavedCard(savedCards, cardId);

    if (!selectedCard) {
      return;
    }

    setDefaultSavedCardId(selectedCard.id);
    setSelectedSavedCardId(selectedCard.id);
    setCardPaymentDraft(sanitizeCardDraft(selectedCard));
    setShowCardFieldFeedback(false);
    toast.success("Cartao padrao atualizado.");
  };

  const handleStartNewSavedCard = () => {
    setSelectedSavedCardId(null);
    setCardPaymentDraft(getEmptyCardDraft());
    setShowCardFieldFeedback(false);
  };

  const handleSaveCurrentCard = () => {
    setShowCardFieldFeedback(true);
    const sanitizedDraft = sanitizeCardDraft(cardPaymentDraft);

    const validationError = validateSavedCardInput(sanitizedDraft);

    if (validationError) {
      toast.warning(validationError);
      return;
    }

    const normalizedHolder = sanitizedDraft.holderName.trim().toLowerCase();
    const normalizedBrand = sanitizedDraft.brand.trim().toLowerCase();
    const existingCard =
      findSavedCard(savedCards, selectedSavedCardId) ||
      savedCards.find(
        (card) =>
          card.lastFour === sanitizedDraft.lastFour &&
          card.holderName.trim().toLowerCase() === normalizedHolder &&
          card.brand.trim().toLowerCase() === normalizedBrand,
      ) ||
      null;
    const nextCard = {
      id: existingCard?.id || `${Date.now()}`,
      ...sanitizedDraft,
    };
    const nextCards = existingCard
      ? savedCards.map((card) =>
          card.id === existingCard.id ? nextCard : card,
        )
      : [...savedCards, nextCard];

    setSavedCards(nextCards);
    setSelectedSavedCardId(nextCard.id);
    setDefaultSavedCardId((prev) => prev || nextCard.id);
    setCardPaymentDraft(sanitizeCardDraft(nextCard));
    setShowCardFieldFeedback(false);
    toast.success(existingCard ? "Cartao atualizado." : "Cartao salvo.");
  };

  const handleRemoveSavedCard = (cardId) => {
    const nextCards = savedCards.filter((card) => card.id !== cardId);
    const nextSelectedCardId = nextCards[0]?.id || null;
    const nextDefaultCardId =
      defaultSavedCardId === cardId
        ? nextCards[0]?.id || null
        : defaultSavedCardId;

    setSavedCards(nextCards);
    setSelectedSavedCardId(nextSelectedCardId);
    setDefaultSavedCardId(nextDefaultCardId);
    setCardPaymentDraft(
      nextSelectedCardId
        ? sanitizeCardDraft(findSavedCard(nextCards, nextSelectedCardId))
        : getEmptyCardDraft(),
    );
    setShowCardFieldFeedback(false);
    toast.info("Cartao removido.");
  };

  return (
    <ThemeProvider theme={isDarkMode ? S.darkTheme : S.lightTheme}>
      <S.ProfileLayout>
        {/* NAVBAR PADRÃO */}
        <S.Navbar>
          <S.Brand onClick={() => navigate("/")} style={{ cursor: "pointer" }}>
            <Utensils size={22} strokeWidth={2.5} />
            <span>Peça Já Food</span>
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
                savedCards={savedCards}
                selectedSavedCardId={selectedSavedCardId}
                defaultSavedCardId={defaultSavedCardId}
                cardPaymentDraft={cardPaymentDraft}
                cardFieldErrors={cardFieldErrors}
                showCardFieldFeedback={showCardFieldFeedback}
                isCepLookupLoading={isCepLookupLoading}
                onNovoEnderecoChange={handleNovoEnderecoChange}
                onAddEndereco={handleAddEndereco}
                onSelectEndereco={handleSelectEndereco}
                onDeleteEndereco={handleDeleteEndereco}
                onCardPaymentDraftChange={handleCardPaymentDraftChange}
                onSelectSavedCard={handleSelectSavedCard}
                onSetDefaultSavedCard={handleSetDefaultSavedCard}
                onStartNewSavedCard={handleStartNewSavedCard}
                onSaveCurrentCard={handleSaveCurrentCard}
                onRemoveSavedCard={handleRemoveSavedCard}
                onNavigateOrders={() => navigate("/profile/orders")}
              />
            </Suspense>
          </S.GridContainer>
        </S.MainContainer>
      </S.ProfileLayout>
    </ThemeProvider>
  );
}
