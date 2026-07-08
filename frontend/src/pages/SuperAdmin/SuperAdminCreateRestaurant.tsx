import { useState } from "react";
import { useNavigate } from "react-router-dom";
import styled from "styled-components";
import { ArrowLeft, Building2 } from "lucide-react";
import { toast } from "react-toastify";
import restaurantsService from "../../Services/restaurantsService";
import SuperAdminShell from "./SuperAdminShell";
import * as S from "./styles";

const INITIAL_CREATE_FORM = {
  restaurantName: "",
  slug: "",
  restaurantEmail: "",
  phone: "",
  city: "",
  state: "",
  adminName: "",
  adminEmail: "",
  adminPassword: "",
  adminConfirmPassword: "",
};

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const STATE_PATTERN = /^[A-Z]{2}$/;
const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const VALIDATION_TOAST_ID = "create-restaurant-validation";
const COMMON_EMAIL_DOMAIN_TYPOS: Record<string, string> = {
  "hotmali.com": "hotmail.com",
  "hotmai.com": "hotmail.com",
  "hotmal.com": "hotmail.com",
  "gmil.com": "gmail.com",
  "gmai.com": "gmail.com",
  "yahho.com": "yahoo.com",
  "outlok.com": "outlook.com",
};
const BRAZIL_UF_LIST = [
  "AC",
  "AL",
  "AP",
  "AM",
  "BA",
  "CE",
  "DF",
  "ES",
  "GO",
  "MA",
  "MT",
  "MS",
  "MG",
  "PA",
  "PB",
  "PR",
  "PE",
  "PI",
  "RJ",
  "RN",
  "RS",
  "RO",
  "RR",
  "SC",
  "SP",
  "SE",
  "TO",
] as const;

function normalizePhone(value: string) {
  return String(value || "").replace(/\D/g, "");
}

function formatBrazilPhone(value: string) {
  const digits = normalizePhone(value).slice(0, 11);

  if (digits.length <= 2) {
    return digits;
  }

  const ddd = digits.slice(0, 2);
  const local = digits.slice(2);

  if (local.length <= 4) {
    return `(${ddd}) ${local}`;
  }

  if (local.length <= 8) {
    return `(${ddd}) ${local.slice(0, 4)}-${local.slice(4)}`;
  }

  return `(${ddd}) ${local.slice(0, 5)}-${local.slice(5)}`;
}

function sanitizeSlug(value: string) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

function getEmailDomainSuggestion(value: string) {
  const domain = String(value || "")
    .split("@")[1]
    ?.trim()
    .toLowerCase();

  if (!domain) {
    return null;
  }

  const suggestion = COMMON_EMAIL_DOMAIN_TYPOS[domain];

  if (!suggestion) {
    return null;
  }

  return {
    domain,
    suggestion,
  };
}

