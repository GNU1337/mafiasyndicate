import type {
  ContrabandGood,
  CrimeFamily,
  GameState,
  ShopItem,
  WorldPin,
} from '../types/game';

export const STORAGE_KEY = 'don_brojim_mafioso_save_v1';

export const SHOP_CATALOG: ShopItem[] = [
  {
    id: 'switchblade',
    name: 'Stiletto Switchblade',
    category: 'weapon',
    description: 'Concealable steel blade favored by street enforcers.',
    priceCash: 180,
    attackBonus: 8,
    defenseBonus: 2,
    hpBonus: 0,
  },
  {
    id: 'snub_revolver',
    name: '.38 Snub-Nose Revolver',
    category: 'weapon',
    description: 'Reliable close-quarters iron for late-night alley work.',
    priceCash: 520,
    attackBonus: 22,
    defenseBonus: 4,
    hpBonus: 0,
  },
  {
    id: 'tommy_gun',
    name: '1928 Chicago Typewriter',
    category: 'weapon',
    description: 'Drum-fed submachine gun that commands instant respect.',
    priceCash: 1850,
    attackBonus: 58,
    defenseBonus: 10,
    hpBonus: 0,
  },
  {
    id: 'tailored_coat',
    name: 'Reinforced Wool Overcoat',
    category: 'armor',
    description: 'Padded double-breasted coat sewn to absorb light hits.',
    priceCash: 260,
    attackBonus: 0,
    defenseBonus: 14,
    hpBonus: 20,
  },
  {
    id: 'kevlar_vest',
    name: 'Armored Under-Vest',
    category: 'armor',
    description: 'Heavy-duty protection worn beneath a tailored suit.',
    priceCash: 940,
    attackBonus: 0,
    defenseBonus: 36,
    hpBonus: 65,
  },
  {
    id: 'getaway_coupe',
    name: 'Tuned Getaway Coupe',
    category: 'vehicle',
    description: 'Stripped-down V8 sedan built to outrun harbor patrols.',
    priceCash: 1400,
    attackBonus: 12,
    defenseBonus: 18,
    hpBonus: 25,
  },
  {
    id: 'golden_cigar',
    name: 'Consigliere Gold Signet',
    category: 'special',
    description: 'Prestigious syndicate ring boosting overall combat poise.',
    priceDiamonds: 5,
    attackBonus: 25,
    defenseBonus: 25,
    hpBonus: 40,
  },
];

export const WORLD_PINS: WorldPin[] = [
  {
    id: 'pin-pub',
    label: 'Pub',
    icon: 'pub',
    worldPos: [-11.5, 2.5, -1.5],
    targetModal: 'pub',
  },
  {
    id: 'pin-domination',
    label: 'Domination',
    icon: 'domination',
    worldPos: [-6.5, 3.0, -5.0],
    targetModal: 'domination',
  },
  {
    id: 'pin-news',
    label: 'News',
    icon: 'news',
    worldPos: [-2.0, 3.2, -7.8],
    targetModal: 'news',
  },
  {
    id: 'pin-bank',
    label: 'Bank',
    icon: 'bank',
    worldPos: [9.5, 3.4, -3.5],
    targetModal: 'bank',
  },
  {
    id: 'pin-lucky-1',
    label: 'Lucky Reward',
    icon: 'luckyCash',
    worldPos: [8.0, 3.4, -12.5],
    targetModal: 'luckyReward',
  },
  {
    id: 'pin-lucky-2',
    label: 'Lucky Reward',
    icon: 'luckyGift',
    worldPos: [14.0, 3.4, -8.5],
    targetModal: 'luckyReward',
  },
  {
    id: 'pin-palermo',
    label: 'Palermo',
    icon: 'palermo',
    worldPos: [3.2, 3.0, 4.8],
    targetFamilyId: 'palermo',
  },
  {
    id: 'pin-gambino',
    label: 'Gambino',
    icon: 'gambino',
    worldPos: [-14.0, 3.4, 9.5],
    targetFamilyId: 'gambino',
  },
  {
    id: 'pin-corleone',
    label: 'Corleone',
    icon: 'corleone',
    worldPos: [-20.5, 3.4, 15.5],
    targetFamilyId: 'corleone',
  },
  {
    id: 'pin-genovese',
    label: 'Genovese',
    icon: 'genovese',
    worldPos: [-7.0, 3.4, 19.0],
    targetFamilyId: 'genovese',
  },
  {
    id: 'pin-salvatore',
    label: 'Salvatore',
    icon: 'salvatore',
    worldPos: [-1.5, 3.4, 12.0],
    targetFamilyId: 'salvatore',
  },
  {
    id: 'pin-padrino',
    label: 'Padrino',
    icon: 'padrino',
    worldPos: [11.0, 3.4, 10.5],
    targetFamilyId: 'padrino',
  },
];

