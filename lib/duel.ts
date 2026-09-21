import { leagueDelta, positionFor, tierFor } from "./league";

// ============================================================
// Modo Duelo — SERVER ONLY.
//
// Partida 1v1 de perguntas rápidas contra um oponente SIMULADO.
// Não há matchmaking real nem jogadores concorrentes: o adversário
// é um bot, e isso está declarado na interface (etiqueta BOT) e no
// README. Fingir jogador real seria uma afirmação falsa que cai por
// terra no primeiro avaliador que abrir duas abas.
//
// O comportamento do bot é DETERMINÍSTICO a partir do id da partida:
// mesma partida, mesmas respostas do oponente. Isso torna a demo
// reproduzível e impede que um cliente modificado peça a partida de
// novo até cair num bot fraco.
// ============================================================

export interface DuelQuestion {
  id: string;
  /** verbete da CyberPedia que responde a esta pergunta */
  article: string;
  /** etiqueta temática exibida no card da pergunta */
  category: string;
  prompt: string;
  options: Array<{ id: string; label: string }>;
  correctOptionId: string;
  explanation: string;
  /** 1 fácil · 2 média · 3 difícil — usada na precisão do bot */
  level: 1 | 2 | 3;
}

export interface PublicDuelQuestion {
  id: string;
  category: string;
  prompt: string;
  options: Array<{ id: string; label: string }>;
}

export interface Opponent {
  name: string;
  /** apelido de liga, no estilo dos jogos competitivos */
  handle: string;
  tier: string;
  unit: string;
  /** pontuação de liga exibida ao lado do nome */
  rating: number;
  /** 0–1: probabilidade base de acerto */
  skill: number;
  avatar: string;
}

export const OPPONENTS: Opponent[] = [
  { name: "Marina D.", handle: "caixa_42", tier: "Prata II", unit: "Loja 42 — Interlagos", rating: 1180, skill: 0.55, avatar: "MD" },
  { name: "Rogério S.", handle: "doca_night", tier: "Prata I", unit: "CD Cajamar", rating: 1265, skill: 0.62, avatar: "RS" },
  { name: "Camila P.", handle: "fin0ps", tier: "Ouro III", unit: "Matriz — Financeiro", rating: 1340, skill: 0.68, avatar: "CP" },
  { name: "Thiago A.", handle: "sac_shield", tier: "Prata I", unit: "SAC — Atendimento", rating: 1215, skill: 0.6, avatar: "TA" },
  { name: "Beatriz L.", handle: "b3a_sec", tier: "Ouro I", unit: "TI — Infraestrutura", rating: 1455, skill: 0.78, avatar: "BL" },
  { name: "Anderson M.", handle: "pdv_and", tier: "Bronze I", unit: "Loja 17 — Osasco", rating: 1095, skill: 0.5, avatar: "AM" },
  { name: "Juliana F.", handle: "rh_ju", tier: "Ouro III", unit: "Matriz — RH", rating: 1300, skill: 0.65, avatar: "JF" },
  { name: "Ricardo N.", handle: "cd_extrema", tier: "Ouro II", unit: "CD Extrema", rating: 1370, skill: 0.72, avatar: "RN" },
];

