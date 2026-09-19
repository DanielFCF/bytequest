import type { PublicRapidCard, RapidCard } from "./types";

// ============================================================
// Baralho do Rapid Fire — SERVER ONLY.
//
// O jogador vê remetente, assunto e corpo. `isScam`, o rótulo do
// vetor e a explicação ficam aqui: se fossem para o bundle, o
// mini-game inteiro seria decidido pelo DevTools.
//
// Regra de composição do baralho: mensagens legítimas precisam ser
// PLAUSIVELMENTE suspeitas (notificação automática, link encurtado
// interno, cobrança real). Um baralho onde o golpe é sempre o texto
// mais dramático treina o reflexo errado — o colaborador aprende a
// reagir ao tom, não aos indicadores.
// ============================================================

export const CARD_POOL: RapidCard[] = [
  // ---------- Legítimos ----------
  {
    id: "leg-teams",
    channel: "push",
    sender: "Microsoft Teams",
    subject: "Reunião em 15 minutos",
    body: "Alinhamento Semanal — Operações\n14:00–14:30 · Sala virtual\nOrganizador: Camila Prado (camila.prado@leroymerlin.com.br)",
    isScam: false,
    verdictLabel: "Legítimo",
    explanation:
      "Notificação nativa do cliente Teams: não pede credencial, não tem link externo e o organizador está no domínio corporativo.",
  },
  {
    id: "leg-rh",
    channel: "email",
    sender: "Comunicação Interna <rh.comunicados@leroymerlin.com.br>",
    subject: "Informe de rendimentos disponível no portal",
    body: "O informe de rendimentos 2026 já está disponível. Acesse o portal do colaborador pelo caminho de sempre (menu RH > Documentos). Não enviamos anexos nem links de download por e-mail.",
    isScam: false,
    verdictLabel: "Legítimo",
    explanation:
      "Domínio correto e, principalmente, o padrão certo: comunicação legítima manda você ao caminho que já conhece em vez de oferecer um atalho clicável.",
  },
  {
    id: "leg-jira",
    channel: "email",
    sender: "Jira <jira@leroymerlin.atlassian.net>",
    subject: "OPS-4412 foi atribuído a você",
    body: "Rodrigo Menezes atribuiu a você o chamado OPS-4412 — Ajuste de etiqueta na doca 2. Prioridade: média. Responder pelo próprio chamado.",
    isScam: false,
    verdictLabel: "Legítimo",
    explanation:
      "Notificação transacional de ferramenta homologada: subdomínio real do tenant, sem urgência artificial e sem pedido de credencial.",
  },
  {
    id: "leg-mfa",
    channel: "push",
    sender: "Microsoft Authenticator",
    subject: "Aprovar entrada?",
    body: "São Paulo, BR · Chrome no Windows · agora\nDigite o número exibido na tela: 47",
    isScam: false,
    verdictLabel: "Legítimo",
    explanation:
      "Push com correspondência de número, na cidade e no navegador que você usa. O detalhe que importa: você acabou de tentar entrar. Push que chega sem você ter feito login é ataque de fadiga de MFA.",
  },
  {
    id: "leg-nf",
    channel: "email",
    sender: "TransLog Faturamento <financeiro@translog.com.br>",
    subject: "NF 88530 — vencimento em 5 dias",
    body: "Segue lembrete da NF 88530, no valor de R$ 18.240, com vencimento em 5 dias. Dados bancários inalterados, conforme cadastro. Dúvidas pelo contato comercial de sempre.",
    isScam: false,
    verdictLabel: "Legítimo",
    explanation:
      "Cobrança real de fornecedor conhecido: prazo normal, valor compatível e — o ponto decisivo — dados bancários inalterados. É a mudança de conta que caracteriza o BEC.",
  },

  // ---------- Ataques ----------
  {
    id: "atk-smishing",
    channel: "sms",
    sender: "+55 11 99999-0000",
    subject: "Pacote retido",
    body: "LEROY MERLIN: pedido #49281 retido na fiscalizacao. Pague R$ 27,90 em ate 2h ou sera cancelado: https://rastreio-leroy.xyz/pagamento",
    isScam: true,
    verdictLabel: "Smishing + typosquatting",
    explanation:
      "Domínio '.xyz' que não pertence à empresa, taxa pequena para reduzir a resistência e prazo de 2h para impedir a conferência.",
  },
  {
    id: "atk-typo",
    channel: "email",
    sender: "Portal do Colaborador <acesso@leroymerlim-rh.com>",
    subject: "Sua senha expira hoje",
    body: "Sua credencial de rede expira em 6 horas. Renove agora para não perder o acesso: https://leroymerlim-rh.com/renovar",
    isScam: true,
    verdictLabel: "Typosquatting",
    explanation:
      "'leroymerlim' com M no lugar do N. Troca de senha legítima acontece no fluxo do sistema, nunca por link de e-mail.",
  },
  {
    id: "atk-mfa-fatigue",
    channel: "push",
    sender: "Microsoft Authenticator",
    subject: "Aprovar entrada? (4ª tentativa)",
    body: "Localização: Frankfurt, DE · 03:12\nToque em Aprovar para continuar.",
    isScam: true,
    verdictLabel: "Fadiga de MFA",
    explanation:
      "Push repetido, de madrugada, de um país onde você não está, e sem que você tenha feito login. Alguém já tem sua senha e está martelando o segundo fator.",
  },
  {
    id: "atk-whaling",
    channel: "email",
    sender: "Ricardo Alves — Diretor <r.alves.diretoria@gmail-corp.com>",
    subject: "Confidencial — preciso agora",
    body: "Estou em reunião e não posso falar. Preciso que você compre 6 cartões-presente de R$ 2.000 e me mande os códigos por aqui. Não comente com ninguém, explico depois.",
    isScam: true,
    verdictLabel: "Whaling / fraude do CEO",
    explanation:
      "Domínio falso, autoridade invocada, canal alternativo bloqueado ('não posso falar') e pedido de sigilo. Cartão-presente é irreversível e não rastreável — por isso é o pedido preferido.",
  },
  {
    id: "atk-quishing",
    channel: "email",
    sender: "Estacionamento Corporativo <notifica@vaga-corp.info>",
    subject: "Regularize sua credencial de vaga",
    body: "Sua credencial de estacionamento será desativada. Aponte a câmera para o QR code em anexo e confirme seu login de rede para manter o benefício.",
    isScam: true,
    verdictLabel: "Quishing",
    explanation:
      "QR code esconde o destino da URL e empurra a vítima para o celular, fora do filtro de rede. Benefício de RH nunca pede login por código de imagem.",
  },
  {
    id: "atk-vishing",
    channel: "chat",
    sender: "Suporte TI (contato novo)",
    subject: "Manutenção emergencial",
    body: "Detectamos acesso indevido na sua conta. Vou te mandar um código de 6 dígitos agora — me repassa aqui para eu revogar as sessões antes que o invasor entre.",
    isScam: true,
    verdictLabel: "Vishing / roubo de MFA",
    explanation:
      "O código é o segundo fator do login que o atacante está fazendo. Nenhum suporte legítimo pede código de MFA, em nenhuma hipótese.",
  },
  {
    id: "atk-invoice",
    channel: "email",
    sender: "TransLog Financeiro <cobranca@translog-br.info>",
    subject: "Atualização de dados bancários — NF 88421",
    body: "Informamos que nossa conta de recebimento mudou de banco. Pagamentos na conta antiga não serão reconhecidos. Nova conta em anexo.",
    isScam: true,
    verdictLabel: "BEC / fraude de boleto",
    explanation:
      "Domínio '.info' parecido com o do parceiro e o único campo que interessa ao fraudador: a conta. A frase sobre a conta antiga existe para impedir a checagem.",
  },
  {
    id: "atk-pix-cliente",
    channel: "chat",
    sender: "Cliente no balcão — tela do celular",
    subject: "QR Code de PIX pronto",
    body: "Já paguei, ó o comprovante aqui. Só passa esse QR no leitor de vocês pra dar baixa. Meu banco é digital, funciona assim mesmo.",
    isScam: true,
    verdictLabel: "PIX invertido",
    explanation:
      "Quem gera o QR define o recebedor. Código trazido pelo cliente não credita a conta da loja — e comprovante em tela é imagem, não confirmação.",
  },
  {
    id: "atk-rota-carga",
    channel: "email",
    sender: "TransLog Operações <expedicao@translog-logistica.net>",
    subject: "Desvio de rota — carga 77341",
    body: "Bloqueio na rodovia. Motorista substituto Anderson Lima, placa QRT-4H88, já liberado. Favor não reter o veículo; confirmação formal enviamos após o descarregamento.",
    isScam: true,
    verdictLabel: "Desvio de carga",
    explanation:
      "Domínio '.net' fora do cadastro, troca de motorista e placa, e o pedido explícito para não reter — desvio de carga se faz por instrução, não por invasão.",
  },
  {
    id: "atk-helpdesk",
    channel: "chat",
    sender: "Suposto gerente regional — contato novo",
    subject: "Perdi o autenticador",
    body: "Matrícula 88231, gerente da 42, meu gestor é o Ricardo. Troquei de celular e perdi o MFA. Cadastra esse número novo no meu acesso agora? Tenho aprovação travando a loja inteira.",
    isScam: true,
    verdictLabel: "Golpe no help desk",
    explanation:
      "Matrícula e nome do gestor circulam em vazamentos e redes sociais. Transferir o segundo fator entrega a conta inteira — foi assim que grandes varejistas foram comprometidos em 2025.",
  },
  {
    id: "atk-ghost-tap",
    channel: "chat",
    sender: "Cenário — fila do caixa",
    subject: "Cliente com o celular encostado",
    body: "O cliente da frente encosta um aparelho perto da maquininha enquanto outro cliente aproxima o cartão. A venda aparece aprovada, mas o comprovante não sai no seu terminal.",
    isScam: true,
    verdictLabel: "Ghost tapping",
    explanation:
      "Aproximação capturada por aparelho intermediário. Se o comprovante não saiu no terminal da loja, a transação não foi da loja — pare a venda e chame o supervisor.",
  },
  {
    id: "atk-infostealer",
    channel: "email",
    sender: "Suporte de Sistemas <atualizacao@suporte-sistemas.co>",
    subject: "Atualização obrigatória do leitor de etiquetas",
    body: "Instale o novo driver do coletor antes do turno para evitar falha de leitura. Execute o arquivo em anexo com permissão de administrador.",
    isScam: true,
    verdictLabel: "Infostealer",
    explanation:
      "Domínio '.co' fora do padrão e execução com privilégio administrativo. Programas assim coletam senhas salvas no navegador e tokens de sessão, que são vendidos e usados depois sem disparar alarme.",
  },
  {
    id: "atk-shadow-ai",
    channel: "chat",
    sender: "Colega da equipe",
    subject: "IA montando a planilha de comissão",
    body: "Joguei a base de comissionamento inteira no ChatGPT e ele montou a fórmula em 2 minutos. Colei com CPF e salário mesmo, pra não dar erro. Manda a sua que eu rodo.",
    isScam: true,
    verdictLabel: "Shadow AI / LGPD",
    explanation:
      "Dado pessoal e financeiro de colaborador em ferramenta não homologada: tratamento sem base legal e fora do perímetro. A fórmula sai igual sem CPF e sem salário nominal.",
  },
  {
    id: "atk-shadow",
    channel: "chat",
    sender: "Grupo do time — colega",
    subject: "Conversor de planilha grátis",
    body: "Achei um site que converte XLS em PDF sem limite. Só subir o arquivo. Já mandei a base de clientes lá e saiu redondo, segue o link pra vocês.",
    isScam: true,
    verdictLabel: "Shadow IT / vazamento",
    explanation:
      "Não é phishing, é exfiltração por boa intenção: base de clientes numa infraestrutura sem contrato, sem DPA e sem ninguém sabendo onde os dados ficam.",
  },
  {
    id: "atk-slop",
    channel: "chat",
    sender: "Assistente de código",
    subject: "Dependência sugerida",
    body: "Para validar CPF use: npm i br-docs-validator (publicada há 6 dias, 41 downloads, sem repositório vinculado).",
    isScam: true,
    verdictLabel: "Slopsquatting / supply chain",
    explanation:
      "Pacote recém-criado, sem histórico e sem repositório: alguém registrou o nome que o modelo costuma alucinar. O install script roda com as suas permissões.",
  },
];

const BY_ID = new Map(CARD_POOL.map((card) => [card.id, card]));

export function getCard(id: string): RapidCard | undefined {
  return BY_ID.get(id);
}

/** Projeção pública: sem gabarito, sem explicação. */
export function toPublicCard(card: RapidCard): PublicRapidCard {
  return {
    id: card.id,
    channel: card.channel,
    sender: card.sender,
    subject: card.subject,
    body: card.body,
  };
}

export function getCards(ids: string[]): RapidCard[] {
  return ids.map((id) => BY_ID.get(id)).filter((card): card is RapidCard => card !== undefined);
}
