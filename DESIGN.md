---
name: MeuPaciente
description: Prontuário veterinário de bolso para o profissional autônomo que atende cães e gatos.
colors:
  verde-agua-clinico: "#137a72"
  verde-agua-profundo: "#12615c"
  verde-agua-claro: "#46b5aa"
  verde-agua-nevoa: "#d5f2ee"
  terracota-paciente: "#e45e39"
  terracota-escuro: "#a03724"
  terracota-nevoa: "#fff4f0"
  ardosia: "#1b222b"
  ardosia-media: "#4e5b71"
  ardosia-suave: "#64738c"
  borda-ardosia: "#d3dae5"
  divisoria: "#e9edf3"
  fundo: "#f7f9fb"
  superficie: "#ffffff"
  hover: "#eef2f7"
  erro: "#a72020"
  erro-fundo: "#fef2f2"
  sucesso: "#0d6943"
  sucesso-fundo: "#ecfdf3"
  alerta: "#944b07"
  alerta-fundo: "#fff9eb"
  noite-fundo: "#0e1418"
  noite-superficie: "#141c21"
  noite-card: "#18222a"
  noite-texto: "#e8eef2"
typography:
  display:
    fontFamily: "IBM Plex Sans, system-ui, sans-serif"
    fontSize: "40px"
    fontWeight: 700
    lineHeight: 1.1
    letterSpacing: "-0.02em"
  headline:
    fontFamily: "IBM Plex Sans, system-ui, sans-serif"
    fontSize: "28px"
    fontWeight: 600
    lineHeight: 1.2
    letterSpacing: "-0.012em"
  title:
    fontFamily: "IBM Plex Sans, system-ui, sans-serif"
    fontSize: "18px"
    fontWeight: 600
    lineHeight: 1.35
  body:
    fontFamily: "IBM Plex Sans, system-ui, sans-serif"
    fontSize: "16px"
    fontWeight: 400
    lineHeight: 1.55
  small:
    fontFamily: "IBM Plex Sans, system-ui, sans-serif"
    fontSize: "14px"
    fontWeight: 400
    lineHeight: 1.45
  label:
    fontFamily: "IBM Plex Sans, system-ui, sans-serif"
    fontSize: "13px"
    fontWeight: 500
    lineHeight: 1.25
    letterSpacing: "0.01em"
  data:
    fontFamily: "IBM Plex Mono, ui-monospace, monospace"
    fontSize: "15px"
    fontWeight: 400
    lineHeight: 1.5
    fontFeature: "tnum"
rounded:
  xs: "3px"
  sm: "4px"
  md: "6px"
  lg: "8px"
  xl: "12px"
  2xl: "16px"
  full: "9999px"
spacing:
  "1": "4px"
  "2": "8px"
  "3": "12px"
  "4": "16px"
  "5": "20px"
  "6": "24px"
  "8": "32px"
  "10": "40px"
  "12": "48px"
  "16": "64px"
components:
  button-primary:
    backgroundColor: "{colors.verde-agua-clinico}"
    textColor: "{colors.superficie}"
    rounded: "{rounded.md}"
    height: "44px"
    padding: "0 20px"
  button-primary-hover:
    backgroundColor: "{colors.verde-agua-profundo}"
  button-secondary:
    backgroundColor: "{colors.superficie}"
    textColor: "{colors.ardosia-media}"
    rounded: "{rounded.md}"
    height: "44px"
    padding: "0 20px"
  button-secondary-hover:
    backgroundColor: "{colors.hover}"
  input:
    backgroundColor: "{colors.superficie}"
    textColor: "{colors.ardosia}"
    rounded: "{rounded.md}"
    height: "48px"
  lista-agrupada:
    backgroundColor: "{colors.superficie}"
    rounded: "{rounded.lg}"
    padding: "12px 16px"
  badge-alerta:
    backgroundColor: "{colors.alerta-fundo}"
    textColor: "{colors.alerta}"
    rounded: "{rounded.xs}"
    height: "22px"
    padding: "0 8px"
  avatar-paciente:
    backgroundColor: "{colors.terracota-nevoa}"
    textColor: "{colors.terracota-escuro}"
    rounded: "{rounded.full}"
    size: "40px"
  nav-item-ativo:
    backgroundColor: "{colors.verde-agua-nevoa}"
    textColor: "{colors.verde-agua-profundo}"
    rounded: "{rounded.md}"
    height: "44px"
