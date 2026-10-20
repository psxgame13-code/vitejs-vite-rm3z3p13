import type { GameContent } from './types'

export const GAME_CONTENT: GameContent = {
  'find-intruder': {
    1: [
      { cells: ['caderno', 'lápis', 'borracha', 'banana'], intruderIndex: 3 },
      { cells: ['azul', 'verde', 'mesa', 'vermelho'], intruderIndex: 2 },
      { cells: ['dois', 'quatro', 'sol', 'oito'], intruderIndex: 2 },
    ],
    2: [
      { cells: ['geladeira', 'segunda', 'terça', 'quarta', 'quinta', 'sexta'], intruderIndex: 0 },
      { cells: ['piano', 'violão', 'flauta', 'sanduíche', 'bateria', 'violino'], intruderIndex: 3 },
      { cells: ['norte', 'sul', 'caderno', 'leste', 'oeste', 'nordeste'], intruderIndex: 2 },
    ],
    3: [
      {
        cells: ['português', 'matemática', 'história', 'geografia', 'pipoca', 'ciências', 'arte', 'inglês', 'educação física'],
        intruderIndex: 4,
      },
      {
        cells: ['janeiro', 'fevereiro', 'março', 'domingo', 'abril', 'maio', 'junho', 'julho', 'agosto'],
        intruderIndex: 3,
      },
      {
        cells: ['futebol', 'vôlei', 'basquete', 'natação', 'handebol', 'geladeira', 'atletismo', 'judô', 'xadrez'],
        intruderIndex: 5,
      },
    ],
  },
  'sequence-memory': {
    1: ['sol', 'lua', 'mar'],
    2: ['norte', 'sul', 'leste', 'oeste'],
    3: ['ler', 'anotar', 'revisar', 'praticar', 'explicar'],
  },
  'organize-day': {
    1: [
      { id: 'wake', label: 'Acordar' },
      { id: 'breakfast', label: 'Tomar café' },
      { id: 'bag', label: 'Arrumar a mochila' },
      { id: 'leave', label: 'Sair para a escola' },
    ],
    2: [
      { id: 'due', label: 'Ver o que vence hoje' },
      { id: 'material', label: 'Separar o material' },
      { id: 'hard', label: 'Fazer primeiro a parte mais difícil' },
      { id: 'review', label: 'Revisar o que ficou' },
      { id: 'store', label: 'Guardar o material' },
    ],
    3: [
      { id: 'week', label: 'Olhar a agenda da semana' },
      { id: 'deadline', label: 'Marcar o prazo mais perto' },
      { id: 'split', label: 'Dividir o trabalho em partes' },
      { id: 'first', label: 'Fazer a primeira parte' },
      { id: 'pause', label: 'Combinar a próxima pausa' },
    ],
  },
  'now-or-later': {
    1: [
      {
        prompt: 'Falta um capítulo para terminar a leitura combinada.',
        nowLabel: 'Ver um vídeo curto agora',
        laterLabel: 'Ler o capítulo e escolher o vídeo depois',
      },
      {
        prompt: 'A mochila ainda está aberta e a aula começa logo.',
        nowLabel: 'Continuar no jogo por mais uma partida',
        laterLabel: 'Fechar a mochila antes e jogar à tarde',
      },
      {
        prompt: 'Você quer lanche, e também precisa anotar o dever.',
        nowLabel: 'Ir direto ao lanche',
        laterLabel: 'Anotar o dever e lanchar em seguida',
      },
    ],
    2: [
      {
        prompt: 'Seus amigos chamaram para o pátio neste minuto. O trabalho da dupla é hoje.',
        nowLabel: 'Ir agora e deixar o trabalho para o fim do dia',
        laterLabel: 'Combinar de ir depois de adiantar a sua parte',
      },
      {
        prompt: 'Chegou uma fase nova do jogo, bem no horário de revisar a prova.',
        nowLabel: 'Jogar a fase agora, porque ela é limitada',
        laterLabel: 'Revisar primeiro e jogar quando a revisão acabar',
      },
      {
        prompt: 'Alguém ofereceu o último pedaço da pizza. Sua apresentação ainda não tem o slide final.',
        nowLabel: 'Pegar a pizza e montar o slide mais tarde',
        laterLabel: 'Fechar o slide e comer o que sobrar depois',
      },
    ],
    3: [
      {
        prompt: 'O grupo vai postar um desafio agora. Quem entrar primeiro ganha o apelido da semana.',
        nowLabel: 'Entrar agora para não ficar de fora do apelido',
        laterLabel: 'Terminar o parágrafo combinado e entrar depois',
      },
      {
        prompt: 'Uma série liberou o episódio final hoje. Amanhã você apresenta o cartaz.',
        nowLabel: 'Assistir ao final agora e fazer o cartaz de madrugada',
        laterLabel: 'Deixar o cartaz pronto e assistir quando ele estiver entregue',
      },
      {
        prompt: 'Tem campeonato no intervalo, e você ainda não separou a experiência da feira de ciências.',
        nowLabel: 'Jogar o campeonato e separar a experiência no último minuto',
        laterLabel: 'Separar a experiência antes e entrar no jogo se der tempo',
      },
    ],
  },
  'recess-conflict': {
    1: [
      {
        prompt: 'No intervalo, alguém escondeu o estojo de um colega e o grupo está rindo.',
        options: [
          { id: 'return', label: 'Ajudar a devolver o estojo, sem zoar', points: 100 },
          { id: 'leave', label: 'Sair de perto e não participar da risada', points: 50 },
          { id: 'hide', label: 'Esconder de novo para o grupo rir mais', points: 0 },
        ],
      },
      {
        prompt: 'Dois colegas discutem porque um furou a fila do lanche.',
        options: [
          { id: 'push', label: 'Empurrar quem furou e gritar com ele', points: 0 },
          { id: 'talk', label: 'Pedir que os dois falem sem empurrar e chamar um adulto se precisar', points: 100 },
          { id: 'walk', label: 'Ir embora para não se meter', points: 50 },
        ],
      },
    ],
    2: [
      {
        prompt: 'No jogo do intervalo, um time começa a excluir quem errou o passe.',
        options: [
          { id: 'rule', label: 'Combinar que o erro faz parte e todo mundo continua jogando', points: 100 },
          { id: 'silent', label: 'Ficar quieto e não xingar, mas também não chamar a pessoa de volta', points: 50 },
          { id: 'out', label: 'Dizer que essa pessoa não serve para o time', points: 0 },
        ],
      },
      {
        prompt: 'Alguém filmou um colega constrangido e quer mostrar para a roda.',
        options: [
          { id: 'share', label: 'Pedir o celular para mostrar também', points: 0 },
          { id: 'stop', label: 'Dizer para não mostrar e devolver a atenção ao colega', points: 100 },
          { id: 'away', label: 'Virar as costas e não assistir', points: 50 },
        ],
      },
    ],
    3: [
      {
        prompt: 'Um grupo espalhou um apelido e a pessoa pediu para parar. Alguns acham que é só brincadeira.',
        options: [
          { id: 'stop-name', label: 'Parar o apelido e lembrar que a pessoa já pediu', points: 100 },
          { id: 'not-me', label: 'Não repetir o apelido, mas deixar os outros falarem', points: 50 },
          { id: 'again', label: 'Repetir mais alto, porque todo mundo está rindo', points: 0 },
        ],
      },
      {
        prompt: 'Na fila, um empurrão derrubou o lanche de alguém. O grupo olha para ver quem vai reagir.',
        options: [
          { id: 'blame', label: 'Culpar a pessoa em voz alta e seguir para o lanche', points: 0 },
          { id: 'help', label: 'Ajudar a recolher e checar se a pessoa se machucou', points: 100 },
          { id: 'watch', label: 'Só observar, sem rir e sem ajudar', points: 50 },
        ],
      },
    ],
  },
  'other-viewpoint': {
    1: [
      {
        prompt: 'Você mandou mensagem e a pessoa não respondeu. Na aula, ela está quieta.',
        options: [
          { id: 'maybe', label: 'Ela pode estar sem bateria, ocupada ou sem vontade de falar agora', points: 100 },
          { id: 'wait', label: 'Eu fico sem saber, mas não vou cobrar na frente dos outros', points: 50 },
          { id: 'ignore', label: 'Ela está me ignorando de propósito e vou comentar isso com o grupo', points: 0 },
        ],
      },
      {
        prompt: 'Um colega não quis entrar no jogo.',
        options: [
          { id: 'better', label: 'Ele se acha demais e não merece ser chamado de novo', points: 0 },
          { id: 'other', label: 'Ele pode querer outra coisa agora, e isso não é um ataque', points: 100 },
          { id: 'ok', label: 'Tudo bem, eu jogo com quem quiser, sem insistir', points: 50 },
        ],
      },
    ],
    2: [
      {
        prompt: 'Sua dupla chegou sem a parte dela. Ela diz que a luz de casa acabou.',
        options: [
          { id: 'hear', label: 'Pode ter acontecido. Vamos ouvir e combinar como terminar juntas', points: 100 },
          { id: 'mine', label: 'Eu fiz a minha parte. Não vou brigar, mas também não vou refazer a dela', points: 50 },
          { id: 'liar', label: 'Isso é desculpa. Vou contar para a turma que ela é folgada', points: 0 },
        ],
      },
      {
        prompt: 'Alguém corrigiu sua resposta na frente da sala.',
        options: [
          { id: 'shame', label: 'Essa pessoa quis me passar vergonha', points: 0 },
          { id: 'check', label: 'Ela pode ter visto outro jeito de resolver e não pensou no modo', points: 100 },
          { id: 'later', label: 'Eu não gostei, então vou falar com ela depois, sem xingar', points: 50 },
        ],
      },
    ],
    3: [
      {
        prompt: 'Um colega novo almoça sozinho e não olha para o grupo.',
        options: [
          { id: 'shy', label: 'Ele pode estar sem jeito ou ainda sem conhecer ninguém', points: 100 },
          { id: 'space', label: 'Vou deixar espaço hoje e cumprimentar sem forçar', points: 50 },
          { id: 'weird', label: 'Ele se acha diferente e não quer amizade', points: 0 },
        ],
      },
      {
        prompt: 'Sua amiga riu de uma fala sua e depois disse que não foi por mal.',
        options: [
          { id: 'always', label: 'Ela sempre me diminui. Vou rir dela na próxima', points: 0 },
          { id: 'both', label: 'Para ela pode ter sido brincadeira, e para mim doeu. Dá para dizer isso', points: 100 },
          { id: 'quiet', label: 'Eu fico chateado, mas não vou devolver na mesma moeda', points: 50 },
        ],
      },
    ],
  },
  'scam-or-truth': {
    1: [
      { text: 'Sua conta será bloqueada em cinco minutos. Clique aqui e envie sua senha.', isScam: true },
      { text: 'Recado da biblioteca no mural: os livros emprestados voltam na sexta.', isScam: false },
      { text: 'Você ganhou um celular. Pague uma taxa hoje para receber o prêmio.', isScam: true },
      { text: 'O professor avisou na aula que o trabalho pode ser feito em dupla.', isScam: false },
    ],
    2: [
      { text: 'Oi, sou do suporte da escola. Me manda o código que chegou no seu celular.', isScam: true },
      { text: 'A coordenação fixou no mural: a foto da turma é na quinta, no pátio.', isScam: false },
      { text: 'Últimas vagas: pague um boleto e garanta o passeio que a escola ainda não anunciou.', isScam: true },
      { text: 'Mensagem no grupo oficial da turma: amanhã tem educação física no ginásio.', isScam: false },
    ],
    3: [
      { text: 'A secretaria pediu, neste chat, o CPF da sua mãe para confirmar a matrícula.', isScam: true },
      { text: 'No mural da escola: a feira de ciências é dia 18, no pátio.', isScam: false },
      { text: 'Você foi sorteado entre os alunos. Para retirar o prêmio, pague a taxa de envio hoje.', isScam: true },
      { text: 'Seu professor repetiu em sala que a entrega do cartaz é na próxima aula.', isScam: false },
    ],
  },
  'share-or-not': {
    1: [
      {
        prompt: 'Um print diz que a escola vai fechar amanhã. Não há recado no mural nem da secretaria.',
        options: [
          { id: 'share', label: 'Encaminhar agora para não deixar ninguém de fora', points: 0 },
          { id: 'check', label: 'Checar o mural ou a secretaria antes de falar', points: 100 },
          { id: 'keep', label: 'Não compartilhar', points: 50 },
        ],
      },
      {
        prompt: 'Uma mensagem manda beber produto de limpeza para não ficar doente.',
        options: [
          { id: 'forward', label: 'Encaminhar para o grupo da família', points: 0 },
          { id: 'source', label: 'Procurar um site de saúde antes de decidir', points: 70 },
          { id: 'stop', label: 'Não compartilhar', points: 100 },
        ],
      },
      {
        prompt: 'Um colega disse que haverá prova surpresa. Isso não está no mural nem no recado do professor.',
        options: [
          { id: 'ask', label: 'Perguntar ao professor ou olhar o mural', points: 100 },
          { id: 'tell', label: 'Avisar todo mundo agora', points: 0 },
          { id: 'hold', label: 'Guardar a informação e não espalhar', points: 50 },
        ],
      },
    ],
    2: [
      {
        prompt: 'Um áudio diz que o passeio foi cancelado. A escola ainda não falou disso.',
        options: [
          { id: 'send', label: 'Reenviar o áudio para a turma', points: 0 },
          { id: 'office', label: 'Confirmar com a coordenação antes', points: 100 },
          { id: 'wait', label: 'Não espalhar o áudio', points: 50 },
        ],
      },
      {
        prompt: 'Um vídeo ensina um desafio perigoso e diz que todo mundo da escola está fazendo.',
        options: [
          { id: 'post', label: 'Postar para os amigos não ficarem por fora', points: 0 },
          { id: 'look', label: 'Procurar se o desafio é seguro antes de mostrar', points: 70 },
          { id: 'no', label: 'Não compartilhar o vídeo', points: 100 },
        ],
      },
      {
        prompt: 'Alguém afirma que a merenda de amanhã está estragada, sem foto da escola nem aviso oficial.',
        options: [
          { id: 'official', label: 'Checar um aviso oficial da escola', points: 100 },
          { id: 'group', label: 'Mandar no grupo da família agora', points: 0 },
          { id: 'silent', label: 'Não repassar enquanto não houver fonte', points: 50 },
        ],
      },
    ],
    3: [
      {
        prompt: 'Circula uma lista com nota de todo mundo. Você não viu isso no sistema da escola.',
        options: [
          { id: 'spread', label: 'Passar a lista adiante', points: 0 },
          { id: 'system', label: 'Conferir no canal oficial antes de comentar', points: 100 },
          { id: 'private', label: 'Não enviar a lista para mais ninguém', points: 50 },
        ],
      },
      {
        prompt: 'Um texto diz que um remédio caseiro cura qualquer febre em uma hora.',
        options: [
          { id: 'family', label: 'Mandar para a família imediatamente', points: 0 },
          { id: 'health', label: 'Olhar uma fonte de saúde confiável', points: 70 },
          { id: 'block', label: 'Não compartilhar o texto', points: 100 },
        ],
      },
      {
        prompt: 'Dizem que a quadra vai fechar o mês inteiro. O aviso não está no mural da educação física.',
        options: [
          { id: 'teacher', label: 'Perguntar ao professor de educação física', points: 100 },
          { id: 'story', label: 'Publicar nos status para avisar geral', points: 0 },
          { id: 'pause', label: 'Esperar e não republishar o boato', points: 50 },
        ],
      },
    ],
  },
}