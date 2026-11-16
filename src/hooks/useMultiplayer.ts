import { useCallback, useEffect, useRef, useState } from 'react';
import type {
  CoopCrewRole,
  MultiplayerSnapshot,
  PlayerProfile,
  PvpStance,
} from '../types/game';

const SESSION_PLAYER_ID_KEY = 'don_brojim_mp_session_id';

function getSessionPlayerId(): string {
  try {
    const existing = sessionStorage.getItem(SESSION_PLAYER_ID_KEY);
    if (existing) return existing;
    const created = `mob-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
    sessionStorage.setItem(SESSION_PLAYER_ID_KEY, created);
    return created;
  } catch {
    return `mob-${Math.random().toString(36).slice(2, 9)}`;
  }
}

export interface RewardGrantEvent {
  cashDelta: number;
  respectDelta: number;
  killsDelta: number;
  vitalityDelta: number;
  message: string;
}

export function useMultiplayer(
  player: PlayerProfile,
  onRewardGrant: (grant: RewardGrantEvent) => void,
  onToast: (message: string) => void,
  authenticatedId?: string | null
) {
  const [sessionId] = useState<string>(() => getSessionPlayerId());
  const selfId = authenticatedId || sessionId;
  const [snapshot, setSnapshot] = useState<MultiplayerSnapshot>({
    connected: false,
    selfId,
    players: [],
    challenges: [],
    coopRooms: [],
    chat: [],
    turfShares: {
      gambino: 24,
      corleone: 21,
      genovese: 18,
      salvatore: 14,
      palermo: 12,
      padrino: 11,
    },
    feed: [],
  });

  const wsRef = useRef<WebSocket | null>(null);
  const playerRef = useRef(player);
  playerRef.current = player;

  const rewardCbRef = useRef(onRewardGrant);
  rewardCbRef.current = onRewardGrant;

  const toastCbRef = useRef(onToast);
  toastCbRef.current = onToast;

  const sendRaw = useCallback((payload: Record<string, unknown>) => {
    const ws = wsRef.current;
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(payload));
    }
  }, []);

  const buildProfilePayload = useCallback(
    (p: PlayerProfile) => ({
      id: selfId,
      name: p.name,
      familyId: p.familyId,
      role: p.role,
      respect: p.respect,
      attack: p.attack,
      defense: p.defense,
      vitality: p.vitality,
      maxVitality: p.maxVitality,
      kills: p.kills,
      cash: p.cash,
      status: p.status,
    }),
    [selfId]
  );

  // Establish WebSocket connection with automatic reconnect
  useEffect(() => {
    let closedByCleanup = false;
    let reconnectTimer: number | null = null;
    let retryDelay = 1000;

    const connect = () => {
      if (closedByCleanup) return;
      const proto = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const url = `${proto}//${window.location.host}/ws`;
      const ws = new WebSocket(url);
      wsRef.current = ws;

      ws.onopen = () => {
        retryDelay = 1000;
        setSnapshot((prev) => ({ ...prev, connected: true }));
        ws.send(
          JSON.stringify({
            type: 'hello',
            player: buildProfilePayload(playerRef.current),
          })
        );
      };

      ws.onmessage = (evt) => {
        let data: Record<string, unknown>;
        try {
          data = JSON.parse(String(evt.data));
        } catch {
          return;
        }

        if (data.type === 'state:sync') {
          setSnapshot((prev) => ({
            ...prev,
            connected: true,
            selfId,
            players: Array.isArray(data.players) ? (data.players as MultiplayerSnapshot['players']) : prev.players,
            challenges: Array.isArray(data.challenges)
              ? (data.challenges as MultiplayerSnapshot['challenges'])
              : prev.challenges,
            coopRooms: Array.isArray(data.coopRooms)
              ? (data.coopRooms as MultiplayerSnapshot['coopRooms'])
              : prev.coopRooms,
            chat: Array.isArray(data.chat) ? (data.chat as MultiplayerSnapshot['chat']) : prev.chat,
            turfShares:
              data.turfShares && typeof data.turfShares === 'object'
                ? (data.turfShares as Record<string, number>)
                : prev.turfShares,
            feed: Array.isArray(data.feed) ? (data.feed as MultiplayerSnapshot['feed']) : prev.feed,
          }));
        } else if (data.type === 'reward:grant') {
          rewardCbRef.current({
            cashDelta: Number(data.cashDelta ?? 0),
            respectDelta: Number(data.respectDelta ?? 0),
            killsDelta: Number(data.killsDelta ?? 0),
            vitalityDelta: Number(data.vitalityDelta ?? 0),
            message: String(data.message ?? ''),
          });
        } else if (data.type === 'toast') {
          const msg = String(data.message ?? '');
          if (msg) toastCbRef.current(msg);
        }
      };

      ws.onclose = () => {
        setSnapshot((prev) => ({ ...prev, connected: false }));
        if (!closedByCleanup) {
          reconnectTimer = window.setTimeout(connect, retryDelay);
          retryDelay = Math.min(8000, retryDelay * 1.5);
        }
      };

      ws.onerror = () => {
        ws.close();
      };
    };

    connect();

    return () => {
      closedByCleanup = true;
      if (reconnectTimer !== null) window.clearTimeout(reconnectTimer);
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
    };
  }, [buildProfilePayload, selfId]);

  // Sync live player stats whenever local profile or authenticated selfId changes
  useEffect(() => {
    setSnapshot((prev) => (prev.selfId === selfId ? prev : { ...prev, selfId }));
    sendRaw({
      type: 'hello',
      player: buildProfilePayload(player),
    });
  }, [
    selfId,
    buildProfilePayload,
    player,
    player.name,
    player.familyId,
    player.role,
    player.respect,
    player.attack,
    player.defense,
    player.vitality,
    player.maxVitality,
    player.kills,
    player.cash,
    player.status,
    sendRaw,
  ]);

  const sendChat = useCallback(
    (text: string, channel: 'city' | 'family') => {
      sendRaw({ type: 'chat:send', text, channel });
    },
    [sendRaw]
  );

  const challengePvp = useCallback(
    (targetId: string, wager: number, stance: PvpStance) => {
      sendRaw({ type: 'pvp:challenge', targetId, wager, stance });
    },
    [sendRaw]
  );

  const respondPvp = useCallback(
    (challengeId: string, accept: boolean, stance: PvpStance) => {
      sendRaw({ type: 'pvp:respond', challengeId, accept, stance });
    },
    [sendRaw]
  );

  const createCoopRoom = useCallback(
    (templateId: string, crewRole: CoopCrewRole) => {
      sendRaw({ type: 'coop:create', templateId, crewRole });
    },
    [sendRaw]
  );

  const joinCoopRoom = useCallback(
    (roomId: string, crewRole: CoopCrewRole) => {
      sendRaw({ type: 'coop:join', roomId, crewRole });
    },
    [sendRaw]
  );

  const leaveCoopRoom = useCallback(
    (roomId: string) => {
      sendRaw({ type: 'coop:leave', roomId });
    },
    [sendRaw]
  );

  const toggleCoopReady = useCallback(
    (roomId: string) => {
      sendRaw({ type: 'coop:ready', roomId });
    },
    [sendRaw]
  );

  const launchCoopRoom = useCallback(
    (roomId: string) => {
      sendRaw({ type: 'coop:launch', roomId });
    },
    [sendRaw]
  );

  const performCoopAction = useCallback(
    (roomId: string) => {
      sendRaw({ type: 'coop:action', roomId });
    },
    [sendRaw]
  );

  const raidMultiplayerTurf = useCallback(
    (targetFamilyId: string) => {
      sendRaw({ type: 'turf:raid', targetFamilyId });
    },
    [sendRaw]
  );

  return {
    snapshot,
    sendChat,
    challengePvp,
    respondPvp,
    createCoopRoom,
    joinCoopRoom,
    leaveCoopRoom,
    toggleCoopReady,
    launchCoopRoom,
    performCoopAction,
    raidMultiplayerTurf,
  };
}
