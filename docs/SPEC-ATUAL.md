# Conexão Municipal — Spec atual do projeto

Data de referência: 11/04/2026

## 1. Norte do produto

O Conexão Municipal agora deve ser lido como uma plataforma com dois pilares integrados:

- `Operação do negócio`: ERP para MEI e pequenas empresas.
- `Geração de negócios`: presença digital, marketplace e oportunidades.

Isso significa que o produto deixou de ser apenas um portal com módulos soltos e também deixou de ser apenas um ERP. A proposta atual é:

- ERP forte para `comércio` e `serviços`;
- presença pública para MEIs e pequenas empresas serem encontrados;
- marketplace local com catálogo inicial;
- oportunidades para mercado privado e compras públicas;
- fiscal como parte oficial da oferta, com trilha distinta para MEI e pequena empresa.

## 2. O que existe hoje no código

### 2.1 Operação do negócio

O backend e o front já suportam:

- autenticação e contexto multitenant;
- cadastro e seleção de negócio (`business`);
- produtos e serviços;
- clientes e fornecedores;
- estoque;
- pedidos de venda;
- pedidos de compra;
- financeiro;
- fiscal;
- Central MEI;
- onboarding público de negócio.

### 2.2 Novos domínios formalizados nesta rodada

Foram incorporados como parte oficial do ERP:

- `orçamentos`;
- `ordens de serviço`.

Regras já previstas no código:

- orçamento pode ser criado e acompanhado por status;
- orçamento pode ser convertido em `pedido de venda`;
- orçamento pode ser convertido em `ordem de serviço`;
- ordem de serviço pode consumir itens da base de produtos/serviços;
- ao concluir a OS, o sistema pode baixar estoque de materiais e gerar título financeiro.

### 2.3 Presença digital e geração de negócios

A plataforma pública agora passa a ter leitura funcional de:

- diretório de negócios;
- perfil público mais rico, com `chamada pública`, `contatos`, `serviços` e `ofertas`;
- marketplace local como vitrine inicial baseada em perfis do tipo `loja`;
- oportunidades unificando:
  - mercado privado;
  - compras públicas.

Também já existe:

- resposta autenticada de fornecedor às oportunidades;
- dashboard do próprio usuário para acompanhar o que publicou.

## 3. Estrutura atual do produto

### 3.1 Pilar 1 — Operação do negócio

O ERP cobre hoje:

- empresa e onboarding;
- produtos e serviços;
- clientes e fornecedores;
- orçamentos;
- vendas;
- ordens de serviço;
- compras;
- estoque;
- financeiro;
- fiscal;
- Central MEI.

### 3.2 Pilar 2 — Conseguir mais negócios

A plataforma cobre hoje:

- diretório/vitrine;
- presença digital do negócio;
- marketplace local v1;
- oportunidades;
- resposta de fornecedores;
- base inicial para compras públicas municipais.

## 4. Leitura correta dos módulos

Para evitar desvio de narrativa, o repositório deve ser entendido assim:

- `diretório` é a base de descoberta e reputação;
- `marketplace` é a vitrine comercial inicial de produtos e serviços;
- `oportunidades` é a camada de demanda e captação, não apenas “cotações”;
- `pedidos de venda` não substituem `ordens de serviço`;
- `orçamentos` não são mais implícitos dentro de vendas, e sim um domínio próprio;
- o fiscal faz parte do produto, inclusive para MEI, com experiência mais guiada.

## 5. Situação por frente

### 5.1 Entregue ou operacional

- autenticação e sessão;
- diretório com moderação;
- academia empresarial;
- painel de plataforma/admin;
- ERP base;
- fiscal em evolução operacional;
- orçamentos;
- ordens de serviço;
- oportunidades com resposta;
- presença digital expandida;
- marketplace local inicial.

### 5.2 Parcial

- compras públicas municipais em fluxo completo de ponta a ponta;
- operação interna mais profunda da prefeitura;
- fluxos avançados de comparação, histórico e transparência pública;
- jornada comercial mais detalhada em conversão e métricas.

### 5.3 Próximos fechamentos naturais

- aprofundar compras públicas municipais;
- enriquecer comparação de propostas e trilha de acompanhamento;
- consolidar métricas e analytics de uso por módulo;
- ampliar testes automatizados dos fluxos novos;
- evoluir a UX fiscal por perfil (`MEI` versus `small_business`).

## 6. Rotas e áreas relevantes

### 6.1 ERP

- `/erp`
- `/erp/orcamentos`
- `/erp/pedidos-venda`
- `/erp/ordens-servico`
- `/erp/pedidos-compra`
- `/erp/estoque`
- `/erp/financeiro`
- `/erp/dados-fiscais`
- `/erp/fiscal`
- `/erp/mei`

### 6.2 Plataforma pública

- `/diretorio`
- `/diretorio/[slug]`
- `/marketplace`
- `/oportunidades`

### 6.3 Área autenticada de presença digital

- `/dashboard/meu-negocio`
- `/dashboard/cotacoes`

## 7. Conclusão

O Conexão Municipal agora está alinhado com a visão de:

- `ERP para MEI e pequenas empresas`, incluindo fiscal;
- `plataforma para gerar negócios`, com presença pública, catálogo e oportunidades.

O foco daqui em diante deve ser consolidar a maturidade operacional desses dois pilares, e não voltar a tratar o produto como um conjunto de módulos independentes sem uma narrativa única.
