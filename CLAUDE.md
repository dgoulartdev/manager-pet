# MeuPaciente — guia para o Claude

Prontuário veterinário (cães e gatos) para profissionais autônomos. Monorepo Turborepo:
`apps/backend` (NestJS 10 + Prisma 6 + PostgreSQL 16), `apps/frontend` (React 18 + Vite PWA),
`packages/shared` (DTOs e enums usados pelos dois). Idioma do projeto: português (pt-BR).

## Fontes da verdade

- `docs/architecture.md` — escopo do MVP, schema, padrões de API e ADRs (leia antes de decisões estruturais).
- `docs/openapi.yaml` — contrato da API (OpenAPI 3.1). Validar com `npx @redocly/cli@1 lint docs/openapi.yaml`.
- `docs/checklist.md` — progresso item a item. Atualize ao concluir uma tela/feature.
- `design/` — telas do Claude Design. **O Design System é regra; as telas Hi-Fi são só guia.**
  A Hi-Fi foi feita para "Gerenciamento Felinos" (marca antiga) e cita dados que a API não tem:
  adaptar para MeuPaciente (cães e gatos) e nunca mostrar números/promessas que o sistema não sustenta.

## Comandos

```bash
npm install                          # na raiz
cp .env.example .env                 # .env único na raiz, lido por backend e frontend
docker compose up -d                 # Postgres local (porta 5432)
npm run build -w @meupaciente/shared # rebuild obrigatório depois de mudar DTOs em packages/shared

# backend (em apps/backend)
npm run db:migrate | db:seed | dev   # dev em http://localhost:3000/v1
npm test                             # unitários (sem banco)
npm run test:e2e                     # e2e (precisa do Postgres; usa o schema isolado test_e2e)

# frontend (em apps/frontend)
npm run dev                          # http://localhost:5173 (porta fixa: o CORS libera só ela)
npx tsc --noEmit -p tsconfig.json && npx eslint "src/**/*.{ts,tsx}" && npx vite build
```

Seed: `teste@meupaciente.com` / `teste123`.

## Convenções de código

- Princípios da seção 10.4 da arquitetura: código escrito para ser lido, nomes descritivos,
  comentários só para o que o código não mostra, **comentários e mensagens em português**.
- API: `snake_case`, datas `YYYY-MM-DD` (só data), erros RFC 7807, PATCH parcial (ausente não muda;
  `null` limpa anuláveis e é 422 em obrigatórios), recurso de outro usuário responde 404 (nunca 403).
- Telefones são gravados **só com dígitos** (a busca por telefone depende disso).
- Espécie é texto livre (ADR-008); o frontend oferece Cão / Gato / Outra. Sexo: Macho / Fêmea
  (sem "Não sei"); sem escolha, a API grava `UNKNOWN` ("não informado").

## Frontend

- **Estilo:** CSS Modules + `src/styles/tokens.css`. Componentes usam **só tokens semânticos**
  (`--color-*`, `--type-*`, `--space-*`…), nunca primitivos (`--primary-600`) nem HEX. Tema escuro
  redefine só os semânticos em `[data-theme='dark']` (segue o sistema operacional).
- **Regras do DS aplicadas:** alvos ≥ 44px; campos ≥ 48px (52px no mobile); texto de input 16px;
  rótulo sempre visível e opcional marcado com "(opcional)"; uma ação primária por tela; cor nunca é
  o único sinal (ícone/texto junto); dado clínico (peso, datas, telefone) em JetBrains Mono;
  terracota só em avatar de paciente, marcador de timeline e gráfico de peso; teal só em ações.
- **Peças prontas** (`src/components`): AppShell, AuthLayout, Alert, Avatar, Badge, BrandMark,
  Button/ButtonLink (primary, secondary, ghost, destructive), Checkbox, DeleteDialog (confirmação ou,
  com vínculos/409, explicação do bloqueio), Dialog (sobre `<dialog>`, `size` sm/md, vira bottom sheet
  no mobile, foco no elemento com `data-autofocus`), EmptyState, ListPage (estilos de tela de lista:
  tabela ≥ 768px e cards abaixo; Pagination; ListSkeleton), LocationDialog e TutorDialog (cadastro e
  edição, usados nas telas e nos atalhos dos formulários), PasswordStrength, PhotoPicker, SearchField,
  Segmented, Select, Tabs, Textarea (auto-grow), TextField, Toast, TutorPicker.
- **Dados:** `lib/api.ts` (`apiRequest`, renovação do token com uma única chamada em andamento —
  a API faz rotação do refresh token), `lib/useApiQuery.ts` (caminho `null` = não buscar),
  `lib/useListSearch.ts` (busca e página na URL, com atalho "/"), `auth/AuthContext.tsx`
  (`updateUser` após salvar o perfil; `changePassword` entra de novo com a senha nova, porque a
  API revoga todas as sessões na troca).
  Utilitários em `lib/` (datas, formatação, vacinas, pesagens, validação).
- Rotas em português (`/inicio`, `/pacientes`, `/pacientes/:id?aba=historico`, `/pacientes/:id/editar`,
  `/pacientes/:id/atendimentos/novo`, `/tutores`, `/locais`, `/perfil`). Depois de entrar o app abre
  em `/inicio`. Cadastro e edição usam a mesma página (`PatientFormPage`, `AppointmentFormPage`).
- Decisão de produto: o tutor de um paciente **não muda** depois do cadastro (a API não aceita
  `tutor_id` no PATCH e deve continuar assim).

## Armadilhas conhecidas

- `@meupaciente/shared` é CommonJS: o `vite.config.ts` o pré-processa (`optimizeDeps`), senão importar
  enums (ex.: `Sex`) quebra no navegador. Só tipos funcionariam sem isso.
- `apps/backend/tsconfig.json` precisa de `"types": ["node", "jest"]` (sem `node`, o seed quebra).
- Prisma fixado em 6.x (a 7 muda a sintaxe do datasource aprovada na arquitetura).
- O painel de navegador do app costuma estar oculto: sem screenshots e com `document.hasFocus()` falso
  (eventos de foco não disparam). Para verificação visual, usar Chrome headless via DevTools Protocol
  (`Emulation.setDeviceMetricsOverride`, `setEmulatedMedia` para o tema, `setFocusEmulationEnabled`)
  com o refresh token injetado no `localStorage`. Para testar diálogos, clicar com
  `Input.dispatchMouseEvent`: `.click()` não conta como ativação do usuário e o Chrome agrupa os
  `<dialog>` abertos assim (um Esc fecha todos).

## Fluxo de trabalho

- Commits em **blocos por tema** (infra, componentes, uma tela, backend, docs), cada um compilando
  sozinho; conventional commits em português com acentos. Ao fim de cada tela: verificar
  (tsc, lint, build, testes, screenshots desktop/mobile/escuro) e commitar por tema.
- **Nunca fazer push sem pedido explícito.**
