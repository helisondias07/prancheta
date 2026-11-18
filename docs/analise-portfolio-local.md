# Análise local de portfólio

O motor `analyzeEvidence` compara texto de vaga com o currículo e descrições de projetos cadastrados. A tela também funciona sem currículo quando existe descrição de projeto; textos e confirmações continuam no dispositivo. URLs são apenas links informados: não são acessadas nem analisadas. A análise é literal, limitada aos termos reconhecidos ou aos requisitos informados; menção não é prova de autoria, competência ou experiência. A confirmação é declaração explícita da pessoa vinculada à descrição exata. A detecção de negação e intenção é incompleta e precisa de revisão humana. O rascunho continua exigindo currículo.

Descrições de projeto aceitam múltiplas linhas, que são preservadas na edição e analisadas como trechos separados. Alterar a descrição continua invalidando confirmações anteriores; apenas mudar nome ou link não as remove.

Os dados de entrada e o resultado estruturado são tipos locais (`Project` e `EvidenceAnalysis` em `src/lib`); o motor é uma função pura e não utiliza rede ou credenciais. Essa separação permite uma futura fonte ou analisador produzir textos com origem e passar por validação explícita, sem chamar o mecanismo local de IA nem conferir autoridade às respostas externas. Nenhum conector externo foi implementado nesta etapa.

## Trecho de página copiado

Na tela Portfólio, a pessoa pode colar texto visível de uma página que esteja autorizada a usar e o texto de uma vaga. A comparação mostra trechos literais como menções não verificadas, sem confirmação de autoria ou competência. Os campos são temporários e não adicionam conteúdo a projetos nem ao currículo. A leitura da página e a seleção do texto são feitas pela pessoa: a aplicação não abre URL, não interpreta HTML e não faz requisições para obter esse conteúdo. O texto copiado é limitado a 8.000 caracteres e a vaga a 4.000; excesso, campos vazios e marcação HTML são rejeitados, sem truncamento. Limites são em unidades UTF-16 do JavaScript. A detecção de marcação não é um sanitizador para HTML ou uma garantia de que o texto é confiável.

Testes locais incluem negação, textos com Next.js, URLs de loopback/metadata como texto, HTML ativo e campos excedentes; os testes não demonstram proteção SSRF para futuras requisições, pois nenhuma requisição é implementada.

**Gate para análise externa:** escolher uma fonte com acesso autorizado e termos compatíveis; obter consentimento específico antes de enviar dados; determinar retenção e custos; implementar controle de rede contra SSRF e redirecionamentos, limites e isolamento; distinguir trechos de origem de saídas geradas; validar com fixtures adversariais, falhas e QA independente antes de permitir dados reais. Uma URL fornecida pelo usuário não é autorização de acesso irrestrito nem evidência de autoria.
