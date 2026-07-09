import { useState } from "react";
import { toast } from "react-toastify";
import { ThemeProvider } from "styled-components";
import { Moon, Sun, Utensils } from "lucide-react";
import authService from "../../Services/authService";
import * as S from "./styles";

type ContactMethod = "email" | "phone";

export default function RecoverPassword() {
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [step, setStep] = useState<"request" | "reset">("request");
  const [contactMethod, setContactMethod] = useState<ContactMethod>("phone");
  const [identifier, setIdentifier] = useState("");
  const [code, setCode] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const buildIdentifierPayload = () => {
    const value = String(identifier || "").trim();

    if (contactMethod === "phone") {
      return { phone: value };
    }

    return { email: value };
  };

  const handleRequestCode = async (event) => {
    event.preventDefault();

    if (!String(identifier || "").trim()) {
      toast.error("Informe o e-mail ou telefone.");
      return;
    }

    try {
      setIsLoading(true);
      const response = await authService.forgotPassword(
        buildIdentifierPayload(),
      );

      toast.success(
        response?.message ||
          "Se os dados informados existirem, enviamos um codigo para redefinir a senha.",
      );
      setStep("reset");
    } catch (error) {
      toast.error(
        error?.response?.data?.error ||
          "Nao foi possivel solicitar recuperacao de senha.",
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleResetPassword = async (event) => {
    event.preventDefault();

    try {
      setIsLoading(true);
      const response = await authService.resetPassword({
        ...buildIdentifierPayload(),
        code,
        newPassword,
        confirmPassword,
      });

      toast.success(response?.message || "Senha redefinida com sucesso.");
      setStep("request");
      setCode("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (error) {
      toast.error(
        error?.response?.data?.error || "Nao foi possivel redefinir a senha.",
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <ThemeProvider theme={isDarkMode ? S.darkTheme : S.lightTheme}>
      <S.Container>
        <S.TopBar>
          <S.ThemeToggleButton onClick={() => setIsDarkMode((prev) => !prev)}>
            {isDarkMode ? <Sun size={18} /> : <Moon size={18} />}
          </S.ThemeToggleButton>
        </S.TopBar>

        <S.BannerSection>
          <S.BrandTitle>
            <Utensils size={32} strokeWidth={2.5} />
            <span>Peça Já Food</span>
          </S.BrandTitle>
          <S.BrandSubtitle>
            Recupere seu acesso de forma segura usando e-mail ou telefone
            cadastrado.
          </S.BrandSubtitle>
        </S.BannerSection>

        <S.FormSection>
          <S.FormWrapper>
            <S.WelcomeText>Recuperar senha</S.WelcomeText>
            <S.FormSubtitle>
              {step === "request"
                ? "Escolha e-mail ou telefone e receba um codigo para redefinir sua senha."
                : "Digite o codigo recebido e informe sua nova senha."}
            </S.FormSubtitle>

            <S.Form
              onSubmit={
                step === "request" ? handleRequestCode : handleResetPassword
              }
            >
              <S.SwitchRow>
                <S.SwitchButton
                  type="button"
                  $active={contactMethod === "email"}
                  onClick={() => {
                    toast.info(
                      "Recuperacao por e-mail esta temporariamente indisponivel.",
                    );
                    setContactMethod("phone");
                  }}
                >
                  E-mail
                </S.SwitchButton>
                <S.SwitchButton
                  type="button"
                  $active={contactMethod === "phone"}
                  onClick={() => setContactMethod("phone")}
                >
                  Telefone
                </S.SwitchButton>
              </S.SwitchRow>

              <S.InputGroup>
                <S.Label htmlFor="identifier">
                  {contactMethod === "email" ? "E-mail" : "Telefone"}
                </S.Label>
                <S.Input
                  id="identifier"
                  type={contactMethod === "email" ? "email" : "text"}
                  inputMode={contactMethod === "phone" ? "tel" : undefined}
                  placeholder={
                    contactMethod === "email"
                      ? "exemplo@email.com"
                      : "(11) 99999-9999"
                  }
                  value={identifier}
                  onChange={(event) => setIdentifier(event.target.value)}
                  required
                />
              </S.InputGroup>

              {step === "reset" && (
                <>
                  <S.InputGroup>
                    <S.Label htmlFor="reset-code">Codigo</S.Label>
                    <S.Input
                      id="reset-code"
                      type="text"
                      inputMode="numeric"
                      pattern="[0-9]*"
                      placeholder="Codigo de 6 digitos"
                      value={code}
                      onChange={(event) =>
                        setCode(
                          event.target.value.replace(/\D/g, "").slice(0, 6),
                        )
                      }
                      required
                    />
                  </S.InputGroup>

                  <S.InputGroup>
                    <S.Label htmlFor="new-password">Nova senha</S.Label>
                    <S.Input
                      id="new-password"
                      type="password"
                      placeholder="••••••••"
                      value={newPassword}
                      onChange={(event) => setNewPassword(event.target.value)}
                      required
                    />
                  </S.InputGroup>

                  <S.InputGroup>
                    <S.Label htmlFor="confirm-password">
                      Confirmar nova senha
                    </S.Label>
                    <S.Input
                      id="confirm-password"
                      type="password"
                      placeholder="••••••••"
                      value={confirmPassword}
                      onChange={(event) =>
                        setConfirmPassword(event.target.value)
                      }
                      required
                    />
                  </S.InputGroup>
                </>
              )}

              <S.Button type="submit" disabled={isLoading}>
                {isLoading
                  ? "Processando..."
                  : step === "request"
                    ? "Enviar codigo"
                    : "Redefinir senha"}
              </S.Button>

              {step === "reset" && (
                <S.Button
                  type="button"
                  onClick={handleRequestCode}
                  disabled={isLoading}
                >
                  Reenviar codigo
                </S.Button>
              )}
            </S.Form>

            <S.FooterRow>
              <S.BackLink to="/login">Voltar para login</S.BackLink>
              <span>|</span>
              <S.BackLink to="/register">Criar conta</S.BackLink>
            </S.FooterRow>
          </S.FormWrapper>
        </S.FormSection>
      </S.Container>
    </ThemeProvider>
  );
}
