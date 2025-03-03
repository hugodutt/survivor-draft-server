export interface Room {
  id: string;
  code: string;
  status: 'waiting' | 'drafting' | 'situations' | 'voting' | 'finished';
  hostId: string;
  players: Player[];
  maxPlayers: number;
  scenario: Scenario;
  currentSituation?: Situation;
  currentPlayerTurn?: string;
  createdAt: Date;
  updatedAt: Date;
  votes?: { [playerId: string]: string }; // Jogador votado por cada jogador
}

export interface Player {
  id: string;
  name: string;
  selectedItems: string[];
  isHost: boolean;
  isReady: boolean;
  currentItemChoice?: string;
  usedItems: string[];
  currentResponse?: {
    itemId: string;
    explanation: string;
  };
  votesReceived?: number; // Número de votos recebidos
}

export interface Scenario {
  id: string;
  name: string;
  description: string;
  backgroundImage: string;
  items: Item[];
  situations: Situation[];
}

export interface Item {
  id: string;
  name: string;
  description: string;
  category: 'ideal' | 'possible' | 'absurd';
}

export interface Situation {
  id: string;
  description: string;
  timeLimit: number;
  idealItems?: string[];
}

export const AVAILABLE_SCENARIOS: Scenario[] = [
  {
    id: 'desert',
    name: 'Deserto Implacável',
    description: 'Você está perdido em um vasto deserto após um acidente de avião. Sobreviva ao calor escaldante durante o dia e ao frio congelante da noite.',
    backgroundImage: '/scenarios/desert.jpg',
    items: [
      // Itens ideais (30%)
      { id: 'water', name: 'Cantil', description: 'Um cantil de 2 litros para armazenar água', category: 'ideal' },
      { id: 'compass', name: 'Bússola', description: 'Uma bússola para navegação', category: 'ideal' },
      { id: 'blanket', name: 'Manta Térmica', description: 'Proteção contra o sol e o frio noturno', category: 'ideal' },
      
      // Itens possíveis (40%)
      { id: 'firstaid', name: 'Kit de Primeiros Socorros', description: 'Para emergências médicas', category: 'possible' },
      { id: 'knife', name: 'Faca de Sobrevivência', description: 'Ferramenta multiuso', category: 'possible' },
      { id: 'lighter', name: 'Isqueiro', description: 'Para fazer fogo', category: 'possible' },
      { id: 'rope', name: 'Corda', description: '15 metros de corda resistente', category: 'possible' },
      
      // Itens absurdos (30%)
      { id: 'glitter', name: 'Frasco de Glitter', description: 'Para brilhar no escuro?', category: 'absurd' },
      { id: 'unicorn', name: 'Pijama de Unicórnio', description: 'Pelo menos é quentinho...', category: 'absurd' },
      { id: 'remote', name: 'Controle Remoto sem Pilhas', description: 'Talvez funcione com energia solar?', category: 'absurd' }
    ],
    situations: [
      {
        id: 'sandstorm',
        description: 'Uma tempestade de areia se aproxima. Como você se protege?',
        timeLimit: 60,
        idealItems: ['blanket', 'compass']
      },
      {
        id: 'oasis',
        description: 'Você encontrou um oásis, mas a água parece turva. O que você faz?',
        timeLimit: 60,
        idealItems: ['water', 'firstaid']
      },
      {
        id: 'night',
        description: 'A noite está chegando e a temperatura está caindo rapidamente. Como você se prepara?',
        timeLimit: 60,
        idealItems: ['blanket', 'lighter']
      },
      {
        id: 'lost',
        description: 'Você perdeu suas referências na vastidão do deserto. Como se orienta?',
        timeLimit: 60,
        idealItems: ['compass', 'knife']
      },
      {
        id: 'rescue',
        description: 'Você avista um avião no horizonte. Como chama sua atenção?',
        timeLimit: 60,
        idealItems: ['lighter', 'glitter']
      }
    ]
  },
  {
    id: 'jungle',
    name: 'Selva Amazônica',
    description: 'Seu barco naufragou em um rio da Amazônia. Sobreviva na densa floresta tropical enquanto tenta encontrar ajuda.',
    backgroundImage: '/scenarios/jungle.jpg',
    items: [
      // Itens ideais (30%)
      { id: 'machete', name: 'Facão', description: 'Para abrir caminho na vegetação densa', category: 'ideal' },
      { id: 'mosquitonet', name: 'Mosquiteiro', description: 'Proteção contra insetos', category: 'ideal' },
      { id: 'matches', name: 'Fósforos Impermeáveis', description: 'Para fazer fogo mesmo na umidade', category: 'ideal' },
      
      // Itens possíveis (40%)
      { id: 'firstaid', name: 'Kit de Primeiros Socorros', description: 'Com antídotos para picadas', category: 'possible' },
      { id: 'rope', name: 'Corda', description: '20 metros de corda resistente', category: 'possible' },
      { id: 'compass', name: 'Bússola', description: 'Para navegação', category: 'possible' },
      { id: 'waterpurifier', name: 'Purificador de Água', description: 'Remove parasitas e bactérias', category: 'possible' },
      
      // Itens absurdos (30%)
      { id: 'dino', name: 'Fantasia de Dinossauro', description: 'Para se camuflar entre os répteis?', category: 'absurd' },
      { id: 'party', name: 'Apito de Festa', description: 'Talvez espante os predadores...', category: 'absurd' },
      { id: 'chalk', name: 'Giz Gigante', description: 'Para marcar árvores com desenhos bonitos', category: 'absurd' }
    ],
    situations: [
      {
        id: 'rain',
        description: 'Uma tempestade tropical se aproxima. Como você se protege?',
        timeLimit: 60,
        idealItems: ['mosquitonet', 'rope']
      },
      {
        id: 'predator',
        description: 'Você ouve rugidos de uma onça próxima. O que você faz?',
        timeLimit: 60,
        idealItems: ['machete', 'matches']
      },
      {
        id: 'river',
        description: 'Você precisa atravessar um rio largo. Como procede?',
        timeLimit: 60,
        idealItems: ['rope', 'compass']
      },
      {
        id: 'thirst',
        description: 'Você encontrou água, mas parece contaminada. Como resolve?',
        timeLimit: 60,
        idealItems: ['waterpurifier', 'firstaid']
      },
      {
        id: 'path',
        description: 'A vegetação está muito densa para passar. O que faz?',
        timeLimit: 60,
        idealItems: ['machete', 'compass']
      }
    ]
  },
  {
    id: 'arctic',
    name: 'Ártico Congelado',
    description: 'Seu avião fez um pouso forçado no Ártico. Sobreviva ao frio extremo e encontre um modo de sinalizar por ajuda.',
    backgroundImage: '/scenarios/arctic.jpg',
    items: [
      // Itens ideais (30%)
      { id: 'sleepingbag', name: 'Saco de Dormir', description: 'Para temperaturas extremas', category: 'ideal' },
      { id: 'stove', name: 'Fogareiro Portátil', description: 'Com combustível para 3 dias', category: 'ideal' },
      { id: 'flare', name: 'Kit de Sinalizadores', description: 'Para sinalizar resgate', category: 'ideal' },
      
      // Itens possíveis (40%)
      { id: 'goggles', name: 'Óculos de Neve', description: 'Proteção contra cegueira da neve', category: 'possible' },
      { id: 'axe', name: 'Machado', description: 'Para cortar gelo e madeira', category: 'possible' },
      { id: 'firstaid', name: 'Kit de Primeiros Socorros', description: 'Com tratamentos para hipotermia', category: 'possible' },
      { id: 'radio', name: 'Rádio de Emergência', description: 'Para comunicação', category: 'possible' },
      
      // Itens absurdos (30%)
      { id: 'welcome', name: 'Tapete de Boas-vindas', description: 'Para recepcionar os ursos polares?', category: 'absurd' },
      { id: 'skate', name: 'Um Único Patins', description: 'Melhor que nada para deslizar no gelo...', category: 'absurd' },
      { id: 'plant', name: 'Vaso de Planta', description: 'Para dar um toque aconchegante ao iglu', category: 'absurd' }
    ],
    situations: [
      {
        id: 'blizzard',
        description: 'Uma nevasca está se aproximando. Como você se prepara?',
        timeLimit: 60,
        idealItems: ['sleepingbag', 'stove']
      },
      {
        id: 'thin_ice',
        description: 'Você precisa atravessar uma área de gelo fino. O que você faz?',
        timeLimit: 60,
        idealItems: ['axe', 'goggles']
      },
      {
        id: 'polar_bear',
        description: 'Você avista um urso polar se aproximando. Como reage?',
        timeLimit: 60,
        idealItems: ['flare', 'axe']
      },
      {
        id: 'rescue',
        description: 'Você ouve um helicóptero ao longe. Como chama atenção?',
        timeLimit: 60,
        idealItems: ['flare', 'radio']
      },
      {
        id: 'shelter',
        description: 'A noite está chegando e você precisa de abrigo. O que faz?',
        timeLimit: 60,
        idealItems: ['sleepingbag', 'stove']
      }
    ]
  }
]; 