export function createInitialFamilies(): CrimeFamily[] {
  return [
    {
      id: 'gambino',
      name: 'Gambino',
      fullTitle: 'Gambino Crime Family',
      crestColor: '#6d28d9',
      emblem: 'dice',
      turfShare: 24,
      treasury: 14850,
      boss: 'hello',
      consig: 'Seno',
      capoAttack1: 'gambino',
      capoAttack2: 'Kevo',
      capoDefense1: 'Ronelll',
      capoDefense2: 'Vito_M',
      members: [
        { id: 'm-hello', name: 'hello', role: 'Godfather', respect: 1840, attack: 95, defense: 88, kills: 14 },
        { id: 'm-seno', name: 'Seno', role: 'Consiglieri', respect: 1420, attack: 72, defense: 81, kills: 9 },
        { id: 'm-gambino', name: 'gambino', role: 'Capo Attack I', respect: 1185, attack: 84, defense: 62, kills: 11 },
        { id: 'm-kevo', name: 'Kevo', role: 'Capo Attack II', respect: 960, attack: 69, defense: 58, kills: 7 },
        { id: 'm-ronelll', name: 'Ronelll', role: 'Capo Defense I', respect: 845, attack: 51, defense: 79, kills: 5 },
        { id: 'm-vito', name: 'Vito_M', role: 'Capo Defense II', respect: 610, attack: 45, defense: 68, kills: 3 },
        { id: 'm-player', name: 'gnujimmy', role: 'Member', respect: 138, attack: 0, defense: 25, kills: 0, isPlayer: true },
      ],
    },
    {
      id: 'corleone',
      name: 'Corleone',
      fullTitle: 'Corleone Crime Family',
      crestColor: '#b91c1c',
      emblem: 'cards',
      turfShare: 21,
      treasury: 16200,
      boss: 'Don_Vito',
      consig: 'TomHagen',
      capoAttack1: 'Santino',
      capoAttack2: 'Clemenza',
      capoDefense1: 'Tessio',
      capoDefense2: 'LucaB',
      members: [
        { id: 'c-1', name: 'Don_Vito', role: 'Godfather', respect: 2150, attack: 98, defense: 96, kills: 18 },
        { id: 'c-2', name: 'TomHagen', role: 'Consiglieri', respect: 1580, attack: 60, defense: 90, kills: 4 },
        { id: 'c-3', name: 'Santino', role: 'Capo Attack I', respect: 1310, attack: 92, defense: 61, kills: 15 },
        { id: 'c-4', name: 'Clemenza', role: 'Capo Attack II', respect: 1090, attack: 76, defense: 72, kills: 10 },
        { id: 'c-5', name: 'Tessio', role: 'Capo Defense I', respect: 940, attack: 64, defense: 80, kills: 6 },
      ],
    },
    {
      id: 'genovese',
      name: 'Genovese',
      fullTitle: 'Genovese Crime Family',
      crestColor: '#0f766e',
      emblem: 'bottle',
      turfShare: 18,
      treasury: 12900,
      boss: 'LuckyL',
      consig: 'FrankC',
      capoAttack1: 'VitoG',
      capoAttack2: 'TonyB',
      capoDefense1: 'WillieM',
      capoDefense2: 'RoccoS',
      members: [
        { id: 'ge-1', name: 'LuckyL', role: 'Godfather', respect: 1790, attack: 89, defense: 85, kills: 12 },
        { id: 'ge-2', name: 'FrankC', role: 'Consiglieri', respect: 1340, attack: 58, defense: 84, kills: 4 },
        { id: 'ge-3', name: 'VitoG', role: 'Capo Attack I', respect: 1120, attack: 81, defense: 66, kills: 9 },
        { id: 'ge-4', name: 'TonyB', role: 'Capo Attack II', respect: 880, attack: 65, defense: 59, kills: 6 },
        { id: 'ge-5', name: 'WillieM', role: 'Capo Defense I', respect: 790, attack: 49, defense: 74, kills: 3 },
      ],
    },
    {
      id: 'salvatore',
      name: 'Salvatore',
      fullTitle: 'Salvatore Crime Family',
      crestColor: '#b45309',
      emblem: 'hat',
      turfShare: 14,
      treasury: 9800,
      boss: 'Sal_Marino',
      consig: 'EnzoR',
      capoAttack1: 'Matteo',
      capoAttack2: 'DanteV',
      capoDefense1: 'NicoP',
      capoDefense2: 'CarloB',
      members: [
        { id: 'sa-1', name: 'Sal_Marino', role: 'Godfather', respect: 1490, attack: 79, defense: 77, kills: 10 },
        { id: 'sa-2', name: 'EnzoR', role: 'Consiglieri', respect: 1110, attack: 54, defense: 75, kills: 4 },
        { id: 'sa-3', name: 'Matteo', role: 'Capo Attack I', respect: 910, attack: 73, defense: 52, kills: 8 },
        { id: 'sa-4', name: 'DanteV', role: 'Capo Attack II', respect: 720, attack: 60, defense: 49, kills: 5 },
        { id: 'sa-5', name: 'NicoP', role: 'Capo Defense I', respect: 640, attack: 41, defense: 65, kills: 2 },
      ],
    },
    {
      id: 'palermo',
      name: 'Palermo',
      fullTitle: 'Palermo Crime Family',
      crestColor: '#374151',
      emblem: 'hand',
      turfShare: 12,
      treasury: 8400,
      boss: 'ManoNera',
      consig: 'PietroD',
      capoAttack1: 'Ciccio',
      capoAttack2: 'Saro',
      capoDefense1: 'Turi',
      capoDefense2: 'Beppe',
      members: [
        { id: 'pa-1', name: 'ManoNera', role: 'Godfather', respect: 1320, attack: 75, defense: 71, kills: 9 },
        { id: 'pa-2', name: 'PietroD', role: 'Consiglieri', respect: 980, attack: 51, defense: 69, kills: 3 },
        { id: 'pa-3', name: 'Ciccio', role: 'Capo Attack I', respect: 810, attack: 68, defense: 50, kills: 6 },
        { id: 'pa-4', name: 'Saro', role: 'Capo Attack II', respect: 615, attack: 55, defense: 46, kills: 4 },
        { id: 'pa-5', name: 'Turi', role: 'Capo Defense I', respect: 540, attack: 38, defense: 58, kills: 2 },
      ],
    },
    {
      id: 'padrino',
      name: 'Padrino',
      fullTitle: 'Padrino Crime Family',
      crestColor: '#1d4ed8',
      emblem: 'pistol',
      turfShare: 11,
      treasury: 7900,
      boss: 'IlPadrino',
      consig: 'GinoK',
      capoAttack1: 'MarcoF',
      capoAttack2: 'LucaZ',
      capoDefense1: 'PaoloN',
      capoDefense2: 'NinoC',
      members: [
        { id: 'pd-1', name: 'IlPadrino', role: 'Godfather', respect: 1240, attack: 71, defense: 74, kills: 8 },
        { id: 'pd-2', name: 'GinoK', role: 'Consiglieri', respect: 920, attack: 48, defense: 67, kills: 3 },
        { id: 'pd-3', name: 'MarcoF', role: 'Capo Attack I', respect: 740, attack: 63, defense: 48, kills: 5 },
        { id: 'pd-4', name: 'LucaZ', role: 'Capo Attack II', respect: 590, attack: 52, defense: 44, kills: 4 },
        { id: 'pd-5', name: 'PaoloN', role: 'Capo Defense I', respect: 495, attack: 36, defense: 55, kills: 2 },
      ],
    },
  ];
}

