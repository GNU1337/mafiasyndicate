import dotenv from 'dotenv';
import express from 'express';
import crypto from 'node:crypto';
import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { WebSocket, WebSocketServer } from 'ws';
import { COOP_MISSION_TEMPLATES } from './src/data/coopMissions.ts';
import type {
  CoopCrewRole,
  CoopMissionRoom,
  MpChatMessage,
  OnlineMobster,
  PlayerProfile,
  PvpChallenge,
  PvpStance,
} from './src/types/game.ts';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PORT = Number(process.env.PORT) || 3000;
const IS_PROD = process.env.NODE_ENV === 'production';
const DATA_DIR = path.resolve(__dirname, 'data');
const ACCOUNTS_FILE = path.join(DATA_DIR, 'accounts.json');

interface StoredAccount {
  id: string;
  username: string;
  usernameLower: string;
  salt: string;
  passwordHash: string;
  token: string;
  familyId: string;
  createdAt: number;
  profile?: Partial<PlayerProfile>;
}

const accountsByLower = new Map<string, StoredAccount>();
const accountsByToken = new Map<string, StoredAccount>();

function loadAccountsFromDisk() {
  try {
    if (!fs.existsSync(ACCOUNTS_FILE)) return;
    const raw = fs.readFileSync(ACCOUNTS_FILE, 'utf-8');
    const parsed = JSON.parse(raw) as StoredAccount[];
    if (!Array.isArray(parsed)) return;
    for (const acc of parsed) {
      if (acc && acc.usernameLower && acc.token) {
        accountsByLower.set(acc.usernameLower, acc);
        accountsByToken.set(acc.token, acc);
      }
    }
  } catch (err) {
    console.warn('Could not load saved accounts:', err);
  }
}

function persistAccountsToDisk() {
  try {
    fs.mkdirSync(DATA_DIR, { recursive: true });
    fs.writeFileSync(
      ACCOUNTS_FILE,
      JSON.stringify(Array.from(accountsByLower.values()), null, 2),
      'utf-8'
    );
  } catch (err) {
    console.warn('Could not persist accounts:', err);
  }
}

function hashPassword(password: string, salt: string): string {
  return crypto.scryptSync(password, salt, 64).toString('hex');
}

function verifyPassword(password: string, salt: string, storedHex: string): boolean {
  const derived = crypto.scryptSync(password, salt, 64);
  const target = Buffer.from(storedHex, 'hex');
  if (derived.length !== target.length) return false;
  return crypto.timingSafeEqual(derived, target);
}

loadAccountsFromDisk();

// Authoritative Server State
const players = new Map<string, OnlineMobster>();
const playerSockets = new Map<string, Set<WebSocket>>();
const socketToPlayerId = new Map<WebSocket, string>();
const lastCoopActionAt = new Map<string, number>();

let challenges: PvpChallenge[] = [];
let coopRooms: CoopMissionRoom[] = [];
let chatMessages: MpChatMessage[] = [
  {
    id: 'chat-welcome',
    senderId: 'system',
    senderName: 'Harbor Dispatch',
    familyId: 'gambino',
    channel: 'city',
    text: 'Welcome to Don BroJim Multiplayer. Form a Co-op Crew or challenge rival mobsters to a PvP showdown.',
    timestamp: Date.now(),
  },
];

const turfShares: Record<string, number> = {
  gambino: 24,
  corleone: 21,
  genovese: 18,
  salvatore: 14,
  palermo: 12,
  padrino: 11,
};

let feed: Array<{
  id: string;
  text: string;
  timestamp: number;
  kind: 'pvp' | 'coop' | 'turf' | 'system';
}> = [];

