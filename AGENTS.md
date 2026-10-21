# MeuPaciente — Diretrizes para Agentes de Desenvolvimento (AGENTS.md)

Prontuário veterinário (cães e gatos) voltado a profissionais autônomos.
Monorepo Turborepo estruturado em:
- `apps/backend`: NestJS 10 + Prisma 6 + PostgreSQL 16
- `apps/frontend`: React 18 + Vite PWA + CSS Modules
- `packages/shared`: DTOs, enums e contratos tipados compartilhados por ambos

**Idioma oficial do projeto:** Português (pt-BR) para interface, comentários, mensagens de erro, documentação e mensagens de commit.

---

## 1. Fontes da Verdade & Documentação

Consulte e mantenha atualizados os seguintes arquivos antes e durante qualquer desenvolvimento:

- `docs/architecture.md`: Escopo do MVP, modelagem do banco (Prisma schema), padrões de API, ADRs e princípios arquiteturais. **Leitura obrigatória antes de decisões estruturais.**
- `docs/openapi.yaml`: Contrato oficial da API (OpenAPI 3.1). Validar sempre com:
  ```bash
  npx @redocly/cli@1 lint docs/openapi.yaml
  ```
- `docs/checklist.md`: Progresso e rastreamento de entregas item a item. Atualize sempre que concluir uma tela ou funcionalidade.
- `design/`: Telas e especificações visuais de design (armazenadas apenas localmente, no `.gitignore`).
  - **O Design System (`src/styles/tokens.css` e componentes) é regra absoluta; as telas Hi-Fi são apenas guia.**
  - As referências de telas vieram de protótipos originais de felinos: **sempre adaptar para cães e gatos** (MeuPaciente) e nunca inventar nem exibir métricas ou promessas que o sistema/API não suporte.

---

## 2. Comandos e Ambiente de Desenvolvimento

### Setup e Serviços Básicos
```bash
npm install                          # Executar na raiz do monorepo
cp .env.example .env                 # Arquivo de ambiente único na raiz (compartilhado por backend e frontend)
docker compose up -d                 # Postgres local (porta 5432) e Mailpit para testes de e-mail (web: http://localhost:8025)
npm run build -w @meupaciente/shared # REBUILD OBRIGATÓRIO após alterar DTOs/enums em packages/shared
```

### Execução dos Serviços
- **Via Turborepo (raiz):**
  ```bash
  npm run dev                          # Executa backend e frontend concorrentemente
  ```
- **Backend isolado (`apps/backend`):**
  ```bash
  npm run dev -w @meupaciente/backend  # Inicia API em http://localhost:3000/v1
  npm run db:migrate                   # Aplica migrations do Prisma
  npm run db:seed                      # Popula banco inicial
  npm test                             # Testes unitários (sem banco de dados)
  npm run test:e2e                     # Testes ponta a ponta (requer Postgres; roda no schema isolado test_e2e)
  ```
- **Frontend isolado (`apps/frontend`):**
  ```bash
  npm run dev -w @meupaciente/frontend # Servidor Vite em http://localhost:5173 (porta fixa necessária para CORS)
  ```

### Verificação Estática e Qualidade (Frontend)
```bash
npx tsc --noEmit -p tsconfig.json && npx eslint "src/**/*.{ts,tsx}" && npx vite build
```

### Credenciais Padrão do Seed
- **E-mail:** `teste@meupaciente.com`
- **Senha:** `teste123`

---

## 3. Convenções de Código e Princípios Arquiteturais

Baseado na **Seção 10.4 da Arquitetura**:

1. **Simplicidade primeiro:** Adicionar complexidade somente quando um problema real exigir. Não implementar recursos desnecessários para o escopo do MVP.
2. **Foco no profissional autônomo:** Uso rápido, intuitivo, muitas vezes em trânsito ou entre atendimentos clínicos. Fluxos sem atritos.
3. **Código escrito para ser lido:**
   - Nomes de variáveis, funções, classes e constantes descritivos, sem abreviações crípticas.
   - Preferir estruturas simples e diretas a abstrações prematuras.
   - Comentários existem **apenas para explicar o que o código sozinho não revela** (regras de negócio, restrições técnicas, decisões não óbvias). Nunca narrar o óbvio.
   - **Comentários e mensagens em português (pt-BR).**
