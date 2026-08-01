# Profile isolado

Pasta independente da tela de perfil em React + TypeScript + styled-components.

## Dependências

```bash
npm install styled-components lucide-react
```

## Uso

Copie `profile` para `src/modules/profile`:

```tsx
import { ProfilePage } from './modules/profile'

<ProfilePage
  onGoHome={() => navigate('/home')}
  onOpenMenu={() => navigate('/menu')}
  onTrackOrder={(id) => navigate(`/orders/${id}/tracking`)}
  onLogout={logout}
/>
```

Passe `data` com as informações retornadas pelo backend. Sem essa propriedade, a página usa `profileMockData` para demonstração. O componente não depende de `react-router-dom`, `ThemeProvider` ou estilos globais.