function pushFeed(text: string, kind: 'pvp' | 'coop' | 'turf' | 'system') {
  feed = [
    {
      id: `fd-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      text,
      timestamp: Date.now(),
      kind,
    },
    ...feed,
  ].slice(0, 25);
}

function sendJson(ws: WebSocket, payload: unknown) {
  if (ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify(payload));
  }
}

function sendToPlayer(playerId: string, payload: unknown) {
  const sockets = playerSockets.get(playerId);
  if (!sockets) return;
  for (const ws of sockets) {
    sendJson(ws, payload);
  }
}

function getSnapshotPayload() {
  return {
    type: 'state:sync',
    players: Array.from(players.values()).sort((a, b) => {
      if (a.online !== b.online) return a.online ? -1 : 1;
      return b.respect - a.respect;
    }),
    challenges: challenges.slice(0, 20),
    coopRooms: coopRooms.slice(0, 20),
    chat: chatMessages.slice(-45),
    turfShares: { ...turfShares },
    feed: feed.slice(0, 20),
  };
}

function broadcastState(wss: WebSocketServer) {
  const raw = JSON.stringify(getSnapshotPayload());
  for (const client of wss.clients) {
    if (client.readyState === WebSocket.OPEN) {
      client.send(raw);
    }
  }
}

function stanceMultiplier(atkStance: PvpStance, defStance: PvpStance): number {
  if (atkStance === 'aggressive' && defStance === 'balanced') return 1.15;
  if (atkStance === 'balanced' && defStance === 'defensive') return 1.15;
  if (atkStance === 'defensive' && defStance === 'aggressive') return 1.15;
  if (atkStance === defStance) return 1.0;
  return 0.9;
}

function computeMobsterPower(m: OnlineMobster): number {
  return 25 + m.attack * 1.45 + m.defense * 1.1 + m.respect * 0.08 + m.maxVitality * 0.06;
}

function resolvePvpDuel(
  challenger: OnlineMobster,
  target: OnlineMobster,
  challengerStance: PvpStance,
  targetStance: PvpStance,
  wager: number
): {
  winner: OnlineMobster;
  loser: OnlineMobster;
  rounds: string[];
  summary: string;
} {
  const cMult = stanceMultiplier(challengerStance, targetStance);
  const tMult = stanceMultiplier(targetStance, challengerStance);

  const cBase = computeMobsterPower(challenger) * cMult;
  const tBase = computeMobsterPower(target) * tMult;

  let cScore = 0;
  let tScore = 0;
  const rounds: string[] = [];

  for (let r = 1; r <= 3; r++) {
    const cRoll = Math.round(cBase * (0.82 + Math.random() * 0.36));
    const tRoll = Math.round(tBase * (0.82 + Math.random() * 0.36));
    if (cRoll >= tRoll) {
      cScore += 1;
      rounds.push(`Round ${r}: ${challenger.name} (${challengerStance}) outgunned ${target.name} (${cRoll} vs ${tRoll})`);
    } else {
      tScore += 1;
      rounds.push(`Round ${r}: ${target.name} (${targetStance}) countered ${challenger.name} (${tRoll} vs ${cRoll})`);
    }
  }

  const winner = cScore >= tScore ? challenger : target;
  const loser = winner.id === challenger.id ? target : challenger;
  const summary = `${winner.name} defeated ${loser.name} (${Math.max(cScore, tScore)}–${Math.min(
    cScore,
    tScore
  )}) and won $${wager.toFixed(2).replace('.', ',')}!`;

  return { winner, loser, rounds, summary };
}

async function startServer() {
  const app = express();
  app.use(express.json());

  app.get('/api/health', (_req, res) => {
    res.json({
      ok: true,
      onlinePlayers: Array.from(players.values()).filter((p) => p.online).length,
      activeCoopRooms: coopRooms.filter((r) => r.status === 'recruiting' || r.status === 'active').length,
      registeredAccounts: accountsByLower.size,
    });
  });

  app.post('/api/auth/register', (req, res) => {
    const rawUser = String(req.body?.username ?? '').trim();
    const rawPass = String(req.body?.password ?? '');
    const rawFamily = String(req.body?.familyId ?? 'gambino').trim().toLowerCase();

    if (rawUser.length < 3 || rawUser.length > 20) {
      res.status(400).json({ error: 'Mobster name must be 3 to 20 characters.' });
      return;
    }
    if (!/^[a-zA-Z0-9_.-]+$/.test(rawUser)) {
      res.status(400).json({ error: 'Use only letters, numbers, underscores, dots, or hyphens in your mobster name.' });
      return;
    }
    if (rawPass.length < 4) {
      res.status(400).json({ error: 'Password must be at least 4 characters.' });
      return;
    }

    const lower = rawUser.toLowerCase();
    if (accountsByLower.has(lower)) {
      res.status(409).json({ error: `The name "${rawUser}" is already taken. Sign in or pick another name.` });
      return;
    }

    const validFamilies = ['gambino', 'corleone', 'genovese', 'salvatore', 'palermo', 'padrino'];
    const familyId = validFamilies.includes(rawFamily) ? rawFamily : 'gambino';
    const salt = crypto.randomBytes(16).toString('hex');
    const passwordHash = hashPassword(rawPass, salt);
    const token = crypto.randomBytes(24).toString('hex');
    const id = `acc-${crypto.randomBytes(6).toString('hex')}`;

    const account: StoredAccount = {
      id,
      username: rawUser,
      usernameLower: lower,
      salt,
      passwordHash,
      token,
      familyId,
      createdAt: Date.now(),
    };

    accountsByLower.set(lower, account);
    accountsByToken.set(token, account);
    persistAccountsToDisk();

    res.status(201).json({
      token,
      account: {
        id: account.id,
        username: account.username,
        familyId: account.familyId,
        profile: account.profile ?? null,
      },
    });
  });

  app.post('/api/auth/login', (req, res) => {
    const rawUser = String(req.body?.username ?? '').trim();
    const rawPass = String(req.body?.password ?? '');
    if (!rawUser || !rawPass) {
      res.status(400).json({ error: 'Enter both your mobster name and password.' });
      return;
    }

    const account = accountsByLower.get(rawUser.toLowerCase());
    if (!account || !verifyPassword(rawPass, account.salt, account.passwordHash)) {
      res.status(401).json({ error: 'Invalid mobster name or password.' });
      return;
    }

    res.json({
      token: account.token,
      account: {
        id: account.id,
        username: account.username,
        familyId: account.familyId,
        profile: account.profile ?? null,
      },
    });
  });

  app.get('/api/auth/me', (req, res) => {
    const authHeader = String(req.headers.authorization ?? '');
    const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7).trim() : '';
    const account = token ? accountsByToken.get(token) : undefined;
    if (!account) {
      res.status(401).json({ error: 'Not signed in.' });
      return;
    }
    res.json({
      account: {
        id: account.id,
        username: account.username,
        familyId: account.familyId,
        profile: account.profile ?? null,
      },
    });
  });

  app.post('/api/auth/save', (req, res) => {
    const authHeader = String(req.headers.authorization ?? '');
    const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7).trim() : '';
    const account = token ? accountsByToken.get(token) : undefined;
    if (!account) {
      res.status(401).json({ error: 'Session expired.' });
      return;
    }
    if (req.body?.profile && typeof req.body.profile === 'object') {
      account.profile = req.body.profile as Partial<PlayerProfile>;
      if (typeof account.profile.familyId === 'string') {
        account.familyId = account.profile.familyId;
      }
      persistAccountsToDisk();
    }
    res.json({ ok: true });
  });

  const server = http.createServer(app);
  const wss = new WebSocketServer({ noServer: true });

  server.on('upgrade', (request, socket, head) => {
    const reqUrl = new URL(request.url || '/', `http://${request.headers.host || 'localhost'}`);
    if (reqUrl.pathname === '/ws') {
      wss.handleUpgrade(request, socket, head, (ws) => {
        wss.emit('connection', ws, request);
      });
    }
  });

  wss.on('connection', (ws) => {
    sendJson(ws, getSnapshotPayload());

    ws.on('message', (rawBuf) => {
      let msg: Record<string, unknown>;
      try {
        msg = JSON.parse(rawBuf.toString());
      } catch {
        return;
      }

      const type = String(msg.type || '');

      if (type === 'hello' || type === 'profile:update') {
        const p = msg.player as Partial<OnlineMobster> | undefined;
        if (!p || !p.id) return;
        const pid = String(p.id).slice(0, 64);

        const prevPlayer = players.get(pid);
        const updated: OnlineMobster = {
          id: pid,
          name: String(p.name || prevPlayer?.name || 'Mobster').slice(0, 24),
          familyId: String(p.familyId || prevPlayer?.familyId || 'gambino'),
          role: (p.role || prevPlayer?.role || 'Member') as OnlineMobster['role'],
          respect: Number(p.respect ?? prevPlayer?.respect ?? 100),
          attack: Number(p.attack ?? prevPlayer?.attack ?? 0),
          defense: Number(p.defense ?? prevPlayer?.defense ?? 25),
          vitality: Number(p.vitality ?? prevPlayer?.vitality ?? 350),
          maxVitality: Number(p.maxVitality ?? prevPlayer?.maxVitality ?? 350),
          kills: Number(p.kills ?? prevPlayer?.kills ?? 0),
          cash: Number(p.cash ?? prevPlayer?.cash ?? 500),
          status: (p.status || prevPlayer?.status || 'Idle') as OnlineMobster['status'],
          online: true,
          lastSeenAt: Date.now(),
        };

        const wasOffline = !prevPlayer || !prevPlayer.online;
        players.set(pid, updated);

        socketToPlayerId.set(ws, pid);
        if (!playerSockets.has(pid)) {
          playerSockets.set(pid, new Set());
        }
        playerSockets.get(pid)!.add(ws);

        if (type === 'hello' && wasOffline) {
          pushFeed(`${updated.name} (${updated.familyId.toUpperCase()}) entered Harbor Town.`, 'system');
        }
        broadcastState(wss);
        return;
      }

      const senderId = socketToPlayerId.get(ws);
      if (!senderId) return;
      const sender = players.get(senderId);
      if (!sender) return;

      if (type === 'chat:send') {
        const text = String(msg.text || '').trim().slice(0, 240);
        const channel = msg.channel === 'family' ? 'family' : 'city';
        if (!text) return;

        const entry: MpChatMessage = {
          id: `chat-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          senderId: sender.id,
          senderName: sender.name,
          familyId: sender.familyId,
          channel,
          text,
          timestamp: Date.now(),
        };
        chatMessages = [...chatMessages, entry].slice(-80);
        broadcastState(wss);
        return;
      }

      if (type === 'pvp:challenge') {
        const targetId = String(msg.targetId || '');
        const wager = Math.max(10, Math.min(5000, Math.round(Number(msg.wager) || 50)));
        const stance = (['aggressive', 'balanced', 'defensive'].includes(String(msg.stance))
          ? msg.stance
          : 'balanced') as PvpStance;

        const target = players.get(targetId);
        if (!target || !target.online || target.id === sender.id) {
          sendJson(ws, { type: 'toast', message: 'Target mobster is currently offline.' });
          return;
        }
        if (sender.cash < wager) {
          sendJson(ws, { type: 'toast', message: `You need $${wager} cash to post that PvP wager.` });
          return;
        }

        const existingPending = challenges.find(
          (c) =>
            c.status === 'pending' &&
            c.challengerId === sender.id &&
            c.targetId === target.id
        );
        if (existingPending) {
          sendJson(ws, { type: 'toast', message: `Challenge already pending for ${target.name}.` });
          return;
        }

        const challenge: PvpChallenge = {
          id: `pvp-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          challengerId: sender.id,
          challengerName: sender.name,
          challengerFamilyId: sender.familyId,
          targetId: target.id,
          targetName: target.name,
          targetFamilyId: target.familyId,
          wager,
          challengerStance: stance,
          status: 'pending',
          createdAt: Date.now(),
        };
        challenges = [challenge, ...challenges].slice(0, 30);
        sendToPlayer(target.id, {
          type: 'toast',
          message: `${sender.name} challenged you to a $${wager} PvP showdown! Open Multiplayer → PvP.`,
        });
        broadcastState(wss);
        return;
      }

      if (type === 'pvp:respond') {
        const challengeId = String(msg.challengeId || '');
        const accept = Boolean(msg.accept);
        const targetStance = (['aggressive', 'balanced', 'defensive'].includes(String(msg.stance))
          ? msg.stance
          : 'balanced') as PvpStance;

        const ch = challenges.find((c) => c.id === challengeId && c.status === 'pending');
        if (!ch || ch.targetId !== sender.id) return;

        if (!accept) {
          challenges = challenges.map((c) =>
            c.id === challengeId ? { ...c, status: 'declined' } : c
          );
          sendToPlayer(ch.challengerId, {
            type: 'toast',
            message: `${sender.name} declined your PvP challenge.`,
          });
          broadcastState(wss);
          return;
        }

        const challenger = players.get(ch.challengerId);
        const target = players.get(ch.targetId);
        if (!challenger || !target) return;

        const actualWager = Math.min(ch.wager, Math.max(0, Math.floor(challenger.cash)), Math.max(0, Math.floor(target.cash)));
        const outcome = resolvePvpDuel(challenger, target, ch.challengerStance, targetStance, actualWager);

        // Update server player snapshots
        const winRespGain = 22;
        const loseDamage = 45;
        players.set(outcome.winner.id, {
          ...outcome.winner,
          cash: Number((outcome.winner.cash + actualWager).toFixed(2)),
          respect: outcome.winner.respect + winRespGain,
          kills: outcome.winner.kills + 1,
        });
        players.set(outcome.loser.id, {
          ...outcome.loser,
          cash: Number(Math.max(0, outcome.loser.cash - actualWager).toFixed(2)),
          vitality: Math.max(20, outcome.loser.vitality - loseDamage),
        });

        challenges = challenges.map((c) =>
          c.id === challengeId
            ? {
                ...c,
                status: 'completed',
                winnerId: outcome.winner.id,
                winnerName: outcome.winner.name,
                summary: outcome.summary,
                rounds: outcome.rounds,
              }
            : c
        );

        pushFeed(outcome.summary, 'pvp');

        sendToPlayer(outcome.winner.id, {
          type: 'reward:grant',
          cashDelta: actualWager,
          respectDelta: winRespGain,
          killsDelta: 1,
          vitalityDelta: 0,
          message: `PvP Victory! ${outcome.summary} (+${winRespGain} Respect)`,
        });
        sendToPlayer(outcome.loser.id, {
          type: 'reward:grant',
          cashDelta: -actualWager,
          respectDelta: 3,
          killsDelta: 0,
          vitalityDelta: -loseDamage,
          message: `PvP Defeat vs ${outcome.winner.name}: Lost $${actualWager} & -${loseDamage} HP (+3 Respect for standing ground).`,
        });

        broadcastState(wss);
        return;
      }

      if (type === 'coop:create') {
        const templateId = String(msg.templateId || 'dock_fleet');
        const crewRole = (['Enforcer', 'Safecracker', 'Wheelman', 'Lookout'].includes(String(msg.crewRole))
          ? msg.crewRole
          : 'Enforcer') as CoopCrewRole;
        const tpl =
          COOP_MISSION_TEMPLATES.find((t) => t.id === templateId) ?? COOP_MISSION_TEMPLATES[0];

        const room: CoopMissionRoom = {
          id: `coop-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          templateId: tpl.id,
          title: tpl.title,
          description: tpl.description,
          leaderId: sender.id,
          leaderName: sender.name,
          difficulty: tpl.difficulty,
          minPlayers: tpl.minPlayers,
          maxPlayers: tpl.maxPlayers,
          rewardCashPerPlayer: tpl.rewardCashPerPlayer,
          rewardRespectPerPlayer: tpl.rewardRespectPerPlayer,
          targetProgress: tpl.targetProgress,
          progress: 0,
          status: 'recruiting',
          startedAt: null,
          endsAt: null,
          members: [
            {
              playerId: sender.id,
              name: sender.name,
              familyId: sender.familyId,
              crewRole,
              power: Math.round(computeMobsterPower(sender)),
              ready: true,
              contributions: 0,
            },
          ],
          actionLog: [`${sender.name} opened Co-op Lobby: ${tpl.title}.`],
        };
        coopRooms = [room, ...coopRooms].slice(0, 20);
        pushFeed(`${sender.name} is recruiting for Co-op Mission: ${tpl.title}.`, 'coop');
        broadcastState(wss);
        return;
      }

      if (type === 'coop:join') {
        const roomId = String(msg.roomId || '');
        const crewRole = (['Enforcer', 'Safecracker', 'Wheelman', 'Lookout'].includes(String(msg.crewRole))
          ? msg.crewRole
          : 'Safecracker') as CoopCrewRole;
        const room = coopRooms.find((r) => r.id === roomId && r.status === 'recruiting');
        if (!room) return;

        const existing = room.members.find((m) => m.playerId === sender.id);
        if (existing) {
          existing.crewRole = crewRole;
          broadcastState(wss);
          return;
        }
        if (room.members.length >= room.maxPlayers) {
          sendJson(ws, { type: 'toast', message: 'This Co-op crew is already full.' });
          return;
        }

        room.members.push({
          playerId: sender.id,
          name: sender.name,
          familyId: sender.familyId,
          crewRole,
          power: Math.round(computeMobsterPower(sender)),
          ready: true,
          contributions: 0,
        });
        room.actionLog = [`${sender.name} joined as ${crewRole}.`, ...room.actionLog].slice(0, 12);
        broadcastState(wss);
        return;
      }

      if (type === 'coop:leave') {
        const roomId = String(msg.roomId || '');
        const room = coopRooms.find((r) => r.id === roomId);
        if (!room) return;
        room.members = room.members.filter((m) => m.playerId !== sender.id);
        if (room.members.length === 0) {
          coopRooms = coopRooms.filter((r) => r.id !== roomId);
        } else {
          if (room.leaderId === sender.id) {
            room.leaderId = room.members[0].playerId;
            room.leaderName = room.members[0].name;
          }
          room.actionLog = [`${sender.name} left the crew.`, ...room.actionLog].slice(0, 12);
        }
        broadcastState(wss);
        return;
      }

      if (type === 'coop:ready') {
        const roomId = String(msg.roomId || '');
        const room = coopRooms.find((r) => r.id === roomId && r.status === 'recruiting');
        if (!room) return;
        const slot = room.members.find((m) => m.playerId === sender.id);
        if (!slot) return;
        slot.ready = !slot.ready;
        broadcastState(wss);
        return;
      }

      if (type === 'coop:launch') {
        const roomId = String(msg.roomId || '');
        const room = coopRooms.find((r) => r.id === roomId && r.status === 'recruiting');
        if (!room || room.leaderId !== sender.id) return;
        if (room.members.length < room.minPlayers) {
          sendJson(ws, {
            type: 'toast',
            message: `Need at least ${room.minPlayers} crew members to launch ${room.title}.`,
          });
          return;
        }
        const tpl =
          COOP_MISSION_TEMPLATES.find((t) => t.id === room.templateId) ?? COOP_MISSION_TEMPLATES[0];
        const hasWheelman = room.members.some((m) => m.crewRole === 'Wheelman');
        const duration = tpl.durationMs + (hasWheelman ? 10_000 : 0);

        room.status = 'active';
        room.startedAt = Date.now();
        room.endsAt = Date.now() + duration;
        room.progress = 0;
        room.actionLog = [
          `OPERATION LIVE! Crew deployed (${room.members.length} mobsters). Hammer crew actions before the timer hits 00:00!`,
          ...room.actionLog,
        ].slice(0, 12);

        for (const m of room.members) {
          sendToPlayer(m.playerId, {
            type: 'toast',
            message: `Co-op Operation Started: ${room.title}!`,
          });
        }
        broadcastState(wss);
        return;
      }

      if (type === 'coop:action') {
        const roomId = String(msg.roomId || '');
        const room = coopRooms.find((r) => r.id === roomId && r.status === 'active');
        if (!room) return;
        const slot = room.members.find((m) => m.playerId === sender.id);
        if (!slot) return;

        const now = Date.now();
        const throttleKey = `${roomId}:${sender.id}`;
        const prevAct = lastCoopActionAt.get(throttleKey) ?? 0;
        if (now - prevAct < 550) return;
        lastCoopActionAt.set(throttleKey, now);

        const baseGain = 9 + Math.floor(sender.attack * 0.14 + sender.defense * 0.08);
        const roleMult =
          slot.crewRole === 'Safecracker'
            ? 1.3
            : slot.crewRole === 'Enforcer'
            ? 1.22
            : 1.1;
        const gain = Math.round(baseGain * roleMult);

        slot.contributions += 1;
        room.progress = Math.min(room.targetProgress, room.progress + gain);
        room.actionLog = [
          `${sender.name} (${slot.crewRole}) pushed +${gain} progress!`,
          ...room.actionLog,
        ].slice(0, 12);

        if (room.progress >= room.targetProgress) {
          room.status = 'completed';
          const hasLookout = room.members.some((m) => m.crewRole === 'Lookout');
          const cashMult = hasLookout ? 1.15 : 1;
          const cashEach = Math.round(room.rewardCashPerPlayer * cashMult);
          const respEach = room.rewardRespectPerPlayer;

          room.actionLog = [
            `SUCCESS! Vault cleared — every crewmate earned $${cashEach} Cash and +${respEach} Respect!`,
            ...room.actionLog,
          ].slice(0, 12);

          pushFeed(
            `Co-op Heist Complete: ${room.members.map((m) => m.name).join(', ')} pulled off ${room.title} ($${cashEach} each)!`,
            'coop'
          );

          for (const m of room.members) {
            const pRec = players.get(m.playerId);
            if (pRec) {
              players.set(m.playerId, {
                ...pRec,
                cash: Number((pRec.cash + cashEach).toFixed(2)),
                respect: pRec.respect + respEach,
              });
            }
            sendToPlayer(m.playerId, {
              type: 'reward:grant',
              cashDelta: cashEach,
              respectDelta: respEach,
              killsDelta: 0,
              vitalityDelta: 0,
              message: `Co-op Victory (${room.title}): Earned $${cashEach} Cash and +${respEach} Respect!`,
            });
          }
        }

        broadcastState(wss);
        return;
      }

      if (type === 'turf:raid') {
        const targetFamilyId = String(msg.targetFamilyId || '');
        if (!targetFamilyId || targetFamilyId === sender.familyId) return;
        if (!(targetFamilyId in turfShares) || !(sender.familyId in turfShares)) return;
        if (turfShares[targetFamilyId] <= 4) {
          sendJson(ws, { type: 'toast', message: `${targetFamilyId.toUpperCase()} turf is already at minimum defense.` });
          return;
        }

        turfShares[targetFamilyId] -= 1;
        turfShares[sender.familyId] += 1;

        const cashGain = 75;
        const respGain = 14;
        players.set(sender.id, {
          ...sender,
          cash: Number((sender.cash + cashGain).toFixed(2)),
          respect: sender.respect + respGain,
        });
        sendToPlayer(sender.id, {
          type: 'reward:grant',
          cashDelta: cashGain,
          respectDelta: respGain,
          killsDelta: 0,
          vitalityDelta: 0,
          message: `Syndicate Turf Raid: Captured +1% harbor turf from ${targetFamilyId.toUpperCase()} (+$${cashGain}, +${respGain} Respect).`,
        });
        pushFeed(
          `${sender.name} seized 1% turf from ${targetFamilyId.toUpperCase()} for ${sender.familyId.toUpperCase()}!`,
          'turf'
        );
        broadcastState(wss);
      }
    });

    ws.on('close', () => {
      const pid = socketToPlayerId.get(ws);
      socketToPlayerId.delete(ws);
      if (!pid) return;
      const set = playerSockets.get(pid);
      if (set) {
        set.delete(ws);
        if (set.size === 0) {
          playerSockets.delete(pid);
          const rec = players.get(pid);
          if (rec) {
            players.set(pid, { ...rec, online: false, lastSeenAt: Date.now() });
            broadcastState(wss);
          }
        }
      }
    });
  });

  // 1-second server loop for Co-op mission timers & cleanup
  setInterval(() => {
    const now = Date.now();
    let changed = false;

    for (const room of coopRooms) {
      if (room.status === 'active' && room.endsAt && now >= room.endsAt) {
        room.status = 'failed';
        room.actionLog = ['TIME EXPIRED — Police patrols locked down the block.', ...room.actionLog].slice(0, 12);
        pushFeed(`Co-op Mission Failed: Crew ran out of time on ${room.title}.`, 'coop');
        changed = true;
      }
    }

    // Remove offline players older than 5 minutes
    for (const [id, rec] of players.entries()) {
      if (!rec.online && now - rec.lastSeenAt > 5 * 60 * 1000) {
        players.delete(id);
        changed = true;
      }
    }

    if (changed) {
      broadcastState(wss);
    }
  }, 1000);

  if (IS_PROD) {
    const distDir = path.resolve(__dirname, 'dist');
    app.use(express.static(distDir));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distDir, 'index.html'));
    });
  } else {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        ws: { server, path: '/vite-ws' },
        hmr: process.env.DISABLE_HMR === 'true' ? false : { server, path: '/vite-ws' },
      },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  }

  server.listen(PORT, '0.0.0.0', () => {
    console.log(`Don BroJim Multiplayer Server listening on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start Don BroJim server:', err);
  process.exit(1);
});
