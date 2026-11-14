# Fontes e infraestrutura — checagem de 14/11/2026

Pesquisa documental em fontes oficiais. Nenhuma conta, cobrança ou chave foi criada; valores são retrato em USD e podem mudar.

## Vagas

- Greenhouse Job Board: GET de dados publicados não exige autenticação; a API também oferece POST de candidatura com credencial. Prancheta usa apenas GET da lista sem `content=true`, não lê perguntas do formulário nem envia candidatura. [Documentação oficial](https://docs.greenhouse.io/job-board)
- Lever Postings: GET lista vagas publicadas por identificador de quadro; a documentação descreve `skip`/`limit`, JSON e indica mandar a pessoa ao anúncio/formulário hospedado. A API também tem POST de candidatura, não usado pela Prancheta. A listagem não é busca global entre empresas e tem restrição de CORS para origens que não sejam a empresa; nosso servidor consulta host fixo após ação da pessoa. [Documentação oficial da Lever](https://github.com/lever/postings-api)
- Remotar permanece leitura da API pública documentada no app; termos e estabilidade de longo prazo ainda precisam de confirmação antes de operação comercial.
- Ashby oferece feed público GET /posting-api/job-board/{JOB_BOARD_NAME} sem chave, com descriptionPlain, jobUrl e isListed; a documentação o descreve para alimentar a página de carreiras da organização e avisa que isListed=false é acesso por link direto. A Prancheta filtra para isListed === true, usa host fixo, não pede compensação e não abre applyUrl. Esse feed público é distinto do endpoint autenticado jobPosting.list, que exige jobsRead e aceita listedOnly; não presumimos que esse parâmetro se aplique ao feed. Não encontramos limite numérico publicado para o feed nem licença clara para agregadores; manter a importação como avaliação de protótipo e bloquear uso comercial/redistribuição até autorização. [Feed público oficial Ashby](https://developers.ashbyhq.com/docs/public-job-posting-api) · [jobPosting.list e listedOnly](https://developers.ashbyhq.com/reference/jobpostinglist) · [postings não listados](https://docs.ashbyhq.com/job-postings)
- LinkedIn segue fora: sem coleta automatizada. Importação manual continua disponível.

## Arquitetura recomendada, ainda não implementada

1. **Agora:** manter `localStorage`, backup JSON validado e exclusão no aparelho. CV e projetos não saem do navegador.
2. **Se sincronização for necessária:** protótipo privado com Auth + Postgres, `user_id` em toda linha, RLS ativada, grants mínimos, políticas de leitura/escrita/exclusão por usuário, migração, teste adversarial entre duas contas e exportação/apagamento. Não inserir CV até mapear retenção, cópias e consentimento; service key apenas no servidor e nunca no cliente. Supabase Auth integra JWT e RLS; a documentação alerta que tabelas expostas sem RLS/grants corretos ficam acessíveis. [Auth](https://supabase.com/docs/guides/auth) · [RLS](https://supabase.com/docs/guides/database/row-level-security)
3. **Alternativa de menor acoplamento:** Firebase Auth + Firestore, regras por usuário e emulador para testes; checar separadamente backups, exportação, exclusão e limites antes de adotar. Não sincronizar CV por padrão.
4. **Hospedagem:** o deploy Vercel Hobby é apenas pessoal/não comercial conforme §4; se houver oferta paga, precisa migração de hosting e revisão de custos/termos antes de qualquer cobrança. [Termos Vercel](https://vercel.com/legal/terms)
5. **Cobrança:** nenhuma até validar produto, plano, suporte, reembolso, provedor e obrigações legais. Hosted checkout, webhooks autenticados e idempotência só depois de aprovação e conta do usuário; nunca guardar cartão.

## Retrato de preços públicos (USD, sem câmbio, sem estimativa de produção)

| Serviço consultado | Retrato oficial | Limite prático para este app |
|---|---|---|
| Supabase Free | US$ 0; 500 MB DB, 1 GB Storage, 50 mil MAU Auth; projetos podem pausar após uma semana sem atividade | Bom para experimentar sem CV; não garante continuidade nem backups automáticos no Free. Pro aparece a partir de US$ 25/mês e uso/compute pode somar custo. [Preço oficial](https://supabase.com/pricing) |
| Firebase Spark | Plano sem custo e sem método de pagamento, com cotas gratuitas; quotas variam por produto | Auth/Firestore exigem regras e limites por produto; além da quota, Blaze é pay-as-you-go. Não é custo total fixo. [Preço oficial](https://firebase.google.com/pricing) |
| Vercel Hobby | US$ 0, uso pessoal/não comercial | Incompatível com cobrar usuários; não publicar oferta comercial neste plano. [Termos](https://vercel.com/legal/terms) |

Não escolhi fornecedor. Preço promocional ou cota grátis não substitui avaliação de contrato, privacidade, retenção, backups, região, suporte, custo fora da quota e uso comercial.
