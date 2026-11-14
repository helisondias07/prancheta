# Prancheta

Compare o texto do **seu** currículo com o anúncio da vaga, registre o que você já enviou e rascunhe uma mensagem. **Nada é enviado daqui.** Nada é inventado no currículo.

## O que funciona de verdade

| Função | Como |
|---|---|
| Dashboard | Contagens locais, D+7, lacunas declaradas |
| Currículo × vaga × portfólio | Cobertura textual; mostra trechos do que foi escrito no projeto. Menções não são prova de autoria, uso ou domínio. Título e URL não contam. Uma frase negativa/hipotética não pode ser confirmada. Para frases afirmativas, só uma confirmação explícita sua conta como uso declarado por você; isso não é verificação independente. Nada é copiado ao CV. **Não é ATS.** |
| PDF local | Extração no navegador com [PDF.js](https://mozilla.github.io/pdf.js/) Apache-2.0 (teto 2 MB). Extração incompleta **não** vira currículo. Scan/imagem falha. Colar texto continua. |
| Portfólio | Links e fatos que você cadastra (`/portfolio`) |
| Vagas | Cole o anúncio **ou** importe quadro público [Greenhouse](https://docs.greenhouse.io/job-board.html), [Remotar](https://api.remotar.com.br/jobs?page=1), [Lever](https://github.com/lever/postings-api) ou [Ashby](https://developers.ashbyhq.com/docs/public-job-posting-api). Ashby exige slug e só entra isListed=true; não é busca global e o slug é apenas rótulo do quadro. Links repetidos não duplicam nem substituem dados salvos. |
| 2 atalhos públicos | URL do anúncio + busca Google; **você** abre |
| Histórico / Kanban | Status local, lembrete D+7 (`/historico`) |
| Filtro do histórico | Busca local por vaga, empresa ou status; ignora acentos e não busca notas privadas |
| Follow-up D+7 | Rascunho com título/empresa informados e cópia manual; só aparece após 7 dias e nunca é enviado |
| Remover candidatura | Confirmação local; apaga só o registro e a nota do histórico. A vaga salva continua em “Vagas”; não há desfazer |
| Contexto da candidatura | Origem capturada ao registrar, link informado e notas privadas editáveis no histórico; registros antigos sem origem são identificados como tal |
| Contato | Rascunho + copiar; envio manual |
| LGPD | Dados neste navegador; exportar, validar e restaurar backup / apagar |

## O que não faz (de propósito)

- Candidatar-se, e-mail, LinkedIn, Easy Apply, anúncio pago
- Completar skill que não está no texto; nota ou ranking de ATS
- OCR de PDF-imagem, login, e-mail automático, cobrança neste Hobby — ver `docs/plano-servicos.md` (não contratado)

Playgrounds visuais: `docs/playground-estados.html`, `docs/playground-analise-evidencias.html`, `docs/playground-backup-local.html`, `docs/playground-remocao-historico.html`, `docs/playground-filtro-historico.html`, `docs/playground-fonte-lever.html` e `docs/playground-fonte-ashby.html`.

## Rodar

```bash
npm install
npm test
npm run dev
```

Abra `http://localhost:3000`. Build: `npm run build`.

## Deploy (sem cobrar)

1. GitHub: este repositório.
2. [Vercel](https://vercel.com) Hobby: Import project, framework Next.js, **sem** domínio pago. Preview por PR. Rollback = deployment anterior.

Hobby é **pessoal ou não comercial** ([Termos §4](https://vercel.com/legal/terms), lido 14/11/2026): *“You shall only use the Services under a Hobby plan for your personal or non-commercial use.”* **Não cobrar** neste deploy. Se um dia houver pagamento: migrar para [Vercel Pro](https://vercel.com/docs/plans/hobby#upgrading-to-pro) **antes** de ligar Pix/cartão — **não contratar agora**. Alternativa sem Pro: hospedar o `npm run build` noutro sítio. Ads R$ 0.

Não ligue cobrança nem ads até revisão.

## Preço (hipótese, não oferta)

Concorrentes públicos (14/11/2026): Jobs Search R$ 19,90; Aptte R$ 9,97–29,90. **Hipótese a testar** (não oferta): R$ 29,90 ou R$ 39,90/mês, sem copiar R$ 19,90, sem ads até WTP. Sem garantia de entrevista. Marca/domínio não conferidos.

## Licenças

- Código deste repo: MIT (veja `LICENSE`).
- Playwright não é dependência. Next.js e React: licenças dos pacotes.
- Greenhouse Job Board GET e Lever Postings GET são usados apenas para listas publicadas; POST de candidatura **não** é usado. Lever exige identificador do quadro e não oferece uma busca global nesta app.
- Ashby usa feed GET oficial; importa apenas isListed=true, não pede remuneração e usa o slug como rótulo do quadro, não como empresa verificada. Direitos para agregação comercial ainda não foram confirmados.
- [PDF.js](https://github.com/mozilla/pdf.js) / `pdfjs-dist` 5.4.296 Apache-2.0 — extração local, worker em `/pdfjs` (mesma origem), `isEvalSupported: false`, sem WASM, sem Adobe API, sem upload. Extração parcial não é gravada.
- Fontes web auto-hospedadas: Atkinson Hyperlegible 5.3.0, Source Serif 4 5.3.1 e IBM Plex Mono 5.3.0, SIL Open Font License 1.1. CSS e WOFF2 são empacotados localmente; avisos de licença ficam em `/licenses/`. O build não busca Google Fonts.

## Privacidade

`/privacidade`. Não versionar PDF/currículo real. `vagas-helison` é outro repo, pessoal, e não entra aqui.
