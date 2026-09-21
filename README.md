# ByteQuest — Positive Tech Game

Plataforma gamificada de treinamento em segurança da informação para a operação
de varejo. Projeto acadêmico desenvolvido para o **Challenge Leroy Merlin** —
FIAP, Curso de Defesa Cibernética, 2026.

> **Avaliador:** para entrar no Painel CISO/SOC, o código de acesso é
> **`SOC-2026`** (já vem preenchido no campo). Veja "Roteiro de avaliação".

---

## O que é

Treinamento de segurança em campanha anual não produz reflexo. O ByteQuest troca
isso por micro-aprendizado diário, com cenários da rotina real de cada setor:
QR Code de PIX falso no caixa, desvio de carga por e-mail falsificado, planilha
de comissionamento colada numa IA pública.

**60 módulos** em 6 trilhas setoriais, **6 formatos de missão**, **25 verbetes**
de consulta livre, **Modo Duelo** e um **painel executivo** de risco humano.

## Como rodar

Requer Node.js 20 ou superior.

```bash
npm install
npm run dev
```

Acesse `http://localhost:3000`.

Para build de produção:

```bash
npm run build
npm start
```

## Roteiro de avaliação (5 minutos)

1. **Trilha setorial** — digite um nome, escolha o crachá **Lojas** e abra o
   Módulo 1. Erre de propósito: a missão não encerra, ela explica.
2. **Rapid Fire** (Módulo 2) — 9 segundos por card. Nem toda mensagem é golpe;
   marcar comunicação legítima como fraude também reprova.
3. **Trilha personalizada** — volte ao início, escolha **"Não sei meu crachá"**
   e responda as 7 perguntas. Cada módulo vem com o motivo da escolha.
4. **CyberPedia** — acessível na tela inicial, sem login.
5. **Painel CISO/SOC** — botão **"Acesso corporativo"** na tela inicial, código
   **`SOC-2026`**. Repare que o risco da unidade sobe conforme os erros que você
   cometeu na sessão.
6. **Duelo** — no menu lateral. Banco de 40 perguntas com 4 alternativas cada;
   cinco por partida, 15 segundos por rodada, com placar por velocidade. A
   classificação de liga (Bronze III → Diamante) acumula entre partidas na
   sessão e aparece acima do botão de buscar partida, com quadro de líderes.
   Os adversários são **bots simulados**, identificados com a etiqueta BOT:
   não há matchmaking entre jogadores reais, e o quadro da liga é fictício.
   Cada pergunta é ligada a um verbete da CyberPedia: a devolutiva indica onde
   o assunto está explicado, e a tela final lista os verbetes das perguntas
   erradas com atalho direto para a leitura.
7. **Multidispositivo** — botão **"Ver no celular"** no canto inferior direito
   (só aparece em tela larga). Abre a própria aplicação numa viewport de 390px.

## Stack

Next.js 16 · React 19 · TypeScript (modo estrito) · Tailwind CSS 4 · lucide-react

Sem dependências além dessas. Sem banco de dados: o progresso vive em
`sessionStorage` (sobrevive a um F5, não entre dispositivos).

## Arquitetura

```
app/
  page.tsx                          interface completa (client-side)
  api/missions/route.ts             GET  — trilha do setor, sem gabarito
  api/missions/validate/route.ts    POST — corrige as engines e pontua
  api/rapid/answer/route.ts         POST — veredito de um card do Rapid Fire
  api/trilha/route.ts               GET/POST — diagnóstico e composição da trilha
  api/grc/route.ts                  GET  — telemetria agregada do painel
  api/duelo/route.ts                GET  — abre partida do Modo Duelo
  api/duelo/answer/route.ts         POST — resolve a pergunta e recalcula o placar
lib/
  missions.ts     catálogo das 60 missões (SERVER-ONLY: contém o gabarito)
  dlp.ts          motor de detecção: CPF, cartão, AWS, JWT, chave privada…
  cyberpedia.ts   25 verbetes (público)
  assessment.ts   questionário e compositor da trilha personalizada
  grc.ts          telemetria do painel executivo
  duel.ts         banco de 40 perguntas e bot do Modo Duelo (SERVER-ONLY)
  league.ts       faixas, progressão e quadro de líderes do Duelo (público)
  sectors.ts      setores (público)
  types.ts        contratos — sufixo `Public` = pode ir ao navegador
```

### Decisão estruturante: o gabarito não vai para o navegador

Uma plataforma de segurança cujo gabarito viaja no JavaScript do cliente perde a
credibilidade no primeiro avaliador que abrir o DevTools. O catálogo de missões
é importado **apenas** pelos Route Handlers; funções de projeção removem
`correct`, `explanation`, `flaggedIds` e a ordem correta antes de serializar.

Verificação, após `npm run build`:

```bash
grep -rl "Baiting bem-sucedido\|correctOptionId" .next/static/   # sem resultados
```

## Os seis formatos de missão

| Formato | Tempo | Habilidade treinada |
|---|---|---|
| Cenário (múltipla escolha) | sem cronômetro | analisar indicadores e seguir procedimento |
| Censor de Prompts (DLP) | sem cronômetro | classificar dado sensível com precisão |
| Encontre os sinais | sem cronômetro | localizar o indicador dentro da mensagem |
| Ordem de resposta | sem cronômetro | sequenciar a resposta a um incidente |
| Rapid Fire | 9 s por card | reconhecer padrão sob pressão |
| Desafio Final | 45 s por rodada | consolidar a trilha |

Quatro dos seis não têm cronômetro: pressão constante gera ansiedade e prejudica
a absorção.

## Modo Guiado (em vez de "game over")

Errar não encerra a missão. Os três escudos existem, mas ao esgotarem o servidor
revela onde estava a ameaça e o colaborador conclui com apoio — mantendo a
ofensiva, com XP no piso de 50 e a missão marcada para revisão.

Bloquear quem errou três vezes puniria justamente quem mais precisa do conteúdo,
e removeria do relatório gerencial o dado mais útil: quem ainda erra e em quê.

## Painel CISO/SOC

Indicadores agregados **por unidade de negócio**, nunca por pessoa. Um painel que
expõe quem errou destrói a disposição de reportar — e o reporte é o controle mais
barato que a empresa tem.

A telemetria é simulada com gerador pseudoaleatório de **semente fixa**: os
números não mudam a cada reload, o que torna a demonstração reproduzível.

## Limitações conhecidas

- Progresso em `sessionStorage`: não persiste entre dispositivos nem sessões.
- Tentativas e tempo são informados pelo cliente; a pontuação é recalculada no
  servidor, mas sem sessão autenticada não há como torná-los autoritativos.
- O portal corporativo usa código de demonstração; em produção seria SSO com
  autorização por papel no Active Directory.
- Telemetria do painel é simulada — a estrutura de resposta já é a que a
  integração com o SOC preencheria.
- O Agente Adversário baseado em LLM, previsto na Fase 1, não foi implementado.
- O Modo Duelo não tem matchmaking real: o oponente é um bot determinístico,
  declarado como tal na interface. A estrutura das rotas já comporta a troca por
  partidas entre jogadores reais quando houver backend com sessão.

## Equipe

Grupo **ByteQuest** — FIAP, Defesa Cibernética

---

Projeto acadêmico. Os cenários citam a Leroy Merlin como estudo de caso do
Challenge; dados, métricas e telemetria são fictícios.