export function createInitialContraband(): ContrabandGood[] {
  return [
    {
      id: 'whiskey',
      name: 'Smuggled Bourbon Crates',
      basePrice: 45,
      currentPrice: 48,
      previousPrice: 44,
      priceHistory: [40, 41, 42, 44, 43, 45, 47, 46, 44, 42, 40, 41, 43, 46, 44, 42, 39, 41, 45, 47, 46, 43, 44, 48],
      owned: 0,
      avgBuyPrice: 0,
      totalBought: 0,
      totalSold: 0,
      realizedProfit: 0,
      volatilityLabel: 'Low',
    },
    {
      id: 'cigars',
      name: 'Havana Reserve Cigars',
      basePrice: 85,
      currentPrice: 76,
      previousPrice: 82,
      priceHistory: [84, 86, 89, 92, 90, 87, 85, 88, 91, 89, 87, 88, 91, 86, 84, 89, 93, 90, 85, 83, 86, 82, 79, 76],
      owned: 0,
      avgBuyPrice: 0,
      totalBought: 0,
      totalSold: 0,
      realizedProfit: 0,
      volatilityLabel: 'Low',
    },
    {
      id: 'silks',
      name: 'Harbor Silk Bolts',
      basePrice: 130,
      currentPrice: 142,
      previousPrice: 128,
      priceHistory: [125, 121, 119, 124, 128, 132, 135, 130, 127, 123, 120, 118, 122, 129, 134, 126, 120, 124, 131, 136, 133, 125, 128, 142],
      owned: 0,
      avgBuyPrice: 0,
      totalBought: 0,
      totalSold: 0,
      realizedProfit: 0,
      volatilityLabel: 'Medium',
    },
    {
      id: 'bullion',
      name: 'Unmarked Gold Bullion',
      basePrice: 310,
      currentPrice: 282,
      previousPrice: 298,
      priceHistory: [302, 310, 318, 326, 334, 325, 314, 308, 299, 305, 312, 315, 328, 340, 322, 305, 318, 332, 312, 296, 304, 301, 298, 282],
      owned: 0,
      avgBuyPrice: 0,
      totalBought: 0,
      totalSold: 0,
      realizedProfit: 0,
      volatilityLabel: 'High',
    },
    {
      id: 'art',
      name: 'Stolen Port Canvas',
      basePrice: 540,
      currentPrice: 575,
      previousPrice: 530,
      priceHistory: [520, 505, 495, 512, 535, 558, 572, 548, 530, 515, 500, 490, 515, 560, 545, 510, 485, 505, 550, 590, 565, 520, 530, 575],
      owned: 0,
      avgBuyPrice: 0,
      totalBought: 0,
      totalSold: 0,
      realizedProfit: 0,
      volatilityLabel: 'High',
    },
  ];
}