4. **Hierarquia de prioridade em refatoração:**
   $$\text{Funcionamento atual} > \text{Preservação da lógica} > \text{Legibilidade} > \text{Estética do código}$$
   Se uma alteração puder introduzir risco ou alterar comportamento, ela **não** deve ser feita.
5. **Fronteiras de módulos são contratos:** Módulos NestJS comunicam-se somente por meio de suas interfaces e serviços públicos exportados.

### Padrões da API REST
- Nomenclatura de endpoints e propriedades em JSON: `snake_case`.
- Datas em strings no formato estrito `YYYY-MM-DD` (apenas data).
- Formato padronizado de erro: RFC 7807 (Problem Details).
- Semântica de `PATCH` parcial:
  - Campo ausente: valor atual não é modificado.
  - Campo com valor `null`: limpa campos anuláveis; retorna `422 Unprocessable Entity` para campos obrigatórios.
- **Multitenancy e Isolamento:** Recurso pertencente a outro usuário responde `404 Not Found` (nunca `403 Forbidden`).
- **Telefones:** Devem ser persistidos no banco **exclusivamente com dígitos** (a busca indexada depende dessa regra).
- **Espécie:** Campo de texto livre (ADR-008). O frontend sugere `Cão` / `Gato` / `Outra`.
- **Sexo:** O frontend apresenta `Macho` / `Fêmea` (sem opção "Não sei"). Se o usuário não selecionar, a API grava `UNKNOWN` ("não informado").

---

## 4. Frontend: Design System e Arquitetura de Telas

### Estilização e Design Tokens
- Utilizar **CSS Modules** + `src/styles/tokens.css`.
- Os componentes utilizam **exclusivamente tokens semânticos** (`--color-*`, `--type-*`, `--space-*`, etc.).
- **Proibido:** Usar tokens primitivos (ex.: `--primary-600`) ou códigos hexadecimais (`#...`) diretamente nos componentes.
- O tema escuro redefine apenas os tokens semânticos dentro do seletor `[data-theme='dark']`.
- Suporte a temas: `Sistema` / `Claro` / `Escuro` (gerenciado em `lib/theme.ts` e aplicado via script no `index.html` para evitar flickering).

### Diretrizes de Acessibilidade e Design System (DS)
- **Alvos de toque (tap targets):** $\ge 44\text{px}$.
- **Campos de formulário:** $\ge 48\text{px}$ ($\ge 52\text{px}$ em telas mobile).
- **Tamanho de texto de input:** Exatamente `16px` para prevenir zoom automático indesejado no iOS.
- **Rótulos (labels):** Sempre visíveis sobre o campo; campos opcionais identificados com `(opcional)`.
- **Hierarquia de ações:** No máximo uma ação primária em destaque por tela/visão.
- **Indicação de status:** Cor nunca é o único indicador (sempre acompanhar com ícone ou texto descritivo).
- **Tipografia clínica:** Dados clínicos (peso, datas, telefone, dosagens) utilizam a fonte `IBM Plex Mono`. Textos gerais da interface usam `IBM Plex Sans`.
- **Uso de cores semânticas:**
  - *Terracota*: Restrito a avatar de paciente, marcadores da timeline e linhas/pontos de gráfico de peso.
  - *Teal*: Reservado exclusivamente para ações e controles interativos.

### Componentes Prontos (`src/components`)
Reaproveite a biblioteca de componentes existente antes de criar qualquer componente novo:
- `AppShell`, `AuthLayout`, `Alert`, `Avatar`, `Badge`, `BrandMark`
- `Button` e `ButtonLink` (variantes: `primary`, `secondary`, `ghost`, `destructive`)
- `Checkbox`, `DeleteDialog` (confirmação ou detalhamento de bloqueio por vínculos / 409)
- `Dialog` (construído sobre a tag nativa `<dialog>`, suporte a tamanhos `sm`/`md`, se transforma em bottom sheet no mobile, com foco no elemento com `data-autofocus`)
- `EmptyState`, `ListPage` (tabela em telas $\ge 768\text{px}$ e lista agrupada no mobile; inclui `Pagination` e `ListSkeleton`)
- `LocationDialog`, `TutorDialog` (modais reutilizáveis de cadastro/edição rápida em fluxos de formulários)
- `PasswordStrength`, `PhotoPicker`, `SearchField`, `Segmented`, `Select`, `Tabs`, `Textarea` (auto-grow), `TextField`, `Toast`, `TutorPicker`.