---

# Design System: MeuPaciente

## Overview

**Creative North Star: "O Prontuário de Bolso"**

O MeuPaciente é uma ferramenta clínica que cabe no bolso da veterinária e anda com ela entre clínicas, consultórios e casas de tutores. O visual é calmo, preciso e acolhedor: fundo claro levemente azulado, superfícies brancas bem delimitadas, um verde-água que só aparece onde há ação e um terracota quente que só aparece onde está o paciente. O dado clínico é o herói — peso, datas e telefones em fonte mono tabular, com mais contraste que qualquer elemento de interface.

A densidade é de ferramenta de trabalho usada com uma mão, em luz ruim: alvos grandes, rótulos sempre visíveis, uma ação primária por tela, listas agrupadas num só bloco. Seções de documento separadas por divisórias, não caixas. Nada decorativo compete com o registro clínico. O tema escuro é cidadão de primeira classe: só os tokens semânticos mudam, os componentes não sabem em que tema estão.

**Key Characteristics:**
- Mobile-first: tab bar no celular, trilho de 72px no tablet, barra lateral de 240px no desktop.
- Verde-água = ação; terracota = paciente; ardósia = texto e estrutura.
- Dado clínico sempre em IBM Plex Mono tabular.
- Superfícies com borda fina, sem sombra em repouso; cantos secos (6–8px).
- Seções separadas por divisória; caixa só para o que é um objeto (tabela, lista, painel de detalhe).
- Estados sempre com texto ou ícone, nunca só com cor.

## Colors

Uma paleta clínica fria (verde-água e ardósia azulada) aquecida por um único acento terracota reservado ao paciente.

### Primary
- **Verde-água Clínico** (verde-agua-clinico): fundo do botão primário, FAB, foco e item selecionado da navegação (sobre a névoa verde-água). O profundo é o hover e a cor de links; o claro vira o primário no tema escuro.

### Secondary
- **Terracota Paciente** (terracota-paciente): a identidade do animal. Avatar do paciente sem foto (sobre a névoa terracota), marcador da linha do tempo e linha do gráfico de peso. Em nenhum outro lugar.

### Neutral
- **Ardósia** (ardosia): texto principal. **Ardósia média** para texto secundário e botões secundários; **ardósia suave** para texto de apoio e ícones inativos.
- **Borda ardósia** e **divisória**: contorno de listas, tabelas e campos; separação entre linhas e entre seções.
- **Fundo** (azulado quase branco) atrás de tudo; **superfície** branca para listas, tabelas, campos e barra lateral; **hover** para linhas e botões fantasma.
- **Estados**: erro, sucesso e alerta sempre como par texto-escuro sobre fundo tonal claro (ex.: selo "Vence em 9 dias" em alerta sobre alerta-fundo).
- **Noite**: fundo, superfície e card escuros azulados, texto quase branco; os estados viram tons claros sobre fundos translúcidos.

### Named Rules
**The Teal Is Action Rule.** Verde-água só em coisas que se clica ou em que se está: botões, links, foco, item ativo. Nunca decorativo.

**The Terracotta Is the Patient Rule.** Terracota só em avatar de paciente, marcador da timeline e gráfico de peso. Se não é o animal, não é terracota.

**The Semantic Only Rule.** Componentes usam só tokens semânticos (`--color-*`), nunca primitivos nem HEX. É o que faz o tema escuro funcionar sem nenhum `if`.

## Typography

**Display Font:** IBM Plex Sans (com system-ui)
**Body Font:** IBM Plex Sans (com system-ui)
**Label/Mono Font:** IBM Plex Mono (com ui-monospace) para dado clínico

**Character:** Uma família só, de ferramenta profissional: a Plex Sans é sóbria e técnica, legível em 14px sob luz de clínica, e a Plex Mono, da mesma família, alinha números em colunas e evita leitura errada de dose. Escala contida (passo ~1.15), pesos 400/500/600; nada de display pesado em tela de trabalho.