export default function SuperAdminCreateRestaurant() {
  const navigate = useNavigate();
  const [isSaving, setIsSaving] = useState(false);
  const [form, setForm] = useState(INITIAL_CREATE_FORM);

  function updateForm(field: string, value: string) {
    setForm((current) => ({
      ...current,
      [field]: value,
    }));
  }

  function getFieldLabel(fieldName: string) {
    const labels: Record<string, string> = {
      restaurantName: "Nome do Restaurante",
      slug: "Slug",
      restaurantEmail: "Email do Restaurante",
      phone: "Telefone",
      city: "Cidade",
      state: "Estado",
      adminName: "Nome do Admin",
      adminEmail: "Email do Admin",
      adminPassword: "Senha do Admin",
      adminConfirmPassword: "Confirmar Senha do Admin",
    };

    return labels[fieldName] || "Campo";
  }

  function handleFieldInvalid(event: React.InvalidEvent<HTMLInputElement>) {
    event.preventDefault();

    const input = event.currentTarget;
    const label = getFieldLabel(input.name || "");

    let message = `Revise o campo ${label}.`;

    if (input.validity.valueMissing) {
      message = `${label} é obrigatório.`;
    } else if (input.validity.typeMismatch) {
      message = `${label} está em formato inválido.`;
    } else if (input.validity.tooShort) {
      message = `${label} está curto demais.`;
    } else if (input.validity.patternMismatch) {
      message = `${label} não está no formato esperado.`;
    }

    toast.warning(message, { toastId: VALIDATION_TOAST_ID });
  }

  function getFriendlyCreateErrorMessage(rawMessage: string) {
    const message = String(rawMessage || "");
    const normalized = message.toLowerCase();

    if (normalized.includes("restaurante") && normalized.includes("e-mail")) {
      return "Este e-mail de restaurante já existe. Use outro e-mail.";
    }

    if (normalized.includes("slug") && normalized.includes("já existe")) {
      return "Este slug já existe. Escolha outro identificador para o restaurante.";
    }

    if (normalized.includes("admin") && normalized.includes("e-mail")) {
      return "Este e-mail de admin já existe. Use outro e-mail.";
    }

    if (normalized.includes("inválido") || normalized.includes("invalido")) {
      return message;
    }

    return "Não foi possível criar restaurante/admin. Revise os campos e tente novamente.";
  }

  function validateForm() {
    const restaurantName = String(form.restaurantName || "").trim();
    const slug = sanitizeSlug(form.slug || form.restaurantName);
    const restaurantEmail = String(form.restaurantEmail || "")
      .trim()
      .toLowerCase();
    const phone = normalizePhone(form.phone);
    const city = String(form.city || "").trim();
    const state = String(form.state || "")
      .trim()
      .toUpperCase();
    const adminName = String(form.adminName || "").trim();
    const adminEmail = String(form.adminEmail || "")
      .trim()
      .toLowerCase();
    const adminPassword = String(form.adminPassword || "");
    const adminConfirmPassword = String(form.adminConfirmPassword || "");

    if (restaurantName.length < 2) {
      toast.error("Informe o nome do restaurante com pelo menos 2 caracteres.");
      return null;
    }

    if (!slug || slug.length < 3 || !SLUG_PATTERN.test(slug)) {
      toast.error("Slug inválido. Use letras minúsculas, números e hífen.");
      return null;
    }

    if (!EMAIL_PATTERN.test(restaurantEmail)) {
      toast.error("Informe um e-mail válido para o restaurante.");
      return null;
    }

    const restaurantEmailSuggestion = getEmailDomainSuggestion(restaurantEmail);
    if (restaurantEmailSuggestion) {
      toast.error(
        `Domínio de e-mail inválido (${restaurantEmailSuggestion.domain}). Você quis dizer ${restaurantEmailSuggestion.suggestion}?`,
      );
      return null;
    }

    if (phone && !/^\d{10,11}$/.test(phone)) {
      toast.error("Telefone inválido. Use DDD + número (10 ou 11 dígitos).");
      return null;
    }

    if (city && city.length < 2) {
      toast.error("Cidade inválida. Informe pelo menos 2 caracteres.");
      return null;
    }

    if (state && !STATE_PATTERN.test(state)) {
      toast.error("Estado inválido. Use a sigla com 2 letras, ex: SP.");
      return null;
    }

    if (adminName.length < 2) {
      toast.error("Informe o nome do admin com pelo menos 2 caracteres.");
      return null;
    }

    if (!EMAIL_PATTERN.test(adminEmail)) {
      toast.error("Informe um e-mail válido para o admin.");
      return null;
    }

    const adminEmailSuggestion = getEmailDomainSuggestion(adminEmail);
    if (adminEmailSuggestion) {
      toast.error(
        `Domínio de e-mail inválido (${adminEmailSuggestion.domain}). Você quis dizer ${adminEmailSuggestion.suggestion}?`,
      );
      return null;
    }

    if (adminPassword.length < 6) {
      toast.error("A senha do admin deve ter pelo menos 6 caracteres.");
      return null;
    }

    if (adminPassword !== adminConfirmPassword) {
      toast.error("A confirmação de senha do admin não confere.");
      return null;
    }

    return {
      restaurantName,
      slug,
      restaurantEmail,
      phone,
      city,
      state,
      adminName,
      adminEmail,
      adminPassword,
    };
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const validatedData = validateForm();
    if (!validatedData) {
      return;
    }

    try {
      setIsSaving(true);

      await restaurantsService.createRestaurant({
        restaurant: {
          name: validatedData.restaurantName,
          slug: validatedData.slug,
          email: validatedData.restaurantEmail,
          phone: validatedData.phone || undefined,
          city: validatedData.city || undefined,
          state: validatedData.state || undefined,
        },
        admin: {
          name: validatedData.adminName,
          email: validatedData.adminEmail,
          password: validatedData.adminPassword,
        },
      });

      toast.success("Restaurante e conta ADMIN criados com sucesso.");
      navigate("/super_admin");
    } catch (error: unknown) {
      const rawMessage =
        typeof error === "object" &&
        error !== null &&
        "response" in error &&
        typeof (error as { response?: { data?: { message?: string } } })
          .response?.data?.message === "string"
          ? (error as { response?: { data?: { message?: string } } }).response
              ?.data?.message
          : "Nao foi possivel criar restaurante/admin.";

      const message = getFriendlyCreateErrorMessage(rawMessage);

      toast.error(message);
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <SuperAdminShell
      title="Cadastro de Restaurante + Admin"
      subtitle="Fluxo exclusivo do Super Admin para onboarding de novas operacoes."
      activeItem="create"
    >
      <BackButton type="button" onClick={() => navigate("/super_admin")}>
        <ArrowLeft size={16} /> Voltar ao painel principal
      </BackButton>

      <S.CreateSection>
        <S.CreateHeader>
          <h2>Onboarding exclusivo do Super Admin</h2>
          <p>
            Crie uma nova operacao com dados do restaurante e a conta
            administrativa inicial.
          </p>
        </S.CreateHeader>

        <S.CreateForm onSubmit={handleSubmit}>
          <S.CreateGrid>
            <S.InputGroup>
              <label>Nome do Restaurante*</label>
              <input
                name="restaurantName"
                type="text"
                value={form.restaurantName}
                onChange={(event) =>
                  updateForm("restaurantName", event.target.value)
                }
                onInvalid={handleFieldInvalid}
                required
              />
            </S.InputGroup>

            <S.InputGroup>
              <label>Slug*</label>
              <input
                name="slug"
                type="text"
                value={form.slug}
                onChange={(event) =>
                  updateForm("slug", sanitizeSlug(event.target.value))
                }
                placeholder="ex: pizzaria-centro"
                onInvalid={handleFieldInvalid}
                required
              />
            </S.InputGroup>

            <S.InputGroup>
              <label>Email do Restaurante*</label>
              <input
                name="restaurantEmail"
                type="email"
                value={form.restaurantEmail}
                onChange={(event) =>
                  updateForm("restaurantEmail", event.target.value)
                }
                onInvalid={handleFieldInvalid}
                required
              />
            </S.InputGroup>

            <S.InputGroup>
              <label>Telefone</label>
              <input
                name="phone"
                type="text"
                inputMode="numeric"
                placeholder="(11) 99999-9999"
                value={form.phone}
                onChange={(event) =>
                  updateForm("phone", formatBrazilPhone(event.target.value))
                }
                onInvalid={handleFieldInvalid}
              />
            </S.InputGroup>

            <S.InputGroup>
              <label>Cidade</label>
              <input
                name="city"
                type="text"
                value={form.city}
                onChange={(event) => updateForm("city", event.target.value)}
                onInvalid={handleFieldInvalid}
              />
            </S.InputGroup>

            <S.InputGroup>
              <label>Estado</label>
              <input
                name="state"
                type="text"
                maxLength={2}
                list="brazil-uf-list"
                placeholder="SP"
                value={form.state}
                onChange={(event) =>
                  updateForm(
                    "state",
                    event.target.value.replace(/[^a-zA-Z]/g, "").toUpperCase(),
                  )
                }
                onInvalid={handleFieldInvalid}
              />
              <datalist id="brazil-uf-list">
                {BRAZIL_UF_LIST.map((uf) => (
                  <option key={uf} value={uf} />
                ))}
              </datalist>
            </S.InputGroup>

            <S.InputGroup>
              <label>Nome do Admin*</label>
              <input
                name="adminName"
                type="text"
                value={form.adminName}
                onChange={(event) =>
                  updateForm("adminName", event.target.value)
                }
                onInvalid={handleFieldInvalid}
                required
              />
            </S.InputGroup>

            <S.InputGroup>
              <label>Email do Admin*</label>
              <input
                name="adminEmail"
                type="email"
                value={form.adminEmail}
                onChange={(event) =>
                  updateForm("adminEmail", event.target.value)
                }
                onInvalid={handleFieldInvalid}
                required
              />
            </S.InputGroup>

            <S.InputGroup>
              <label>Senha do Admin*</label>
              <input
                name="adminPassword"
                type="password"
                minLength={6}
                value={form.adminPassword}
                onChange={(event) =>
                  updateForm("adminPassword", event.target.value)
                }
                onInvalid={handleFieldInvalid}
                required
              />
            </S.InputGroup>

            <S.InputGroup>
              <label>Confirmar Senha do Admin*</label>
              <input
                name="adminConfirmPassword"
                type="password"
                minLength={6}
                value={form.adminConfirmPassword}
                onChange={(event) =>
                  updateForm("adminConfirmPassword", event.target.value)
                }
                onInvalid={handleFieldInvalid}
                required
              />
            </S.InputGroup>
          </S.CreateGrid>

          <S.CreateActions>
            <S.CreateButton type="submit" disabled={isSaving}>
              <Building2 size={16} />
              {isSaving ? "Criando..." : "Criar restaurante e admin"}
            </S.CreateButton>
          </S.CreateActions>
        </S.CreateForm>
      </S.CreateSection>
    </SuperAdminShell>
  );
}

const BackButton = styled.button`
  border: 1px solid ${(props) => props.theme.border};
  background: ${(props) => props.theme.surface};
  color: ${(props) => props.theme.textDark};
  border-radius: 8px;
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  font-size: 0.82rem;
  font-weight: 700;
  padding: 0.5rem 0.72rem;
  cursor: pointer;
  margin-bottom: 1rem;

  &:hover {
    background: ${(props) => props.theme.surfaceAlt};
  }

  &:disabled {
    opacity: 0.6;
    cursor: wait;
  }
`;