export function createInitialGameState(): GameState {
  const now = Date.now();
  return {
    player: {
      name: 'gnujimmy',
      bio: 'Rising soldier in the Gambino dockside rackets.',
      familyId: 'gambino',
      role: 'Member',
      respect: 138,
      kills: 0,
      successfulDefenses: 0,
      vitality: 350,
      maxVitality: 350,
      hpStat: 25,
      attack: 0,
      defense: 25,
      cash: 901.2,
      bankBalance: 250.0,
      diamonds: 0,
      energy: 10,
      maxEnergy: 10,
      status: 'inMission',
      missionName: 'Harbor Dock Watch',
      missionEndsAt: now + 57 * 60 * 1000 + 37 * 1000,
      missionRewardCash: 165,
      missionRewardRespect: 28,
      ownedItems: {},
      cooldowns: {
        pickpocketUntil: 0,
        extortionUntil: 0,
        defamationUntil: 0,
        killUntil: 0,
        chestUntil: 0,
        videoRewardUntil: 0,
      },
      knifeBestScore: 6,
      carBestScore: 3,
    },
    families: createInitialFamilies(),
    contraband: createInitialContraband(),
    tradeHistory: [],
    priceAlerts: [],
    autoTradeRules: [],
    cargoCapacity: 25,
    marketNextTickAt: now + 30 * 1000,
    news: [
      {
        id: 'n-1',
        timestamp: now - 1000 * 60 * 18,
        headline: 'Gambino dock crews secured two contraband barges near Pier 4.',
        category: 'family',
      },
      {
        id: 'n-2',
        timestamp: now - 1000 * 60 * 45,
        headline: 'Corleone enforcers clashed with Genovese patrols outside the Old Pub.',
        category: 'turf',
      },
      {
        id: 'n-3',
        timestamp: now - 1000 * 60 * 90,
        headline: 'Harbor Bank tightened vault security ahead of midnight shift.',
        category: 'market',
      },
    ],
    mail: [
      {
        id: 'mail-1',
        sender: 'hello (Godfather)',
        subject: 'Welcome to the Gambino Family',
        body: 'Keep your head down, run the docks, test your steel in the Knife pit, and prove your wheel skills on the highway. Earn Respect and there is a Capo seat waiting.',
        timestamp: now - 1000 * 60 * 60,
        read: false,
      },
      {
        id: 'mail-2',
        sender: 'Seno (Consiglieri)',
        subject: 'Safe Cash Reminder',
        body: 'Deposit spare bills at the Harbor Bank before picking fights with Palermo or Corleone hitmen.',
        timestamp: now - 1000 * 60 * 140,
        read: true,
      },
    ],
    soundEnabled: true,
    lastSavedAt: now,
  };
}