### Hierarchy
- **Display** (700, 40px, 1.1): só no painel de marca das telas de entrada (28px no celular).
- **Headline** (600, 28px no desktop / 24px no celular, 1.2): título de página ("Boa tarde, Ana", "Pacientes", nome do paciente).
- **Title** (600, 18px, 1.35): título de seção e de painel ("Vacinas para acompanhar", "Identificação").
- **Body** (400, 16px, 1.55): texto corrido e texto de campo (16px sempre, para o iOS não dar zoom).
- **Small** (400, 14px, 1.45): metadados de linha, subtítulos, ajuda.
- **Label** (500, 13px, +0.01em): rótulos de campo, cabeçalho de colunas, rótulo do resumo.
- **Data** (IBM Plex Mono 400–600, 13–15px, tabular; 18–20px 600 no resumo do prontuário, 32px no total da Home): peso, datas, telefone, contagens.

### Named Rules
**The Clinical Data Is Mono Rule.** Peso, datas, telefone e números de contagem sempre em IBM Plex Mono tabular. Texto de interface nunca em mono.

## Layout

Grid mobile-first de 4 → 8 → 12 colunas, com breakpoints sm 480, md 768, lg 1024, xl 1280. Abaixo de 768px: coluna única, tab bar fixa de 64px no rodapé, FAB de 56px para a ação principal e listas agrupadas num bloco único com divisórias. De 768 a 1023px, a navegação vira um trilho de 72px e as listas viram tabela. A partir de 1024px, barra lateral de 240px e conteúdo até 1280px; painéis lado a lado quando cabem.

Espaçamento em base 4 (4, 8, 12, 16, 20, 24, 32, 40, 48, 64). Margem de página 16px no celular, 32px no tablet e 40px no desktop; 24px entre blocos da página. Formulários longos travam em 720px e texto clínico em 75ch.

**The Mobile-First Rule.** 80% do uso é no celular, com uma mão. Toda tela nasce na largura de 375px e cresce; nunca rolagem horizontal.

## Elevation & Depth

Plano em repouso. A profundidade vem de superfícies brancas com borda de 1px sobre um fundo levemente azulado; nada em repouso tem sombra. Sombra existe só no que flutua sobre a página: FAB, toast e diálogo.

### Shadow Vocabulary
- **Hover** (`0 1px 2px …, 0 2px 6px rgba(27,34,43,.06)`): reservado; hoje sem uso fixo.
- **Flutuante** (`0 12px 28px rgba(27,34,43,.10), 0 2px 6px …`): FAB e toast.
- **Diálogo** (`0 24px 56px rgba(27,34,43,.14), 0 4px 12px …`): diálogos e bottom sheets.
- **Foco** (`0 0 0 3px` verde-água a 35%): anel de foco em botões e campos.

**The Border Before Shadow Rule.** Separação é feita por borda de 1px, divisória e fundo. Sombra só em elemento que flutua; nunca em card, botão ou lista em repouso.

**The Section Not Card Rule.** Grupos de conteúdo de uma mesma tela (dados do paciente, seções de formulário, configurações do perfil) são seções com título e divisória, não caixas. Caixa só para um objeto com borda própria: tabela, lista, faixa de resumo, painel de detalhe. Nunca caixa dentro de caixa.

## Shapes

Cantos secos, de instrumento: 6px em botões, campos, chips e itens da linha do tempo; 8px em listas, tabelas e painéis; 12px em diálogos; 16px no topo dos bottom sheets; 3px em selos. Círculo completo só em avatar, FAB e marcador da linha do tempo — nunca pílulas. Bordas de 1px; nada de contornos grossos nem de faixa colorida lateral.

## Components

### Buttons
Firmes e diretos, com uma ação primária por tela.
- **Shape:** 6px; alturas de 36 (sm), 44 (md, padrão) e 52px (lg); texto 500.
- **Primary:** fundo verde-água clínico, texto branco, sem sombra; ícone Lucide de 18px à esquerda quando ajuda.
- **Hover / Focus:** escurece para o verde-água profundo em 140ms; foco com anel de 3px, nunca outline padrão.
- **Secondary:** fundo de superfície, borda ardósia, texto ardósia média. **Ghost:** transparente, texto secundário. **Destructive:** vermelho, só dentro de confirmação.
- **FAB (celular):** círculo de 56px verde-água acima da tab bar, sombra flutuante.

