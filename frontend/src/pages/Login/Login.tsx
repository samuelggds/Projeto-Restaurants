import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import { ThemeProvider } from "styled-components";
import { Utensils, Sun, Moon } from "lucide-react";
import authService from "../../Services/authService";
import { useAuth } from "../../contexts/authContext.js";
import * as S from "./styles";

export default function Login() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(false);
  const [googleStatus, setGoogleStatus] = useState("loading");
  const [googleMessage, setGoogleMessage] = useState("");
  const googleButtonRef = useRef(null);
  const isGoogleMountedRef = useRef(false);

  const loadGoogleScript = useCallback(() => {
    if (window.google?.accounts?.id) {
      return Promise.resolve();
    }

    const existingScript = document.querySelector<HTMLScriptElement>(
      'script[src="https://accounts.google.com/gsi/client"]',
    );

    if (existingScript) {
      if (existingScript.dataset.loaded === "true") {
        return Promise.resolve();
      }

      return new Promise<void>((resolve, reject) => {
        const handleLoad = () => {
          existingScript.dataset.loaded = "true";
          existingScript.removeEventListener("load", handleLoad);
          existingScript.removeEventListener("error", handleError);
          resolve();
        };

        const handleError = () => {
          existingScript.removeEventListener("load", handleLoad);
          existingScript.removeEventListener("error", handleError);
          reject(new Error("script-error"));
        };

        existingScript.addEventListener("load", handleLoad);
        existingScript.addEventListener("error", handleError);
      });
    }

    return new Promise<void>((resolve, reject) => {
      const script = document.createElement("script");
      script.src = "https://accounts.google.com/gsi/client";
      script.async = true;
      script.defer = true;
      script.onload = () => {
        script.dataset.loaded = "true";
        resolve();
      };
      script.onerror = () => reject(new Error("script-error"));
      document.head.appendChild(script);
    });
  }, []);

  const getGoogleClientId = useCallback(async () => {
    const localClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;

    if (localClientId) {
      return localClientId;
    }

    return authService.getGoogleClientId();
  }, []);

  const redirectByRole = useCallback(
    (user) => {
      if (user?.role === "SUPER_ADMIN") {
        navigate("/super_admin");
        return;
      }

      if (user?.role === "ADMIN") {
        navigate("/admin");
        return;
      }

      if (user?.role === "MOTOQUEIRO") {
        navigate("/courier");
        return;
      }

      if (user?.role === "FUNCIONARIO") {
        navigate("/employees");
        return;
      }

      navigate("/");
    },
    [navigate],
  );

  const initializeGoogleLogin = useCallback(async () => {
    setGoogleStatus("loading");
    setGoogleMessage("");

    try {
      const [googleClientId] = await Promise.all([
        getGoogleClientId(),
        loadGoogleScript(),
      ]);

      if (!googleClientId) {
        throw new Error("missing-client-id");
      }

      if (!isGoogleMountedRef.current || !googleButtonRef.current) {
        return;
      }

      if (!window.google?.accounts?.id) {
        throw new Error("google-api-unavailable");
      }

      window.google.accounts.id.initialize({
        client_id: googleClientId,
        callback: async (response) => {
          try {
            const authResponse = await authService.loginWithGoogle(
              response.credential,
            );

            login(authResponse.user, authResponse.token);
            toast.success("Login com Google realizado com sucesso!");
            redirectByRole(authResponse.user);
          } catch (error) {
            const message =
              error?.response?.data?.error || "Erro ao autenticar com Google";
            toast.error(message);
          }
        },
      });

      googleButtonRef.current.innerHTML = "";
      window.google.accounts.id.renderButton(googleButtonRef.current, {
        type: "standard",
        shape: "pill",
        theme: isDarkMode ? "filled_black" : "outline",
        text: "continue_with",
        size: "large",
        width: 320,
      });

      setGoogleStatus("ready");
    } catch {
      if (isGoogleMountedRef.current) {
        setGoogleStatus("error");
        setGoogleMessage(
          "Nao foi possivel carregar o login com Google. Verifique o client id, o acesso ao script do Google e tente novamente.",
        );
      }
    }
  }, [getGoogleClientId, loadGoogleScript, login, redirectByRole, isDarkMode]);

  useEffect(() => {
    isGoogleMountedRef.current = true;

    const timeoutId = setTimeout(() => {
      initializeGoogleLogin();
    }, 0);

    return () => {
      clearTimeout(timeoutId);
      isGoogleMountedRef.current = false;
    };
  }, [initializeGoogleLogin]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const response = await authService.login({
        email,
        password,
      });

      // Save to context and localStorage
      login(response.user, response.token);

      toast.success("Login realizado com sucesso!");

      if (rememberMe) {
        localStorage.setItem("rememberedEmail", email);
      } else {
        localStorage.removeItem("rememberedEmail");
      }

      redirectByRole(response.user);
    } catch (error) {
      const message =
        error.response?.data?.error ||
        (error.request
          ? "Sem conexão com o servidor. Verifique se backend/frontend estão na mesma rede e tente novamente."
          : "Erro ao fazer login!");
      toast.error(message);
    }
  };

  return (
    <ThemeProvider theme={isDarkMode ? S.darkTheme : S.lightTheme}>
      <S.Container>
        {/* INTERRUPTOR DE TEMA (SOL/LUA) NO TOPO */}
        <S.TopBar>
          <S.ThemeToggleButton onClick={() => setIsDarkMode(!isDarkMode)}>
            {isDarkMode ? <Sun size={18} /> : <Moon size={18} />}
          </S.ThemeToggleButton>
        </S.TopBar>

        {/* LADO ESQUERDO: BANNER INSTITUCIONAL PADRÃO */}
        <S.BannerSection>
          <S.BrandTitle>
            <Utensils size={32} strokeWidth={2.5} />
            <span>Peça já food</span>
          </S.BrandTitle>
          <S.BrandSubtitle>
            Acesse nosso menu interativo global. Faça seus pedidos de forma
            rápida na mesa e gerencie sua experiência gastronômica sem
            complicações.
          </S.BrandSubtitle>
        </S.BannerSection>

        {/* LADO DIREITO: FORMULÁRIO PADRÃO */}
        <S.FormSection>
          <S.FormWrapper>
            <S.WelcomeText>Bem-vindo!</S.WelcomeText>
            <S.FormSubtitle>
              Por favor, insira seus dados de acesso para continuar.
            </S.FormSubtitle>

            <S.Form onSubmit={handleSubmit}>
              <S.InputGroup>
                <S.Label htmlFor="email">E-mail</S.Label>
                <S.Input
                  id="email"
                  type="email"
                  placeholder="exemplo@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </S.InputGroup>

              <S.InputGroup>
                <S.Label htmlFor="password">Senha</S.Label>
                <S.Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </S.InputGroup>

              <S.Row>
                <S.CheckboxLabel htmlFor="remember">
                  <input
                    id="remember"
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                  />{" "}
                  Lembrar de mim
                </S.CheckboxLabel>
                <S.ForgotLink href="#esqueceu">Esqueceu a senha?</S.ForgotLink>
              </S.Row>

              <S.Button type="submit">Entrar no Sistema</S.Button>
            </S.Form>

            <S.Divider>ou</S.Divider>
            <S.GoogleButtonContainer>
              <div ref={googleButtonRef} />
              {googleStatus !== "ready" && (
                <S.GoogleFallbackButton
                  type="button"
                  onClick={initializeGoogleLogin}
                  disabled={googleStatus === "loading"}
                >
                  {googleStatus === "loading"
                    ? "Carregando login com Google..."
                    : "Tentar carregar login com Google"}
                </S.GoogleFallbackButton>
              )}
            </S.GoogleButtonContainer>
            {googleMessage && <S.GoogleHint>{googleMessage}</S.GoogleHint>}

            <S.RegisterText>
              Não tem uma conta? <a href="/register">Cadastre-se aqui</a>
            </S.RegisterText>
          </S.FormWrapper>
        </S.FormSection>
      </S.Container>
    </ThemeProvider>
  );
}
