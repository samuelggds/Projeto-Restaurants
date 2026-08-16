import { ThemeProvider } from 'styled-components';
import { Cog } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import * as S from './styles';

const theme = {};

export default function SystemMaintenancePage() {
  const navigate = useNavigate();

  return (
    <ThemeProvider theme={theme}>
      <S.Page>
        <S.GearWrap>
          <Cog size={62} strokeWidth={1.8} />
        </S.GearWrap>
        <S.Title>Sistema em manutenção</S.Title>
        <S.BackButton type="button" onClick={() => navigate('/login')}>
          Voltar para login
        </S.BackButton>
      </S.Page>
    </ThemeProvider>
  );
}
