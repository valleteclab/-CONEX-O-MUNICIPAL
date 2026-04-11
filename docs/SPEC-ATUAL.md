# Conexão Municipal — Spec atual do projeto

Data de referência: 11/04/2026

## 1. Objetivo desta spec

Este documento resume o estado real do projeto com base no código do repositório hoje, para alinhar produto, engenharia e operação sobre:

- o que já está implementado;
- o que está parcialmente implementado;
- o que ainda falta para a próxima rodada de trabalho;
- por onde retomar a execução sem depender apenas do SDD original.

Esta spec complementa:

- `SDD-ConexaoMunicipal.md` como documento de visão ampla;
- `docs/GO-LIVE.md` como recorte operacional de liberação.

Importante: o código atual já avançou além de parte do texto em `docs/GO-LIVE.md`, principalmente no ERP web.

## 2. Resumo executivo

O projeto já é uma plataforma multicomponente funcional, composta por:

- portal web público e autenticado em Next.js;
- API monolítica modular em NestJS;
- banco PostgreSQL com entidades para auth, diretório, cotações, academia, painel/plataforma e ERP;
- fluxo multitenant com contexto de município (`tenant`) e, no ERP, contexto adicional de negócio (`business`).

Hoje, o produto não é apenas uma vitrine institucional com protótipos. A base já suporta operação real em várias áreas:

- autenticação e sessão;
- diretório de negócios com moderação;
- central de cotações;
- academia empresarial com cursos, aulas e sessões ao vivo;
- painel administrativo da plataforma;
- ERP com cadastros, vendas, compras, estoque, financeiro, fiscal e onboarding público de negócio.

## 3. Arquitetura atual

## 3.1 Estrutura do monorepo

- `apps/web`: frontend Next.js com rotas públicas, área logada, admin e ERP.
- `apps/api`: backend NestJS com módulos separados por domínio.
- `packages/shared`: pacote compartilhado ainda enxuto, preparado para centralizar tipos/contratos.
- `infra` e `tools`: suporte de deploy e execução.

## 3.2 Módulos do backend já presentes

O `AppModule` registra hoje os módulos:

- `AuthModule`
- `DirectoryModule`
- `QuotationsModule`
- `AcademyModule`
- `AnalyticsModule`
- `PlatformModule`
- `UsersModule`
- `ErpModule`

## 3.3 Modelo de dados já implementado

As entidades existentes mostram que a modelagem principal já foi criada para:

- usuários, tenants, planos e tokens de autenticação;
- vitrine do diretório;
- academia com cursos, aulas, progresso, certificados/gamificação e sessões ao vivo;
- ERP com negócio, usuários do negócio, produtos, partes/clientes/fornecedores, estoque, pedidos, contas a receber, contas a pagar, caixa e documentos fiscais;
- configurações de plataforma;
- fila de classificação fiscal de produtos com IA.

## 4. Estado funcional por módulo

## 4.1 Autenticação e sessão

Status: implementado e base do restante da plataforma.

Já existe:

- cadastro e login;
- refresh token;
- recuperação de senha;
- contexto por tenant;
- sessão no browser com armazenamento de token e headers para API autenticada.

## 4.2 Diretório inteligente

Status: funcional.

Já existe:

- listagem pública;
- página de detalhe por slug;
- área logada para cadastro/gestão da vitrine em `/dashboard/meu-negocio`;
- moderação por `super_admin`;
- endpoints de listagem e mudança de status no módulo `platform`.

Leitura prática: o diretório já está em condição de operação moderada.

## 4.3 Central de cotações

Status: funcional na arquitetura e presente no front.

Já existe:

- módulo backend dedicado;
- rota pública `/cotacoes`;
- área autenticada em `/dashboard/cotacoes`.

Ponto de atenção:

- o código lido nesta rodada não detalhou todas as telas internas de operação, então vale validar depois o nível de acabamento UX e métricas.

## 4.4 Academia empresarial

Status: bem avançada e operacional.

Já existe:

- catálogo público;
- página de curso por slug;
- área logada da academia;
- página pública de aulas ao vivo;
- gestão de cursos, aulas e sessões ao vivo no backend de plataforma;
- painel administrativo para gerenciar academia;
- base para progresso, gamificação e certificados.

Leitura prática: a Academia já está além de um MVP simples e pode ser tratada como produto ativo.

## 4.5 Painel municipal

Status: implementado no front e com backend dedicado.

Já existe:

- rota `/painel`;
- componente `PainelDashboard`;
- módulo `analytics` na API.

Ponto de atenção:

- ainda precisamos confirmar profundidade dos indicadores e origem dos dados para definir se o painel já está em nível executivo ou ainda em fase inicial de BI.

## 4.6 Plataforma / super admin

Status: funcional e importante para operação.

Já existe:

- entrada dedicada de plataforma;
- dashboard admin em `/admin`;
- moderação de vitrines do diretório;
- moderação de negócios ERP;
- gestão da Academia;
- tela para configuração do classificador fiscal com IA via OpenRouter.

Leitura prática: a camada operacional de plataforma já existe e é um diferencial, porque evita depender de scripts manuais para governança do ecossistema.

## 4.7 ERP empresarial nativo

Status: backbone implementado; front já conectado em partes críticas; ainda há espaço claro de evolução.

### Backend ERP já disponível

O módulo `erp` já expõe controladores para:

