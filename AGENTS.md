# Prancheta

- Não inventar experiência, skill ou envio.
- Não scrapar LinkedIn. Fontes vivas: Greenhouse Job Board GET e Remotar GET.
- PII só em localStorage. Não commitar currículo real nem o PDF.
- Rotas: `/` dashboard, `/curriculo`, `/vagas`, `/portfolio`, `/historico`. PDF: texto no browser, sem OCR, sem upload.
- `npm test` e `npm run build` antes de dizer pronto. Audit: vitest 4.1.12 + override postcss 8.5.33 (sem Next 16).
- Vercel Hobby = pessoal/não comercial (Termos §4). Sem cobrança neste projeto.
- Candidatura e mensagem: o usuário envia. A app só rascunha e registra.
