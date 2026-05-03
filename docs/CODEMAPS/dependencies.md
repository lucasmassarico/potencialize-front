<!-- Generated: 2026-04-26 | Files scanned: package.json | Token estimate: ~400 -->

# Dependências — potencialize-front

## Runtime Dependencies

| Pacote | Versão | Uso |
|--------|--------|-----|
| react | ^19.1.1 | Framework UI |
| react-dom | ^19.1.1 | Renderização DOM |
| react-router-dom | ^7.9.1 | Roteamento SPA |
| @mui/material | ^7.3.2 | Componentes UI (Material Design) |
| @mui/icons-material | ^7.3.2 | Ícones MUI |
| @emotion/react | ^11.14.0 | CSS-in-JS (peer dep MUI) |
| @emotion/styled | ^11.14.1 | CSS-in-JS estilizado |
| @fontsource/inter | ^5.2.8 | Fonte Inter auto-hospedada |
| @tanstack/react-query | ^5.89.0 | Cache e sincronização de estado servidor |
| axios | ^1.12.2 | Cliente HTTP com interceptors |
| react-hook-form | ^7.62.0 | Estado de formulários performático |
| @hookform/resolvers | ^5.2.2 | Integração RHF + Zod |
| zod | ^4.1.9 | Validação de schema em runtime |
| dayjs | ^1.11.18 | Manipulação de datas (substituto leve do moment) |

## Dev Dependencies

| Pacote | Versão | Uso |
|--------|--------|-----|
| vite | ^7.1.6 | Build tool e dev server |
| @vitejs/plugin-react | ^5.0.2 | Suporte React + Fast Refresh no Vite |
| typescript | ~5.8.3 | Compilador TypeScript |
| @types/react | ^19.1.13 | Tipos React |
| @types/react-dom | ^19.1.9 | Tipos ReactDOM |
| eslint | ^9.35.0 | Linting |
| typescript-eslint | ^8.8.0 | Regras ESLint para TypeScript |

## Serviços Externos

| Serviço | Integração | Arquivo |
|---------|-----------|---------|
| Backend API (Python/Flask) | Axios REST | src/api/http.ts |

## Notas de Versão

- **React 19**: Concurrent features disponíveis; `use` hook nativo
- **MUI 7**: Suporte a React 19
- **Zod 4**: API ligeiramente diferente da v3 (`.parse` vs `.safeParse`)
- **React Router 7**: Framework mode disponível (não usado aqui — modo library)
