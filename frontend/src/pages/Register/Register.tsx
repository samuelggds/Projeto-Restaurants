import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { toast } from 'react-toastify';
import { ThemeProvider } from 'styled-components';
import { Utensils, Sun, Moon } from 'lucide-react';
import authService from '../../Services/authService'; // Ajuste o caminho conforme seu projeto
import {
  evaluatePassword,
  PasswordRequirements,
  STANDARD_PASSWORD_POLICY,
} from '../../features/password-policy';
import * as S from './styles';
import { useRestaurantLoginBranding } from '../Login/hooks/useRestaurantLoginBranding';

export default function Register() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const branding = useRestaurantLoginBranding(searchParams);
  const [isDarkMode, setIsDarkMode] = useState(false);

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const passwordEvaluation = evaluatePassword(
    password,
    confirmPassword,
    STANDARD_PASSWORD_POLICY,
  );
  const passwordHasError =
    password.length > 0 &&
    passwordEvaluation.requirements.some(
      (requirement) => requirement.id !== 'confirmation' && !requirement.met,
    );
  const confirmationHasError =
    confirmPassword.length > 0 &&
    passwordEvaluation.requirements.some(
      (requirement) => requirement.id === 'confirmation' && !requirement.met,
    );

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!passwordEvaluation.isValid) {
      toast.error(passwordEvaluation.errors[0]);
      return;
    }

    try {
      // Ajuste os campos enviados de acordo com o que o seu Back-end espera
      await authService.register({
        name,
        email,
        password,
        confirmPassword,
      });

      toast.success('Cadastro realizado com sucesso! Faça login para continuar.');
      navigate('/login'); // Redireciona para o login após sucesso
    } catch (error) {
      error.message = 'Erro ao realizar cadastro , Email ou senha inválidos!';
      toast.error(error.message);
    }
  };

  return (
    <ThemeProvider
      theme={{
        ...(isDarkMode ? S.darkTheme : S.lightTheme),
        primary: branding.primaryColor,
        primaryHover: branding.primaryColor,
      }}
    >
      <S.Container>
        {/* INTERRUPTOR DE TEMA (SOL/LUA) NO TOPO */}
        <S.TopBar>
          <S.ThemeToggleButton
            type="button"
            aria-label={isDarkMode ? 'Ativar tema claro' : 'Ativar tema escuro'}
            onClick={() => setIsDarkMode(!isDarkMode)}
          >
            {isDarkMode ? <Sun size={18} /> : <Moon size={18} />}
          </S.ThemeToggleButton>
        </S.TopBar>

        {/* LADO ESQUERDO: BANNER INSTITUCIONAL PADRÃO */}
        <S.BannerSection $hasLogo={Boolean(branding.logoUrl)}>
          <S.BrandTitle>
            {branding.logoUrl ? (
              <S.RestaurantLogo src={branding.logoUrl} alt={`Logo ${branding.name}`} />
            ) : (
              <Utensils size={32} strokeWidth={2.5} />
            )}
            <span>{branding.name}</span>
          </S.BrandTitle>
          <S.BrandSubtitle>
            Crie sua conta em poucos segundos e tenha acesso completo ao nosso cardápio, histórico
            de pedidos na mesa e benefícios exclusivos de fidelidade.
          </S.BrandSubtitle>
        </S.BannerSection>

        {/* LADO DIREITO: FORMULÁRIO DE CADASTRO */}
        <S.FormSection>
          <S.FormWrapper>
            <S.WelcomeText>Criar Conta</S.WelcomeText>
            <S.FormSubtitle>
              Preencha os campos abaixo de maneira rápida para começar.
            </S.FormSubtitle>

            <S.Form onSubmit={handleSubmit}>
              {/* Campo Nome */}
              <S.InputGroup>
                <S.Label htmlFor="name">Nome Completo</S.Label>
                <S.Input
                  id="name"
                  type="text"
                  placeholder="Seu nome completo"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                />
              </S.InputGroup>

              {/* Campo E-mail */}
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

              {/* Campo Senha */}
              <S.InputGroup>
                <S.Label htmlFor="password">Senha</S.Label>
                <S.Input
                  id="password"
                  type="password"
                  placeholder="Mínimo 8 caracteres"
                  autoComplete="new-password"
                  minLength={STANDARD_PASSWORD_POLICY.minLength}
                  maxLength={STANDARD_PASSWORD_POLICY.maxLength}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  aria-invalid={passwordHasError}
                  aria-describedby="register-password-requirements"
                  required
                />
              </S.InputGroup>

              {/* Campo Confirmar Senha */}
              <S.InputGroup>
                <S.Label htmlFor="confirmPassword">Confirmar Senha</S.Label>
                <S.Input
                  id="confirmPassword"
                  type="password"
                  placeholder="Repita sua senha"
                  autoComplete="new-password"
                  minLength={STANDARD_PASSWORD_POLICY.minLength}
                  maxLength={STANDARD_PASSWORD_POLICY.maxLength}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  aria-invalid={confirmationHasError}
                  aria-describedby="register-password-requirements"
                  required
                />
              </S.InputGroup>

              <PasswordRequirements
                id="register-password-requirements"
                password={password}
                confirmation={confirmPassword}
                policy={STANDARD_PASSWORD_POLICY}
              />

              <S.Button type="submit" disabled={!passwordEvaluation.isValid}>
                Finalizar Cadastro
              </S.Button>
            </S.Form>

            <S.RegisterText>
              Já possui uma conta? <a href="/login">Fazer Login</a>
            </S.RegisterText>
          </S.FormWrapper>
        </S.FormSection>
      </S.Container>
    </ThemeProvider>
  );
}
