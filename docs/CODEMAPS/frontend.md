<!-- Generated: 2026-04-26 | Files scanned: 85+ | Token estimate: ~900 -->

# Frontend Codemap — potencialize-front

## Rotas / Páginas

```
/login                      → src/pages/Login.tsx
/                           → src/pages/Dashboard.tsx
/descriptors                → src/pages/descriptors/DescriptorsList.tsx
/classes                    → src/pages/classes/ClassesList.tsx
/classes/:id                → src/pages/classes/ClassDetail.tsx
  ├── (index)               → src/pages/classes/tabs/ClassOverview.tsx
  ├── assessments           → src/pages/classes/tabs/ClassAssessments.tsx
  └── students              → src/pages/classes/tabs/ClassStudents.tsx
/assessments/:assessmentId  → src/pages/assessments/AssessmentDetail.tsx
  ├── (index)               → src/pages/assessments/tabs/AssessmentOverview.tsx
  ├── matrix                → src/pages/assessments/tabs/AssessmentMatrix.tsx
  ├── weights               → src/pages/assessments/tabs/AssessmentWeights.tsx
  ├── questions             → src/pages/assessments/tabs/AssessmentQuestions.tsx
  └── grading-policy        → src/pages/assessments/tabs/AssessmentGradingPolicyTab.tsx
*                           → src/pages/NotFound.tsx
```

## Componentes Reutilizáveis (src/components/)

| Componente | Propósito |
|-----------|-----------|
| AppLayout.tsx | Shell principal: sidebar + `<Outlet />` |
| CenteredLoader.tsx | Spinner centralizado na tela |
| LoadingOverlay.tsx | Overlay de loading sobre conteúdo |
| ConfirmDialog.tsx | Modal genérico de confirmação |
| PageGuard.tsx | Wrapper que oculta conteúdo por role |
| Skeletons.tsx | Skeleton loaders (MUI Skeleton) |
| DescriptorsCombo.tsx | Select assíncrono de descritores |
| TeachersCombo.tsx | Select assíncrono de professores |
| classes/ClassFormDialog.tsx | Dialog de criação/edição de turma |
| states/ErrorState.tsx | Estado de erro inline |
| states/NotFound.tsx | Estado 404 inline |

## Componentes de Tela (feature-scoped, dentro de pages/)

### assessments/components/
| Componente | Propósito |
|-----------|-----------|
| AssessmentSubnav.tsx | Navegação por abas da avaliação |
| QuestionFormDialog.tsx | CRUD de questão |
| QuestionsBulkDialog.tsx | Importação em lote de questões |
| AnswersBulkDialog.tsx | Importação em lote de respostas |
| StudentGradeDialog.tsx | Lançamento de nota do aluno |

### classes/components/
| Componente | Propósito |
|-----------|-----------|
| ClassSubnav.tsx | Navegação por abas da turma |
| AssessmentFormDialog.tsx | Criação de avaliação dentro da turma |
| StudentFormDialog.tsx | CRUD de aluno |
| StudentsBulkDialog.tsx | Importação em lote de alunos |

### descriptors/components/
| Componente | Propósito |
|-----------|-----------|
| DescriptorFormDialog.tsx | CRUD de descritor/habilidade |

## Hooks Customizados (src/hooks/)

| Hook | Retorno | Descrição |
|------|---------|-----------|
| useAuth() | `{ user, loading, login, logout }` | Context de autenticação; auto-refresh no mount |
| useDescriptors() | TanStack Query result | Busca lista de descritores |
| useTeachers() | TanStack Query result | Busca lista de professores |
| useClassContext() | dados da turma | Hook local em pages/classes/tabs/ |

## Contextos / Providers (src/hooks/useAuth.tsx)

```
AuthProvider
  ├── estado: user (decoded JWT payload) | loading | error
  ├── login(body) → POST /auth/login → armazena tokens
  ├── logout()    → limpa memória + localStorage
  └── auto-refresh no mount se refreshToken existir no localStorage
```

Provider stack em main.tsx (de fora para dentro):
```
ThemeProvider → QueryClientProvider → AuthProvider → App
```

## Camada de API / Services (src/api/)

| Arquivo | Endpoints cobertos |
|---------|-------------------|
| http.ts | Instância Axios, interceptors de auth e 401-refresh |
| auth.ts | login, refresh, logout |
| assessments.ts | CRUD + pesos + política de aprovação |
| classes.ts | CRUD de turmas |
| students.ts | CRUD de alunos |
| questions.ts | CRUD de questões |
| studentAnswers.ts | Submissão e listagem de respostas |
| studentResults.ts | Resultados/notas agregadas |
| descriptors.ts | CRUD de descritores |
| teachers.ts | Listagem de professores |
| apiError.ts | Classificação de erros da API |

## Tipos / Interfaces (src/types/)

| Arquivo | Tipos principais |
|---------|-----------------|
| auth.ts | `Role`, `LoginBody`, `LoginResponse`, `RefreshResponse` |
| assessments.ts | `Assessment`, `WeightMode`, `SkillLevel` |
| classes.ts | `Class`, `ClassPayload` |
| students.ts | `Student`, `StudentPayload` |
| questions.ts | `Question`, `Option` |
| descriptors.ts | `Descriptor` |
| studentAnswers.ts | `StudentAnswer`, `AnswerPayload` |
| studentResults.ts | `StudentResult`, `SkillSummary` |
| teachers.ts | `Teacher` |

**Enums importantes:**
- `Role`: `"admin"` | `"teacher"`
- `WeightMode`: `"fixed_all"` | `"by_skill"` | `"per_question"`
- `SkillLevel`: `"abaixo"` | `"basico"` | `"adequado"` | `"avancado"`
- `SubjectKind`: matérias escolares (português, matemática…)

## Utils / Helpers

| Arquivo | Exports |
|---------|---------|
| src/utils/utils.ts | `toTitleCase(str)` |
| src/lib/tokenStorage.ts | `getAccessToken`, `setAccessToken`, `clearTokens` |
| src/lib/jwt.ts | `decodeJwt(token)` |
| src/lib/csrf.ts | `getCsrfToken`, `setCsrfToken` |
| src/lib/apiErrors.ts | `isApiError`, `extractErrorMessage` |
| src/lib/error.ts | Classes de erro customizadas |
| src/lib/dayjs.ts | Configuração global do Day.js (locale, plugins) |

## Configuração do Vite (vite.config.ts)

```typescript
// Configuração mínima — sem aliases, sem proxy configurado
export default defineConfig({
  plugins: [react()],   // @vitejs/plugin-react — Fast Refresh
})
```

## Variáveis de Ambiente (.env.example)

| Variável | Valor padrão | Descrição |
|---------|-------------|-----------|
| `VITE_API_BASE_URL` | `http://127.0.0.1:5000/api/v1` | URL base da API backend |
| `VITE_AUTH_MODE` | `bearer` | Modo de auth: `bearer` ou `cookie` |

Uso em código: `import.meta.env.VITE_API_BASE_URL` (injetado em build pelo Vite).
