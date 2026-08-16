import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { toast } from 'react-toastify';
import { ThemeProvider } from 'styled-components';
import { Utensils, Sun, Moon } from 'lucide-react';
import authService from '../../Services/authService'; // Ajuste o caminho conforme seu projeto
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

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Validação básica de senhas incompatíveis antes de enviar para a API
    if (password !== confirmPassword) {
      return toast.error('As senhas não coincidem!');
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
          <S.ThemeToggleButton onClick={() => setIsDarkMode(!isDarkMode)}>
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
                  placeholder="Mínimo 6 caracteres"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
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
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                />
              </S.InputGroup>

              <S.Button type="submit">Finalizar Cadastro</S.Button>
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
