# ByteQuest — roteiro e checklist da apresentação

## Estado verificado (véspera)

| Verificação | Resultado |
|---|---|
| TypeScript estrito | sem erros |
| ESLint | sem apontamentos |
| Build de produção | OK, 7 rotas de API |
| Integridade do catálogo | 60 módulos · 20 cards · 25 verbetes · 42 perguntas de duelo · 7 de diagnóstico — **0 problemas** |
| Cada pergunta do duelo tem verbete | 42/42 |
| Casos de borda nas APIs | 400, 404 e 409 respondendo corretamente |
| Gabarito no pacote do navegador | ausente |
| Gabarito ou pista nos payloads públicos | ausente (missões, duelo e questionário) |
| Percurso completo no navegador, desktop e celular | sem erro de JavaScript, sem tela vazia |
| F5 no meio da demo | progresso preservado |

## Antes de sair de casa

- [ ] Abrir o link da Vercel numa **aba anônima** e fazer uma missão. Se carregar e corrigir, o servidor está no ar.
- [ ] Abrir o repositório do GitHub em aba anônima (tem que abrir sem login).
- [ ] Deixar uma aba já aberta no app e outra no PPTX.
- [ ] Ter o código do painel à mão: **SOC-2026** (já vem preenchido no campo).
- [ ] Clicar em **Reiniciar demo** (menu lateral) para começar do zero.
- [ ] Levar o zip do projeto num pen-drive ou na nuvem. Se a internet do local falhar, `npm install && npm run dev` roda local.

## Roteiro de 5 minutos

**1. Tela inicial (20s)** — mostre que a CyberPedia é pública, antes do login, e que o painel executivo fica atrás de "Acesso corporativo", não na lista de crachás.

**2. Trilha Lojas, Módulo 1 (60s)** — "O chip não pega, passa na tarja". **Erre de propósito** escolhendo "Passar na tarja". Leia a devolutiva em voz alta: ela explica *por que* é golpe. Diga: *errar não encerra a missão — ela ensina.* Acerte na segunda e conclua.

**3. F5 na frente deles (10s)** — recarregue a página. O progresso continua. Frase: *"se o navegador fechar no meio do turno, nada se perde."*

**4. Rapid Fire, Módulo 2 (40s)** — responda dois cards. Destaque que alguns são **legítimos**: marcar tudo como golpe também reprova.

**5. Trilha personalizada (40s)** — "Não sei meu crachá", responda as 7 perguntas. Mostre o perfil de risco e **a justificativa em cada módulo**. Frase-chave: *"regras explícitas, não caixa-preta — dá para auditar por que cada pessoa recebeu cada módulo."*

**6. Duelo (60s)** — procure oponente, jogue uma partida. No fim, mostre o bloco **Para revisar**: cada erro aponta o verbete da CyberPedia que responde. Diga que o oponente é bot e está identificado como tal.

**7. Painel CISO (40s)** — Trocar crachá → Acesso corporativo → Entrar. Mostre que **o risco de Lojas subiu** por causa dos erros cometidos na demo. Frase: *"agregado por unidade, nunca por pessoa — quem expõe quem errou mata a vontade de reportar."*

**8. Ver no celular (20s)** — botão no canto inferior direito. É a própria aplicação numa viewport de 390px, não uma imagem.

## Perguntas prováveis e respostas curtas

**"O oponente do duelo é real?"** — Não, é um bot, e está escrito BOT na tela. A estrutura das rotas comporta jogadores reais quando houver backend com sessão.

**"Por que não usaram IA para montar a trilha?"** — Porque em GRC alguém vai perguntar por que aquele colaborador recebeu aquele módulo. Regra determinística responde; modelo de linguagem não.

**"Os dados do painel são reais?"** — São simulados, com semente fixa para a demo ser reproduzível. O formato da resposta já é o que a integração com o SOC preencheria.

**"E se o aluno abrir o DevTools?"** — Não encontra o gabarito. Todas as respostas corretas ficam no servidor; o navegador só recebe o enunciado.

**"O que falta para produção?"** — Backend com banco de dados e login corporativo (SSO). Hoje o progresso vive no navegador e o painel usa código de demonstração. Está na seção de limitações do relatório.

## Se algo der errado ao vivo

- **Tela travada ou estranha** → menu lateral, **Reiniciar demo**.
- **Link da Vercel fora do ar** → rode local com o zip (`npm install && npm run dev`, porta 3000).
- **Internet caiu** → a apresentação em PPTX tem capturas reais de todas as telas.
