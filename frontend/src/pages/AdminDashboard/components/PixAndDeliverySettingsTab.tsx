import { lazy, Suspense, useState } from "react";
import * as S from "../styles";

const QRCode = lazy(() => import("react-qr-code"));

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
  isPixKeyInvalid: boolean;
  hasPixKey: boolean;
  pixKeyTypeLabel: string;
  pixPreviewPayload: string;
  isDarkMode: boolean;
  onSubmitPixSettings: (event: React.FormEvent<HTMLFormElement>) => void;
  onSubmitCardBankSettings: (event: React.FormEvent<HTMLFormElement>) => void;
  onFieldChange: (
    event: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>,
  ) => void;
};

export default function PixAndDeliverySettingsTab({
  settingsForm,
  isSavingSettings,
  isPixKeyInvalid,
  hasPixKey,
  pixKeyTypeLabel,
  pixPreviewPayload,
  isDarkMode,
  onSubmitPixSettings,
  onSubmitCardBankSettings,
  onFieldChange,
}: PixAndDeliverySettingsTabProps) {
  const kybSteps = [
    { key: "company", label: "Empresa" },
    { key: "owner", label: "Dono" },
    { key: "bank", label: "Banco" },
    { key: "documents", label: "Documentos" },
  ] as const;
  const [kybStepIndex, setKybStepIndex] = useState(0);
  const [kybStepError, setKybStepError] = useState("");

  const isFirstKybStep = kybStepIndex === 0;
  const isLastKybStep = kybStepIndex === kybSteps.length - 1;
  const currentKybStep = kybSteps[kybStepIndex]?.key || "company";
  const kybProgressPercent = Math.round(
    ((kybStepIndex + 1) / kybSteps.length) * 100,
  );
  const bankHolderDocumentDigits = onlyDigits(
    settingsForm.bankHolderDocument || "",
  );
  const bankHolderDocumentDetectedType =
    bankHolderDocumentDigits.length === 0
      ? ""
      : bankHolderDocumentDigits.length > 11
        ? "CNPJ"
        : "CPF";
  const bankHolderDocumentPlaceholder =
    bankHolderDocumentDetectedType === "CNPJ"
      ? "Ex: 12.345.678/0001-90"
      : "Ex: 123.456.789-00";
  const fieldHelpStyle = {
    display: "block",
    marginTop: "0.4rem",
    opacity: 0.78,
    lineHeight: 1.35,
    fontSize: "0.8rem",
  } as const;

  function hasValue(value: string) {
    return String(value || "").trim().length > 0;
  }

  function onlyDigits(value: string) {
    return String(value || "").replace(/\D/g, "");
  }

  function isValidEmail(value: string) {
    const normalized = String(value || "").trim();
    if (!normalized) {
      return false;
    }

    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized);
  }

  function getKybFieldErrors() {
    const errors: Record<string, string> = {};

    const legalDocumentType = String(settingsForm.legalDocumentType || "")
      .trim()
      .toUpperCase();
    const companyDocument = onlyDigits(settingsForm.companyDocument || "");
    const ownerCpf = onlyDigits(settingsForm.ownerCpf || "");
    const bankCode = onlyDigits(settingsForm.bankCode || "");
    const bankBranch = String(settingsForm.bankBranch || "").trim();
    const bankAccount = String(settingsForm.bankAccount || "").trim();
    const bankHolderDocument = onlyDigits(
      settingsForm.bankHolderDocument || "",
    );
    const cardGateway = String(settingsForm.cardGateway || "")
      .trim()
      .toUpperCase();
    const stripeSecretKey = String(settingsForm.stripeSecretKey || "").trim();
    const mercadoPagoAccessToken = String(
      settingsForm.mercadoPagoAccessToken || "",
    ).trim();
    const pagbankEmail = String(settingsForm.pagbankEmail || "").trim();
    const pagbankToken = String(settingsForm.pagbankToken || "").trim();

    if (!legalDocumentType) {
      errors.legalDocumentType = "Selecione CPF ou CNPJ para continuar.";
    }

    if (!companyDocument) {
      errors.companyDocument = "Informe o documento da empresa para continuar.";
    } else if (legalDocumentType === "CPF" && companyDocument.length !== 11) {
      errors.companyDocument = "CPF da empresa/autonomo deve ter 11 digitos.";
    } else if (legalDocumentType === "CNPJ" && companyDocument.length !== 14) {
      errors.companyDocument =
        "CNPJ da empresa deve ter 14 digitos (somente numeros).";
    }

    if (!String(settingsForm.ownerFullName || "").trim()) {
      errors.ownerFullName = "Informe o nome do representante para continuar.";
    }

    if (!ownerCpf) {
      errors.ownerCpf = "Informe o CPF do representante para continuar.";
    } else if (ownerCpf.length !== 11) {
      errors.ownerCpf = "CPF do representante deve ter 11 digitos.";
    }

    if (!String(settingsForm.bankName || "").trim()) {
      errors.bankName = "Informe o banco para continuar.";
    }

    if (!bankCode) {
      errors.bankCode = "Informe o codigo do banco (ex: 001).";
    } else if (bankCode.length < 3 || bankCode.length > 8) {
      errors.bankCode =
        "Codigo do banco invalido. Use apenas numeros (3 a 8 digitos).";
    }

    if (!bankBranch) {
      errors.bankBranch = "Informe a agencia para continuar.";
    } else if (onlyDigits(bankBranch).length < 3) {
      errors.bankBranch =
        "Agencia invalida. Digite ao menos 3 numeros da agencia.";
    }

    if (!bankAccount) {
      errors.bankAccount = "Informe a conta para continuar.";
    } else if (onlyDigits(bankAccount).length < 4) {
      errors.bankAccount =
        "Conta invalida. Digite conta e digito conforme seu banco.";
    }

    if (bankHolderDocument) {
      if (![11, 14].includes(bankHolderDocument.length)) {
        errors.bankHolderDocument =
          "Documento do titular da conta deve ter 11 (CPF) ou 14 (CNPJ) digitos.";
      } else if (companyDocument && companyDocument !== bankHolderDocument) {
        errors.bankHolderDocument =
          "Documento do titular da conta deve ser igual ao CPF/CNPJ da empresa.";
      }
    }

    if (cardGateway === "STRIPE") {
      const hasStripeKey =
        stripeSecretKey.length > 0 ||
        Boolean(settingsForm.stripeSecretKeyConfigured);
      if (!hasStripeKey) {
        errors.stripeSecretKey =
          "Cole a chave secreta Stripe (sk_...) para ativar pagamento por cartao.";
      } else if (stripeSecretKey && !stripeSecretKey.startsWith("sk_")) {
        errors.stripeSecretKey =
          "Chave Stripe invalida. Ela normalmente comeca com sk_.";
      }
    }

    if (cardGateway === "MERCADO_PAGO") {
      const hasMercadoToken =
        mercadoPagoAccessToken.length > 0 ||
        Boolean(settingsForm.mercadoPagoAccessTokenConfigured);
      if (!hasMercadoToken) {
        errors.mercadoPagoAccessToken =
          "Cole o Access Token do Mercado Pago (APP_USR-...) para ativar o cartao.";
      } else if (
        mercadoPagoAccessToken &&
        !/^APP_USR-|^TEST-/.test(mercadoPagoAccessToken)
      ) {
        errors.mercadoPagoAccessToken =
          "Token Mercado Pago invalido. Geralmente comeca com APP_USR-.";
      }
    }

    if (cardGateway === "PAGBANK") {
      if (!pagbankEmail) {
        errors.pagbankEmail = "Informe o e-mail da conta PagBank vendedora.";
      } else if (!isValidEmail(pagbankEmail)) {
        errors.pagbankEmail =
          "E-mail PagBank invalido. Exemplo: financeiro@loja.com.";
      }

      const hasPagBankToken =
        pagbankToken.length > 0 || Boolean(settingsForm.pagbankTokenConfigured);
      if (!hasPagBankToken) {
        errors.pagbankToken =
          "Informe o token de integracao PagBank para ativar o cartao.";
      } else if (pagbankToken && pagbankToken.length < 10) {
        errors.pagbankToken =
          "Token PagBank parece incompleto. Copie novamente do painel do PagBank.";
      }
    }

    return errors;
  }

  const kybFieldErrors = getKybFieldErrors();

  function getFieldStyle(fieldName: string) {
    if (!kybFieldErrors[fieldName]) {
      return undefined;
    }

    return {
      border: "1px solid #ef4444",
      boxShadow: "0 0 0 1px rgba(239, 68, 68, 0.18)",
    } as const;
  }

  function renderGatewayCredentialGuide() {
    const selectedGateway = String(settingsForm.cardGateway || "")
      .trim()
      .toUpperCase();
    const integratedGateways = new Set(["STRIPE", "MERCADO_PAGO", "PAGBANK"]);
    const isIntegratedGateway = integratedGateways.has(selectedGateway);
    const hasGatewayMerchantId =
      String(settingsForm.gatewayMerchantId || "").trim().length > 0;
    const hasStripeSecretKey =
      String(settingsForm.stripeSecretKey || "").trim().length > 0 ||
      Boolean(settingsForm.stripeSecretKeyConfigured);
    const hasMercadoPagoAccessToken =
      String(settingsForm.mercadoPagoAccessToken || "").trim().length > 0 ||
      Boolean(settingsForm.mercadoPagoAccessTokenConfigured);
    const hasPagBankEmail =
      String(settingsForm.pagbankEmail || "").trim().length > 0;
    const hasPagBankToken =
      String(settingsForm.pagbankToken || "").trim().length > 0 ||
      Boolean(settingsForm.pagbankTokenConfigured);

    if (!selectedGateway) {
      return null;
    }

    const baseStyle = {
      border: "1px solid rgba(59, 130, 246, 0.28)",
      background: "rgba(59, 130, 246, 0.08)",
      borderRadius: 10,
      padding: "0.75rem 0.8rem",
      marginTop: "0.9rem",
      display: "grid",
      gap: "0.4rem",
    } as const;

    const linkStyle = {
      color: "#1d4ed8",
      fontWeight: 700,
    } as const;

    const statusBaseStyle = {
      display: "inline-flex",
      alignItems: "center",
      gap: "0.35rem",
      borderRadius: 999,
      padding: "0.2rem 0.55rem",
      fontSize: "0.74rem",
      fontWeight: 800,
      width: "fit-content",
    } as const;

    const readyStatusStyle = {
      ...statusBaseStyle,
      border: "1px solid rgba(34, 197, 94, 0.4)",
      background: "rgba(22, 163, 74, 0.14)",
      color: "#166534",
    } as const;

    const warningStatusStyle = {
      ...statusBaseStyle,
      border: "1px solid rgba(245, 158, 11, 0.45)",
      background: "rgba(245, 158, 11, 0.15)",
      color: "#92400e",
    } as const;

    const criticalStatusStyle = {
      ...statusBaseStyle,
      border: "1px solid rgba(239, 68, 68, 0.45)",
      background: "rgba(239, 68, 68, 0.15)",
      color: "#991b1b",
    } as const;

    function renderCredentialStatus(
      isReady: boolean,
      readyLabel: string,
      warningLabel: string,
    ) {
      return (
        <span style={isReady ? readyStatusStyle : warningStatusStyle}>
          {isReady ? "OK" : "Pendente"}
          {isReady ? readyLabel : warningLabel}
        </span>
      );
    }

    if (selectedGateway === "STRIPE") {
      return (
        <div style={baseStyle}>
          <strong style={{ fontSize: "0.82rem" }}>
            Onde pegar credenciais Stripe
          </strong>
          <small style={{ lineHeight: 1.45 }}>
            Painel Stripe {">"} Developers {">"} API keys. Use a chave secreta
            no backend e, se precisar, o ID da conta conectada neste campo.
          </small>
          {renderCredentialStatus(
            hasStripeSecretKey,
            " Configuracao minima pronta",
            " Informe as credenciais",
          )}
          {Boolean(settingsForm.stripeSecretKeyConfigured) &&
          !String(settingsForm.stripeSecretKey || "").trim() ? (
            <small style={{ lineHeight: 1.4 }}>
              Chave Stripe ja cadastrada. Preencha novamente apenas para trocar.
            </small>
          ) : null}
          {!hasGatewayMerchantId ? (
            <small style={{ lineHeight: 1.4 }}>
              Opcional: preencha ID da conta/merchant para operacao com conta
              conectada.
            </small>
          ) : null}
          <a
            href="https://dashboard.stripe.com/apikeys"
            target="_blank"
            rel="noreferrer"
            style={linkStyle}
          >
            Abrir API keys da Stripe
          </a>
        </div>
      );
    }

    if (selectedGateway === "MERCADO_PAGO") {
      return (
        <div style={baseStyle}>
          <strong style={{ fontSize: "0.82rem" }}>
            Onde pegar credenciais Mercado Pago
          </strong>
          <small style={{ lineHeight: 1.45 }}>
            Painel Mercado Pago {">"} Suas integrações {">"} Credenciais. Copie
            o Access Token da conta vendedora.
          </small>
          {renderCredentialStatus(
            hasMercadoPagoAccessToken,
            " Configuracao minima pronta",
            " Informe as credenciais",
          )}
          {Boolean(settingsForm.mercadoPagoAccessTokenConfigured) &&
          !String(settingsForm.mercadoPagoAccessToken || "").trim() ? (
            <small style={{ lineHeight: 1.4 }}>
              Access token do Mercado Pago ja cadastrado. Preencha novamente
              apenas para trocar.
            </small>
          ) : null}
          {!hasGatewayMerchantId ? (
            <small style={{ lineHeight: 1.4 }}>
              Opcional: preencha ID da conta/merchant quando houver esse dado no
              seu contrato.
            </small>
          ) : null}
          <a
            href="https://www.mercadopago.com.br/developers/panel"
            target="_blank"
            rel="noreferrer"
            style={linkStyle}
          >
            Abrir painel de integrações do Mercado Pago
          </a>
        </div>
      );
    }

    if (selectedGateway === "PAGBANK") {
      return (
        <div style={baseStyle}>
          <strong style={{ fontSize: "0.82rem" }}>
            Onde pegar credenciais PagBank
          </strong>
          <small style={{ lineHeight: 1.45 }}>
            Entre no PagBank/PagSeguro, abra Integracoes e gere o token da conta
            vendedora. O e-mail deve ser o da conta PagBank.
          </small>
          {renderCredentialStatus(
            hasPagBankEmail && hasPagBankToken,
            " Credenciais minimas preenchidas",
            " Falta preencher e-mail e/ou token",
          )}
          {!hasPagBankEmail || !hasPagBankToken ? (
            <small style={{ lineHeight: 1.4 }}>
              Minimo para salvar com seguranca: e-mail da conta PagBank e token
              de integracao.
            </small>
          ) : null}
          {Boolean(settingsForm.pagbankTokenConfigured) &&
          !String(settingsForm.pagbankToken || "").trim() ? (
            <small style={{ lineHeight: 1.4 }}>
              Token PagBank ja cadastrado. Preencha novamente apenas para
              trocar.
            </small>
          ) : null}
          <a
            href="https://dev.pagbank.uol.com.br"
            target="_blank"
            rel="noreferrer"
            style={linkStyle}
          >
            Abrir portal de desenvolvedor do PagBank
          </a>
        </div>
      );
    }

    return (
      <div
        style={{
          ...baseStyle,
          border: "1px solid rgba(239, 68, 68, 0.42)",
          background: "rgba(239, 68, 68, 0.1)",
        }}
      >
        <strong style={{ fontSize: "0.82rem" }}>
          Gateway selecionado ainda sem integração completa
        </strong>
        <span style={criticalStatusStyle}>
          Critico
          {isIntegratedGateway
            ? " Gateway integrado"
            : " Checkout automatico indisponivel"}
        </span>
        <small style={{ lineHeight: 1.45 }}>
          Este gateway aparece no cadastro, mas o checkout automático ainda não
          está habilitado no backend atual. Para operação imediata, use Stripe,
          Mercado Pago ou PagBank.
        </small>
      </div>
    );
  }

  type ChecklistItem = {
    label: string;
    done: boolean;
    required?: boolean;
  };

  function renderStepChecklist(title: string, items: ChecklistItem[]) {
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

  const companyChecklistItems: ChecklistItem[] = [
    {
      label: "Tipo de documento (CPF ou CNPJ)",
      done: hasValue(settingsForm.legalDocumentType),
    },
    {
      label: "Documento da empresa/autonomo",
      done: hasValue(settingsForm.companyDocument),
    },
    {
      label: "Razao social",
      done: hasValue(settingsForm.companyLegalName),
      required: false,
    },
    {
      label: "Endereco comercial",
      done: hasValue(settingsForm.companyAddress),
      required: false,
    },
  ];

  const ownerChecklistItems: ChecklistItem[] = [
    {
      label: "Nome completo do representante",
      done: hasValue(settingsForm.ownerFullName),
    },
    {
      label: "CPF do representante",
      done: hasValue(settingsForm.ownerCpf),
    },
    {
      label: "E-mail de contato",
      done: hasValue(settingsForm.ownerEmail),
      required: false,
    },
    {
      label: "Telefone de contato",
      done: hasValue(settingsForm.ownerPhone),
      required: false,
    },
  ];

  const bankChecklistItems: ChecklistItem[] = [
    {
      label: "Nome do banco",
      done: hasValue(settingsForm.bankName),
    },
    {
      label: "Agencia",
      done: hasValue(settingsForm.bankBranch),
    },
    {
      label: "Conta",
      done: hasValue(settingsForm.bankAccount),
    },
    {
      label: "Documento do titular da conta",
      done: hasValue(settingsForm.bankHolderDocument),
      required: false,
    },
  ];

  const documentsChecklistItems: ChecklistItem[] = [
    {
      label: "Documento do socio (RG/CNH)",
      done: hasValue(settingsForm.ownerDocumentFileUrl),
      required: false,
    },
    {
      label: "Comprovante da conta bancaria",
      done: hasValue(settingsForm.bankProofFileUrl),
      required: false,
    },
    {
      label: "Contrato social ou CCMEI",
      done: hasValue(settingsForm.companyContractFileUrl),
      required: false,
    },
  ];

  const selectedGatewayForReview = String(settingsForm.cardGateway || "")
    .trim()
    .toUpperCase();
  const hasPagBankEmailForReview =
    String(settingsForm.pagbankEmail || "").trim().length > 0;
  const hasPagBankTokenForReview =
    String(settingsForm.pagbankToken || "").trim().length > 0 ||
    Boolean(settingsForm.pagbankTokenConfigured);
  const hasStripeSecretKeyForReview =
    String(settingsForm.stripeSecretKey || "").trim().length > 0 ||
    Boolean(settingsForm.stripeSecretKeyConfigured);
  const hasMercadoPagoAccessTokenForReview =
    String(settingsForm.mercadoPagoAccessToken || "").trim().length > 0 ||
    Boolean(settingsForm.mercadoPagoAccessTokenConfigured);

  const gatewayCredentialChecklistLabel =
    selectedGatewayForReview === "PAGBANK"
      ? "Credenciais do gateway (PagBank: e-mail e token)"
      : selectedGatewayForReview === "STRIPE"
        ? "Credenciais do gateway (Stripe: chave secreta)"
        : selectedGatewayForReview === "MERCADO_PAGO"
          ? "Credenciais do gateway (Mercado Pago: access token)"
          : "Credenciais do gateway";

  const gatewayCredentialChecklistDone =
    selectedGatewayForReview === "PAGBANK"
      ? hasPagBankEmailForReview && hasPagBankTokenForReview
      : selectedGatewayForReview === "STRIPE"
        ? hasStripeSecretKeyForReview
        : selectedGatewayForReview === "MERCADO_PAGO"
          ? hasMercadoPagoAccessTokenForReview
          : selectedGatewayForReview
            ? false
            : true;

  const finalReviewItems: ChecklistItem[] = [
    {
      label: "Tipo de documento da empresa",
      done: hasValue(settingsForm.legalDocumentType),
    },
    {
      label: "CNPJ/CPF da empresa",
      done: hasValue(settingsForm.companyDocument),
    },
    {
      label: "Nome do representante legal",
      done: hasValue(settingsForm.ownerFullName),
    },
    {
      label: "CPF do representante legal",
      done: hasValue(settingsForm.ownerCpf),
    },
    {
      label: "Banco de recebimento",
      done: hasValue(settingsForm.bankName),
    },
    {
      label: "Agencia de recebimento",
      done: hasValue(settingsForm.bankBranch),
    },
    {
      label: "Conta de recebimento",
      done: hasValue(settingsForm.bankAccount),
    },
    {
      label: "Documento do titular da conta",
      done: hasValue(settingsForm.bankHolderDocument),
      required: false,
    },
    {
      label: "Gateway de cartao",
      done: hasValue(settingsForm.cardGateway),
      required: false,
    },
    {
      label: gatewayCredentialChecklistLabel,
      done: gatewayCredentialChecklistDone,
      required:
        selectedGatewayForReview === "PAGBANK" ||
        selectedGatewayForReview === "STRIPE" ||
        selectedGatewayForReview === "MERCADO_PAGO",
    },
  ];

  const finalReviewRequiredMissingCount = finalReviewItems.filter(
    (item) => item.required !== false && !item.done,
  ).length;
  const finalReviewReady = finalReviewRequiredMissingCount === 0;

  function getKybStepError(stepKey: (typeof kybSteps)[number]["key"]) {
    if (stepKey === "company") {
      return (
        kybFieldErrors.legalDocumentType || kybFieldErrors.companyDocument || ""
      );
    }

    if (stepKey === "owner") {
      return kybFieldErrors.ownerFullName || kybFieldErrors.ownerCpf || "";
    }

    if (stepKey === "bank") {
      return (
        kybFieldErrors.bankName ||
        kybFieldErrors.bankCode ||
        kybFieldErrors.bankBranch ||
        kybFieldErrors.bankAccount ||
        kybFieldErrors.bankHolderDocument ||
        kybFieldErrors.stripeSecretKey ||
        kybFieldErrors.mercadoPagoAccessToken ||
        kybFieldErrors.pagbankEmail ||
        kybFieldErrors.pagbankToken ||
        ""
      );
    }

    return "";
  }

  function validateCurrentKybStep() {
    return getKybStepError(currentKybStep);
  }

  const firstIncompleteStepIndex = kybSteps.findIndex((step) =>
    Boolean(getKybStepError(step.key)),
  );
  const maxReachableStepIndex =
    firstIncompleteStepIndex === -1
      ? kybSteps.length - 1
      : firstIncompleteStepIndex;

  function isStepCompleted(stepKey: (typeof kybSteps)[number]["key"]) {
    return !getKybStepError(stepKey);
  }

  function handleStepClick(targetIndex: number) {
    if (targetIndex <= kybStepIndex) {
      setKybStepError("");
      setKybStepIndex(targetIndex);
      return;
    }

    const currentStepError = validateCurrentKybStep();

    if (currentStepError) {
      setKybStepError(currentStepError);
      return;
    }

    if (targetIndex > maxReachableStepIndex + 1) {
      return;
    }

    setKybStepError("");
    setKybStepIndex(targetIndex);
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

  return (
    <>
      <S.FormCard>
        <S.PageHeader>
          <h2>Cadastro de PIX</h2>
          <p>
            Configure o PIX e os dados de cobrança do delivery separados do
            onboarding de cartão/banco.
          </p>
        </S.PageHeader>

        <form onSubmit={onSubmitPixSettings}>
          <S.FormRow>
            <S.FormGroup>
              <label>Taxa de Entrega (R$)</label>
              <input
                type="number"
                name="deliveryFee"
                step="0.01"
                min="0"
                placeholder="Ex: 8.50"
                value={settingsForm.deliveryFee}
                onChange={onFieldChange}
              />
            </S.FormGroup>

            <S.FormGroup>
              <label>Pedido Minimo (R$)</label>
              <input
                type="number"
                name="minimumOrder"
                step="0.01"
                min="0"
                placeholder="Ex: 20.00"
                value={settingsForm.minimumOrder}
                onChange={onFieldChange}
              />
            </S.FormGroup>
          </S.FormRow>

          <S.FormGroup style={{ marginTop: "1rem" }}>
            <label>WhatsApp do Restaurante</label>
            <input
              type="text"
              name="whatsapp"
              placeholder="Ex: (85) 99999-9999"
              value={settingsForm.whatsapp}
              onChange={onFieldChange}
            />
          </S.FormGroup>

          <S.FormGroup style={{ marginTop: "1rem" }}>
            <label>Provedor PIX</label>
            <select
              name="pixProvider"
              value={settingsForm.pixProvider}
              onChange={onFieldChange}
            >
              <option value="MERCADO_PAGO">Mercado Pago</option>
              <option value="NUBANK">Nubank</option>
              <option value="PICPAY">PicPay</option>
            </select>
          </S.FormGroup>

          <S.FormGroup style={{ marginTop: "1rem" }}>
            <label>Chave PIX</label>
            <input
              type="text"
              name="pixKey"
              placeholder="Ex: email@dominio.com, CPF ou celular com DDD"
              value={settingsForm.pixKey}
              onChange={onFieldChange}
            />
            {hasPixKey && isPixKeyInvalid ? (
              <small
                style={{
                  display: "block",
                  marginTop: "0.45rem",
                  color: "#dc2626",
                  fontWeight: 600,
                }}
              >
                Formato invalido. Use apenas CPF, e-mail ou celular.
              </small>
            ) : hasPixKey ? (
              <small
                style={{
                  display: "block",
                  marginTop: "0.45rem",
                  color: "#16a34a",
                  fontWeight: 600,
                }}
              >
                {pixKeyTypeLabel}
              </small>
            ) : null}
          </S.FormGroup>

          <S.SubmitBtn
            type="submit"
            style={{ marginTop: "1.25rem" }}
            disabled={isSavingSettings || isPixKeyInvalid}
          >
            {isSavingSettings ? "Salvando..." : "Salvar PIX"}
          </S.SubmitBtn>
        </form>

        <div style={{ marginTop: "1.75rem" }}>
          <h3 style={{ marginBottom: "0.5rem" }}>Pre-visualizacao do QR PIX</h3>
          {hasPixKey && !isPixKeyInvalid ? (
            <div
              style={{
                border: "1px solid rgba(148, 163, 184, 0.35)",
                borderRadius: "16px",
                padding: "1rem",
                display: "grid",
                gap: "0.75rem",
                justifyItems: "start",
                maxWidth: "360px",
              }}
            >
              <div
                style={{
                  background: isDarkMode ? "#0f172a" : "#d8e2ed",
                  borderRadius: "12px",
                  padding: "0.75rem",
                }}
              >
                <Suspense fallback={null}>
                  <QRCode
                    value={pixPreviewPayload}
                    size={160}
                    bgColor="#ffffff"
                    fgColor="#111827"
                    level="M"
                  />
                </Suspense>
              </div>
              <small style={{ opacity: 0.85, lineHeight: 1.4 }}>
                Esse QR e gerado automaticamente a partir da chave PIX do
                provedor selecionado e sera exibido para o cliente no checkout
                delivery.
              </small>
            </div>
          ) : (
            <small style={{ opacity: 0.75 }}>
              Informe uma chave PIX valida (CPF, e-mail ou celular) para
              visualizar e habilitar o QR Code.
            </small>
          )}
        </div>
      </S.FormCard>

      <S.FormCard style={{ marginTop: "1rem" }}>
        <S.PageHeader>
          <h2>Cadastro de Cartao/Banco (KYB)</h2>
          <p>
            Preencha os dados para onboarding no gateway: Empresa, Dono,
            Liquidação bancária e Documentos.
          </p>
        </S.PageHeader>

        <div
          style={{
            border: "1px solid rgba(37, 99, 235, 0.28)",
            background: "rgba(37, 99, 235, 0.08)",
            borderRadius: "12px",
            padding: "0.85rem 0.95rem",
            marginBottom: "1rem",
            display: "grid",
            gap: "0.4rem",
          }}
        >
          <strong style={{ fontSize: "0.9rem" }}>
            Como preencher este cadastro
          </strong>
          <small style={{ opacity: 0.86, lineHeight: 1.45 }}>
            1) Informe os dados da empresa que recebe os pagamentos. 2) Informe
            os dados do representante legal. 3) Cadastre a conta bancária que
            vai receber as vendas. 4) Anexe os documentos para aprovação no
            gateway.
          </small>
          <small style={{ opacity: 0.86, lineHeight: 1.45 }}>
            Dica: tenha em mãos CNPJ/CPF, dados bancários e fotos legíveis dos
            documentos antes de começar.
          </small>
        </div>

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
                const isDone = index < kybStepIndex;
                const isCompleted = isStepCompleted(step.key);
                const isDisabled = index > maxReachableStepIndex + 1;

                return (
                  <button
                    key={step.key}
                    type="button"
                    onClick={() => handleStepClick(index)}
                    disabled={isDisabled}
                    style={{
                      borderRadius: "10px",
                      border: isActive
                        ? "1px solid rgba(30, 64, 175, 0.45)"
                        : isDone
                          ? "1px solid rgba(22, 163, 74, 0.4)"
                          : "1px solid rgba(148, 163, 184, 0.35)",
                      background: isActive
                        ? "rgba(37, 99, 235, 0.12)"
                        : isDone
                          ? "rgba(22, 163, 74, 0.12)"
                          : "transparent",
                      padding: "0.55rem 0.45rem",
                      fontWeight: 700,
                      cursor: isDisabled ? "not-allowed" : "pointer",
                      opacity: isDisabled ? 0.5 : 1,
                      display: "inline-flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: "0.4rem",
                    }}
                  >
                    <span
                      style={{
                        width: 18,
                        height: 18,
                        borderRadius: "999px",
                        border: "1px solid rgba(148, 163, 184, 0.45)",
                        display: "inline-flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: "0.72rem",
                        lineHeight: 1,
                        background: isCompleted
                          ? "rgba(22, 163, 74, 0.22)"
                          : "transparent",
                        color: isCompleted ? "#15803d" : "inherit",
                      }}
                    >
                      {isCompleted ? "✓" : index + 1}
                    </span>
                    <span>{step.label}</span>
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
                  transition: "width 220ms ease",
                }}
              />
            </div>

            <small style={{ opacity: 0.8 }}>
              Etapa {kybStepIndex + 1} de {kybSteps.length}:{" "}
              {kybSteps[kybStepIndex]?.label}
            </small>

            {kybStepError ? (
              <small style={{ color: "#dc2626", fontWeight: 600 }}>
                {kybStepError}
              </small>
            ) : null}
          </div>

          {currentKybStep === "company" ? (
            <>
              <h3 style={{ marginBottom: "0.75rem" }}>1. Dados da Empresa</h3>
              <p
                style={{ marginTop: 0, marginBottom: "0.9rem", opacity: 0.82 }}
              >
                Nesta etapa, informe exatamente os dados do documento fiscal que
                vai receber os pagamentos.
              </p>
              {renderStepChecklist(
                "Checklist da etapa Empresa",
                companyChecklistItems,
              )}
              <S.FormRow>
                <S.FormGroup>
                  <label>Tipo de Documento</label>
                  <select
                    name="legalDocumentType"
                    value={settingsForm.legalDocumentType}
                    onChange={onFieldChange}
                  >
                    <option value="">Selecione</option>
                    <option value="CNPJ">CNPJ</option>
                    <option value="CPF">CPF (autonomo)</option>
                  </select>
                  <small style={fieldHelpStyle}>
                    Se voce tem empresa formal, selecione CNPJ. Se vende como
                    pessoa fisica, selecione CPF.
                  </small>
                </S.FormGroup>
                <S.FormGroup>
                  <label>CNPJ/CPF</label>
                  <input
                    type="text"
                    name="companyDocument"
                    inputMode="numeric"
                    maxLength={18}
                    placeholder={
                      settingsForm.legalDocumentType === "CPF"
                        ? "Ex: 123.456.789-00"
                        : "Ex: 12.345.678/0001-90"
                    }
                    value={settingsForm.companyDocument}
                    onChange={onFieldChange}
                  />
                  <small style={fieldHelpStyle}>
                    Digite o mesmo documento que consta no cadastro fiscal da
                    empresa/autonomo.
                  </small>
                </S.FormGroup>
              </S.FormRow>

              <S.FormRow style={{ marginTop: "1rem" }}>
                <S.FormGroup>
                  <label>Razao Social</label>
                  <input
                    type="text"
                    name="companyLegalName"
                    placeholder="Ex: Pizzaria Silva LTDA"
                    value={settingsForm.companyLegalName}
                    onChange={onFieldChange}
                  />
                  <small style={fieldHelpStyle}>
                    Nome juridico completo como aparece no contrato/cartao CNPJ.
                  </small>
                </S.FormGroup>
                <S.FormGroup>
                  <label>Nome Fantasia</label>
                  <input
                    type="text"
                    name="companyTradeName"
                    placeholder="Ex: Pizza do Centro"
                    value={settingsForm.companyTradeName}
                    onChange={onFieldChange}
                  />
                  <small style={fieldHelpStyle}>
                    Nome que seus clientes conhecem (nome comercial).
                  </small>
                </S.FormGroup>
              </S.FormRow>

              <S.FormGroup style={{ marginTop: "1rem" }}>
                <label>Endereco Comercial</label>
                <input
                  type="text"
                  name="companyAddress"
                  placeholder="Ex: Rua das Flores, 120 - Centro, Fortaleza/CE"
                  value={settingsForm.companyAddress}
                  onChange={onFieldChange}
                />
                <small style={fieldHelpStyle}>
                  Endereco onde a empresa/autonomo opera oficialmente.
                </small>
              </S.FormGroup>

              <S.FormRow style={{ marginTop: "1rem" }}>
                <S.FormGroup>
                  <label>CNAE</label>
                  <input
                    type="text"
                    name="companyCnae"
                    placeholder="Ex: 5611-2/01"
                    value={settingsForm.companyCnae}
                    onChange={onFieldChange}
                  />
                  <small style={fieldHelpStyle}>
                    Codigo da atividade principal da empresa (se tiver duvida,
                    consulte seu contador).
                  </small>
                </S.FormGroup>
                <S.FormGroup>
                  <label>Faturamento Mensal Estimado (R$)</label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    name="monthlyRevenue"
                    placeholder="Ex: 25000"
                    value={settingsForm.monthlyRevenue}
                    onChange={onFieldChange}
                  />
                  <small style={fieldHelpStyle}>
                    Media aproximada de vendas por mes. Nao precisa ser exato,
                    mas seja realista.
                  </small>
                </S.FormGroup>
              </S.FormRow>
            </>
          ) : null}

          {currentKybStep === "owner" ? (
            <>
              <h3 style={{ marginBottom: "0.75rem" }}>
                2. Dados do Dono / Representante Legal
              </h3>
              <p
                style={{ marginTop: 0, marginBottom: "0.9rem", opacity: 0.82 }}
              >
                Informe os dados da pessoa responsavel legalmente pela empresa.
              </p>
              {renderStepChecklist(
                "Checklist da etapa Dono",
                ownerChecklistItems,
              )}
              <S.FormRow>
                <S.FormGroup>
                  <label>Nome Completo</label>
                  <input
                    type="text"
                    name="ownerFullName"
                    placeholder="Ex: Joao Pedro da Silva"
                    value={settingsForm.ownerFullName}
                    onChange={onFieldChange}
                  />
                  <small style={fieldHelpStyle}>
                    Nome completo sem abreviacoes, igual ao documento.
                  </small>
                </S.FormGroup>
                <S.FormGroup>
                  <label>CPF</label>
                  <input
                    type="text"
                    name="ownerCpf"
                    inputMode="numeric"
                    maxLength={14}
                    placeholder="Ex: 123.456.789-00"
                    value={settingsForm.ownerCpf}
                    onChange={onFieldChange}
                  />
                  <small style={fieldHelpStyle}>
                    CPF do representante legal. Use o mesmo CPF dos documentos.
                  </small>
                </S.FormGroup>
              </S.FormRow>

              <S.FormRow style={{ marginTop: "1rem" }}>
                <S.FormGroup>
                  <label>Data de Nascimento</label>
                  <input
                    type="date"
                    name="ownerBirthDate"
                    value={settingsForm.ownerBirthDate}
                    onChange={onFieldChange}
                  />
                  <small style={fieldHelpStyle}>
                    Data de nascimento do representante conforme documento.
                  </small>
                </S.FormGroup>
                <S.FormGroup>
                  <label>E-mail</label>
                  <input
                    type="email"
                    name="ownerEmail"
                    placeholder="Ex: dono@seudominio.com"
                    value={settingsForm.ownerEmail}
                    onChange={onFieldChange}
                  />
                  <small style={fieldHelpStyle}>
                    E-mail usado para avisos de aprovacao e pendencias do
                    gateway.
                  </small>
                </S.FormGroup>
              </S.FormRow>

              <S.FormRow style={{ marginTop: "1rem" }}>
                <S.FormGroup>
                  <label>Telefone Celular</label>
                  <input
                    type="text"
                    name="ownerPhone"
                    inputMode="tel"
                    maxLength={16}
                    placeholder="Ex: (85) 99999-9999"
                    value={settingsForm.ownerPhone}
                    onChange={onFieldChange}
                  />
                  <small style={fieldHelpStyle}>
                    Telefone para contato rapido em caso de validacao pendente.
                  </small>
                </S.FormGroup>
                <S.FormGroup>
                  <label>Endereco Residencial</label>
                  <input
                    type="text"
                    name="ownerAddress"
                    placeholder="Ex: Av. Brasil, 2200 - Fortaleza/CE"
                    value={settingsForm.ownerAddress}
                    onChange={onFieldChange}
                  />
                  <small style={fieldHelpStyle}>
                    Endereco residencial do representante legal.
                  </small>
                </S.FormGroup>
              </S.FormRow>
            </>
          ) : null}

          {currentKybStep === "bank" ? (
            <>
              <h3 style={{ marginBottom: "0.75rem" }}>
                3. Dados Bancarios para Liquidacao
              </h3>
              <p
                style={{ marginTop: 0, marginBottom: "0.9rem", opacity: 0.82 }}
              >
                Esta conta vai receber os valores das vendas. Preencha com
                atencao para evitar bloqueio de repasse.
              </p>
              {renderStepChecklist(
                "Checklist da etapa Banco",
                bankChecklistItems,
              )}
              <S.FormRow>
                <S.FormGroup>
                  <label>Banco</label>
                  <input
                    type="text"
                    name="bankName"
                    placeholder="Ex: Banco do Brasil"
                    value={settingsForm.bankName}
                    onChange={onFieldChange}
                  />
                  <small style={fieldHelpStyle}>
                    Nome do banco onde voce recebe os repasses.
                  </small>
                </S.FormGroup>
                <S.FormGroup>
                  <label>Codigo do Banco</label>
                  <input
                    type="text"
                    name="bankCode"
                    inputMode="numeric"
                    maxLength={8}
                    placeholder="Ex: 001"
                    value={settingsForm.bankCode}
                    style={getFieldStyle("bankCode")}
                    onChange={onFieldChange}
                  />
                  {kybFieldErrors.bankCode ? (
                    <small
                      style={{
                        ...fieldHelpStyle,
                        color: "#dc2626",
                        fontWeight: 700,
                      }}
                    >
                      {kybFieldErrors.bankCode}
                    </small>
                  ) : null}
                  <small style={fieldHelpStyle}>
                    Codigo numerico do banco (COMPE/ISPB).
                  </small>
                </S.FormGroup>
              </S.FormRow>

              <S.FormRow style={{ marginTop: "1rem" }}>
                <S.FormGroup>
                  <label>Tipo de Conta</label>
                  <select
                    name="bankAccountType"
                    value={settingsForm.bankAccountType}
                    onChange={onFieldChange}
                  >
                    <option value="">Selecione</option>
                    <option value="CORRENTE">Conta Corrente</option>
                    <option value="POUPANCA">Conta Poupanca</option>
                  </select>
                  <small style={fieldHelpStyle}>
                    Tipo exato da conta que recebera os pagamentos.
                  </small>
                </S.FormGroup>
                <S.FormGroup>
                  <label>Documento do Titular da Conta</label>
                  <input
                    type="text"
                    name="bankHolderDocument"
                    inputMode="numeric"
                    maxLength={18}
                    placeholder={bankHolderDocumentPlaceholder}
                    value={settingsForm.bankHolderDocument}
                    style={getFieldStyle("bankHolderDocument")}
                    onChange={onFieldChange}
                  />
                  {!kybFieldErrors.bankHolderDocument &&
                  bankHolderDocumentDetectedType ? (
                    <small
                      style={{
                        ...fieldHelpStyle,
                        color: "#166534",
                        fontWeight: 700,
                      }}
                    >
                      Formato detectado: {bankHolderDocumentDetectedType}.
                    </small>
                  ) : null}
                  {kybFieldErrors.bankHolderDocument ? (
                    <small
                      style={{
                        ...fieldHelpStyle,
                        color: "#dc2626",
                        fontWeight: 700,
                      }}
                    >
                      {kybFieldErrors.bankHolderDocument}
                    </small>
                  ) : null}
                  <small style={fieldHelpStyle}>
                    Obrigatorio: este CPF/CNPJ deve ser o mesmo do cadastro da
                    empresa para aprovacao.
                  </small>
                </S.FormGroup>
              </S.FormRow>

              <S.FormRow style={{ marginTop: "1rem" }}>
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
                  {kybFieldErrors.bankBranch ? (
                    <small
                      style={{
                        ...fieldHelpStyle,
                        color: "#dc2626",
                        fontWeight: 700,
                      }}
                    >
                      {kybFieldErrors.bankBranch}
                    </small>
                  ) : null}
                  <small style={fieldHelpStyle}>
                    Numero da agencia sem digito, se seu banco usar esse padrao.
                  </small>
                </S.FormGroup>
                <S.FormGroup>
                  <label>Conta</label>
                  <input
                    type="text"
                    name="bankAccount"
                    inputMode="numeric"
                    maxLength={14}
                    placeholder="Ex: 98765-4"
                    value={settingsForm.bankAccount}
                    style={getFieldStyle("bankAccount")}
                    onChange={onFieldChange}
                  />
                  {kybFieldErrors.bankAccount ? (
                    <small
                      style={{
                        ...fieldHelpStyle,
                        color: "#dc2626",
                        fontWeight: 700,
                      }}
                    >
                      {kybFieldErrors.bankAccount}
                    </small>
                  ) : null}
                  <small style={fieldHelpStyle}>
                    Numero da conta com digito, conforme aparece no app/banco.
                  </small>
                </S.FormGroup>
              </S.FormRow>

              <S.FormRow style={{ marginTop: "1rem" }}>
                <S.FormGroup>
                  <label>Gateway de Cartao</label>
                  <select
                    name="cardGateway"
                    value={settingsForm.cardGateway}
                    onChange={onFieldChange}
                  >
                    <option value="">Selecione</option>
                    <option value="STRIPE">Stripe</option>
                    <option value="PAGBANK">PagBank</option>
                    <option value="MERCADO_PAGO">Mercado Pago</option>
                  </select>
                  <small style={fieldHelpStyle}>
                    Selecione o gateway de cartao que voce usa ou pretende usar.
                  </small>
                  <small style={{ ...fieldHelpStyle, fontWeight: 700 }}>
                    Dica rapida: Stripe = chave sk_; Mercado Pago = Access Token
                    APP_USR-; PagBank = e-mail + token.
                  </small>
                </S.FormGroup>
                <S.FormGroup>
                  <label>ID da Conta/Merchant no Gateway</label>
                  <input
                    type="text"
                    name="gatewayMerchantId"
                    placeholder="Ex: acct_123... ou merchant_456..."
                    value={settingsForm.gatewayMerchantId}
                    onChange={onFieldChange}
                  />
                  <small style={fieldHelpStyle}>
                    Codigo de identificacao da sua conta dentro do gateway.
                  </small>
                </S.FormGroup>
              </S.FormRow>

              {renderGatewayCredentialGuide()}

              {String(settingsForm.cardGateway || "").toUpperCase() ===
              "STRIPE" ? (
                <S.FormGroup style={{ marginTop: "1rem" }}>
                  <label>Chave Secreta Stripe</label>
                  <input
                    type="password"
                    name="stripeSecretKey"
                    placeholder="Cole aqui a sk_... da conta do restaurante"
                    value={settingsForm.stripeSecretKey}
                    style={getFieldStyle("stripeSecretKey")}
                    onChange={onFieldChange}
                  />
                  {kybFieldErrors.stripeSecretKey ? (
                    <small
                      style={{
                        ...fieldHelpStyle,
                        color: "#dc2626",
                        fontWeight: 700,
                      }}
                    >
                      {kybFieldErrors.stripeSecretKey}
                    </small>
                  ) : null}
                  <small style={fieldHelpStyle}>
                    Por seguranca, essa chave nao e exibida apos salvar.
                    Preencha novamente apenas para atualizar credencial.
                  </small>
                </S.FormGroup>
              ) : null}

              {String(settingsForm.cardGateway || "").toUpperCase() ===
              "MERCADO_PAGO" ? (
                <S.FormGroup style={{ marginTop: "1rem" }}>
                  <label>Access Token Mercado Pago</label>
                  <input
                    type="password"
                    name="mercadoPagoAccessToken"
                    placeholder="Cole aqui o APP_USR-... da conta do restaurante"
                    value={settingsForm.mercadoPagoAccessToken}
                    style={getFieldStyle("mercadoPagoAccessToken")}
                    onChange={onFieldChange}
                  />
                  {kybFieldErrors.mercadoPagoAccessToken ? (
                    <small
                      style={{
                        ...fieldHelpStyle,
                        color: "#dc2626",
                        fontWeight: 700,
                      }}
                    >
                      {kybFieldErrors.mercadoPagoAccessToken}
                    </small>
                  ) : null}
                  <small style={fieldHelpStyle}>
                    Por seguranca, o token nao e exibido apos salvar. Preencha
                    novamente apenas para atualizar credencial.
                  </small>
                </S.FormGroup>
              ) : null}

              {String(settingsForm.cardGateway || "").toUpperCase() ===
              "PAGBANK" ? (
                <>
                  <S.FormRow style={{ marginTop: "1rem" }}>
                    <S.FormGroup>
                      <label>E-mail da Conta PagBank</label>
                      <input
                        type="email"
                        name="pagbankEmail"
                        placeholder="Ex: dono@restaurante.com"
                        value={settingsForm.pagbankEmail}
                        style={getFieldStyle("pagbankEmail")}
                        onChange={onFieldChange}
                      />
                      {kybFieldErrors.pagbankEmail ? (
                        <small
                          style={{
                            ...fieldHelpStyle,
                            color: "#dc2626",
                            fontWeight: 700,
                          }}
                        >
                          {kybFieldErrors.pagbankEmail}
                        </small>
                      ) : null}
                      <small style={fieldHelpStyle}>
                        E-mail da conta vendedora do PagBank usada para receber
                        os pagamentos.
                      </small>
                    </S.FormGroup>

                    <S.FormGroup>
                      <label>Ambiente PagBank</label>
                      <select
                        name="pagbankEnvironment"
                        value={"production"}
                        onChange={onFieldChange}
                        disabled
                      >
                        <option value="production">Production (real)</option>
                      </select>
                      <small style={fieldHelpStyle}>
                        Ambiente fixo em producao.
                      </small>
                    </S.FormGroup>
                  </S.FormRow>

                  <S.FormGroup style={{ marginTop: "1rem" }}>
                    <label>Token PagBank</label>
                    <input
                      type="password"
                      name="pagbankToken"
                      placeholder="Cole aqui o token de integracao"
                      value={settingsForm.pagbankToken}
                      style={getFieldStyle("pagbankToken")}
                      onChange={onFieldChange}
                    />
                    {kybFieldErrors.pagbankToken ? (
                      <small
                        style={{
                          ...fieldHelpStyle,
                          color: "#dc2626",
                          fontWeight: 700,
                        }}
                      >
                        {kybFieldErrors.pagbankToken}
                      </small>
                    ) : null}
                    <small style={fieldHelpStyle}>
                      Por seguranca, o token nao e exibido apos salvar. Preencha
                      apenas quando quiser atualizar a credencial.
                    </small>
                  </S.FormGroup>
                </>
              ) : null}
            </>
          ) : null}

          {currentKybStep === "documents" ? (
            <>
              <h3 style={{ marginBottom: "0.75rem" }}>
                4. Documentos (URL ou Base64)
              </h3>
              <p
                style={{ marginTop: 0, marginBottom: "0.9rem", opacity: 0.82 }}
              >
                Envie documentos legiveis para validacao. Fotos cortadas,
                borradas ou com reflexo podem reprovar seu cadastro.
              </p>
              {renderStepChecklist(
                "Checklist da etapa Documentos",
                documentsChecklistItems,
              )}

              <div
                style={{
                  border: finalReviewReady
                    ? "1px solid rgba(22, 163, 74, 0.4)"
                    : "1px solid rgba(249, 115, 22, 0.45)",
                  borderRadius: 10,
                  padding: "0.75rem 0.8rem",
                  marginBottom: "0.95rem",
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

                <small style={{ opacity: 0.82, lineHeight: 1.4 }}>
                  Confira os campos criticos abaixo. Se todos estiverem como
                  "Preenchido", seu cadastro esta pronto para envio.
                </small>

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

              <S.FormGroup>
                <label>Documento do Socio (RG/CNH)</label>
                <input
                  type="text"
                  name="ownerDocumentFileUrl"
                  placeholder="https://... ou data:image/..."
                  value={settingsForm.ownerDocumentFileUrl}
                  onChange={onFieldChange}
                />
                <small style={fieldHelpStyle}>
                  Frente/verso do documento do representante legal.
                </small>
              </S.FormGroup>

              <S.FormGroup style={{ marginTop: "1rem" }}>
                <label>Comprovante da Conta Bancaria</label>
                <input
                  type="text"
                  name="bankProofFileUrl"
                  placeholder="https://... ou data:image/..."
                  value={settingsForm.bankProofFileUrl}
                  onChange={onFieldChange}
                />
                <small style={fieldHelpStyle}>
                  Pode ser print do app bancario mostrando banco, agencia, conta
                  e titular.
                </small>
              </S.FormGroup>

              <S.FormGroup style={{ marginTop: "1rem" }}>
                <label>Contrato Social ou CCMEI</label>
                <input
                  type="text"
                  name="companyContractFileUrl"
                  placeholder="https://... ou data:image/..."
                  value={settingsForm.companyContractFileUrl}
                  onChange={onFieldChange}
                />
                <small style={fieldHelpStyle}>
                  Documento que comprova abertura da empresa e quadro
                  societario.
                </small>
              </S.FormGroup>

              <small
                style={{ display: "block", marginTop: "0.9rem", opacity: 0.8 }}
              >
                A conta bancaria deve ter a mesma titularidade (CPF/CNPJ) usada
                no cadastro da empresa para evitar reprovacao no gateway.
              </small>
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
                {isSavingSettings ? "Salvando..." : "Salvar Cartao/Banco (KYB)"}
              </S.SubmitBtn>
            )}
          </div>
        </form>
      </S.FormCard>
    </>
  );
}
