// Stop-words PT-BR for Word Cloud filtering
export const STOP_WORDS = new Set([
  'para', 'como', 'mais', 'sobre', 'após', 'antes', 'desde', 'entre',
  'esse', 'essa', 'este', 'esta', 'isso', 'isto', 'aqui', 'aquele',
  'aquela', 'dele', 'dela', 'deles', 'delas', 'nele', 'nela', 'neles',
  'nelas', 'minha', 'meus', 'minhas', 'nossa', 'nosso', 'nossos',
  'nossas', 'vossa', 'vosso', 'vossos', 'vossas', 'suas', 'seus',
  'quando', 'onde', 'qual', 'quais', 'quem', 'quanto', 'quantos',
  'quantas', 'pela', 'pelo', 'pelas', 'pelos', 'numa', 'numas',
  'nuns', 'numa', 'umas', 'uma', 'uns', 'cada', 'todo', 'toda',
  'todos', 'todas', 'muito', 'muita', 'muitos', 'muitas', 'pouco',
  'pouca', 'poucos', 'poucas', 'outro', 'outra', 'outros', 'outras',
  'mesmo', 'mesma', 'mesmos', 'mesmas', 'certo', 'certa', 'certos',
  'certas', 'vários', 'várias', 'tanto', 'tanta', 'tantos', 'tantas',
  'algum', 'alguma', 'alguns', 'algumas', 'nenhum', 'nenhuma',
  'nenhuns', 'nenhumas', 'com', 'sem', 'sob', 'por', 'que', 'dos',
  'das', 'nos', 'nas', 'aos', 'não', 'sim', 'mas', 'pois', 'porque',
  'porém', 'contudo', 'todavia', 'portanto', 'logo', 'então', 'assim',
  'ainda', 'também', 'talvez', 'sempre', 'nunca', 'jamais', 'agora',
  'hoje', 'ontem', 'amanhã', 'aqui', 'ali', 'lá', 'bem', 'mal',
  'já', 'já', 'está', 'estou', 'estão', 'estava', 'foram', 'sido',
  'ser', 'ter', 'haver', 'fazer', 'poder', 'dever', 'saber',
  'querer', 'ficar', 'vir', 'dar', 'ver', 'dizer', 'ir',
  'tem', 'tinha', 'teve', 'terá', 'teria', 'tenha', 'tivesse',
  'fez', 'faz', 'fará', 'faria', 'faça', 'fizesse', 'feito',
  'pode', 'podia', 'pôde', 'poderá', 'poderia', 'possa', 'pudesse',
  'deve', 'devia', 'deverá', 'deveria', 'deva', 'devesse',
  'quer', 'quis', 'queria', 'quererá', 'quereria', 'queira',
  'fica', 'ficou', 'ficava', 'ficará', 'ficaria', 'fique',
  'vem', 'veio', 'vinha', 'virá', 'viria', 'venha',
  'disse', 'dizia', 'dirá', 'diria', 'diga',
  'vai', 'foi', 'era', 'será', 'seria', 'seja', 'fosse',
  'ano', 'anos', 'mês', 'dia', 'dias', 'vez', 'vezes', 'região', 'efeito', 'anteriormente', 'realizou', 'tratar', 'queixa',
  'anúncio',
  'tipo', 'coisa', 'parte', 'lado', 'forma', 'modo',
  'interesse', 'busca', 'primeira', 'primeiro',
  'realizando', 'tratamentos', 'tratamento', 'após',
]);

export function tokenizeText(text) {
  if (!text) return [];
  return text
    .toLowerCase()
    .replace(/[.,;:!?()[\]{}"'\/\\—–-]/g, ' ')
    .split(/\s+/)
    .filter(w => w.length > 4 && !STOP_WORDS.has(w));
}
