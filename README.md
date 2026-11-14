# Prancheta

Compare o texto do **seu** currículo com o anúncio da vaga, registre o que você já enviou e rascunhe uma mensagem. **Nada é enviado daqui.** Nada é inventado no currículo.

## O que funciona de verdade

| Função | Como |
|---|---|
| Currículo × vaga | Palavras técnicas presentes vs. ausentes |
| Portfólio | Links e fatos que você cadastra |
| Vagas | Cole o anúncio **ou** importe quadro público [Greenhouse](https://docs.greenhouse.io/job-board.html) / [Remotar](https://api.remotar.com.br/jobs?page=1) |
| Histórico | Status, data, lembrete de feedback após 7 dias (local) |
| Contato | Rascunho + copiar; envio manual |
| LGPD | Dados neste navegador; exportar / apagar |

## O que não faz (de propósito)

- Candidatar-se, e-mail, LinkedIn, Easy Apply, anúncio pago
- Completar skill que não está no texto
- Prometer contratação

Playground visual: `docs/playground-estados.html`.

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

Não ligue cobrança nem ads até revisão.

## Preço (hipótese, não oferta)

Concorrentes públicos (14/11/2026): Jobs Search R$ 19,90; Aptte R$ 9,97–29,90. **Hipótese a testar** (não oferta): R$ 29,90 ou R$ 39,90/mês, sem copiar R$ 19,90, sem ads até WTP. Sem garantia de entrevista. Marca/domínio não conferidos.

## Licenças

- Código deste repo: MIT (veja `LICENSE`).
- Playwright não é dependência. Next.js e React: licenças dos pacotes.
- Greenhouse Job Board GET é público e sem chave; POST de candidatura **não** é usado.

## Privacidade

`/privacidade`. Não versionar PDF/currículo real. `vagas-helison` é outro repo, pessoal, e não entra aqui.