### Camada de Dados e Roteamento
- `lib/api.ts`: Cliente HTTP com função `apiRequest`. Executa rotação segura e concorrente do refresh token.
- `lib/useApiQuery.ts`: Hook de busca (passar path `null` cancela ou desativa a consulta).
- `lib/useListSearch.ts`: Sincroniza busca e paginação na query string da URL, com atalho de teclado `/`.
- `auth/AuthContext.tsx`: Contexto de autenticação (`updateUser` pós-edição de perfil; `changePassword` reautentica o usuário, pois a API invalida todas as sessões anteriores).
- Utilitários em `lib/`: Manipulação de datas, pesagens, validações e vacinas.
- **Rotas em português:** `/inicio`, `/esqueci-senha`, `/redefinir-senha?token=`, `/pacientes`, `/pacientes/:id?aba=historico`, `/pacientes/:id/editar`, `/pacientes/:id/atendimentos/novo`, `/tutores`, `/locais`, `/perfil`.
- O destino padrão pós-login é `/inicio`.
- Telas de cadastro e edição compartilham a mesma página (`PatientFormPage`, `AppointmentFormPage`).
- **Regra de Negócio Crucial:** O tutor de um paciente **nunca muda** após a criação (a API rejeita intencionalmente `tutor_id` no PATCH).

---

## 5. Armadilhas Conhecidas (Gotchas Técnicos)

1. **Pacote `@meupaciente/shared` (CommonJS):**
   - O `vite.config.ts` precisa manter o shared em `optimizeDeps`. Sem isso, a importação de enums compartilhados (como `Sex`) falha em runtime no navegador.
2. **Tipagem no Backend:**
   - `apps/backend/tsconfig.json` precisa manter `"types": ["node", "jest"]`. Sem o tipo `node`, o script de seed quebra na compilação.
3. **Serviço de E-mail (Recuperação de Senha):**
   - Implementado em `modules/email` com a abstração `EmailSender` (ADR-011).
   - Localmente: Usa Mailpit via `SMTP_HOST=localhost` e `SMTP_PORT=1025`.
   - Produção: Gmail via SMTP ou Resend (`RESEND_API_KEY`).
   - Sem credenciais: O token de recuperação é impresso no log do backend.
   - O disparo utiliza `waitUntil` da Vercel. Testes e2e usam captura simulada (nunca disparam e-mail real).
4. **Prisma ORM fixado em 6.x:**
   - Não atualizar para Prisma 7, pois a versão 7 altera a sintaxe de datasource homologada na arquitetura.
5. **Deploy na Vercel (ADR-012):**
   - Projetos `meupaciente-api` (`apps/backend`) e `meupaciente` (`apps/frontend`).
   - O comando de instalação compila o pacote `shared` (`prepare`) e gera o client do Prisma (`postinstall`). As migrations executam no `installCommand` de `apps/backend/vercel.json` somente em produção via `DATABASE_URL_UNPOOLED` do Neon.
6. **Automação de Testes e Navegador Headless:**
   - Em sessões headless via Chrome DevTools Protocol:
     - Configurar emulação (`Emulation.setDeviceMetricsOverride`, `setEmulatedMedia`, `setFocusEmulationEnabled`).
     - Injetar refresh token válido diretamente no `localStorage`.
     - Para interagir com `<dialog>`, disparar cliques com `Input.dispatchMouseEvent` (chamadas puras de `.click()` não geram ativação de usuário pelo browser e provocam fechamento anômalo com Esc).

---

## 6. Fluxo de Trabalho e Qualidade

- **Commits atômicos por tema:**
  - Dividir commits por assunto bem delimitado (infraestrutura, componentes, uma tela específica, backend, documentação).
  - Cada commit deve compilar de forma independente sem quebrar a árvore.
  - Seguir o padrão **Conventional Commits em português com acentuação**:
    - `feat: adicionar listagem de tutores`
    - `fix: corrigir validação de telefone no formulário`
    - `docs: atualizar checklist de pacientes`
- **Validação ao concluir uma tela/feature:**
  - Executar verificação de tipos e lint: `npx tsc --noEmit -p tsconfig.json && npx eslint "src/**/*.{ts,tsx}" && npx vite build`
  - Rodar testes pertinentes (`npm test`).
  - Verificar visualmente em desktop, mobile e tema escuro.
  - Atualizar o `docs/checklist.md`.
  - Commitar o tema.
- **REGRA DE OURO:**
  - **NUNCA executar `git push` sem solicitação expressa do usuário.**