- negócios ERP;
- consulta pública por CNPJ e cidades;
- produtos;
- clientes e fornecedores;
- estoque;
- pedidos de venda;
- pedidos de compra;
- financeiro;
- fiscal;
- onboarding público de negócio ERP.

### Front ERP já existente

Há rotas web para:

- visão geral do ERP;
- cadastro de negócio;
- produtos;
- clientes e fornecedores;
- estoque;
- pedidos de venda;
- pedidos de compra;
- financeiro;
- dados fiscais;
- fiscal;
- PDV.

### O que já está claramente integrado

Com base nas telas e helpers lidos, já há integração real entre front e API em pontos importantes:

- seleção de `businessId` e envio automático do header `X-Business-Id`;
- listagem e criação de produtos;
- criação de pedido de venda;
- confirmação/cancelamento de pedido;
- abertura do fluxo de emissão fiscal a partir de pedido confirmado;
- leitura de clientes e produtos para montar pedidos;
- configuração do classificador fiscal no painel de super admin.

### Evolução recente identificada no código

Os arquivos alterados localmente indicam trabalho ativo em:

- classificação fiscal de produtos com IA;
- emissão fiscal;
- pedidos de venda;
- cadastro de produtos;
- painel de super admin;
- configuração de plataforma para IA do ERP.

Isso sugere que o foco atual da equipe já migrou do “ERP placeholder” para “ERP operacional com automação fiscal”.

## 5. Divergência entre documentação antiga e estado real

Hoje existe uma divergência importante:

- `docs/GO-LIVE.md` ainda descreve o ERP web como majoritariamente placeholder;
- o código atual já mostra ERP com telas cliente-side ligadas à API para produtos e vendas, além de fiscal e IA em evolução.

Conclusão:

- o `GO-LIVE` continua útil como documento histórico/operacional;
- para priorização de produto, a referência correta agora deve ser esta spec somada ao SDD.

## 6. Situação atual do produto

## 6.1 O que já pode ser tratado como entregue

- arquitetura do monorepo;
- autenticação e contexto de tenant;
- diretório com moderação;
- academia com gestão administrativa;
- painel administrativo da plataforma;
- estrutura principal de ERP no backend;
- front ERP com rotas reais e parte das integrações-chave.

## 6.2 O que está parcialmente entregue

- painel municipal e analytics mais profundos;
- ERP financeiro e compras, que já existem como domínio, mas ainda precisam de validação de acabamento no front;
- fiscal ponta a ponta já integrado com PlugNotas para NFS-e, NF-e e NFC-e, ainda dependendo de configuração externa de produção e operação real;
- PDV, que existe como área do produto, mas precisa ser confirmado em nível de integração efetiva.

## 6.3 O que ainda parece faltar para uma operação madura

- fechamento da jornada ERP ponta a ponta no browser;
- testes automatizados cobrindo fluxos críticos;
- validação forte de readiness fiscal por negócio, agora cobrindo NFS-e, NF-e e NFC-e;
- observabilidade e métricas de uso por módulo;
- definição objetiva do que entra no próximo go-live comercial.

## 7. Próxima frente recomendada

A melhor continuação do trabalho, pelo estado do código, é tratar o ERP como trilha principal.

## 7.1 Prioridade imediata

Fechar o ciclo operacional abaixo:

1. negócio ERP selecionado;
2. produto cadastrado;
3. cliente cadastrado;
4. pedido criado;
5. pedido confirmado;
6. emissão fiscal disparada;
7. retorno e atualização do documento fiscal;
8. reflexo em estoque e financeiro validado.

Esse fluxo deve virar o “happy path” oficial do ERP.

## 7.2 Sprint sugerida

### Trilha A — ERP operacional

- validar e completar telas de clientes/fornecedores, estoque, compras e financeiro;
- revisar consistência de mensagens de erro e estados vazios;
- garantir paginação, filtros mínimos e reload após mutações.

### Trilha B — Fiscal + IA

- consolidar o fluxo de classificação fiscal por job;
- melhorar visibilidade de status do job e resultado aplicado;
- consolidar emissão fiscal em produção, incluindo certificado, CSC e webhook;
- acompanhar cancelamento, refresh e retorno assíncrono dos documentos em ambiente real.

### Trilha C — Produto e operação

- atualizar `docs/GO-LIVE.md` quando a equipe quiser transformar esta spec em plano de liberação;
- definir escopo comercial: o que já pode ser vendido como pronto e o que ainda entra como roadmap;
- criar smoke tests manuais ou automatizados dos fluxos principais.

## 8. Backlog objetivo para continuar os trabalhos

Lista recomendada de execução, em ordem:

1. revisar todas as páginas ERP contra os endpoints já existentes;
2. fechar o fluxo fiscal ponta a ponta com cenários reais e mensagens claras;
3. confirmar impactos de estoque e financeiro ao confirmar pedidos;
4. testar onboarding de negócio ERP desde a entrada pública;
5. elevar cobertura de testes nos fluxos críticos;
6. alinhar documentação operacional com o estado real do código.

## 9. Conclusão

O Conexão Municipal já não está em fase de estruturação básica. A fundação do produto está pronta e o projeto entrou numa fase de consolidação operacional, principalmente no ERP.

Se formos continuar a partir do melhor ponto de alavancagem, o trabalho agora deve focar em:

- transformar o ERP existente em jornada fechada e confiável;
- alinhar documentação e operação ao que já foi implementado;
- reduzir lacunas entre backend robusto e acabamento final do front.