export const QUESTION_BANK: DuelQuestion[] = [
  {
    id: "d01", article: "phishing", category: "PHISHING", level: 1,
    prompt: "Um e-mail diz que sua senha expira em 2 horas e traz um link para renovar. O que fazer?",
    options: [
      { id: "a", label: "Clicar no link e trocar a senha" },
      { id: "b", label: "Acessar o portal pelo caminho de sempre e conferir" },
      { id: "c", label: "Responder pedindo confirmação" },
      { id: "d", label: "Encaminhar para o colega conferir" },
    ],
    correctOptionId: "b",
    explanation: "Troca de senha legítima acontece no fluxo do sistema, nunca por link de e-mail com prazo curto.",
  },
  {
    id: "d02", article: "golpe-suporte", category: "ACESSO", level: 1,
    prompt: "Qual destes NUNCA deve ser compartilhado, nem com o suporte de TI?",
    options: [
      { id: "a", label: "Seu ramal" },
      { id: "b", label: "O código de 6 dígitos do MFA" },
      { id: "c", label: "O número do seu crachá" },
      { id: "d", label: "Sua data de admissão" },
    ],
    correctOptionId: "b",
    explanation: "O código de MFA é o segundo fator do login. Suporte legítimo jamais pede — quem pede está entrando na sua conta.",
  },
  {
    id: "d03", article: "typosquatting", category: "PHISHING", level: 2,
    prompt: "Em 'https://pagamentos-leroy.com.br.seguro-net.io/login', qual é o domínio real?",
    options: [
      { id: "a", label: "pagamentos-leroy.com.br" },
      { id: "b", label: "seguro-net.io" },
      { id: "c", label: "login" },
      { id: "d", label: "com.br" },
    ],
    correctOptionId: "b",
    explanation: "Vale o nome registrável imediatamente antes da extensão. Tudo à esquerda é escolhido livremente pelo atacante.",
  },
  {
    id: "d04", article: "fadiga-mfa", category: "ACESSO", level: 2,
    prompt: "Você recebe 6 notificações de MFA seguidas, de madrugada, sem ter feito login. Isso indica:",
    options: [
      { id: "a", label: "Erro do aplicativo autenticador" },
      { id: "b", label: "Alguém já tem sua senha e tenta entrar" },
      { id: "c", label: "Manutenção programada da TI" },
      { id: "d", label: "Alguém tentando te avisar de um problema" },
    ],
    correctOptionId: "b",
    explanation: "É fadiga de MFA. Nunca aprove — e troque a senha, porque ela já vazou.",
  },
  {
    id: "d05", article: "acesso-fisico", category: "FÍSICO", level: 1,
    prompt: "Um cliente pede para carregar o celular na porta USB do terminal de caixa. Por que recusar?",
    options: [
      { id: "a", label: "Porque consome energia do PDV" },
      { id: "b", label: "Porque a porta USB transporta dados, não só energia" },
      { id: "c", label: "Porque a bateria pode superaquecer" },
      { id: "d", label: "Porque o cabo do cliente pode estar danificado" },
    ],
    correctOptionId: "b",
    explanation: "USB é barramento de dados. Num host com acesso à rede de pagamento, é superfície de ataque.",
  },
  {
    id: "d06", article: "dados-ia", category: "DADOS & IA", level: 2,
    prompt: "Antes de colar uma planilha de clientes numa IA pública, o que precisa sair?",
    options: [
      { id: "a", label: "Os cabeçalhos das colunas" },
      { id: "b", label: "CPF, cartão e demais dados identificáveis" },
      { id: "c", label: "Nada, a IA não guarda dados" },
      { id: "d", label: "Apenas a coluna de valores" },
    ],
    correctOptionId: "b",
    explanation: "O que identifica a pessoa sai; o que dá contexto à tarefa fica. Prompt enviado é dado fora do perímetro.",
  },
  {
    id: "d07", article: "deepfake-voz", category: "FRAUDE", level: 3,
    prompt: "Numa chamada de vídeo com imagem ruim, o 'CEO' pede transferência urgente. O que autentica ele?",
    options: [
      { id: "a", label: "O rosto e a voz na chamada" },
      { id: "b", label: "Uma palavra-código combinada previamente, por canal separado" },
      { id: "c", label: "Um e-mail de confirmação enviado depois" },
      { id: "d", label: "O número que aparece no identificador de chamadas" },
    ],
    correctOptionId: "b",
    explanation: "Deepfake clona rosto e voz. Se a conta estiver comprometida, o e-mail também chega. Só o segredo fora da banda resiste.",
  },
  {
    id: "d08", article: "quishing", category: "PHISHING", level: 2,
    prompt: "Uma etiqueta colada num palete traz QR Code pedindo login de rede. Isso é:",
    options: [
      { id: "a", label: "Novo processo de conferência" },
      { id: "b", label: "Quishing — coleta de credencial" },
      { id: "c", label: "Falha de integração do sistema" },
      { id: "d", label: "Campanha de marketing da transportadora" },
    ],
    correctOptionId: "b",
    explanation: "QR esconde o destino e empurra para o celular, fora do filtro corporativo. Página que pede senha de rede fora do domínio oficial é coleta.",
  },
  {
    id: "d09", article: "acesso-fisico", category: "FÍSICO", level: 1,
    prompt: "Achou um pen-drive no estacionamento da loja. O correto é:",
    options: [
      { id: "a", label: "Conectar para descobrir o dono" },
      { id: "b", label: "Entregar à segurança sem conectar" },
      { id: "c", label: "Conectar num computador antigo, por segurança" },
      { id: "d", label: "Formatar e usar como pen-drive pessoal" },
    ],
    correctOptionId: "b",
    explanation: "É baiting. Um BadUSB se apresenta como teclado e digita comandos sozinho — não precisa que você abra arquivo nenhum.",
  },
  {
    id: "d10", article: "segredos", category: "SEGREDOS", level: 3,
    prompt: "Uma chave de API de produção foi commitada num repositório público há 40 minutos. Primeiro passo:",
    options: [
      { id: "a", label: "Reescrever o histórico do repositório" },
      { id: "b", label: "Revogar a chave e emitir uma nova" },
      { id: "c", label: "Tornar o repositório privado" },
      { id: "d", label: "Avisar o time por e-mail e decidir depois" },
    ],
    correctOptionId: "b",
    explanation: "Chave pública é chave comprometida — bots varrem em segundos. Limpar histórico é higiene, não contenção.",
  },
  {
    id: "d11", article: "fraude-fornecedor", category: "FRAUDE", level: 2,
    prompt: "Fornecedor avisa por e-mail que mudou de banco e pede pagamento na conta nova. O que fazer?",
    options: [
      { id: "a", label: "Pagar, o e-mail tem a identidade visual correta" },
      { id: "b", label: "Confirmar pelo contato já cadastrado no sistema" },
      { id: "c", label: "Responder o e-mail pedindo comprovante" },
      { id: "d", label: "Ligar para o telefone que consta na assinatura do e-mail" },
    ],
    correctOptionId: "b",
    explanation: "Mudança de conta é o único campo que o BEC precisa alterar. Responder mantém a verificação dentro do canal do fraudador.",
  },
  {
    id: "d12", article: "acesso-fisico", category: "FÍSICO", level: 1,
    prompt: "Alguém com as mãos ocupadas pede que você segure a porta da área restrita. Isso é:",
    options: [
      { id: "a", label: "Cortesia normal entre colegas" },
      { id: "b", label: "Tailgating — cada um passa com o próprio crachá" },
      { id: "c", label: "Aceitável se a pessoa estiver uniformizada" },
      { id: "d", label: "Pedir para ela mostrar o crachá e liberar" },
    ],
    correctOptionId: "b",
    explanation: "Uniforme se compra. Segurar a porta anula todo o investimento em controle de acesso.",
  },
  {
    id: "d13", article: "fraude-caixa", category: "FRAUDE", level: 2,
    prompt: "O cliente mostra um QR Code de PIX já gerado e pede para você ler no leitor da loja. Por que recusar?",
    options: [
      { id: "a", label: "Porque o leitor não aceita QR externo" },
      { id: "b", label: "Porque quem gera o código define quem recebe" },
      { id: "c", label: "Porque o valor pode estar errado" },
      { id: "d", label: "Porque o app do cliente pode estar desatualizado" },
    ],
    correctOptionId: "b",
    explanation: "Código trazido pelo cliente não credita a conta da loja. O QR de cobrança sai sempre do PDV.",
  },
  {
    id: "d14", article: "dados-ia", category: "DADOS & IA", level: 3,
    prompt: "Um ticket de usuário externo contém texto mandando o assistente listar variáveis de ambiente. Isso é:",
    options: [
      { id: "a", label: "Erro de formatação do log" },
      { id: "b", label: "Prompt injection indireta" },
      { id: "c", label: "Teste automatizado da ferramenta" },
      { id: "d", label: "Instrução legítima de um script de automação" },
    ],
    correctOptionId: "b",
    explanation: "Conteúdo de terceiro lido por um agente vira entrada — e entrada nunca deve virar instrução.",
  },
  {
    id: "d15", article: "senhas", category: "ACESSO", level: 1,
    prompt: "Qual senha resiste melhor a um ataque automatizado?",
    options: [
      { id: "a", label: "P@ssw0rd2026!" },
      { id: "b", label: "girassol-pedra-caneca-verde" },
      { id: "c", label: "Leroy@123" },
      { id: "d", label: "Senha1234" },
    ],
    correctOptionId: "b",
    explanation: "Comprimento vence complexidade decorada. Substituições previsíveis já estão nos dicionários de ataque.",
  },
  {
    id: "d16", article: "lgpd", category: "LGPD", level: 2,
    prompt: "Você enviou por engano uma planilha com dados de outro cliente. A prioridade é:",
    options: [
      { id: "a", label: "Esperar para ver se alguém percebe" },
      { id: "b", label: "Tentar o recall e reportar imediatamente" },
      { id: "c", label: "Pedir ao destinatário que apague, sem avisar ninguém" },
      { id: "d", label: "Pedir ao TI que apague o e-mail do servidor e seguir sem reportar" },
    ],
    correctOptionId: "b",
    explanation: "Sob a LGPD o prazo conta a partir do conhecimento. Erro reportado em minutos é incidente; escondido por dias é violação.",
  },
  {
    id: "d17", article: "shadow-it", category: "SHADOW IT", level: 2,
    prompt: "Uma extensão de navegador pede 'ler e alterar todos os seus dados em todos os sites'. Isso significa:",
    options: [
      { id: "a", label: "Permissão padrão de qualquer extensão" },
      { id: "b", label: "Acesso a tudo que aparece na sua tela, inclusive sistemas internos" },
      { id: "c", label: "Acesso apenas ao site onde foi instalada" },
      { id: "d", label: "Que a extensão precisa de internet para funcionar" },
    ],
    correctOptionId: "b",
    explanation: "Extensão é software com visão total da aba. Extensões populares são compradas e atualizadas com código malicioso.",
  },
  {
    id: "d18", article: "ransomware", category: "MALWARE", level: 3,
    prompt: "No ransomware, por que o atacante costuma exfiltrar dados ANTES de criptografar?",
    options: [
      { id: "a", label: "Para acelerar a criptografia" },
      { id: "b", label: "Para extorquir mesmo se o backup funcionar" },
      { id: "c", label: "Para testar a rede" },
      { id: "d", label: "Para ocupar a banda da rede durante o ataque" },
    ],
    correctOptionId: "b",
    explanation: "É a dupla extorsão: com backup íntegro, resta a ameaça de publicar o que foi roubado.",
  },
  {
    id: "d19", article: "vazamento-acidental", category: "FÍSICO", level: 1,
    prompt: "Ao se afastar da estação de trabalho por dois minutos, você deve:",
    options: [
      { id: "a", label: "Deixar como está, é rápido" },
      { id: "b", label: "Bloquear a tela" },
      { id: "c", label: "Minimizar as janelas abertas" },
      { id: "d", label: "Fechar o navegador" },
    ],
    correctOptionId: "b",
    explanation: "Acesso físico a sessão aberta dispensa qualquer malware. Windows + L custa meio segundo.",
  },
  {
    id: "d20", article: "supply-chain", category: "SUPPLY CHAIN", level: 2,
    prompt: "Um pacote sugerido pela IA foi publicado há 6 dias, tem 41 downloads e nenhum repositório. Isso é:",
    options: [
      { id: "a", label: "Uma biblioteca nova promissora" },
      { id: "b", label: "Provável slopsquatting — risco de supply chain" },
      { id: "c", label: "Problema apenas de manutenção futura" },
      { id: "d", label: "Um fork legítimo de uma biblioteca conhecida" },
    ],
    correctOptionId: "b",
    explanation: "Alguém registrou o nome que o modelo costuma alucinar. O install script roda com as suas permissões.",
  },
  {
    id: "d21", article: "resposta-incidente", category: "RESPOSTA", level: 1,
    prompt: "O melhor momento para reportar uma tentativa de golpe que você NÃO caiu é:",
    options: [
      { id: "a", label: "Não precisa reportar, já que não caiu" },
      { id: "b", label: "Imediatamente — provavelmente chegou a mais colegas" },
      { id: "c", label: "Só se acontecer de novo" },
      { id: "d", label: "Só se você tiver certeza de que era golpe" },
    ],
    correctOptionId: "b",
    explanation: "A mensagem que chegou a você costuma ser a décima da campanha. O bloqueio protege quem viria depois.",
  },
  {
    id: "d22", article: "nuvem", category: "NUVEM", level: 3,
    prompt: "A IA sugere abrir a porta do banco para 0.0.0.0/0 e remover a senha 'só para testar'. A resposta é:",
    options: [
      { id: "a", label: "Aplicar, é temporário" },
      { id: "b", label: "Restringir ao CIDR do serviço e manter a autenticação" },
      { id: "c", label: "Remover só a senha, mantendo o firewall" },
      { id: "d", label: "Abrir a porta e ativar o log de auditoria" },
    ],
    correctOptionId: "b",
    explanation: "Saída de IA é sugestão, não autoridade. 'Temporário' é como a maioria dos bancos expostos nasceu.",
  },
  {
    id: "d23", article: "engenharia-social", category: "FRAUDE", level: 2,
    prompt: "Um 'supervisor' liga pedindo estorno em dinheiro fora do sistema, com pressa. O correto é:",
    options: [
      { id: "a", label: "Fazer e regularizar depois" },
      { id: "b", label: "Encerrar e ligar no ramal da lista interna" },
      { id: "c", label: "Ligar no número que ele forneceu" },
      { id: "d", label: "Pedir que ele envie a solicitação por e-mail" },
    ],
    correctOptionId: "b",
    explanation: "Verificação out-of-band: o canal precisa ser escolhido por você, nunca oferecido por quem faz o pedido.",
  },
  {
    id: "d24", article: "phishing", category: "PHISHING", level: 2,
    prompt: "O cadeado verde no navegador garante que o site é:",
    options: [
      { id: "a", label: "Confiável e legítimo" },
      { id: "b", label: "Apenas criptografado na conexão" },
      { id: "c", label: "Auditado por uma autoridade" },
      { id: "d", label: "Que o site tem certificado de segurança validado por auditoria" },
    ],
    correctOptionId: "b",
    explanation: "Certificado gratuito dá cadeado a qualquer site, inclusive ao falso. Cadeado não é identidade.",
  },
  {
    id: "d25", article: "senhas", category: "ACESSO", level: 1,
    prompt: "A melhor forma de guardar senhas diferentes para cada sistema é:",
    options: [
      { id: "a", label: "Um caderno na gaveta da mesa" },
      { id: "b", label: "Um gerenciador de senhas aprovado pela empresa" },
      { id: "c", label: "Um arquivo de texto no computador" },
      { id: "d", label: "Usar a mesma senha com um número no fim" },
    ],
    correctOptionId: "b",
    explanation: "Gerenciador aprovado cria senhas únicas e longas sem você precisar memorizar nenhuma delas.",
  },
  {
    id: "d26", article: "phishing", category: "PHISHING", level: 2,
    prompt: "Um e-mail vem do endereço correto de um colega, mas pede algo estranho. Isso significa:",
    options: [
      { id: "a", label: "É seguro, o domínio está certo" },
      { id: "b", label: "A conta dele pode estar comprometida" },
      { id: "c", label: "É spam automático" },
      { id: "d", label: "O servidor de e-mail está com defeito" },
    ],
    correctOptionId: "b",
    explanation: "Conta legítima invadida é o veículo preferido: passa por todos os filtros porque o remetente é real.",
  },
  {
    id: "d27", article: "vazamento-acidental", category: "FÍSICO", level: 1,
    prompt: "Você encontra um relatório confidencial esquecido na impressora. O correto é:",
    options: [
      { id: "a", label: "Deixar onde está, quem imprimiu vem buscar" },
      { id: "b", label: "Recolher e entregar ao gestor ou à segurança" },
      { id: "c", label: "Fotografar e perguntar no grupo quem imprimiu" },
      { id: "d", label: "Jogar no lixo para evitar exposição" },
    ],
    correctOptionId: "b",
    explanation: "Tirar de circulação por canal responsável. Fotografar multiplica o vazamento; jogar no lixo comum também expõe.",
  },
  {
    id: "d28", article: "dados-ia", category: "DADOS & IA", level: 2,
    prompt: "Qual destes NÃO precisa sair de um prompt enviado a uma IA pública?",
    options: [
      { id: "a", label: "CPF do cliente" },
      { id: "b", label: "Chave de API do sistema" },
      { id: "c", label: "O nome do produto vendido" },
      { id: "d", label: "Salário nominal do colaborador" },
    ],
    correctOptionId: "c",
    explanation: "Nome de produto é contexto de negócio, não identifica pessoa nem abre sistema. Mascarar demais degrada a resposta.",
  },
  {
    id: "d29", article: "fraude-fornecedor", category: "FRAUDE", level: 2,
    prompt: "No golpe do falso boleto, o dado que o criminoso precisa alterar é:",
    options: [
      { id: "a", label: "O valor da cobrança" },
      { id: "b", label: "A linha digitável e o beneficiário" },
      { id: "c", label: "A data de vencimento" },
      { id: "d", label: "O logotipo da empresa" },
    ],
    correctOptionId: "b",
    explanation: "Valor e visual costumam ser copiados do boleto real — justamente para não levantar suspeita. O que muda é quem recebe.",
  },
  {
    id: "d30", article: "resposta-incidente", category: "RESPOSTA", level: 2,
    prompt: "Você suspeita que sua máquina foi infectada. A primeira ação é:",
    options: [
      { id: "a", label: "Desligar imediatamente" },
      { id: "b", label: "Desconectar da rede e acionar o SOC, sem desligar" },
      { id: "c", label: "Rodar um antivírus gratuito baixado na hora" },
      { id: "d", label: "Reiniciar em modo de segurança e formatar" },
    ],
    correctOptionId: "b",
    explanation: "Desligar apaga a memória volátil, que é evidência. Isolar da rede contém sem destruir o que a resposta precisa.",
  },
  {
    id: "d31", article: "senhas", category: "ACESSO", level: 2,
    prompt: "Por que reutilizar a senha do trabalho em sites pessoais é perigoso?",
    options: [
      { id: "a", label: "Porque deixa o login mais lento" },
      { id: "b", label: "Porque um vazamento no site pessoal entrega a conta corporativa" },
      { id: "c", label: "Porque a política proíbe por burocracia" },
      { id: "d", label: "Porque o navegador pode salvar errado" },
    ],
    correctOptionId: "b",
    explanation: "Credenciais vazadas são testadas em massa em outros serviços. É o vetor de entrada mais comum que existe.",
  },
  {
    id: "d32", article: "lgpd", category: "LGPD", level: 2,
    prompt: "Sob a LGPD, o prazo para comunicar um incidente com dado pessoal começa a contar:",
    options: [
      { id: "a", label: "Quando o cliente reclama" },
      { id: "b", label: "A partir do conhecimento do incidente" },
      { id: "c", label: "Após a conclusão da investigação" },
      { id: "d", label: "No fechamento do mês" },
    ],
    correctOptionId: "b",
    explanation: "Por isso esconder o erro piora tudo: o relógio já está correndo desde o momento em que alguém soube.",
  },
  {
    id: "d33", article: "shadow-it", category: "SHADOW IT", level: 1,
    prompt: "Um site gratuito converte planilhas em PDF. Antes de usar com dado da empresa, pergunte:",
    options: [
      { id: "a", label: "Se a conversão mantém a formatação" },
      { id: "b", label: "Onde os arquivos ficam e quem responde por eles" },
      { id: "c", label: "Se tem propaganda" },
      { id: "d", label: "Se funciona no celular" },
    ],
    correctOptionId: "b",
    explanation: "Sem contrato e sem cláusula de proteção de dados, o arquivo passa a viver numa infraestrutura que ninguém auditou.",
  },
  {
    id: "d34", article: "nuvem", category: "NUVEM", level: 3,
    prompt: "Um bucket de armazenamento com dados de clientes foi marcado como público. O risco imediato é:",
    options: [
      { id: "a", label: "Aumento do custo de tráfego" },
      { id: "b", label: "Indexação e cópia por varredores automatizados" },
      { id: "c", label: "Lentidão no acesso interno" },
      { id: "d", label: "Perda do versionamento dos arquivos" },
    ],
    correctOptionId: "b",
    explanation: "Buckets públicos são varridos por bots em minutos. O custo é o de menos: o conteúdo já saiu.",
  },
  {
    id: "d35", article: "engenharia-social", category: "PHISHING", level: 2,
    prompt: "Qual é o indicador mais confiável de que um e-mail é fraude?",
    options: [
      { id: "a", label: "Erros de português" },
      { id: "b", label: "Pressa combinada com quebra de processo" },
      { id: "c", label: "Assinatura sem foto" },
      { id: "d", label: "Ter sido enviado fora do horário comercial" },
    ],
    correctOptionId: "b",
    explanation: "Texto gerado por IA não erra mais o português. O que continua constante é a pressa que pede para pular o controle.",
  },
  {
    id: "d36", article: "fraude-caixa", category: "FÍSICO", level: 2,
    prompt: "Um cliente insiste em ditar o número do cartão em voz alta no balcão. O correto é:",
    options: [
      { id: "a", label: "Anotar no papel e digitar depois" },
      { id: "b", label: "Orientar que ele mesmo digite na maquininha" },
      { id: "c", label: "Digitar no sistema enquanto ele fala" },
      { id: "d", label: "Registrar no chamado para conferência" },
    ],
    correctOptionId: "b",
    explanation: "Número de cartão não passa por papel, por pessoa nem por sistema de atendimento — só pelo terminal de pagamento.",
  },
  {
    id: "d37", article: "supply-chain", category: "SUPPLY CHAIN", level: 3,
    prompt: "Um fornecedor pede acesso de leitura ao ERP, sem contrato de segurança assinado. A resposta correta é:",
    options: [
      { id: "a", label: "Liberar com usuário genérico para não atrasar" },
      { id: "b", label: "Condicionar ao contrato, com usuário nominal, MFA e prazo" },
      { id: "c", label: "Liberar e pedir o contrato depois" },
      { id: "d", label: "Compartilhar exportações por e-mail no lugar do acesso" },
    ],
    correctOptionId: "b",
    explanation: "Quando o fornecedor for invadido, o incidente é seu. Escopo mínimo, identidade nominal e prazo definido.",
  },
  {
    id: "d38", article: "anexos-malware", category: "MALWARE", level: 2,
    prompt: "Um arquivo chamado 'nota_fiscal.pdf.exe' chega por e-mail. O que isso indica?",
    options: [
      { id: "a", label: "É um PDF compactado" },
      { id: "b", label: "É um executável disfarçado de documento" },
      { id: "c", label: "É um erro de digitação do remetente" },
      { id: "d", label: "É um formato novo de nota eletrônica" },
    ],
    correctOptionId: "b",
    explanation: "Vale sempre a última extensão. '.pdf' ali é parte do nome, escolhido para enganar a leitura rápida.",
  },
  {
    id: "d39", article: "senhas", category: "ACESSO", level: 1,
    prompt: "Ao sair de férias, o correto com a sua senha é:",
    options: [
      { id: "a", label: "Deixar anotada com o colega que vai substituir" },
      { id: "b", label: "Não compartilhar e solicitar delegação formal de acesso" },
      { id: "c", label: "Compartilhar só com o gestor direto" },
      { id: "d", label: "Trocar por uma senha simples e temporária" },
    ],
    correctOptionId: "b",
    explanation: "Senha compartilhada elimina a rastreabilidade: qualquer ação passa a ser atribuída a você.",
  },
  {
    id: "d40", article: "fraude-fornecedor", category: "FRAUDE", level: 3,
    prompt: "Numa tentativa de desvio de carga, qual verificação realmente quebra a fraude?",
    options: [
      { id: "a", label: "Conferir se a placa bate com o documento apresentado" },
      { id: "b", label: "Confirmar com o contato da transportadora já cadastrado no sistema" },
      { id: "c", label: "Ligar para o número informado pelo motorista" },
      { id: "d", label: "Exigir assinatura do motorista no romaneio" },
    ],
    correctOptionId: "b",
    explanation: "Placa e documento podem ser reais. O que o fraudador não controla é o contato que já estava no seu cadastro.",
  },
  {
    id: "d41", article: "senha-conta", category: "ACESSO", level: 2,
    prompt: "Você recebe aviso de que sua senha apareceu num vazamento de outro site. O que fazer?",
    options: [
      { id: "a", label: "Ignorar, o vazamento foi em outro serviço" },
      { id: "b", label: "Trocar a senha em todos os lugares onde ela foi usada" },
      { id: "c", label: "Trocar apenas no site que vazou" },
      { id: "d", label: "Adicionar um número ao fim da senha atual" },
    ],
    correctOptionId: "b",
    explanation: "Credenciais vazadas são testadas em massa em outros serviços. Enquanto a mesma senha existir em algum lugar, ela continua sendo uma chave válida.",
  },
  {
    id: "d42", article: "skimming-digital", category: "NUVEM", level: 3,
    prompt: "Marketing pede para inserir hoje um script de terceiro na página de pagamento. O risco é:",
    options: [
      { id: "a", label: "A página ficar mais lenta" },
      { id: "b", label: "O script ler os dados do cartão enquanto o cliente digita" },
      { id: "c", label: "Quebrar o layout no celular" },
      { id: "d", label: "Aumentar o custo de hospedagem" },
    ],
    correctOptionId: "b",
    explanation: "Script de terceiro no checkout enxerga tudo que é digitado. É o skimming digital (Magecart) — e a responsabilidade PCI é de quem hospeda a página.",
  },
];

