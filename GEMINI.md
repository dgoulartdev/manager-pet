# MeuPaciente — Diretrizes para Gemini & Antigravity (GEMINI.md)

Este documento define as instruções de contexto, estilo de código, arquitetura e fluxo de trabalho para o **Antigravity** e modelos **Gemini** que atuam no repositório **MeuPaciente**.

---

## 1. Visão Geral do Projeto

**MeuPaciente** é um prontuário veterinário (focado em cães e gatos) voltado a profissionais autônomos.
O projeto é organizado como um monorepo Turborepo:

- `apps/backend`: NestJS 10 + Prisma 6 + PostgreSQL 16
- `apps/frontend`: React 18 + Vite PWA + CSS Modules
- `packages/shared`: DTOs, enums e contratos compartilhados entre backend e frontend

**Idioma do projeto:** Todo o código novo, mensagens de commit, comentários no código, mensagens de erro e textos da interface devem ser em **português (pt-BR)**.

---

## 2. Fontes da Verdade & Prioridade de Documentação

Antes de tomar decisões conceituais, estruturais ou alterar fluxos, consulte:

1. `docs/architecture.md`: Escopo do MVP, modelagem do banco (Prisma schema), padrões de API, ADRs e princípios de desenvolvimento. **Leitura prévia obrigatória para qualquer alteração arquitetural.**
2. `docs/openapi.yaml`: Especificação oficial e contrato da API (OpenAPI 3.1). Valide alterações com:
   ```bash
   npx @redocly/cli@1 lint docs/openapi.yaml
   ```
3. `docs/checklist.md`: Rastreamento de progresso item a item. Mantenha atualizado ao concluir telas ou módulos.
4. `design/`: Telas e protótipos de interface locais (não versionados no git).
   - **O Design System (`src/styles/tokens.css` e componentes existentes) é a regra.**
   - As telas Hi-Fi são apenas guias de referência. Protótipos antigos usavam a marca "Gerenciamento Felinos": adapte sempre para MeuPaciente (cães e gatos) e nunca prometa ou apresente dados que a API não possui.

---

## 3. Comandos & Execução de Tarefas

### Configuração Inicial
```bash
npm install                          # Na raiz do monorepo
cp .env.example .env                 # Arquivo .env compartilhado por backend e frontend
docker compose up -d                 # Inicia PostgreSQL (porta 5432) e Mailpit (http://localhost:8025)
npm run build -w @meupaciente/shared # OBRIGATÓRIO reconstruir sempre que alterar DTOs/enums em packages/shared
```

### Servidores de Desenvolvimento (Launch Configurations)
- **Desenvolvimento Geral:**
  ```bash
  npm run dev                          # Executa todo o workspace via Turborepo
  ```
- **Backend isolado (`apps/backend`):**
  ```bash
  npm run dev -w @meupaciente/backend  # Servidor NestJS em http://localhost:3000/v1
  ```
- **Frontend isolado (`apps/frontend`):**
  ```bash
  npm run dev -w @meupaciente/frontend # Servidor Vite em http://localhost:5173 (porta fixa para CORS)
  ```

### Banco de Dados e Testes
- **Backend:**
  - `npm run db:migrate`: Aplica migrations do Prisma.
  - `npm run db:seed`: Popula dados de desenvolvimento.
  - `npm test`: Testes unitários (sem dependência de banco).
  - `npm run test:e2e`: Testes de integração e2e (utiliza schema isolado `test_e2e` no Postgres).
- **Frontend:**
  - Validação completa de tipos, linter e build:
    ```bash
    npx tsc --noEmit -p tsconfig.json && npx eslint "src/**/*.{ts,tsx}" && npx vite build
    ```

### Credenciais Padrão do Seed
- **E-mail:** `teste@meupaciente.com`
- **Senha:** `teste123`

---

## 4. Princípios de Desenvolvimento (Seção 10.4 da Arquitetura)

