export type FamilyRole =
  | 'Godfather'
  | 'Consiglieri'
  | 'Capo Attack I'
  | 'Capo Attack II'
  | 'Capo Defense I'
  | 'Capo Defense II'
  | 'Member';

export type PlayerStatus = 'Idle' | 'inMission' | 'Recovering';

export interface FamilyMember {
  id: string;
  name: string;
  role: FamilyRole;
  respect: number;
  attack: number;
  defense: number;
  kills: number;
  isPlayer?: boolean;
}

export interface CrimeFamily {
  id: string;
  name: string;
  fullTitle: string;
  crestColor: string;
  emblem: 'dice' | 'cards' | 'bottle' | 'hat' | 'hand' | 'pistol';
  turfShare: number;
  treasury: number;
  boss: string;
  consig: string;
  capoAttack1: string;
  capoAttack2: string;
  capoDefense1: string;
  capoDefense2: string;
  members: FamilyMember[];
}

export interface PlayerProfile {
  name: string;
  bio: string;
  familyId: string;
  role: FamilyRole;
  respect: number;
  kills: number;
  successfulDefenses: number;
  vitality: number;
  maxVitality: number;
  hpStat: number;
  attack: number;
  defense: number;
  cash: number;
  bankBalance: number;
  diamonds: number;
  energy: number;
  maxEnergy: number;
  status: PlayerStatus;
  missionName: string | null;
  missionEndsAt: number | null;
  missionRewardCash: number;
  missionRewardRespect: number;
  ownedItems: Record<string, number>;
  cooldowns: {
    pickpocketUntil: number;
    extortionUntil: number;
    defamationUntil: number;
    killUntil: number;
    chestUntil: number;
    videoRewardUntil: number;
  };
  knifeBestScore: number;
  carBestScore: number;
}

export interface ContrabandGood {
  id: string;
  name: string;
  basePrice: number;
  currentPrice: number;
  previousPrice: number;
  priceHistory: number[];
  owned: number;
  avgBuyPrice: number;
  totalBought: number;
  totalSold: number;
  realizedProfit: number;
  volatilityLabel: 'Low' | 'Medium' | 'High';
}

export interface TradeRecord {
  id: string;
  timestamp: number;
  goodId: string;
  goodName: string;
  side: 'BUY' | 'SELL';
  qty: number;
  unitPrice: number;
  total: number;
  realizedDelta?: number;
}

export interface PriceAlert {
  id: string;
  goodId: string;
  goodName: string;
  condition: 'below' | 'above';
  targetPrice: number;
  triggered: boolean;
}

export interface AutoTradeRule {
  id: string;
  goodId: string;
  goodName: string;
  side: 'BUY' | 'SELL';
  condition: 'below' | 'above';
  targetPrice: number;
  qty: number | 'ALL';
  repeat: boolean;
  enabled: boolean;
  executedCount: number;
  lastTriggeredAt?: number;
}

export interface NewsEntry {
  id: string;
  timestamp: number;
  headline: string;
  category: 'crime' | 'family' | 'market' | 'turf';
}

export interface MailMessage {
  id: string;
  sender: string;
  subject: string;
  body: string;
  timestamp: number;
  read: boolean;
}

export interface ShopItem {
  id: string;
  name: string;
  category: 'weapon' | 'armor' | 'vehicle' | 'special';
  description: string;
  priceCash?: number;
  priceDiamonds?: number;
  attackBonus: number;
  defenseBonus: number;
  hpBonus: number;
}

export type ModalType =
  | null
  | 'menu'
  | 'profile'
  | 'family'
  | 'pickpocket'
  | 'extortion'
  | 'tutorial'
  | 'heist'
  | 'trade'
  | 'defamation'
  | 'mission'
  | 'hotel'
  | 'kill'
  | 'training'
  | 'pub'
  | 'domination'
  | 'news'
  | 'bank'
  | 'shop'
  | 'timers'
  | 'medals'
  | 'mail'
  | 'settings'
  | 'luckyReward'
  | 'multiplayer';

export type CoopCrewRole = 'Enforcer' | 'Safecracker' | 'Wheelman' | 'Lookout';
export type PvpStance = 'aggressive' | 'balanced' | 'defensive';

export interface OnlineMobster {
  id: string;
  name: string;
  familyId: string;
  role: FamilyRole;
  respect: number;
  attack: number;
  defense: number;
  vitality: number;
  maxVitality: number;
  kills: number;
  cash: number;
  status: PlayerStatus;
  online: boolean;
  lastSeenAt: number;
}

export interface PvpChallenge {
  id: string;
  challengerId: string;
  challengerName: string;
  challengerFamilyId: string;
  targetId: string;
  targetName: string;
  targetFamilyId: string;
  wager: number;
  challengerStance: PvpStance;
  status: 'pending' | 'accepted' | 'declined' | 'completed';
  createdAt: number;
  winnerId?: string;
  winnerName?: string;
  summary?: string;
  rounds?: string[];
}

export interface CoopMemberSlot {
  playerId: string;
  name: string;
  familyId: string;
  crewRole: CoopCrewRole;
  power: number;
  ready: boolean;
  contributions: number;
}

export interface CoopMissionRoom {
  id: string;
  templateId: string;
  title: string;
  description: string;
  leaderId: string;
  leaderName: string;
  difficulty: 'Standard' | 'Hard' | 'Syndicate';
  minPlayers: number;
  maxPlayers: number;
  rewardCashPerPlayer: number;
  rewardRespectPerPlayer: number;
  targetProgress: number;
  progress: number;
  status: 'recruiting' | 'active' | 'completed' | 'failed';
  startedAt: number | null;
  endsAt: number | null;
  members: CoopMemberSlot[];
  actionLog: string[];
}

export interface MpChatMessage {
  id: string;
  senderId: string;
  senderName: string;
  familyId: string;
  channel: 'city' | 'family';
  text: string;
  timestamp: number;
}

export interface MultiplayerSnapshot {
  connected: boolean;
  selfId: string;
  players: OnlineMobster[];
  challenges: PvpChallenge[];
  coopRooms: CoopMissionRoom[];
  chat: MpChatMessage[];
  turfShares: Record<string, number>;
  feed: Array<{ id: string; text: string; timestamp: number; kind: 'pvp' | 'coop' | 'turf' | 'system' }>;
}

export type MiniGameType = null | 'knife' | 'car';

export interface ConfirmPromptState {
  title?: string;
  message: string;
  okLabel?: string;
  closeLabel?: string;
  onConfirm: () => void;
}

export interface ResultPromptState {
  message: string;
  variant?: 'mahogany' | 'dark';
}

export interface WorldPin {
  id: string;
  label: string;
  icon:
    | 'pub'
    | 'domination'
    | 'news'
    | 'bank'
    | 'luckyCash'
    | 'luckyGift'
    | 'palermo'
    | 'gambino'
    | 'corleone'
    | 'genovese'
    | 'salvatore'
    | 'padrino';
  worldPos: [number, number, number];
  targetModal?: ModalType;
  targetFamilyId?: string;
}

export interface GameState {
  player: PlayerProfile;
  families: CrimeFamily[];
  contraband: ContrabandGood[];
  tradeHistory: TradeRecord[];
  priceAlerts: PriceAlert[];
  autoTradeRules: AutoTradeRule[];
  cargoCapacity: number;
  marketNextTickAt: number;
  news: NewsEntry[];
  mail: MailMessage[];
  soundEnabled: boolean;
  lastSavedAt: number;
}
