# Admin isolado

Módulo administrativo em React + TypeScript + styled-components.

Ele foi preparado para ser usado somente na rota `/admin`. As áreas **Settings** e **Employees** alternam internamente, sem criar `/settings` ou `/admin/employees`.

## Dependências

```bash
npm install styled-components lucide-react
```

## Uso

```tsx
import { AdminPage } from './modules/admin'

<Route path="/admin" element={
  <AdminPage
    onSaveSettings={(settings) => api.saveSettings(settings)}
    onCreateEmployee={(employee) => api.createEmployee(employee)}
    onUpdateEmployee={(employee) => api.updateEmployee(employee)}
    onViewStore={() => navigate('/home')}
  />
} />
```

Sem propriedades, a tela usa dados demonstrativos. O componente não depende de `react-router-dom` nem de `ThemeProvider`.