1. **Simplicidade primeiro:** Complexidade só entra quando estritamente necessária para resolver uma dor concreta do profissional veterinário no MVP.
2. **Experiência do profissional autônomo:** O veterinário atende sozinho e muitas vezes em mobilidade. Fluxos devem ser ágeis, com zero fricção.
3. **Código legível:**
   - Nomes de variáveis, constantes e funções devem ser claros e autoexplicativos, evitando abreviações desnecessárias.
   - Preferir estruturas diretas a soluções indiretas ou sobre-engenharia.
   - Comentários existem unicamente para explicar regras de negócio, limitações técnicas ou decisões não óbvias — nunca para narrar código evidente.
   - **Comentários e mensagens sempre em português.**
4. **Hierarquia de decisão em refatorações:**
   $$\text{Funcionamento atual} > \text{Preservação da lógica} > \text{Legibilidade} > \text{Estética do código}$$
   Nunca altere a lógica de funcionamento pré-existente sob justificativa de limpeza ou cosmética.
5. **Fronteiras de módulos:** Módulos NestJS se comunicam exclusivamente através de suas interfaces públicas exportadas.

### Convenções de API REST
- Endpoints e payloads em `snake_case`.
- Datas representadas exclusivamente como strings `YYYY-MM-DD` (apenas data).
- Respostas de erro padronizadas pelo formato RFC 7807 (Problem Details).
- Semântica de `PATCH` parcial:
  - Propriedade omitida: valor preservado no banco.
  - Propriedade enviada como `null`: limpa o campo se anulável; resulta em `422 Unprocessable Entity` se for obrigatório.
- **Segurança multitenant:** Acesso a recursos pertencentes a outro usuário deve responder `404 Not Found` (nunca `403 Forbidden`).
- **Telefones:** Persistidos **exclusivamente com dígitos** para viabilizar indexação e busca.
- **Espécie:** Texto livre (ADR-008); interface sugere `Cão`, `Gato` ou `Outra`.
- **Sexo:** Frontend exibe `Macho` e `Fêmea` (sem "Não sei"); caso não informado, grava `UNKNOWN`.

---

## 5. Regras do Frontend e Design System

### Estilização & Tokens
- Uso de **CSS Modules** associado a `src/styles/tokens.css`.
- **Apenas tokens semânticos** (`--color-*`, `--type-*`, `--space-*`, etc.) são permitidos nos componentes.
- **Nunca** utilizar tokens primitivos (ex.: `--primary-600`) ou cores hexadecimais literais nos componentes.
- O tema escuro deve ser configurado apenas redefinindo tokens semânticos sob o seletor `[data-theme='dark']`.
- Suporte a temas: `Sistema` / `Claro` / `Escuro` gerenciado via `lib/theme.ts` e inicializado no `index.html`.

### Regras do Design System (DS)
- **Área de toque mínima:** Alvos clicáveis $\ge 44\text{px}$.
- **Tamanho de controles:** Inputs e botões com altura $\ge 48\text{px}$ ($\ge 52\text{px}$ no mobile).
- **Tipografia em formulários:** Texto de input fixado em `16px` (evita zoom indesejado no Safari mobile).
- **Rótulos (labels):** Sempre visíveis; campos opcionais identificados com o sufixo `(opcional)`.
- **Ações:** Uma única ação primária por tela.
- **Semântica de cores:** Cor nunca pode ser o único meio de transmitir informação (associar ícone ou texto explicativo).
- **Tipografia técnica:** Dados clínicos (peso, datas, telefone, dosagens) devem utilizar `IBM Plex Mono`. Textos gerais utilizam `IBM Plex Sans`.
- **Cores semânticas específicas:**
  - *Terracota*: Restrito a avatares de pacientes, marcadores na timeline de histórico e curvas do gráfico de peso.
  - *Teal*: Restrito a botões e links de ação.

### Biblioteca de Componentes (`src/components`)
Reaproveitar os componentes existentes antes de qualquer nova implementação:
- `AppShell`, `AuthLayout`, `Alert`, `Avatar`, `Badge`, `BrandMark`
- `Button` e `ButtonLink` (estilos: `primary`, `secondary`, `ghost`, `destructive`)
- `Checkbox`, `DeleteDialog` (confirmação ou aviso de bloqueio por vínculos / 409)
- `Dialog` (baseado no `<dialog>` nativo, tamanhos `sm`/`md`, se adapta como bottom sheet no mobile, respeita `data-autofocus`)
- `EmptyState`, `ListPage` (tabela para desktop $\ge 768\text{px}$ e lista agrupada no mobile; inclui `Pagination` e `ListSkeleton`)
- `LocationDialog` e `TutorDialog` (modais de cadastro e edição rápida integrados a formulários)
- `PasswordStrength`, `PhotoPicker`, `SearchField`, `Segmented`, `Select`, `Tabs`, `Textarea` (auto-grow), `TextField`, `Toast`, `TutorPicker`.

