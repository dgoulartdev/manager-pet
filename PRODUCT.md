# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Veterinária(o) autônoma(o) que atende cães e gatos em clínicas parceiras, consultórios e em domicílio. Usa o sistema sozinha(o), quase sempre pelo celular, muitas vezes no meio do atendimento, com uma das mãos ocupada segurando o animal e sob a iluminação variável de clínicas de terceiros. A primeira usuária real é a piloto do lançamento.

## Product Purpose

MeuPaciente (pt-BR) é o prontuário veterinário do profissional autônomo: registrar e consultar o histórico completo de cada paciente — dados, atendimentos, peso, vacinas — independente de onde o atendimento aconteceu. Resolve a fragmentação de hoje (WhatsApp, planilhas, PDFs, sistemas de cada clínica). Sucesso é a veterinária abrir o app e ter o histórico certo à mão, e registrar um atendimento sem atrito.

## Positioning

- **O prontuário é do veterinário:** o histórico pertence ao profissional e o acompanha entre clínicas, em vez de ficar preso ao sistema de cada clínica onde ele atende.
- **Simples de propósito:** só o registro clínico. Financeiro, estoque, agenda, gestão de clínica, portal do tutor e integrações estão fora do escopo por decisão, não por falta.

## Operating Context

- Atendimento em três tipos de local: local cadastrado (clínica parceira, consultório), local avulso e domicílio.
- Fluxo central: encontrar o paciente (por nome, tutor ou telefone), abrir o prontuário, registrar atendimento (queixa, histórico, diagnóstico, conduta, prescrição, peso) e vacinas; acompanhar reforços e contatar o tutor.
- PWA; instalado no celular. Idioma único: português do Brasil.

## Capabilities and Constraints

- Entidades: pacientes (cães e gatos; espécie é texto livre, a interface oferece Cão / Gato / Outra), tutores, locais, atendimentos, vacinas (com vínculo opcional a um atendimento). Usuário único por conta, dados isolados por usuário.
- O tutor de um paciente não muda depois do cadastro; tutor com pacientes não pode ser excluído.
- Sexo: Macho / Fêmea, opcional ("não informado" quando vazio).
- Telefones são guardados só com dígitos; datas clínicas não têm hora.
- Pendentes: recuperação de senha depende de provedor de e-mail ainda não escolhido; hosting, storage persistente de fotos e documentos legais (termos, LGPD) ainda não definidos. Upload de exames é a primeira evolução planejada pós-MVP.

## Brand Commitments

- Nome **MeuPaciente**, marca com ícone de pata. A marca antiga "Gerenciamento Felinos" (só felinos) foi abandonada; materiais em `design/` ainda usam o nome antigo e devem ser adaptados, nunca copiados.
- Voz em português, direta e sem jargão de marketing.

## Evidence on Hand

- Não há clientes, depoimentos, métricas de uso, planos ou preços. Nunca mostrar números, metas, planos ou promessas que o sistema não sustenta (as telas Hi-Fi em `design/` trazem exemplos disso a não copiar).
- Dados locais de demonstração existem só no banco de desenvolvimento.

## Product Principles

1. O histórico clínico é o centro; tudo o que não serve a ele fica de fora.
2. Registrar no meio do atendimento tem de ser rápido e possível com uma mão.
3. Só mostrar o que o sistema realmente sabe; nada de dado inventado ou promessa sem lastro.
4. O dado é do veterinário e o acompanha, onde quer que atenda.

## Accessibility & Inclusion

Uso predominante no celular, com uma mão e em luz variável: alvos de toque de pelo menos 44px, campos altos com texto de 16px, rótulos sempre visíveis, cor nunca como único sinal, contraste mínimo 4,5:1, temas claro e escuro.
