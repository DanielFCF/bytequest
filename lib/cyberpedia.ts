import type { Article } from "./types";

/**
 * CyberPedia — conteúdo público, pode viver no bundle do cliente.
 *
 * Padrão editorial definido após o retorno da CISO (Sprint 3):
 * 1. Frases curtas. Uma ideia por frase.
 * 2. Termo técnico sempre acompanhado da tradução na primeira vez
 *    ("MFA — aquele código que chega no seu celular").
 * 3. A seção de defesa é escrita em ação observável, no imperativo.
 * 4. O detalhe técnico não sumiu: foi para o bloco "Aprofundar",
 *    que abre só se a pessoa quiser. Simplificar o padrão, sem
 *    perder a profundidade que a banca elogiou.
 * 5. A ordem segue a frequência real no varejo, não a didática:
 *    ransomware e fraude no caixa vêm antes de phishing.
 */
export const CYBERPEDIA: Article[] = [
  {
    id: "ransomware",
    title: "Ransomware",
    subtitle: "Quando a loja inteira para de vender",
    icon: "Lock",
    readingMinutes: 4,
    tags: ["Mais comum", "Para a operação", "Crítico"],
    family: "O maior risco do varejo hoje",
    tldr:
      "Um programa criminoso tranca todos os arquivos da empresa e cobra resgate para destrancar.",
    flow: ["Senha roubada", "Semanas escondido", "Tudo travado"],
    flowIcons: ["KeyRound", "Eye", "Lock"],
    whatItIs:
      "Ransomware é um programa que embaralha os arquivos da empresa e só devolve mediante pagamento. Quem já viu uma loja sem sistema sabe o tamanho do estrago: caixa parado, entrega parada, reposição parada. O prejuízo quase nunca é o resgate em si, é o dia inteiro sem vender. E hoje tem um agravante: antes de travar, os criminosos copiam os dados e ameaçam publicar. Ou seja, mesmo com backup a empresa continua sendo chantageada.",
    howTheyAct: [
      "Eles entram com uma senha que já era válida. Senha vazada em outro site, reaproveitada aqui, ou roubada por um programa espião no computador de alguém.",
      "Ficam quietos por semanas, olhando a rede e procurando onde dói mais. Ninguém percebe nada nessa fase.",
      "Copiam os dados para fora.",
      "Travam tudo de madrugada, véspera de feriado, quando a equipe está menor e a demora para reagir é maior.",
    ],
    defense: [
      "Nunca use a mesma senha do trabalho em site pessoal. É assim que a maioria dos ataques começa.",
      "Ative o segundo fator (aquele código no celular) em tudo que a empresa permitir.",
      "Não abra anexo que você não estava esperando, mesmo vindo de colega. A conta dele pode ter sido invadida.",
      "Nunca desligue o antivírus para um programa funcionar. Esse pedido costuma ser parte do golpe.",
      "Avisou o sistema lento, arquivo com nome estranho ou pasta que não abre? Chame a segurança na hora. Esse é o momento em que ainda dá para impedir.",
    ],
    takeaway:
      "Entre a entrada do criminoso e o travamento existem semanas. Quem avisa cedo salva o dia de venda de todo mundo.",
    stat: {
      value: "44%",
      label: "das violações confirmadas em 2025 envolveram ransomware (eram 32% em 2024)",
      source: "Verizon DBIR 2025",
    },
    deepDive: {
      title: "Aprofundar: por onde eles entram",
      body:
        "Três vetores de acesso inicial concentram a maioria dos casos: credencial válida reutilizada ou obtida por infostealer, serviço de borda exposto sem MFA (VPN e firewall são alvo preferencial de varredura automatizada) e engenharia social contra o service desk. Após o acesso, o padrão é reconhecimento silencioso, escalada de privilégio, comprometimento do ambiente de backup e exfiltração antes da criptografia — a chamada dupla extorsão. Os ataques de 2025 contra grandes varejistas do Reino Unido tiveram impacto financeiro estimado entre 270 e 440 milhões de libras.",
    },
  },
  {
    id: "fraude-caixa",
    title: "Golpes no caixa",
    subtitle: "QR Code, maquininha adulterada e a tal da tarja",
    icon: "CreditCard",
    readingMinutes: 4,
    tags: ["Frente de loja", "Dinheiro", "Presencial"],
    family: "Fraude no ponto de venda",
    tldr:
      "Golpes que acontecem na sua frente, no balcão, usando o pagamento como isca.",
    flow: ["Cliente cria pressa", "Desvia o pagamento", "Loja paga a conta"],
    flowIcons: ["Users", "CreditCard", "Coins"],
    whatItIs:
      "São fraudes feitas na hora de pagar. Têm três formatos principais: o cliente mostra um QR Code de PIX já pronto e pede para você ler no leitor da loja; alguém instala uma peça fina dentro da maquininha para capturar o cartão; ou o golpista força um erro no chip para você sugerir passar na tarja. Todos têm a mesma assinatura: pressa, fila atrás e um pedido para fugir do procedimento normal.",
    howTheyAct: [
      "QR Code trazido pronto: quem cria o código escolhe quem recebe o dinheiro. Se não foi o seu sistema que gerou, não é a conta da loja que recebe. O comprovante na tela do celular é só uma imagem, e existe aplicativo que falsifica isso muito bem.",
      "Maquininha adulterada: uma peça fina é colocada na entrada do chip e copia os dados do cartão sem ninguém ver.",
      "Erro proposital no chip: o aparelho dá erro de leitura de propósito, esperando que alguém diga 'o chip não pega, passa na tarja'. Quando a venda vai pela tarja, a responsabilidade pela fraude passa a ser da loja.",
      "Aproximação por engano: o criminoso encosta um aparelho perto do cartão do cliente na fila e captura o pagamento.",
    ],
    defense: [
      "O QR Code sempre nasce no sistema da loja, com o valor da venda na sua tela. Nunca leia código que o cliente trouxe pronto.",
      "Libere a mercadoria só quando a baixa aparecer no sistema da loja, nunca por comprovante na tela do cliente.",
      "Confira a maquininha no início do turno: peça solta, folga na entrada do chip, adesivo rompido ou cabo diferente do normal.",
      "Deu erro no chip? Não sugira a tarja. Tente outra maquininha ou outro meio de pagamento.",
      "Chame o supervisor sem constrangimento. Cliente honesto entende; golpista tem pressa exatamente para você não chamar ninguém.",
    ],
    takeaway:
      "Todo golpe de caixa depende de você quebrar o procedimento por gentileza. Manter o procedimento é o que protege você e a loja.",
    stat: {
      value: "63%",
      label: "dos consumidores brasileiros já foram vítimas de fraude de pagamento",
      source: "Relatório do Varejo 2025, Adyen",
    },
    deepDive: {
      title: "Aprofundar: shimming e mudança de responsabilidade",
      body:
        "O shimmer é um dispositivo fino como papel inserido na ranhura do chip, que intercepta a comunicação entre o terminal e o EMV. O objetivo não é ler o chip, e sim provocar falha de leitura e induzir o fallback para tarja magnética. Nesse fallback, a responsabilidade pela transação fraudulenta se desloca para o estabelecimento. Em terminais desassistidos, o vetor equivalente é o skimmer externo, conhecido no Brasil como chupa-cabra.",
    },
  },
  {
    id: "senha-conta",
    title: "Roubo de senha e conta",
    subtitle: "Como uma senha antiga vira a porta de entrada",
    icon: "KeyRound",
    readingMinutes: 4,
    tags: ["Todos os setores", "Acesso", "Alta frequência"],
    family: "Identidade e acesso",
    tldr:
      "Senhas vazadas em outros sites são testadas aqui até uma funcionar.",
    flow: ["Senha vaza", "Robô testa em massa", "Entram como você"],
    flowIcons: ["FileText", "Bot", "UserX"],
    whatItIs:
      "Toda semana algum site sofre vazamento e listas de e-mails e senhas acabam à venda. Criminosos pegam essas listas e usam robôs para testar as mesmas combinações em outros lugares, inclusive nos sistemas da empresa e nas contas dos nossos clientes. Se você usa a mesma senha em dois lugares, o vazamento de um entrega o outro. Existe ainda o programa espião que grava a senha direto do computador, sem precisar de vazamento nenhum.",
    howTheyAct: [
      "Compram listas prontas de e-mails e senhas vazados.",
      "Um robô testa milhares de combinações por minuto, dia e noite.",
      "Quando uma funciona, entram como se fossem você — nenhum alarme dispara, porque a senha está certa.",
      "Se a conta for de cliente, usam o cadastro para comprar; se for de funcionário, usam para chegar nos sistemas internos.",
    ],
    defense: [
      "Nunca repita a senha do trabalho em site pessoal, rede social ou loja online.",
      "Ative o segundo fator (código no celular) em tudo que permitir.",
      "Nunca aprove um pedido de acesso no celular que não foi você quem começou. Se aparecer sozinho, alguém já tem sua senha.",
      "Recebeu vários pedidos de aprovação seguidos? Negue todos e avise a segurança na mesma hora.",
      "Use o cofre de senhas da empresa em vez de anotar em papel ou no bloco de notas do celular.",
    ],
    takeaway:
      "Senha repetida é a porta mais barata que existe para quem quer entrar. Trocar isso custa cinco minutos.",
    stat: {
      value: "39%",
      label: "do tráfego dos sites de varejo já vem de robôs, muitos testando credenciais",
      source: "Imperva Bad Bot Report 2025",
    },
    deepDive: {
      title: "Aprofundar: credential stuffing e infostealer",
      body:
        "Credential stuffing é o teste automatizado de pares usuário/senha obtidos em vazamentos de terceiros; difere do brute force por não adivinhar senhas, e sim reutilizar as válidas. Infostealers coletam senhas salvas no navegador, tokens de sessão e cookies de autenticação, que são comercializados em mercados clandestinos — um token de sessão válido dispensa inclusive o segundo fator. Daí a recomendação de MFA resistente a phishing (chave física ou passkey) para contas privilegiadas.",
    },
  },
  {
    id: "golpe-suporte",
    title: "Golpe no suporte e no atendimento",
    subtitle: "O pedido urgente que parece vir de dentro",
    icon: "Headset",
    readingMinutes: 4,
    tags: ["SAC", "TI", "Em alta"],
    family: "Engenharia social por telefone",
    tldr:
      "Alguém liga fingindo ser funcionário ou cliente e pede para trocar senha, e-mail ou telefone da conta.",
    flow: ["Liga com pressa", "Pede troca de acesso", "Conta é tomada"],
    flowIcons: ["Phone", "KeyRound", "UserX"],
    whatItIs:
      "É o golpe que mais cresceu no varejo. O criminoso não invade nada: ele liga para o suporte ou para o atendimento fingindo ser alguém que perdeu o acesso e pede uma redefinição de senha ou a troca do segundo fator. Ele chega preparado, com nome completo, cargo, endereço antigo e até o nome do gestor, tudo pesquisado em rede social e em vazamentos anteriores. Para quem atende, parece um chamado comum de quem está em apuros.",
    howTheyAct: [
      "Pesquisam a vítima antes: nome, cargo, time, vocabulário interno.",
      "Ligam com urgência montada — reunião começando, cliente esperando, prazo estourando.",
      "Pedem para trocar a senha, o e-mail ou o telefone cadastrado. Essa troca é o golpe inteiro.",
      "Com o contato trocado, recebem os códigos de recuperação e tomam a conta por completo.",
    ],
    defense: [
      "Dado que o outro sabe (nome, endereço, últimos pedidos) não prova que ele é quem diz ser. Esses dados já vazaram.",
      "Confirme sempre por um canal que você escolheu: ligue para o ramal da lista interna ou para o telefone que já estava no cadastro.",
      "Trocar e-mail ou telefone da conta é o pedido mais perigoso que existe. Trate como exceção, nunca como rotina.",
      "Nunca peça nem repasse o código de segundo fator. Nenhum suporte de verdade precisa dele.",
      "Recusar educadamente e verificar é sempre aceitável. Se a pessoa se irrita com a verificação, isso já é resposta.",
    ],
    takeaway:
      "Quem atende é quem decide em quem a empresa confia. Verificar por fora leva dois minutos e evita meses de estrago.",
    stat: {
      value: "Alerta CISA",
      label:
        "grupos criminosos convencem agentes de suporte a redefinir senha e transferir o segundo fator, tomando contas em ambientes de login único",
      source: "CISA / relatos de ataques a varejistas em 2025",
    },
    deepDive: {
      title: "Aprofundar: por que o service desk virou o perímetro",
      body:
        "O service desk fica a montante dos controles de identidade: uma redefinição de senha ou reinscrição de MFA parece tarefa administrativa, mas decide quem a organização reconhece como usuário legítimo. Grupos como o Scattered Spider (UNC3944) combinam ligação ao help desk, MFA fatigue e SIM swap para obter acesso inicial e depois implantar ransomware. As contramedidas recomendadas são verificação out-of-band por contato previamente cadastrado, aprovação adicional para reinscrição de MFA, limitação de quais agentes podem redefinir contas privilegiadas e registro auditável de toda redefinição.",
    },
  },
  {
    id: "skimming-digital",
    title: "Skimming digital no site",
    subtitle: "O código escondido na tela de pagamento",
    icon: "ShoppingCart",
    readingMinutes: 3,
    tags: ["E-commerce", "Cartão", "PCI"],
    family: "Fraude no site da loja",
    tldr:
      "Um código invisível é plantado na página de pagamento e copia o cartão do cliente enquanto ele digita.",
    flow: ["Invade um fornecedor", "Planta código no checkout", "Copia cada cartão"],
    flowIcons: ["Building2", "Code", "CreditCard"],
    whatItIs:
      "A página de pagamento da loja carrega vários pedacinhos de código de outras empresas: chat, análise de acesso, publicidade, frete. Se o criminoso invadir uma dessas empresas, ele consegue plantar um código na nossa página sem nunca invadir a nossa. Esse código fica invisível e copia o número do cartão enquanto o cliente digita. A compra acontece normalmente, o cliente recebe o produto, e o roubo só aparece semanas depois na fatura.",
    howTheyAct: [
      "Procuram o elo mais fraco: um fornecedor pequeno cujo código roda dentro do nosso site.",
      "Alteram esse código para incluir uma linha a mais, que copia o que é digitado.",
      "A cópia é enviada em silêncio para um servidor deles, muitas vezes com endereço parecido com o de um serviço legítimo.",
      "Ficam meses ativos, porque nada quebra e nenhum cliente reclama do site.",
    ],
    defense: [
      "Quem trabalha com o site: nenhum script novo entra na página de pagamento sem aprovação e registro.",
      "Desconfie de qualquer alteração na tela de pagamento que ninguém do time pediu.",
      "Quem atende: cliente relatando cobrança estranha logo após comprar no nosso site é um sinal a reportar, não apenas um chargeback.",
      "Fornecedor com acesso ao nosso site é risco nosso. Toda contratação passa por avaliação de segurança.",
    ],
    takeaway:
      "O cliente confia na nossa página. Quem cuida do que roda nela está cuidando dessa confiança.",
    stat: {
      value: "Obrigatório",
      label:
        "desde março de 2025 o PCI DSS 4.0.1 exige inventário e verificação de integridade de todo script da página de pagamento, além de detecção de alteração",
      source: "PCI DSS 4.0.1, requisitos 6.4.3 e 11.6.1",
    },
    deepDive: {
      title: "Aprofundar: Magecart e integridade de script",
      body:
        "Magecart é o nome genérico da família de ataques de e-skimming que injeta JavaScript malicioso em páginas de checkout, normalmente pela cadeia de suprimentos de scripts de terceiros. Os controles previstos no PCI DSS 4.0.1 são inventário autorizado de scripts, verificação de integridade (por exemplo Subresource Integrity e Content Security Policy) e mecanismo de detecção de alteração com alerta ao menos semanal. Aplicam-se integralmente a quem valida por SAQ A-EP ou SAQ D.",
    },
  },
  {
    id: "fraude-fornecedor",
    title: "Fraude de fornecedor",
    subtitle: "A conta bancária que mudou de um dia para o outro",
    icon: "Link2Off",
    readingMinutes: 3,
    tags: ["Financeiro", "Logística", "Alto valor"],
    family: "Fraude documental",
    tldr:
      "Um e-mail parecido com o do fornecedor avisa que a conta mudou — e o pagamento vai para o criminoso.",
    flow: ["Copia o fornecedor", "Muda só a conta", "Pagamento some"],
    flowIcons: ["Mail", "Building2", "Coins"],
    whatItIs:
      "O criminoso se passa por um fornecedor conhecido e avisa que os dados bancários mudaram. Tudo no e-mail está certo: o número da nota, o valor, o logotipo, o jeito de escrever. Só um campo foi alterado, que é justamente a conta que vai receber. A variação logística do mesmo golpe muda a rota de entrega e o motorista de uma carga de alto valor, com o pedido para não reter o caminhão.",
    howTheyAct: [
      "Registram um endereço de e-mail quase igual ao do fornecedor, trocando uma letra ou o final do endereço.",
      "Às vezes nem isso: usam a conta real do fornecedor, que já foi invadida.",
      "Enviam a cobrança verdadeira, com um único campo alterado.",
      "Acrescentam a frase que impede a conferência: 'pagamentos na conta antiga não serão reconhecidos' ou 'não retenha o veículo'.",
    ],
    defense: [
      "Mudança de conta bancária de fornecedor é sempre confirmada por telefone, usando o contato que já está no sistema.",
      "Nunca confirme respondendo o próprio e-mail. Se a caixa for do criminoso, ele responde tudo o que você quiser ouvir.",
      "Leia o endereço do remetente inteiro, não só o nome que aparece na tela.",
      "Alteração de rota, motorista ou placa de carga valiosa exige confirmação antes da saída, mesmo com pressa.",
    ],
    takeaway:
      "Dez minutos conferindo uma conta bancária custam muito menos que uma transferência que não volta.",
    deepDive: {
      title: "Aprofundar: BEC e ataque à cadeia de suprimentos",
      body:
        "Business Email Compromise dispensa malware: a fraude ocorre por instrução documental sobre um processo legítimo. Em varejo, 52% das empresas relatam ataques via cadeia de suprimentos, e o vetor combina comprometimento de conta de fornecedor, domínio semelhante (typosquatting) e exploração da janela de expedição. O controle eficaz é procedimental: verificação out-of-band obrigatória para qualquer alteração de dado bancário ou de rota, com registro.",
    },
  },
  {
    id: "acesso-fisico",
    title: "Acesso físico indevido",
    subtitle: "Pen-drive, carona na catraca e o celular na USB",
    icon: "Usb",
    readingMinutes: 3,
    tags: ["Loja", "CD", "Presencial"],
    family: "Segurança física",
    tldr:
      "Nem todo ataque vem pela internet: alguns entram pela porta ou pela porta USB.",
    flow: ["Cria um pretexto", "Conecta ou entra", "Acesso liberado"],
    flowIcons: ["Users", "Usb", "DoorOpen"],
    whatItIs:
      "Três situações do dia a dia. Alguém pede para conectar um pen-drive ou carregar o celular no computador do caixa. Alguém com as mãos ocupadas pede para você segurar a porta do centro de distribuição. Alguém 'da manutenção' aparece sem estar na agenda. Nenhum deles invade nada: todos contam com a nossa boa vontade.",
    howTheyAct: [
      "Montam um visual coerente: uniforme, crachá genérico, caixa pesada nos braços.",
      "Escolhem o horário de maior movimento, quando rosto novo não chama atenção.",
      "Criam um motivo que dá pena de recusar: prazo acabando, celular descarregando, cliente esperando.",
      "Um pen-drive ou cabo preparado se apresenta ao computador como se fosse um teclado e digita comandos sozinho. Não precisa que você abra arquivo nenhum.",
    ],
    defense: [
      "Nada de origem desconhecida entra no computador da loja — nem pen-drive, nem celular para carregar. A porta USB transmite dados, não só energia.",
      "Ofereça a alternativa: tomada comum para carregar, totem para imprimir, atendimento no balcão.",
      "Cada pessoa passa com o próprio crachá. Segurar a porta anula todo o controle de acesso.",
      "Visitante espera na recepção enquanto a portaria confirma. Visita de verdade não se incomoda.",
      "Achou um pen-drive no chão? Entregue à segurança. Não espete para ver o que é.",
      "Bloqueie a tela sempre que sair da mesa, mesmo por um minuto.",
    ],
    takeaway:
      "Ajudar o cliente é obrigação. Conectar o dispositivo dele não faz parte disso, e sempre existe outro caminho.",
    deepDive: {
      title: "Aprofundar: BadUSB e tailgating",
      body:
        "Dispositivos BadUSB se enumeram como Human Interface Device e injetam comandos de teclado, dispensando execução de arquivo pelo usuário. Em terminais de PDV, o impacto é agravado pelo fato de o host ter alcance à rede de pagamento. Tailgating explora o custo social de recusar passagem e é a técnica de maior taxa de sucesso em testes de intrusão física, inclusive em equipes maduras em segurança digital.",
    },
  },
  {
    id: "dados-ia",
    title: "Dados em inteligência artificial",
    subtitle: "O que você cola no ChatGPT sai da empresa",
    icon: "Bot",
    readingMinutes: 3,
    tags: ["Escritório", "LGPD", "IA"],
    family: "Proteção de dados",
    tldr:
      "Tudo que você digita numa IA pública sai do controle da empresa e pode não voltar.",
    whatItIs:
      "Usar IA para resumir, redigir ou montar planilha economiza tempo de verdade. O problema não é a ferramenta, é o que vai junto. Ao colar a planilha inteira, costuma ir CPF, salário, dado de cliente e às vezes senha de sistema. A partir dali, essa informação está num servidor de outra empresa, possivelmente em outro país, e pode ficar guardada. Pela LGPD, dado de pessoa só pode ser tratado com finalidade definida — 'colei para formatar mais rápido' não é uma delas.",
    flow: ["Cola a planilha", "Dado sai da empresa", "Não volta mais"],
    flowIcons: ["FileText", "Bot", "Cloud"],
    howTheyAct: [
      "Normalmente não há criminoso: o vazamento é feito por alguém de boa-fé, com pressa.",
      "O dado colado pode ficar armazenado em registros do fornecedor por tempo indeterminado.",
      "Se esse fornecedor sofrer um vazamento, nosso dado vai junto.",
      "Existe ainda o texto armadilhado: um documento ou chamado de fora com instruções escondidas, escritas para a IA obedecer.",
    ],
    defense: [
      "Antes de colar, pergunte: a IA precisa disso para responder? CPF, salário e senha quase nunca são necessários.",
      "Troque o dado por um marcador. Em vez de apagar o campo, escreva [CPF] e mantenha o resto.",
      "Não exagere no sentido contrário: apagar nome de coluna e código comum piora a resposta e não protege nada.",
      "Use só as ferramentas de IA aprovadas pela empresa.",
      "Colou algo sensível sem querer? Avise a segurança. Senha exposta precisa ser trocada, e o relógio começa no envio.",
    ],
    takeaway:
      "A IA não sabe o valor do que recebe. Quem filtra é você, antes de apertar enviar.",
    deepDive: {
      title: "Aprofundar: DLP e prompt injection indireta",
      body:
        "O colaborador atua como último ponto de controle de Data Loss Prevention quando não há interceptação técnica do envio. Quanto ao texto armadilhado: quando um agente de IA lê conteúdo de terceiros (ticket, e-mail, página), esse conteúdo é entrada, e entrada pode conter instrução — é a injeção indireta descrita no OWASP Top 10 para aplicações de LLM. A mitigação exige separação explícita entre prompt do operador e conteúdo lido, além de aprovação humana para ações sensíveis.",
    },
  },
  {
    id: "shadow-it",
    title: "Ferramenta não aprovada",
    subtitle: "O site grátis que resolve rápido e cobra caro depois",
    icon: "CloudOff",
    readingMinutes: 3,
    tags: ["Escritório", "Governança", "LGPD"],
    family: "Risco de terceiros",
    tldr:
      "Site ou aplicativo usado no trabalho sem aprovação leva dados da empresa para um lugar que ninguém controla.",
    flow: ["Precisa resolver hoje", "Sobe o arquivo", "Dado fora de controle"],
    flowIcons: ["Smartphone", "Cloud", "ShieldAlert"],
    whatItIs:
      "É o conversor de PDF online, o assinador grátis, a extensão do navegador, a planilha na conta pessoal. Quase sempre nasce de uma necessidade real e de boa intenção — por isso é difícil combater só proibindo. O problema é que esses arquivos passam a viver numa empresa sem contrato conosco, sem compromisso de proteger o dado e sem ninguém para responder se vazar.",
    howTheyAct: [
      "O caminho oficial parece lento para uma entrega de hoje, e o site grátis resolve em cinco minutos.",
      "O arquivo sobe para um servidor desconhecido, muitas vezes fora do Brasil.",
      "A prática se espalha por indicação entre colegas, sem registro nenhum.",
      "Extensões de navegador merecem atenção extra: elas leem tudo que aparece na sua tela, e extensões populares já foram vendidas e transformadas em espião por uma atualização automática.",
    ],
    defense: [
      "Antes de usar ferramenta nova com arquivo do trabalho, pergunte onde os dados ficam e quem responde por eles.",
      "Prefira a ferramenta aprovada. Se ela não existe ou é ruim, peça — necessidade conhecida vira prioridade.",
      "Nunca use conta pessoal para guardar ou compartilhar documento de trabalho.",
      "Já subiu algo para um site não aprovado? Avise a segurança. Isso é tratamento de incidente, não punição.",
    ],
    takeaway:
      "Ninguém protege o que não sabe que existe. Contar é o começo da solução, não o problema.",
  },
  {
    id: "phishing",
    title: "Phishing e links falsos",
    subtitle: "A mensagem que pede a chave em vez de arrombar a porta",
    icon: "Fish",
    readingMinutes: 3,
    tags: ["Todos os setores", "Base"],
    family: "Fundamento",
    tldr:
      "Mensagem que imita alguém confiável para conseguir sua senha ou seu clique.",
    flow: ["Imita quem você confia", "Cria urgência", "Captura a senha"],
    flowIcons: ["Mail", "Link", "KeyRound"],
    whatItIs:
      "É o golpe mais conhecido e continua funcionando, agora sem os erros de português que a gente aprendeu a procurar — os textos hoje são escritos por IA e saem perfeitos. Chega por e-mail, SMS, WhatsApp ou QR Code. A variação direcionada é a mais perigosa: a mensagem cita o seu projeto, o nome do seu gestor e o sistema que você usa.",
    howTheyAct: [
      "Registram um endereço parecido com o verdadeiro: uma letra trocada, um final diferente (.co no lugar de .com.br).",
      "Copiam a aparência da página de login real. O cadeado do navegador aparece normalmente, porque cadeado não prova identidade.",
      "Criam um motivo para agir agora: senha expirando, pacote retido, benefício a confirmar.",
      "Capturam a senha e, em campanhas modernas, também o código do segundo fator, em tempo real.",
    ],
    defense: [
      "Leia o endereço do site de trás para frente: o que vale é o nome logo antes do .com.br.",
      "Entre nos sistemas pelo favorito ou digitando o endereço, nunca pelo link recebido.",
      "Pressa é sinal de alerta, não de prioridade. Pedido legítimo aguenta dez minutos de conferência.",
      "QR Code também é link. Confira o endereço na prévia antes de abrir.",
      "Reporte mesmo quando não clicou: a mensagem que chegou até você chegou a mais cem pessoas.",
    ],
    takeaway:
      "A pergunta não é se a mensagem parece verdadeira. É se o canal que está pedindo sua senha foi escolhido por você.",
    deepDive: {
      title: "Aprofundar: adversary-in-the-middle",
      body:
        "Kits de phishing modernos operam como proxy reverso entre a vítima e o serviço legítimo, capturando credencial, código de MFA e cookie de sessão em tempo real. Isso torna insuficiente o MFA por código digitável e motiva a adoção de MFA resistente a phishing (FIDO2 ou passkey) para contas privilegiadas. Após o acesso, o padrão inclui criação de regra de encaminhamento na caixa da vítima para manter persistência oculta.",
    },
  },
  {
    id: "deepfake-voz",
    title: "Deepfake de voz e vídeo",
    subtitle: "Quando ver e ouvir deixou de ser prova",
    icon: "BrainCircuit",
    readingMinutes: 4,
    tags: ["Liderança", "Financeiro", "Em alta"],
    family: "Engenharia social",
    tldr:
      "Com poucos segundos de áudio público, criminosos clonam a voz de um diretor e pedem transferência por telefone ou vídeo.",
    flow: ["Coleta áudio público", "Clona a voz", "Liga pedindo dinheiro"],
    flowIcons: ["Mic", "Bot", "Phone"],
    whatItIs:
      "Deepfake é mídia sintética: voz ou vídeo gerados por IA imitando uma pessoa real. Para clonar uma voz bastam alguns segundos de gravação — uma palestra, um podcast, um vídeo institucional. O ataque típico é a ligação ou a chamada de vídeo com 'imagem ruim' em que o executivo pede uma transferência urgente. Em 2024, uma multinacional em Hong Kong transferiu cerca de US$ 25 milhões após uma videoconferência em que todos os participantes, exceto a vítima, eram deepfakes.",
    howTheyAct: [
      "Coletam áudio e vídeo públicos da liderança: eventos, LinkedIn, entrevistas.",
      "Descobrem quem aprova pagamentos e quando o executivo estará viajando ou incomunicável.",
      "Ligam ou chamam por vídeo com qualidade propositalmente ruim, justificada por 'conexão instável'.",
      "Combinam autoridade, urgência e sigilo — e bloqueiam o canal alternativo: 'não posso falar, estou em reunião'.",
    ],
    defense: [
      "Trate voz e rosto como informação, não como autenticação: nenhum canal audiovisual confirma identidade.",
      "Combine com a diretoria uma palavra-código para pedidos financeiros de alto valor. É a defesa que sobrevive ao deepfake.",
      "Confirme sempre por um canal independente que você escolheu — o ramal da lista interna, não o número da ligação.",
      "Desconfie de qualidade ruim que 'justifica' a conversa curta. É escolha do atacante, não acidente.",
      "Reduza a matéria-prima: evite publicar áudio e agenda em tempo real; publique depois do evento.",
    ],
    takeaway:
      "Se o pedido depende de você acreditar no que viu ou ouviu, confirme por onde o atacante não alcança.",
    stat: {
      value: "41%",
      label: "das organizações sofreram deepfake de áudio combinado com engenharia social",
      source: "Gartner, pesquisa com CISOs, 2026",
    },
    deepDive: {
      title: "Aprofundar: por que a detecção humana falha",
      body:
        "Estudos de detecção mostram que pessoas identificam vídeo sintético de alta qualidade em taxas próximas ao acaso. Por isso a defesa não pode ser 'prestar atenção': precisa ser processo — segredo compartilhado fora da banda, dupla aprovação para valores acima de um limiar e verificação por canal previamente cadastrado. Ferramentas de detecção de mídia sintética ajudam como camada adicional, nunca como controle único.",
    },
  },
  {
    id: "fadiga-mfa",
    title: "Fadiga de MFA (push bombing)",
    subtitle: "Quando aprovar só para parar de tocar é o golpe",
    icon: "KeyRound",
    readingMinutes: 3,
    tags: ["Todos os setores", "Acesso", "Alta frequência"],
    family: "Credenciais",
    tldr:
      "O atacante já tem sua senha e dispara pedidos de aprovação no seu celular até você aceitar um por cansaço.",
    flow: ["Já tem a senha", "Dispara pedidos sem parar", "Você aprova por cansaço"],
    flowIcons: ["KeyRound", "Smartphone", "BadgeCheck"],
    whatItIs:
      "O segundo fator existe para proteger quem já teve a senha vazada. A fadiga de MFA ataca exatamente esse ponto: o criminoso, com a senha em mãos, tenta entrar dezenas de vezes seguidas, e cada tentativa gera um push no seu celular — de madrugada, no meio da reunião, no trânsito. Basta uma aprovação. Em incidentes de grande porte, o atacante ainda liga se passando pela TI para 'ajudar' a aprovar.",
    howTheyAct: [
      "Obtêm a senha em vazamento anterior ou por phishing.",
      "Automatizam tentativas de login para gerar notificações em sequência.",
      "Escolhem horários de baixa atenção: madrugada, fim de expediente, feriado.",
      "Se você resiste, ligam como 'suporte de TI' pedindo que aprove para 'encerrar o alerta'.",
    ],
    defense: [
      "Push que chega sem você ter feito login é ataque. Nunca aprove — e troque a senha imediatamente, porque ela já vazou.",
      "Prefira MFA com correspondência de número ou chave física: não dá para aprovar por engano.",
      "Ninguém da TI pede que você aprove um push. Se pedirem, é o atacante.",
      "Reporte a sequência de pedidos: ela indica qual conta está com a senha comprometida.",
    ],
    takeaway:
      "Notificação de MFA que você não pediu não é bug. É alguém com a sua senha, esperando você cansar.",
    stat: {
      value: "23%",
      label: "dos terceiros corrigiram MFA ausente ou mal configurado em contas de nuvem dentro do prazo",
      source: "Verizon DBIR 2026",
    },
  },
  {
    id: "quishing",
    title: "QR Code malicioso (quishing)",
    subtitle: "O link que o filtro de e-mail não consegue ler",
    icon: "Link2Off",
    readingMinutes: 3,
    tags: ["Loja", "Logística", "Em alta"],
    family: "Phishing",
    tldr:
      "O QR Code esconde o endereço do link numa imagem, escapa dos filtros e empurra você para o celular, fora da proteção da empresa.",
    flow: ["Esconde o link na imagem", "Você aponta a câmera", "Cai no celular sem filtro"],
    flowIcons: ["QrCode", "Smartphone", "Link"],
    whatItIs:
      "Quishing é phishing por QR Code. Ele resolve dois problemas do criminoso de uma vez: o filtro de e-mail não lê o endereço dentro de uma imagem, e a vítima abre o link no celular pessoal, longe do proxy corporativo. No varejo aparece em etiqueta de palete, cartaz de 'promoção', adesivo colado em cima do QR real do estacionamento ou do cardápio, e em PDF anexado ao e-mail.",
    howTheyAct: [
      "Geram um QR que aponta para uma página de login falsa ou para um pagamento PIX.",
      "Colocam onde ninguém desconfia: adesivo sobre um QR legítimo, PDF 'do RH', etiqueta de carga.",
      "Contam com o gesto automático de apontar a câmera sem olhar o endereço.",
      "No celular, pedem login de rede ou dados de cartão numa página que imita a real.",
    ],
    defense: [
      "QR Code é um link: leia o endereço na prévia antes de abrir. Domínio estranho, não abre.",
      "Desconfie de adesivo sobre outro QR e de código em lugar onde não havia antes.",
      "Login de rede nunca se digita em página aberta por QR. Use o app ou o favorito.",
      "Pagamento PIX por QR só do próprio sistema da loja, nunca de código trazido por terceiros.",
      "Reporte o QR suspeito com foto e local: derrubar o adesivo protege quem vier depois.",
    ],
    takeaway:
      "Apontar a câmera é clicar num link. Trate com o mesmo cuidado.",
    stat: {
      value: "+146%",
      label: "de crescimento de ataques por QR Code em um único trimestre (7,6 mi → 18,7 mi de detecções)",
      source: "Microsoft Threat Intelligence, 1º trimestre de 2026",
    },
  },
  {
    id: "vazamento-acidental",
    title: "Vazamento acidental",
    subtitle: "O e-mail errado, a impressora, a tela aberta",
    icon: "CloudOff",
    readingMinutes: 3,
    tags: ["Todos os setores", "LGPD", "Mais comum"],
    family: "Proteção de dados",
    tldr:
      "A maior parte dos vazamentos não tem hacker: é o anexo errado, o documento na bandeja, a etiqueta no lixo comum.",
    flow: ["Pressa do dia a dia", "Dado vai para o lugar errado", "Alguém de fora vê"],
    flowIcons: ["Mail", "Printer", "Eye"],
    whatItIs:
      "Vazamento acidental é dado pessoal ou confidencial que sai do controle da empresa por erro, não por ataque: e-mail com destinatário errado, planilha de outro cliente anexada, relatório de salários na impressora do andar, etiqueta de entrega no lixo comum, tela desbloqueada com o sistema de clientes aberto. Sob a LGPD, o erro é incidente da mesma forma — e o que define o tamanho do problema é a velocidade do reporte, não a culpa.",
    howTheyAct: [
      "Aqui não há atacante: há pressa, autocompletar de e-mail, impressora compartilhada e mesa vazia.",
      "O dado exposto vira insumo de golpe: quem acha a etiqueta liga para o cliente sabendo o que ele comprou.",
      "Documento fotografado e postado em grupo multiplica o vazamento em segundos.",
      "O medo de reportar transforma um incidente de minutos numa violação de dias.",
    ],
    defense: [
      "Confira o destinatário antes de enviar; para dado sensível, envie por link com permissão, não por anexo.",
      "Documento sensível impresso se retira na hora. Use impressão com liberação por crachá quando houver.",
      "Bloqueie a tela ao levantar, mesmo por um minuto. Windows + L custa meio segundo.",
      "Etiqueta, romaneio e relatório vão para descarte seguro, nunca para o lixo comum — rasgar ao meio não resolve.",
      "Errou? Reporte em minutos. O recall funciona nos primeiros instantes e o prazo legal conta a partir do conhecimento.",
    ],
    takeaway:
      "Erro reportado em minutos é incidente. Erro escondido por dias é violação. A diferença é você.",
    stat: {
      value: "62%",
      label: "das violações confirmadas envolvem o elemento humano",
      source: "Verizon DBIR 2026",
    },
  },
];

export function findArticle(id: string): Article | undefined {
  return CYBERPEDIA.find((a) => a.id === id);
}