export const QUESTIONS_PER_MATCH = 5;
export const SECONDS_PER_QUESTION = 15;

// ---------- PRNG determinístico ----------
function hash(text: string): number {
  let h = 2166136261;
  for (let i = 0; i < text.length; i += 1) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function rng(seed: number): () => number {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Identificador da partida: define oponente, perguntas e comportamento do bot. */
export function newMatchId(): string {
  return `m${Date.now().toString(36)}${Math.floor(Math.random() * 1e6).toString(36)}`;
}

export function opponentFor(matchId: string): Opponent {
  return OPPONENTS[hash(`op:${matchId}`) % OPPONENTS.length];
}

export function questionsFor(matchId: string): DuelQuestion[] {
  const rand = rng(hash(`q:${matchId}`));
  const pool = [...QUESTION_BANK];
  // Fisher-Yates com semente: sorteio reproduzível
  for (let i = pool.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rand() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  return pool.slice(0, QUESTIONS_PER_MATCH);
}

export interface BotMove {
  correct: boolean;
  /** milissegundos até responder */
  ms: number;
  optionId: string;
}

/**
 * Jogada do bot para uma pergunta. Precisão cai conforme o nível da
 * pergunta; o tempo de resposta varia para parecer humano, mas nunca
 * é instantâneo nem estoura o cronômetro sem motivo.
 */
export function botMove(matchId: string, index: number, question: DuelQuestion): BotMove {
  const opponent = opponentFor(matchId);
  const rand = rng(hash(`bot:${matchId}:${index}`));
  const penalty = (question.level - 1) * 0.16;
  const correct = rand() < Math.max(0.28, opponent.skill - penalty);
  const ms = Math.round(2600 + rand() * 7200 + question.level * 900);

  const wrong = question.options.filter((o) => o.id !== question.correctOptionId);
  const optionId = correct
    ? question.correctOptionId
    : (wrong[Math.floor(rand() * wrong.length)]?.id ?? question.correctOptionId);

  return { correct, ms: Math.min(ms, SECONDS_PER_QUESTION * 1000 - 400), optionId };
}

/** Pontos por acerto, com bônus de velocidade. */
export function scoreFor(correct: boolean, ms: number): number {
  if (!correct) return 0;
  const limit = SECONDS_PER_QUESTION * 1000;
  const speed = Math.max(0, 1 - ms / limit);
  return 100 + Math.round(speed * 60);
}

export function toPublicQuestion(q: DuelQuestion): PublicDuelQuestion {
  // `article` fica de fora: saber o verbete antes de responder entrega a
  // pista. Ele volta na devolutiva, depois que a rodada é resolvida.
  return { id: q.id, category: q.category, prompt: q.prompt, options: q.options };
}


// ---------- Classificação pós-partida ----------

export interface Standing {
  tier: string;
  /** 0-100, progresso dentro da faixa */
  progress: number;
  /** pontos de liga ACUMULADOS após a partida */
  points: number;
  /** pontos ganhos nesta partida */
  delta: number;
  toNext: number;
  globalRank: number;
  unitRank: number;
  percentile: number;
  accuracy: number;
}

/**
 * Posição do jogador após a partida.
 *
 * A faixa vem dos pontos ACUMULADOS na sessão, não do placar da
 * partida — antes o jogador voltava a Prata III toda vez, porque o
 * cálculo olhava só o jogo recém-terminado.
 */
export function standingFor(
  previousPoints: number,
  score: number,
  hits: number,
  total: number,
  result: "win" | "draw" | "loss",
  playerName: string,
): Standing {
  const delta = leagueDelta(score, result);
  const points = previousPoints + delta;
  const status = tierFor(points);
  const position = positionFor(points, playerName);
  const accuracy = total === 0 ? 0 : Math.round((hits / total) * 100);

  return {
    tier: status.tier.name,
    progress: status.progress,
    points,
    delta,
    toNext: status.toNext,
    globalRank: position.rank,
    unitRank: Math.max(1, Math.round(position.rank / 18)),
    percentile: position.percentile,
    accuracy,
  };
}
