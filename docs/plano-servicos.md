# Serviços que exigem conta, chave ou pagamento — não contratados

Acesso 14/11/2026. R$ 0 neste Hobby. **Não é oferta.**

| Integração | Por que espera | O que o usuário desbloqueia |
|---|---|---|
| Login / conta | E-mail, senha, provedor OAuth | Conta existente; não criamos cadastro daqui |
| E-mail / follow-up automático | SMTP ou API paga | O usuário envia o rascunho |
| LinkedIn / Easy Apply | ToS + credencial | Fora do recorte |
| ATS real (Greenhouse POST, Gupy, etc.) | Chave de empregador | Só GET público de quadro |
| OCR de PDF-imagem | Serviço ou modelo pesado | Cole o texto; scan continua falha |
| Cobrança (Pix/cartão) | Vercel Pro + meio de pagamento | Migrar de Hobby **antes**; não contratar agora |
| Ads | Orçamento | R$ 0 até revisão |

Comparação currículo × vaga × portfólio é **local** e **não é ATS**.

## Estado atual e decisão sem custo

Não há conta, fornecedor selecionado ou backend. O currículo, projetos, vagas e candidaturas ficam no `localStorage` deste navegador. Isso evita enviar CV a um serviço, mas não sincroniza aparelhos e pode perder dados se o armazenamento do navegador for limpo. O backup JSON é manual e **não criptografado**; guardá-lo em local privado. Nunca colocar token de provedor no `localStorage`.

| Área | Funciona hoje | Próximo gate antes de integrar |
|---|---|---|
| Persistência | localStorage, exportar/restaurar JSON, apagar no aparelho | Se houver sincronização: decidir minimização/retensão do CV, isolamento por usuário, controle de acesso, exportação/exclusão e recuperação; escolher provedor e rever contrato/custo antes de criar conta ou mandar dados |
| Login | nenhum login; perfil é só do navegador atual | Definir se conta realmente é necessária. Se sim: provedor com autenticação robusta, verificação de e-mail, recuperação, exclusão de conta, proteção contra takeover e revisão LGPD; nunca inventar sessão nem guardar senha própria |
| Cobrança | nenhuma cobrança, anúncio ou oferta | Antes de vender: confirmar uso comercial do host (Hobby não serve), custos e termos do processador, preço/refund/suporte e obrigações legais. Não guardar dados de cartão; processador hospedado + webhooks verificados/idempotentes. Exige autorização para criar contas e assumir custos |
| Vagas | Greenhouse Job Board GET e Remotar GET; também permite colar anúncio manualmente | Somente adicionar uma fonte com API/feed oficial de leitura, permissão e limites verificados. Guardar origem/data como procedência, filtrar URL http(s), não submeter candidatura nem coletar vagas por scraping de LinkedIn |

Sem esses gates, o app continua local, sem conta e sem cobrança. Não há migração ou serviço pago planejado como se já existisse.

## Fases de produto

1. **Agora, sem serviço:** melhorar fluxo local CV/vaga/projeto/histórico, procedência, backup e mensagens de limite. Dados fictícios em testes; dados de usuário não entram em testes ou Git.
2. **Sync/login, somente após decisão:** teste de necessidade, mapa de dados e retenção, avaliação de fornecedor/termos/custo, autorização do usuário; implementação com exportação/exclusão e teste de isolamento de duas contas. Nenhum dado de CV sai antes disso.
3. **Cobrança, depois do produto real:** validar uso comercial e custo do host, política de preço/cancelamento/reembolso, processador hospedado, webhooks seguros, acessibilidade e suporte. Só ligar após aprovação de preço e conta pelo usuário.
4. **Fontes:** manter as duas fontes GET atuais; para cada nova, validar primeiro documentação oficial, direitos/termos, autenticação, quota, atribuição e estabilidade. Se faltar API permitida, oferecer entrada manual em vez de automação.

Esta lista é um plano, não certificação LGPD, segurança de fornecedor, aconselhamento jurídico nem anúncio de lançamento. Valores e fornecedores não foram cotados nem contratados.
