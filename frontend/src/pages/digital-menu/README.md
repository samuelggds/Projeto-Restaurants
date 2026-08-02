# Cardápio digital de mesa

Pasta independente em React + TypeScript + styled-components. O componente não depende de `react-router-dom` ou `ThemeProvider`.

## Dependências

```bash
npm install styled-components lucide-react
```

## Uso

```tsx
import { DigitalMenuPage } from './modules/digital-menu'

<DigitalMenuPage
  onCallWaiter={() => api.callWaiter()}
  onRequestBill={() => api.requestBill()}
  onSubmitOrder={(items) => api.createTableOrder(items)}
/>
```

Passe `data` com restaurante, mesa, categorias, produtos e status retornados pelo backend. Sem essa propriedade, a tela utiliza dados demonstrativos.

No celular a sidebar desaparece, o conteúdo ocupa toda a tela e o resumo do pedido permanece fixo na parte inferior.