export function loadSavedGameState(): GameState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return createInitialGameState();
    const parsed = JSON.parse(raw) as Partial<GameState>;
    if (!parsed || !parsed.player || !Array.isArray(parsed.families)) {
      return createInitialGameState();
    }
    const defaults = createInitialContraband();
    const hydratedContraband = (parsed.contraband ?? defaults).map((g) => {
      const fallback = defaults.find((d) => d.id === g.id) ?? defaults[0];
      return {
        ...fallback,
        ...g,
        priceHistory:
          Array.isArray(g.priceHistory) && g.priceHistory.length > 1
            ? g.priceHistory
            : [...fallback.priceHistory.slice(0, -1), g.currentPrice ?? fallback.currentPrice],
        avgBuyPrice: typeof g.avgBuyPrice === 'number' ? g.avgBuyPrice : 0,
        totalBought: typeof g.totalBought === 'number' ? g.totalBought : 0,
        totalSold: typeof g.totalSold === 'number' ? g.totalSold : 0,
        realizedProfit: typeof g.realizedProfit === 'number' ? g.realizedProfit : 0,
        volatilityLabel: g.volatilityLabel ?? fallback.volatilityLabel,
      };
    });
    return {
      ...createInitialGameState(),
      ...parsed,
      contraband: hydratedContraband,
      tradeHistory: Array.isArray(parsed.tradeHistory) ? parsed.tradeHistory : [],
      priceAlerts: Array.isArray(parsed.priceAlerts) ? parsed.priceAlerts : [],
      autoTradeRules: Array.isArray(parsed.autoTradeRules) ? parsed.autoTradeRules : [],
      cargoCapacity: typeof parsed.cargoCapacity === 'number' ? parsed.cargoCapacity : 25,
      marketNextTickAt:
        typeof parsed.marketNextTickAt === 'number'
          ? parsed.marketNextTickAt
          : Date.now() + 30 * 1000,
    };
  } catch {
    return createInitialGameState();
  }
}

export function formatCash(amount: number): string {
  return amount.toFixed(2).replace('.', ',');
}

export function formatCountdown(msRemaining: number): string {
  const totalSec = Math.max(0, Math.floor(msRemaining / 1000));
  const hrs = Math.floor(totalSec / 3600);
  const mins = Math.floor((totalSec % 3600) / 60);
  const secs = totalSec % 60;
  return `${String(hrs).padStart(2, '0')}:${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}
