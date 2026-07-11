import { useMemo, useState } from "react";
import * as S from "../styles";

type SettingsForm = {
  deliveryFee: string;
  minimumOrder: string;
  whatsapp: string;
  pixProvider: string;
  pixKey: string;
  legalDocumentType: string;
  companyDocument: string;
  companyLegalName: string;
  companyTradeName: string;
  companyAddress: string;
  establishmentZipCode: string;
  establishmentStreet: string;
  establishmentNumber: string;
  establishmentComplement: string;
  establishmentDistrict: string;
  establishmentCityState: string;
  companyCnae: string;
  monthlyRevenue: string;
  ownerFullName: string;
  ownerCpf: string;
  ownerBirthDate: string;
  ownerEmail: string;
  ownerPhone: string;
  ownerAddress: string;
  bankName: string;
  bankCode: string;
  bankAccountType: string;
  bankBranch: string;
  bankAccount: string;
  bankHolderDocument: string;
  cardGateway: string;
  gatewayMerchantId: string;
  stripeSecretKey: string;
  stripeSecretKeyConfigured: boolean;
  mercadoPagoAccessToken: string;
  mercadoPagoAccessTokenConfigured: boolean;
  pagbankEmail: string;
  pagbankToken: string;
  pagbankTokenConfigured: boolean;
  pagbankEnvironment: string;
  ownerDocumentFileUrl: string;
  bankProofFileUrl: string;
  companyContractFileUrl: string;
};

type PixAndDeliverySettingsTabProps = {
  settingsForm: SettingsForm;
  isSavingSettings: boolean;
  isConnectingMercadoPago: boolean;
  onSubmitCardBankSettings: (event: React.FormEvent<HTMLFormElement>) => void;
  onConnectMercadoPago: () => Promise<void>;
  onFieldChange: (
    event: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>,
  ) => void;
};

type StepKey = "company" | "address" | "bank";

type ChecklistItem = {
  label: string;
  done: boolean;
  required?: boolean;
};

const fieldHelpStyle = {
  display: "block",
  marginTop: "0.4rem",
  opacity: 0.78,
  lineHeight: 1.35,
  fontSize: "0.8rem",
} as const;

const infoBoxStyle = {
  border: "1px solid rgba(37, 99, 235, 0.26)",
  background: "rgba(37, 99, 235, 0.08)",
  borderRadius: "10px",
  padding: "0.7rem 0.8rem",
  marginBottom: "0.9rem",
  display: "grid",
  gap: "0.35rem",
} as const;

function hasValue(value: string) {
  return String(value || "").trim().length > 0;
}

function onlyDigits(value: string) {
  return String(value || "").replace(/\D/g, "");
}

function isValidEmail(value: string) {
  const normalized = String(value || "").trim();
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized);
}

function isLikelyPixKey(value: string) {
  const normalized = String(value || "").trim();
  const digits = onlyDigits(normalized);

  if (!normalized) {
    return false;
  }

  const isEmail = isValidEmail(normalized);
  const isCpf = digits.length === 11;
  const isCnpj = digits.length === 14;
  const isPhone = digits.length >= 10 && digits.length <= 13;
  const isRandomKey = /^[a-zA-Z0-9\-]{32,36}$/.test(normalized);

  return isEmail || isCpf || isCnpj || isPhone || isRandomKey;
}

