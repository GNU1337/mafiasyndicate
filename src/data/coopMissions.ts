import type { CoopCrewRole } from '../types/game';

export interface CoopMissionTemplate {
  id: string;
  title: string;
  description: string;
  difficulty: 'Standard' | 'Hard' | 'Syndicate';
  minPlayers: number;
  maxPlayers: number;
  durationMs: number;
  targetProgress: number;
  rewardCashPerPlayer: number;
  rewardRespectPerPlayer: number;
}

export const COOP_MISSION_TEMPLATES: CoopMissionTemplate[] = [
  {
    id: 'dock_fleet',
    title: 'Dockside Smuggler Fleet Raid',
    description:
      'Coordinate two or more mobsters to hijack rival cargo barges at Pier 4 and haul the contraband before patrol boats arrive.',
    difficulty: 'Standard',
    minPlayers: 2,
    maxPlayers: 4,
    durationMs: 45_000,
    targetProgress: 100,
    rewardCashPerPlayer: 280,
    rewardRespectPerPlayer: 40,
  },
  {
    id: 'armored_convoy',
    title: 'Armored Harbor Convoy Ambush',
    description:
      'Box in the midnight payroll truck along the waterfront avenue. Enforcers suppress guards while Safecrackers drill the rear vault.',
    difficulty: 'Hard',
    minPlayers: 2,
    maxPlayers: 4,
    durationMs: 55_000,
    targetProgress: 140,
    rewardCashPerPlayer: 460,
    rewardRespectPerPlayer: 65,
  },
  {
    id: 'reserve_vault',
    title: 'Federal Harbor Reserve Breach',
    description:
      'High-stakes joint family operation. Crack the twin steel vault doors and extract unmarked gold bars under tight timer pressure.',
    difficulty: 'Syndicate',
    minPlayers: 2,
    maxPlayers: 4,
    durationMs: 65_000,
    targetProgress: 190,
    rewardCashPerPlayer: 850,
    rewardRespectPerPlayer: 115,
  },
  {
    id: 'casino_takeover',
    title: 'Grand Casino High-Roller Takeover',
    description:
      'All-hands syndicate heist across the VIP cage, armored counting room, and getaway boulevard.',
    difficulty: 'Syndicate',
    minPlayers: 2,
    maxPlayers: 4,
    durationMs: 75_000,
    targetProgress: 240,
    rewardCashPerPlayer: 1350,
    rewardRespectPerPlayer: 175,
  },
];

export const CREW_ROLES: Array<{
  role: CoopCrewRole;
  actionLabel: string;
  bonusText: string;
}> = [
  { role: 'Enforcer', actionLabel: 'Suppress Guards', bonusText: '+25% Attack Power' },
  { role: 'Safecracker', actionLabel: 'Drill Vault Lock', bonusText: '+30% Vault Progress' },
  { role: 'Wheelman', actionLabel: 'Hold Getaway Lane', bonusText: '+20% Crew Escape Speed' },
  { role: 'Lookout', actionLabel: 'Jam Police Comms', bonusText: '+15% Cash Cut Bonus' },
];