### Camada de Comunicação e Estado
- `lib/api.ts`: Cliente HTTP central (`apiRequest`) com gerenciamento seguro de concorrência e rotação de refresh token.
- `lib/useApiQuery.ts`: Hook para requisições GET (passar path `null` suspende a chamada).
- `lib/useListSearch.ts`: Controle de parâmetros de filtro/busca e paginação na URL com atalho `/`.
- `auth/AuthContext.tsx`: Gerenciamento de sessão (`updateUser` para perfil; `changePassword` com reautenticação automática).
- Rotas nomeadas em português (`/inicio`, `/esqueci-senha`, `/redefinir-senha?token=`, `/pacientes`, `/pacientes/:id?aba=historico`, `/pacientes/:id/editar`, `/pacientes/:id/atendimentos/novo`, `/tutores`, `/locais`, `/perfil`).
- O tutor de um paciente **não pode ser alterado** após a criação (a API rejeita `tutor_id` no PATCH).

---

## 6. Cuidados Técnicos e Armadilhas Conhecidas

- **`@meupaciente/shared` (CommonJS):**
  O arquivo `vite.config.ts` utiliza `optimizeDeps` para pré-empacotar este módulo. Sem isso, a importação de enums (como `Sex`) quebra no navegador.
- **Tipagens do Backend:**
  `apps/backend/tsconfig.json` precisa conter `"types": ["node", "jest"]` para que o script de seed compile corretamente.
- **Módulo de E-mail (Recuperação de Senha):**
  Implementado em `modules/email` com o contrato `EmailSender` (ADR-011). Localmente utiliza o Mailpit (`localhost:1025`); em produção utiliza Resend ou SMTP dedicado; sem configuração, apenas loga o token.
- **Prisma ORM fixado na versão 6.x:**
  A versão 7 modifica a sintaxe de datasource acordada na arquitetura. Mantenha no 6.x.
- **Deploy Vercel (ADR-012):**
  Projetos `meupaciente-api` e `meupaciente`. `prepare` compila o shared, `postinstall` gera os clientes Prisma e migrations executam apenas em produção via `installCommand` com `DATABASE_URL_UNPOOLED`.
- **Emulação e Testes de Navegador:**
  Ao simular navegador via DevTools Protocol (CDP):
  - Injetar o refresh token no `localStorage`.
  - Configurar `Emulation.setDeviceMetricsOverride`, `setEmulatedMedia` e `setFocusEmulationEnabled`.
  - Para fechar/abrir modais `<dialog>`, utilizar eventos de mouse reais via `Input.dispatchMouseEvent` (pois `.click()` sintético não concede ativação do usuário e pode fechar todos os diálogos aninhados ao pressionar Esc).

---

## 7. Fluxo de Trabalho & Regras de Git

- **Commits atômicos por tema:**
  - Agrupe alterações em commits organizados por tema (infra, componentes, uma tela específica, backend, documentação).
  - Cada commit deve ser autossuficiente e passar no build isoladamente.
  - Formato **Conventional Commits em português com acentuação**:
    - Ex.: `feat: adicionar filtro de espécies na lista de pacientes`
    - Ex.: `fix: corrigir validação de campo obrigatório no cadastro`
- **Checklist obrigatório antes de commitar:**
  - `npx tsc --noEmit -p tsconfig.json`
  - `npx eslint "src/**/*.{ts,tsx}"`
  - `npm run build`
  - `npm test`
  - Para telas: testar responsividade e tema escuro.
- **REGRA INEGOCIÁVEL:**
  - **NUNCA executar `git push` sem que o usuário peça explicitamente.**
