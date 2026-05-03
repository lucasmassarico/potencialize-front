<!-- Generated: 2026-04-26 | Files scanned: 85+ | Token estimate: ~700 -->

# Arquitetura Geral — potencialize-front

## Stack

| Camada | Tecnologia |
|--------|-----------|
| UI | React 19 + Material-UI 7 |
| Linguagem | TypeScript 5.8 (strict mode) |
| Build | Vite 7 |
| Roteamento | React Router 7 |
| Estado Servidor | TanStack Query 5 |
| Estado Auth | React Context (AuthProvider) |
| HTTP | Axios 1.12 |
| Formulários | React Hook Form 7 + Zod 4 |
| Datas | Day.js |

## Fluxo Geral da Aplicação

```
index.html
  └── main.tsx
        ├── ThemeProvider (MUI v7)
        ├── QueryClientProvider (TanStack Query)
        └── AuthProvider (Context)
              └── App.tsx
                    └── AppRoutes (React Router)
                          ├── /login → Login.tsx
                          ├── ProtectedRoute (verifica auth)
                          │     └── AppLayout (sidebar + outlet)
                          │           ├── /              → Dashboard
                          │           ├── /descriptors   → DescriptorsList
                          │           ├── /classes       → ClassesList
                          │           ├── /classes/:id   → ClassDetail (tabs)
                          │           └── /assessments/:id → AssessmentDetail (tabs)
                          └── * → NotFound
```

## Autenticação e Segurança

```
Login → POST /api/v1/auth/login
  └── tokens recebidos
        ├── access_token → memória (tokenStorage.ts)
        └── refresh_token → localStorage

Axios Interceptor (src/api/http.ts)
  ├── Request: Authorization: Bearer <access_token>
  └── Response 401: auto-refresh → fila de requisições pendentes
```

## Fonte de Verdade por Responsabilidade

| Responsabilidade | Arquivo |
|-----------------|---------|
| Rotas | src/routes/index.tsx |
| Auth state | src/hooks/useAuth.tsx |
| HTTP client | src/api/http.ts |
| Tema visual | src/theme.ts + src/design/tokens.json |
| Env vars | .env.example |