### Chips
- **Selo de estado (Badge):** 22px de altura, raio 3px, caption 600; fundo tonal + texto escuro do mesmo tom (erro, alerta, sucesso, neutro, primário). O texto sempre diz o estado ("Atrasada há 2 meses", "Em dia").
- **Contagem de aba:** número em mono discreto ao lado do rótulo, sem pílula.

### Cards / Containers
- **Quando usar:** só para um objeto com borda própria (lista, tabela, faixa de resumo, painel de detalhe). Grupos da mesma tela são seções (ver The Section Not Card Rule).
- **Corner Style:** 8px.
- **Background:** superfície branca (card escuro no tema noite).
- **Shadow Strategy:** nenhuma.
- **Border:** 1px borda ardósia; divisórias internas de 1px.

### Inputs / Fields
- **Style:** 48px de altura (52px no celular), borda de 1px, raio 6px, fundo de superfície, texto de 16px, rótulo sempre visível acima; opcional marcado com "(opcional)".
- **Focus:** borda verde-água e anel de foco de 3px.
- **Error / Disabled:** borda vermelha sobre fundo de erro tonal, com mensagem abaixo; desabilitado em fundo ardósia claro.

### Navigation
- **Desktop:** barra lateral branca de 240px, itens de 44px com ícone de 20px; ativo em névoa verde-água com texto verde-água profundo. A conta fica no pé, com o botão Sair.
- **Tablet:** trilho de 72px com ícone sobre rótulo.
- **Celular:** tab bar de 5 itens (Início, Pacientes, Tutores, Locais, Perfil), 56px de altura, item ativo em verde-água.

### Lista que vira tabela
A peça mais recorrente: no celular, um bloco único com borda e linhas separadas por divisória (avatar, nome em título, metadados em small); a partir de 768px, a lista vira uma tabela dentro de uma moldura de 8px, com cabeçalho de colunas em label sobre superfície sutil, linhas de 64px separadas por divisória e paginação no rodapé.

### Resumo do prontuário
Uma faixa só, com três respostas (peso, último atendimento, próxima vacina) separadas por divisórias verticais; no celular, uma linha por resposta com rótulo à esquerda e valor à direita. Cada célula leva à aba do detalhe. Não é uma fileira de cartões de métrica.

### Linha do tempo
Fio vertical de 1px com o marcador terracota de cada atendimento; data em mono e título ao lado, sem caixa nem faixa lateral. O item aberto ganha o fundo de seleção.

### Avatar do paciente
Círculo de 40px com a foto ou as iniciais em terracota escuro sobre névoa terracota. É o único lugar onde o terracota aparece em listas.

## Do's and Don'ts

### Do:
- **Do** manter alvos de toque de pelo menos 44px e campos de 48px (52px no celular) com texto de 16px.
- **Do** usar só tokens semânticos (`--color-*`, `--type-*`, `--space-*`) nos componentes.
- **Do** escrever peso, datas, telefone e contagens em IBM Plex Mono tabular.
- **Do** separar grupos de uma tela com título e divisória; caixa só para lista, tabela ou painel.
- **Do** acompanhar toda cor de estado com texto ou ícone.
- **Do** ter uma única ação primária por tela; no celular ela vira FAB.
- **Do** verificar cada tela no tema claro e no escuro.

### Don't:
- **Don't** usar terracota fora de avatar de paciente, marcador de timeline e gráfico de peso.
- **Don't** usar verde-água como decoração, fundo de seção ou texto que não é ação.
- **Don't** usar primitivos (`--primary-600`) ou HEX soltos em componentes.
- **Don't** criar rolagem horizontal de página no celular; tabela vira lista agrupada.
- **Don't** pôr caixa dentro de caixa, sombra em superfície em repouso, pílulas ou faixa colorida na lateral de cards e itens.
- **Don't** usar ícone repetido em toda linha só como enfeite, nem círculo colorido atrás de ícone.
- **Don't** mostrar números, metas, planos ou promessas que o sistema não sustenta.
- **Don't** usar sombras largas, brilhos ou texto em gradiente.
