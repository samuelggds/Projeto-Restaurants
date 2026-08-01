# Home isolada

Esta pasta contém somente a tela Home em React + TypeScript + styled-components.

## Dependências

```bash
npm install styled-components lucide-react
```

## Uso

Copie a pasta `home` para `src/modules/home` e importe:

```tsx
import { HomePage } from './modules/home'

export function App() {
  return (
    <HomePage
      onOpenMenu={() => navigate('/menu')}
      onOpenProfile={() => navigate('/profile')}
      onOpenCart={() => navigate('/cart')}
      onAddProduct={(productId) => console.log(productId)}
    />
  )
}
```

Passe a propriedade `data` com os dados do seu backend. Enquanto ela não for enviada, a página utiliza `homeMockData` para pré-visualização.

O componente não depende de `react-router-dom`, `ThemeProvider` ou estilos globais do projeto.