function renderChecklist(title: string, items: ChecklistItem[]) {
  const doneCount = items.filter((item) => item.done).length;

  return (
    <div
      style={{
        border: "1px solid rgba(148, 163, 184, 0.3)",
        borderRadius: 10,
        padding: "0.7rem 0.8rem",
        marginBottom: "0.95rem",
        background: "rgba(148, 163, 184, 0.08)",
        display: "grid",
        gap: "0.45rem",
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          gap: "0.5rem",
          flexWrap: "wrap",
        }}
      >
        <strong style={{ fontSize: "0.82rem", opacity: 0.9 }}>{title}</strong>
        <small style={{ opacity: 0.8 }}>
          {doneCount}/{items.length} itens preenchidos
        </small>
      </div>

      <div style={{ display: "grid", gap: "0.35rem" }}>
        {items.map((item) => {
          const isRequired = item.required !== false;

          return (
            <div
              key={item.label}
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                gap: "0.55rem",
                borderRadius: 8,
                padding: "0.35rem 0.5rem",
                background: item.done
                  ? "rgba(22, 163, 74, 0.12)"
                  : "rgba(249, 115, 22, 0.1)",
              }}
            >
              <span style={{ fontSize: "0.8rem", fontWeight: 600 }}>
                {item.label}
                {!isRequired ? " (opcional)" : ""}
              </span>
              <span
                style={{
                  fontSize: "0.75rem",
                  fontWeight: 700,
                  color: item.done ? "#166534" : "#9a3412",
                }}
              >
                {item.done
                  ? "Preenchido"
                  : isRequired
                    ? "Falta preencher"
                    : "Opcional"}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default function PixAndDeliverySettingsTab({
  settingsForm,
  isSavingSettings,
  isConnectingMercadoPago,
  onSubmitCardBankSettings,
  onConnectMercadoPago,
  onFieldChange,
}: PixAndDeliverySettingsTabProps) {
  const kybSteps: Array<{ key: StepKey; label: string }> = [
    { key: "company", label: "Empresa/Proprietario" },
    { key: "address", label: "Endereco" },
    { key: "bank", label: "Repasse" },
  ];

  const [kybStepIndex, setKybStepIndex] = useState(0);
  const [kybStepError, setKybStepError] = useState("");

  const currentKybStep = kybSteps[kybStepIndex]?.key || "company";
  const isFirstKybStep = kybStepIndex === 0;
  const isLastKybStep = kybStepIndex === kybSteps.length - 1;
  const kybProgressPercent = Math.round(
    ((kybStepIndex + 1) / kybSteps.length) * 100,
  );

  const kybFieldErrors = useMemo(() => {
    const errors: Record<string, string> = {};

    const legalDocumentType = String(settingsForm.legalDocumentType || "")
      .trim()
      .toUpperCase();
    const companyDocument = onlyDigits(settingsForm.companyDocument || "");
    const ownerPhone = onlyDigits(settingsForm.ownerPhone || "");
    const zipCodeDigits = onlyDigits(settingsForm.establishmentZipCode || "");
    const bankBranchDigits = onlyDigits(settingsForm.bankBranch || "");
    const bankAccountDigits = onlyDigits(settingsForm.bankAccount || "");
    const bankAccountType = String(settingsForm.bankAccountType || "")
      .trim()
      .toUpperCase();

    if (!legalDocumentType) {
      errors.legalDocumentType = "Selecione CPF ou CNPJ para continuar.";
    }

    if (!companyDocument) {
      errors.companyDocument = "Informe o CPF ou CNPJ.";
    } else if (legalDocumentType === "CPF" && companyDocument.length !== 11) {
      errors.companyDocument = "CPF deve ter 11 digitos.";
    } else if (legalDocumentType === "CNPJ" && companyDocument.length !== 14) {
      errors.companyDocument = "CNPJ deve ter 14 digitos.";
    }

    if (!String(settingsForm.companyLegalName || "").trim()) {
      errors.companyLegalName = "Informe a razao social/nome completo.";
    } else if (String(settingsForm.companyLegalName || "").trim().length < 3) {
      errors.companyLegalName =
        "Nome muito curto. Informe o nome completo oficial.";
    }

    if (!String(settingsForm.companyTradeName || "").trim()) {
      errors.companyTradeName = "Informe o nome fantasia.";
    } else if (String(settingsForm.companyTradeName || "").trim().length < 2) {
      errors.companyTradeName = "Nome fantasia muito curto.";
    }

    if (!String(settingsForm.ownerEmail || "").trim()) {
      errors.ownerEmail = "Informe o e-mail comercial.";
    } else if (!isValidEmail(settingsForm.ownerEmail || "")) {
      errors.ownerEmail = "E-mail comercial inválido.";
    }

    if (!ownerPhone) {
      errors.ownerPhone = "Informe o telefone/WhatsApp com DDD.";
    } else if (ownerPhone.length < 10 || ownerPhone.length > 13) {
      errors.ownerPhone =
        "Telefone inválido. Use DDD + número (10 a 13 dígitos).";
    }

    if (!String(settingsForm.establishmentZipCode || "").trim()) {
      errors.establishmentZipCode = "Informe o CEP.";
    } else if (zipCodeDigits.length !== 8) {
      errors.establishmentZipCode =
        "CEP inválido. Use 8 dígitos (ex: 60000000).";
    }

    if (!String(settingsForm.establishmentStreet || "").trim()) {
      errors.establishmentStreet = "Informe o logradouro.";
    }

    if (!String(settingsForm.establishmentNumber || "").trim()) {
      errors.establishmentNumber = "Informe o numero.";
    }

    if (!String(settingsForm.establishmentDistrict || "").trim()) {
      errors.establishmentDistrict = "Informe o bairro.";
    }

    if (!String(settingsForm.establishmentCityState || "").trim()) {
      errors.establishmentCityState = "Informe cidade/estado.";
    } else if (
      !String(settingsForm.establishmentCityState || "").includes("/")
    ) {
      errors.establishmentCityState =
        "Use o formato Cidade/UF (ex: Fortaleza/CE).";
    }

    if (!String(settingsForm.bankName || "").trim()) {
      errors.bankName = "Informe o banco.";
    }

    if (!String(settingsForm.bankBranch || "").trim()) {
      errors.bankBranch = "Informe a agencia.";
    } else if (bankBranchDigits.length < 3) {
      errors.bankBranch = "Agência inválida. Informe ao menos 3 dígitos.";
    }

    if (!String(settingsForm.bankAccount || "").trim()) {
      errors.bankAccount = "Informe o numero da conta.";
    } else if (bankAccountDigits.length < 4) {
      errors.bankAccount =
        "Conta inválida. Informe conta com dígito verificador.";
    }

    if (!bankAccountType) {
      errors.bankAccountType = "Selecione o tipo de conta.";
    } else if (!["CORRENTE", "POUPANCA"].includes(bankAccountType)) {
      errors.bankAccountType = "Tipo de conta inválido.";
    }

    if (!String(settingsForm.pixKey || "").trim()) {
      errors.pixKey = "Informe a chave Pix.";
    } else if (!isLikelyPixKey(settingsForm.pixKey)) {
      errors.pixKey =
        "Chave Pix inválida. Use CPF, CNPJ, celular, e-mail ou chave aleatória.";
    }

    return errors;
  }, [settingsForm]);

  function getFieldStyle(fieldName: string) {
    if (!kybFieldErrors[fieldName]) {
      return undefined;
    }

    return {
      border: "1px solid #ef4444",
      boxShadow: "0 0 0 1px rgba(239, 68, 68, 0.18)",
    } as const;
  }

  function renderFieldError(fieldName: string) {
    const error = kybFieldErrors[fieldName];
    if (!error) {
      return null;
    }

    return (
      <small
        style={{
          ...fieldHelpStyle,
          color: "#dc2626",
          fontWeight: 700,
        }}
      >
        {error}
      </small>
    );
  }

  function getKybStepError(stepKey: StepKey) {
    if (stepKey === "company") {
      return (
        kybFieldErrors.legalDocumentType ||
        kybFieldErrors.companyDocument ||
        kybFieldErrors.companyLegalName ||
        kybFieldErrors.companyTradeName ||
        kybFieldErrors.ownerEmail ||
        kybFieldErrors.ownerPhone ||
        ""
      );
    }

    if (stepKey === "address") {
      return (
        kybFieldErrors.establishmentZipCode ||
        kybFieldErrors.establishmentStreet ||
        kybFieldErrors.establishmentNumber ||
        kybFieldErrors.establishmentDistrict ||
        kybFieldErrors.establishmentCityState ||
        ""
      );
    }

    return (
      kybFieldErrors.bankName ||
      kybFieldErrors.bankBranch ||
      kybFieldErrors.bankAccount ||
      kybFieldErrors.bankAccountType ||
      kybFieldErrors.pixKey ||
      ""
    );
  }

  function validateCurrentKybStep() {
    return getKybStepError(currentKybStep);
  }

  function goToNextKybStep() {
    const nextError = validateCurrentKybStep();
    if (nextError) {
      setKybStepError(nextError);
      return;
    }

    setKybStepError("");
    setKybStepIndex((prev) => Math.min(prev + 1, kybSteps.length - 1));
  }

  function goToPreviousKybStep() {
    setKybStepError("");
    setKybStepIndex((prev) => Math.max(prev - 1, 0));
  }

  function handleSubmitCardBankSettings(
    event: React.FormEvent<HTMLFormElement>,
  ) {
    const firstInvalidIndex = kybSteps.findIndex((step) =>
      Boolean(getKybStepError(step.key)),
    );

    if (firstInvalidIndex !== -1) {
      event.preventDefault();
      setKybStepIndex(firstInvalidIndex);
      setKybStepError(getKybStepError(kybSteps[firstInvalidIndex].key));
      return;
    }

    setKybStepError("");
    onSubmitCardBankSettings(event);
  }

  const companyChecklist: ChecklistItem[] = [
    { label: "Tipo de conta", done: hasValue(settingsForm.legalDocumentType) },
    { label: "CPF ou CNPJ", done: hasValue(settingsForm.companyDocument) },
    {
      label: "Razao social / nome completo",
      done: hasValue(settingsForm.companyLegalName),
    },
    { label: "Nome fantasia", done: hasValue(settingsForm.companyTradeName) },
    { label: "E-mail comercial", done: hasValue(settingsForm.ownerEmail) },
    { label: "Telefone/WhatsApp", done: hasValue(settingsForm.ownerPhone) },
  ];

  const addressChecklist: ChecklistItem[] = [
    { label: "CEP", done: hasValue(settingsForm.establishmentZipCode) },
    { label: "Logradouro", done: hasValue(settingsForm.establishmentStreet) },
    { label: "Numero", done: hasValue(settingsForm.establishmentNumber) },
    {
      label: "Complemento (opcional)",
      done: hasValue(settingsForm.establishmentComplement),
      required: false,
    },
    { label: "Bairro", done: hasValue(settingsForm.establishmentDistrict) },
    {
      label: "Cidade / Estado",
      done: hasValue(settingsForm.establishmentCityState),
    },
  ];

  const bankChecklist: ChecklistItem[] = [
    { label: "Banco", done: hasValue(settingsForm.bankName) },
    { label: "Agencia", done: hasValue(settingsForm.bankBranch) },
    { label: "Numero da conta", done: hasValue(settingsForm.bankAccount) },
    { label: "Tipo de conta", done: hasValue(settingsForm.bankAccountType) },
    { label: "Chave Pix", done: hasValue(settingsForm.pixKey) },
  ];

  const finalReviewItems: ChecklistItem[] = [
    ...companyChecklist,
    ...addressChecklist,
    ...bankChecklist,
  ];

  const finalReviewRequiredMissingCount = finalReviewItems.filter(
    (item) => item.required !== false && !item.done,
  ).length;
  const finalReviewReady = finalReviewRequiredMissingCount === 0;

  return (
    <>
      <S.FormCard>
        <S.PageHeader>
          <h2>Conexao com Mercado Pago</h2>
          <p>
            Autorize sua conta para o sistema gerar cobrancas PIX e Cartao em
            seu nome.
          </p>
        </S.PageHeader>

        <div
          style={{
            border: "1px solid rgba(148, 163, 184, 0.3)",
            borderRadius: 12,
            padding: "0.95rem",
            background: "rgba(248, 250, 252, 0.7)",
            display: "grid",
            gap: "0.7rem",
          }}
        >
          <small style={{ opacity: 0.85 }}>
            1) Clique no botao para abrir a autorizacao oficial do Mercado Pago.
          </small>
          <small style={{ opacity: 0.85 }}>
            2) Faca login e clique em "Autorizar".
          </small>
          <small style={{ opacity: 0.85 }}>
            3) Voce sera redirecionado de volta e a conexao ficara salva
            automaticamente.
          </small>

          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "0.6rem",
              flexWrap: "wrap",
            }}
          >
            <button
              type="button"
              onClick={onConnectMercadoPago}
              disabled={isConnectingMercadoPago}
              style={{
                minHeight: 42,
                borderRadius: 10,
                border: "1px solid rgba(30, 64, 175, 0.42)",
                background: "linear-gradient(135deg, #2563eb, #1d4ed8)",
                color: "#ffffff",
                fontWeight: 800,
                padding: "0 1rem",
                cursor: isConnectingMercadoPago ? "not-allowed" : "pointer",
                opacity: isConnectingMercadoPago ? 0.75 : 1,
              }}
            >
              {isConnectingMercadoPago
                ? "Abrindo autorizacao..."
                : "Conectar com o Mercado Pago"}
            </button>

            <small
              style={{
                fontWeight: 700,
                color: settingsForm.mercadoPagoAccessTokenConfigured
                  ? "#166534"
                  : "#9a3412",
              }}
            >
              Status:{" "}
              {settingsForm.mercadoPagoAccessTokenConfigured
                ? "Conectado"
                : "Nao conectado"}
            </small>
          </div>
        </div>
      </S.FormCard>

      <S.FormCard style={{ marginTop: "1rem" }}>
        <S.PageHeader>
          <h2>Formulario de Onboarding (Asaas)</h2>
          <p>Preencha somente os dados solicitados para cadastro no gateway.</p>
        </S.PageHeader>

        <form onSubmit={handleSubmitCardBankSettings}>
          <div
            style={{
              display: "grid",
              gap: "0.8rem",
              marginBottom: "1rem",
              border: "1px solid rgba(148, 163, 184, 0.28)",
              borderRadius: "12px",
              padding: "0.9rem",
            }}
          >
            <div
              style={{
                display: "grid",
                gridTemplateColumns: `repeat(${kybSteps.length}, minmax(0, 1fr))`,
                gap: "0.45rem",
              }}
            >
              {kybSteps.map((step, index) => {
                const isActive = index === kybStepIndex;

                return (
                  <button
                    key={step.key}
                    type="button"
                    onClick={() => setKybStepIndex(index)}
                    style={{
                      borderRadius: "10px",
                      border: isActive
                        ? "1px solid rgba(30, 64, 175, 0.45)"
                        : "1px solid rgba(148, 163, 184, 0.35)",
                      background: isActive
                        ? "rgba(37, 99, 235, 0.12)"
                        : "transparent",
                      padding: "0.55rem 0.45rem",
                      fontWeight: 700,
                      cursor: "pointer",
                    }}
                  >
                    {index + 1}. {step.label}
                  </button>
                );
              })}
            </div>

            <small style={{ opacity: 0.8 }}>
              Progresso do onboarding: {kybProgressPercent}%
            </small>

            <div
              aria-hidden="true"
              style={{
                width: "100%",
                height: 8,
                borderRadius: 999,
                background: "rgba(148, 163, 184, 0.22)",
                overflow: "hidden",
              }}
            >
              <div
                style={{
                  height: "100%",
                  width: `${kybProgressPercent}%`,
                  borderRadius: 999,
                  background:
                    "linear-gradient(90deg, rgba(37, 99, 235, 0.9), rgba(34, 197, 94, 0.88))",
                }}
              />
            </div>

            {kybStepError ? (
              <small style={{ color: "#dc2626", fontWeight: 600 }}>
                {kybStepError}
              </small>
            ) : null}
          </div>

          {currentKybStep === "company" ? (
            <>
              <h3 style={{ marginBottom: "0.75rem" }}>
                1. Dados da Empresa / Proprietario
              </h3>
              <div style={infoBoxStyle}>
                <small>
                  Tipo de Conta: Pessoa Física (CPF) ou Pessoa Jurídica (CNPJ)
                </small>
                <small>
                  Razão Social / Nome Completo: nome oficial do documento
                </small>
                <small>
                  Nome Fantasia: como o restaurante aparece no extrato
                </small>
                <small>CPF ou CNPJ: apenas números</small>
                <small>E-mail Comercial: onde receberá notificações</small>
                <small>Telefone/WhatsApp: com DDD</small>
                <small>
                  Dica: todos os dados devem bater com o cadastro bancário para
                  não travar aprovação.
                </small>
              </div>

              {renderChecklist(
                "Checklist da etapa Empresa/Proprietario",
                companyChecklist,
              )}

              <S.FormRow>
                <S.FormGroup>
                  <label>Tipo de Conta</label>
                  <select
                    name="legalDocumentType"
                    value={settingsForm.legalDocumentType}
                    onChange={onFieldChange}
                    style={getFieldStyle("legalDocumentType")}
                  >
                    <option value="">Selecione</option>
                    <option value="CPF">Pessoa Fisica (CPF)</option>
                    <option value="CNPJ">Pessoa Juridica (CNPJ)</option>
                  </select>
                  {renderFieldError("legalDocumentType")}
                </S.FormGroup>

                <S.FormGroup>
                  <label>CPF ou CNPJ</label>
                  <input
                    type="text"
                    name="companyDocument"
                    inputMode="numeric"
                    maxLength={18}
                    placeholder={
                      settingsForm.legalDocumentType === "CNPJ"
                        ? "Ex: 12345678000199"
                        : "Ex: 12345678901"
                    }
                    value={settingsForm.companyDocument}
                    style={getFieldStyle("companyDocument")}
                    onChange={onFieldChange}
                  />
                  {renderFieldError("companyDocument")}
                </S.FormGroup>
              </S.FormRow>

              <S.FormRow style={{ marginTop: "1rem" }}>
                <S.FormGroup>
                  <label>Razao Social / Nome Completo</label>
                  <input
                    type="text"
                    name="companyLegalName"
                    placeholder="Ex: Pizzaria Sabor da Vila LTDA"
                    value={settingsForm.companyLegalName}
                    style={getFieldStyle("companyLegalName")}
                    onChange={onFieldChange}
                  />
                  {renderFieldError("companyLegalName")}
                </S.FormGroup>

                <S.FormGroup>
                  <label>Nome Fantasia</label>
                  <input
                    type="text"
                    name="companyTradeName"
                    placeholder="Ex: Pizzaria Sabor da Vila"
                    value={settingsForm.companyTradeName}
                    style={getFieldStyle("companyTradeName")}
                    onChange={onFieldChange}
                  />
                  {renderFieldError("companyTradeName")}
                </S.FormGroup>
              </S.FormRow>

              <S.FormRow style={{ marginTop: "1rem" }}>
                <S.FormGroup>
                  <label>E-mail Comercial</label>
                  <input
                    type="email"
                    name="ownerEmail"
                    placeholder="Ex: financeiro@seudominio.com"
                    value={settingsForm.ownerEmail}
                    style={getFieldStyle("ownerEmail")}
                    onChange={onFieldChange}
                  />
                  {renderFieldError("ownerEmail")}
                </S.FormGroup>

                <S.FormGroup>
                  <label>Telefone/WhatsApp</label>
                  <input
                    type="text"
                    name="ownerPhone"
                    maxLength={16}
                    placeholder="Ex: (85) 99999-8888"
                    value={settingsForm.ownerPhone}
                    style={getFieldStyle("ownerPhone")}
                    onChange={onFieldChange}
                  />
                  {renderFieldError("ownerPhone")}
                </S.FormGroup>
              </S.FormRow>
            </>
          ) : null}

          {currentKybStep === "address" ? (
            <>
              <h3 style={{ marginBottom: "0.75rem" }}>
                2. Endereco do Estabelecimento
              </h3>
              <div style={infoBoxStyle}>
                <small>CEP</small>
                <small>Logradouro (Rua, Avenida, etc.)</small>
                <small>Número</small>
                <small>Complemento (opcional)</small>
                <small>Bairro</small>
                <small>Cidade / Estado</small>
                <small>
                  Exemplo cidade/estado: Fortaleza/CE. Isso evita erro na
                  análise.
                </small>
              </div>

              {renderChecklist("Checklist da etapa Endereco", addressChecklist)}

              <S.FormRow>
                <S.FormGroup>
                  <label>CEP</label>
                  <input
                    type="text"
                    name="establishmentZipCode"
                    inputMode="numeric"
                    maxLength={9}
                    placeholder="Ex: 60000-000"
                    value={settingsForm.establishmentZipCode}
                    style={getFieldStyle("establishmentZipCode")}
                    onChange={onFieldChange}
                  />
                  {renderFieldError("establishmentZipCode")}
                </S.FormGroup>

                <S.FormGroup>
                  <label>Logradouro</label>
                  <input
                    type="text"
                    name="establishmentStreet"
                    placeholder="Ex: Rua das Flores"
                    value={settingsForm.establishmentStreet}
                    style={getFieldStyle("establishmentStreet")}
                    onChange={onFieldChange}
                  />
                  {renderFieldError("establishmentStreet")}
                </S.FormGroup>
              </S.FormRow>

              <S.FormRow style={{ marginTop: "1rem" }}>
                <S.FormGroup>
                  <label>Numero</label>
                  <input
                    type="text"
                    name="establishmentNumber"
                    placeholder="Ex: 123"
                    value={settingsForm.establishmentNumber}
                    style={getFieldStyle("establishmentNumber")}
                    onChange={onFieldChange}
                  />
                  {renderFieldError("establishmentNumber")}
                </S.FormGroup>

                <S.FormGroup>
                  <label>Complemento (opcional)</label>
                  <input
                    type="text"
                    name="establishmentComplement"
                    placeholder="Ex: Sala 02 / Loja B"
                    value={settingsForm.establishmentComplement}
                    onChange={onFieldChange}
                  />
                </S.FormGroup>
              </S.FormRow>

              <S.FormRow style={{ marginTop: "1rem" }}>
                <S.FormGroup>
                  <label>Bairro</label>
                  <input
                    type="text"
                    name="establishmentDistrict"
                    placeholder="Ex: Centro"
                    value={settingsForm.establishmentDistrict}
                    style={getFieldStyle("establishmentDistrict")}
                    onChange={onFieldChange}
                  />
                  {renderFieldError("establishmentDistrict")}
                </S.FormGroup>

                <S.FormGroup>
                  <label>Cidade / Estado</label>
                  <input
                    type="text"
                    name="establishmentCityState"
                    placeholder="Ex: Fortaleza/CE"
                    value={settingsForm.establishmentCityState}
                    style={getFieldStyle("establishmentCityState")}
                    onChange={onFieldChange}
                  />
                  {renderFieldError("establishmentCityState")}
                </S.FormGroup>
              </S.FormRow>
            </>
          ) : null}

          {currentKybStep === "bank" ? (
            <>
              <h3 style={{ marginBottom: "0.75rem" }}>
                3. Dados de Repasse Financeiro
              </h3>
              <div style={infoBoxStyle}>
                <small>Banco</small>
                <small>Agencia (sem dígito)</small>
                <small>Número da Conta (com dígito)</small>
                <small>Tipo de Conta: Corrente ou Poupança</small>
                <small>Chave Pix: vinculada à conta de repasse</small>
                <small>
                  Atenção: conta e chave Pix devem ser da mesma titularidade da
                  empresa/proprietário cadastrado.
                </small>
              </div>

              {renderChecklist("Checklist da etapa Repasse", bankChecklist)}

              <S.FormRow>
                <S.FormGroup>
                  <label>Banco</label>
                  <input
                    type="text"
                    name="bankName"
                    placeholder="Ex: Banco do Brasil"
                    value={settingsForm.bankName}
                    style={getFieldStyle("bankName")}
                    onChange={onFieldChange}
                  />
                  {renderFieldError("bankName")}
                </S.FormGroup>

                <S.FormGroup>
                  <label>Agencia</label>
                  <input
                    type="text"
                    name="bankBranch"
                    inputMode="numeric"
                    maxLength={9}
                    placeholder="Ex: 1234"
                    value={settingsForm.bankBranch}
                    style={getFieldStyle("bankBranch")}
                    onChange={onFieldChange}
                  />
                  {renderFieldError("bankBranch")}
                </S.FormGroup>
              </S.FormRow>

              <S.FormRow style={{ marginTop: "1rem" }}>
                <S.FormGroup>
                  <label>Numero da Conta</label>
                  <input
                    type="text"
                    name="bankAccount"
                    inputMode="numeric"
                    maxLength={14}
                    placeholder="Ex: 987654-3"
                    value={settingsForm.bankAccount}
                    style={getFieldStyle("bankAccount")}
                    onChange={onFieldChange}
                  />
                  {renderFieldError("bankAccount")}
                </S.FormGroup>

                <S.FormGroup>
                  <label>Tipo de Conta</label>
                  <select
                    name="bankAccountType"
                    value={settingsForm.bankAccountType}
                    style={getFieldStyle("bankAccountType")}
                    onChange={onFieldChange}
                  >
                    <option value="">Selecione</option>
                    <option value="CORRENTE">Conta Corrente</option>
                    <option value="POUPANCA">Conta Poupanca</option>
                  </select>
                  {renderFieldError("bankAccountType")}
                </S.FormGroup>
              </S.FormRow>

              <S.FormRow style={{ marginTop: "1rem" }}>
                <S.FormGroup>
                  <label>Chave Pix</label>
                  <input
                    type="text"
                    name="pixKey"
                    placeholder="Ex: financeiro@seudominio.com | CPF 12345678909 | Celular +5511999999999"
                    value={settingsForm.pixKey}
                    style={getFieldStyle("pixKey")}
                    onChange={onFieldChange}
                  />
                  {renderFieldError("pixKey")}
                </S.FormGroup>
              </S.FormRow>

              <div
                style={{
                  border: finalReviewReady
                    ? "1px solid rgba(22, 163, 74, 0.4)"
                    : "1px solid rgba(249, 115, 22, 0.45)",
                  borderRadius: 10,
                  padding: "0.75rem 0.8rem",
                  marginTop: "0.95rem",
                  marginBottom: "0.35rem",
                  background: finalReviewReady
                    ? "rgba(22, 163, 74, 0.1)"
                    : "rgba(249, 115, 22, 0.11)",
                  display: "grid",
                  gap: "0.5rem",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    gap: "0.5rem",
                    flexWrap: "wrap",
                  }}
                >
                  <strong style={{ fontSize: "0.84rem" }}>
                    Resumo final antes de salvar
                  </strong>
                  <small
                    style={{
                      fontWeight: 700,
                      color: finalReviewReady ? "#166534" : "#9a3412",
                    }}
                  >
                    {finalReviewReady
                      ? "Pronto para salvar"
                      : `Faltam ${finalReviewRequiredMissingCount} campos obrigatorios`}
                  </small>
                </div>

                <div style={{ display: "grid", gap: "0.35rem" }}>
                  {finalReviewItems.map((item) => {
                    const isRequired = item.required !== false;

                    return (
                      <div
                        key={item.label}
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                          gap: "0.55rem",
                          borderRadius: 8,
                          padding: "0.35rem 0.5rem",
                          background: item.done
                            ? "rgba(22, 163, 74, 0.12)"
                            : "rgba(249, 115, 22, 0.1)",
                        }}
                      >
                        <span style={{ fontSize: "0.8rem", fontWeight: 600 }}>
                          {item.label}
                          {!isRequired ? " (opcional)" : ""}
                        </span>
                        <span
                          style={{
                            fontSize: "0.75rem",
                            fontWeight: 700,
                            color: item.done ? "#166534" : "#9a3412",
                          }}
                        >
                          {item.done
                            ? "Preenchido"
                            : isRequired
                              ? "Falta preencher"
                              : "Opcional"}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </>
          ) : null}

          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              gap: "0.75rem",
              marginTop: "1.25rem",
              flexWrap: "wrap",
            }}
          >
            <button
              type="button"
              onClick={goToPreviousKybStep}
              disabled={isFirstKybStep}
              style={{
                minHeight: 42,
                padding: "0 1rem",
                borderRadius: 10,
                border: "1px solid rgba(148, 163, 184, 0.45)",
                background: "transparent",
                cursor: isFirstKybStep ? "not-allowed" : "pointer",
                opacity: isFirstKybStep ? 0.55 : 1,
                fontWeight: 700,
              }}
            >
              Voltar
            </button>

            {!isLastKybStep ? (
              <button
                type="button"
                onClick={goToNextKybStep}
                style={{
                  minHeight: 42,
                  padding: "0 1rem",
                  borderRadius: 10,
                  border: "1px solid rgba(30, 64, 175, 0.45)",
                  background: "rgba(37, 99, 235, 0.14)",
                  cursor: "pointer",
                  fontWeight: 700,
                }}
              >
                Proximo
              </button>
            ) : (
              <S.SubmitBtn type="submit" disabled={isSavingSettings}>
                {isSavingSettings ? "Salvando..." : "Salvar Cartao/Banco"}
              </S.SubmitBtn>
            )}
          </div>
        </form>
      </S.FormCard>
    </>
  );
}
