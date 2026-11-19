# DESIGN.md — VagaMatch

Rebranding (18/11/2026): **Prancheta → VagaMatch**. Segunda direção (19/11, anti-slop): **"Dossiê"** — dossiê técnico de candidatura, papel de arquivo, régua e mono como prova. Fonte: `C:/Users/HelisonDias/OpenBot/Shared/AgentOps/rebranding-anti-slop-2026-11-18.md`.

## Intenção
Landing comercial em `/` (convencer em 5 segundos, simulador sem login, planos) e ferramenta operacional em `/app` + rotas `/curriculo`, `/vagas`, `/portfolio`, `/historico`, `/conta`. Público: quem candidata no Brasil, celular primeiro. **Regra dos dois produtos:** nenhum gradiente, nenhuma sombra, nenhum raio acima de 2px, nenhum ícone em círculo colorido. Hierarquia por régua, escala tipográfica e densidade.

## Tokens (globals.css)
- `--vm-paper` `#F6F3EA` (fundo) · `--vm-sheet` `#FCFBF6` (bloco) · `--vm-ink` `#15140F` · `--vm-ink-2` `#5A594E` · `--vm-rule` `#D8D3C4` · `--vm-rule-strong` `#B9B3A1`
- `--vm-gap` `#8E3B2C` (lacuna) · `--vm-evidence` `#21563F` (comprovado) · `--vm-uncertain` `#6B6759` · `--vm-mark` `#F2E2A8` (marca-texto de keyword)
- Sem azul/cobalto em lugar nenhum da interface. Aliases legados (`--primario`, `--tinta`, `--linha`…) apontam para os tokens novos para as telas do painel herdarem o sistema.
- Tipo: **Schibsted Grotesk** (interface, 400/500/700) e **Commit Mono** (dados/score, 400/600), OFL auto-hospedadas via `@fontsource`, subset latin.
- Raio máximo 2px; sombra zero (elevação = superfície + régua); foco 2px tinta; alvo 44px.
- Sem tema escuro: a marca é clara por definição (`color-scheme: light`).

## Componentes
- **Comparador "lacuna × evidência":** duas colunas com eixo vertical de 1px, cabeçalhos mono "A vaga pede" / "Seu CV comprova"; linha numerada `01…n`, peso à esquerda; à direita, evidência com referência de página ou "lacuna" com régua esquerda de 3px em `--vm-gap`. Também usado no resultado do simulador (landing e painel).
- **Painel de scores:** numeral mono 600 (clamp 56–96px) + rótulo "match", **medidor segmentado** de 10 partes (6×14px, gap 2px), número sempre visível; três sub-scores em linhas com régua. Zero donut/animação de anel.
- **Folha de preço:** três colunas divididas por régua vertical, sem caixa/fundo; nome em mono pequeno, preço mono 600 34px; incluso em lista com régua entre itens e "—" textual para o ausente; recomendada com régua superior de 2px e rótulo mono "recomendado para o ciclo de 90 dias"; CTA sólido só na recomendada, demais como link sublinhado.

## Voz
Frase curta, sujeito claro, zero exclamação, zero emoji, zero "vamos juntos/potencialize". Estado sempre escrito, nunca só cor. Número com contexto.

## Regras vigentes
- Zero cara de dashboard na `/`: sem grade de KPIs, sem tabela crua; o mockup mostra o produto de verdade (exemplo real do motor `analyzeEvidence`), agora como diff.
- Proibido: inventar experiência/skill/envio; score de entrevista; ATS; enviar dados a servidor sem conta.
- Acessibilidade: skip link, alvo 44px, foco visível, `lang="pt-BR"`, `prefers-reduced-motion` (sem animação decorativa).
- Vercel Hobby = pessoal/não comercial (Termos §4). Sem cobrança ativa; planos sinalizados como Acesso Antecipado.
- Nome antigo "Prancheta" permanece apenas em identificadores internos (chave `prancheta.v1`, formato de backup, `usePranchetaStore`) por compatibilidade.
