# DESIGN.md — VagaMatch

Rebranding (18/11/2026): **Prancheta → VagaMatch** — *"Descubra seu match real com a vaga antes do RH — sem inventar nada no currículo"*. Referências públicas visitadas: tealhq.com e huntr.co (estrutura de landing comercial clara, fundo claro, proposta em 5s); o motor anti-alucinação do produto permanece o diferencial.

## Intenção
Landing comercial em `/` (convencer em 5 segundos, simulador sem login, planos) e ferramenta operacional em `/app` + rotas `/curriculo`, `/vagas`, `/portfolio`, `/historico`, `/conta` (operar a busca, uma folha por vaga). Público: quem candidata no Brasil, celular primeiro.

## Tokens (globals.css)
- Fundo `--papel` `#FFFFFF`, banda `--superficie` `#F8FAFC`, cartão `--folha` `#FFFFFF`, tinta `--tinta` `#0F172A`, tinta-suave `#475569`, linha `#E2E8F0`
- Primário cobalto `--primario` `#2563EB` (hover `#1D4ED8`), D+7 `--carimbo` `#1D4ED8`
- Evidência comprovada `--ok` `#047857` / anel `--match` `#10B981`; estudo/aviso `#B45309`; lacuna/erro `#DC2626`
- Dark: carvão-azulado `#0B1120` / `#101A2E` com os mesmos papéis semânticos
- Tipo: Source Serif 4 (títulos editoriais), Atkinson Hyperlegible (UI), IBM Plex Mono (datas e números). OFL, auto-hospedadas.
- Raio: 6px controles, 10px cards da landing. Botões cobalto com texto branco (contraste ≥ 4,5:1).

## Landing (classes `vm-*`)
Topbar com marca + CTAs → hero (h1 editorial + mockup lado a lado: currículo ↔ anel de score % ↔ requisitos, com evidência em esmeralda e lacuna em vermelho) → barra de prova (4 fatos) → simulador real sem login → comparativo honesto vs "ChatGPT numa 2ª aba" → planos (Passe 90 Dias R$ 79 em destaque) → CTA final + rodapé. Entrada do herói e anel do score: uma vez, no load; hover levanta card 2px. Nada de motion ligado ao scroll.

## Regras vigentes
- Zero cara de dashboard na `/`: sem grade de KPIs, sem tabela crua; o mockup mostra o produto de verdade (exemplo real do motor `analyzeEvidence`).
- Proibido: inventar experiência/skill/envio; score de entrevista; ATS; enviar dados a servidor sem conta.
- Acessibilidade: skip link, alvo 44px, foco visível, `lang="pt-BR"`, dark com paleta própria, `prefers-reduced-motion`.
- Vercel Hobby = pessoal/não comercial (Termos §4). Sem cobrança ativa; planos sinalizados como Acesso Antecipado.
- Nome antigo "Prancheta" permanece apenas em identificadores internos (chave `prancheta.v1`, formato de backup, `usePranchetaStore`) por compatibilidade.

Fonte do rebranding: feedback do usuário em 18/11/2026 via Coordenador.
