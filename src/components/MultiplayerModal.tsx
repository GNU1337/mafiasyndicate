import React, { useMemo, useState } from 'react';
import { COOP_MISSION_TEMPLATES, CREW_ROLES } from '../data/coopMissions';
import { formatCash, formatCountdown } from '../data/initialGameState';
import type {
  CoopCrewRole,
  CrimeFamily,
  MultiplayerSnapshot,
  PlayerProfile,
  PvpStance,
} from '../types/game';
import { sound } from '../utils/sound';

interface MultiplayerModalProps {
  snapshot: MultiplayerSnapshot;
  player: PlayerProfile;
  families: CrimeFamily[];
  nowMs: number;
  initialTab?: MpTab;
  onClose: () => void;
  onSendChat: (text: string, channel: 'city' | 'family') => void;
  onChallengePvp: (targetId: string, wager: number, stance: PvpStance) => void;
  onRespondPvp: (challengeId: string, accept: boolean, stance: PvpStance) => void;
  onCreateCoop: (templateId: string, crewRole: CoopCrewRole) => void;
  onJoinCoop: (roomId: string, crewRole: CoopCrewRole) => void;
  onLeaveCoop: (roomId: string) => void;
  onToggleCoopReady: (roomId: string) => void;
  onLaunchCoop: (roomId: string) => void;
  onPerformCoopAction: (roomId: string) => void;
  onRaidTurf: (targetFamilyId: string) => void;
  onShowToast: (msg: string) => void;
  onOpenAuth: () => void;
  isSignedIn: boolean;
}

export type MpTab = 'coop' | 'pvp' | 'turf' | 'chat';

export const MultiplayerModal: React.FC<MultiplayerModalProps> = ({
  snapshot,
  player,
  families,
  nowMs,
  initialTab = 'coop',
  onClose,
  onSendChat,
  onChallengePvp,
  onRespondPvp,
  onCreateCoop,
  onJoinCoop,
  onLeaveCoop,
  onToggleCoopReady,
  onLaunchCoop,
  onPerformCoopAction,
  onRaidTurf,
  onShowToast,
  onOpenAuth,
  isSignedIn,
}) => {
  const [activeTab, setActiveTab] = useState<MpTab>(initialTab);
  const [selectedCrewRole, setSelectedCrewRole] = useState<CoopCrewRole>('Enforcer');
  const [pvpWager, setPvpWager] = useState<string>('75');
  const [pvpStance, setPvpStance] = useState<PvpStance>('balanced');
  const [defenseStance, setDefenseStance] = useState<PvpStance>('balanced');
  const [chatChannel, setChatChannel] = useState<'city' | 'family'>('city');
  const [chatText, setChatText] = useState('');
  const [copiedInvite, setCopiedInvite] = useState(false);

  const onlinePlayers = useMemo(
    () => snapshot.players.filter((p) => p.online),
    [snapshot.players]
  );
  const otherOnlinePlayers = useMemo(
    () => onlinePlayers.filter((p) => p.id !== snapshot.selfId),
    [onlinePlayers, snapshot.selfId]
  );

  const incomingChallenges = useMemo(
    () =>
      snapshot.challenges.filter(
        (c) => c.status === 'pending' && c.targetId === snapshot.selfId
      ),
    [snapshot.challenges, snapshot.selfId]
  );

  const myCoopRoom = useMemo(
    () =>
      snapshot.coopRooms.find((r) =>
        r.members.some((m) => m.playerId === snapshot.selfId)
      ) ?? null,
    [snapshot.coopRooms, snapshot.selfId]
  );

  const openRecruitingRooms = useMemo(
    () =>
      snapshot.coopRooms.filter(
        (r) =>
          r.status === 'recruiting' &&
          !r.members.some((m) => m.playerId === snapshot.selfId)
      ),
    [snapshot.coopRooms, snapshot.selfId]
  );

  const visibleChat = useMemo(
    () =>
      snapshot.chat.filter(
        (m) => m.channel === 'city' || m.familyId === player.familyId
      ),
    [snapshot.chat, player.familyId]
  );

  const shareableInviteUrl = useMemo(() => {
    try {
      const u = new URL(window.location.href);
      if (u.hostname.startsWith('ais-dev-')) {
        u.hostname = u.hostname.replace(/^ais-dev-/, 'ais-pre-');
      }
      u.searchParams.set('invite', 'register');
      return u.toString();
    } catch {
      return window.location.href;
    }
  }, []);

  const handleCopyInvite = async () => {
    sound.playClick();
    try {
      await navigator.clipboard.writeText(shareableInviteUrl);
      setCopiedInvite(true);
      window.setTimeout(() => setCopiedInvite(false), 2400);
    } catch {
      onShowToast(`Send your friend this Shared App link: ${shareableInviteUrl}`);
    }
  };

  return (
    <div
      className="fixed inset-0 z-40 flex items-center justify-center bg-black/65 p-2 sm:p-4"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-[1020px] max-h-[92vh] flex flex-col rounded-2xl bg-[#131110]/98 border-2 border-[#b99142]/75 shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header Bar */}
        <div className="flex flex-wrap items-center justify-between gap-3 px-4 sm:px-6 py-3.5 bg-[#261a12] border-b border-amber-500/25">
          <div className="flex flex-wrap items-center gap-3 sm:gap-4">
            <h2 className="font-display text-2xl sm:text-3xl font-bold text-amber-200 tracking-wide whitespace-nowrap">
              Syndicate Multiplayer
            </h2>
            <div className="flex items-center gap-1 p-1 rounded-lg bg-black/45 border border-white/10 overflow-x-auto">
              {(
                [
                  ['coop', `Co-op Missions (${snapshot.coopRooms.filter((r) => r.status === 'recruiting' || r.status === 'active').length})`],
                  ['pvp', `PvP Showdowns${incomingChallenges.length > 0 ? ` (${incomingChallenges.length}!)` : ''}`],
                  ['turf', `Turf & Mobsters (${onlinePlayers.length})`],
                  ['chat', 'City Chat & Feed'],
                ] as const
              ).map(([tabKey, label]) => (
                <button
                  key={tabKey}
                  type="button"
                  onClick={() => {
                    sound.playClick();
                    setActiveTab(tabKey);
                  }}
                  className={`px-3 py-1.5 rounded-md text-xs font-semibold transition cursor-pointer whitespace-nowrap ${
                    activeTab === tabKey
                      ? 'bg-[#b99142] text-black shadow-sm'
                      : 'text-slate-300 hover:text-white'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <span
              className={`px-2.5 py-1 rounded-md border text-xs font-mono-num font-bold whitespace-nowrap ${
                snapshot.connected
                  ? 'bg-emerald-950/60 border-emerald-500/40 text-emerald-300'
                  : 'bg-red-950/60 border-red-500/40 text-red-300'
              }`}
            >
              {snapshot.connected ? `LIVE · ${onlinePlayers.length} Online` : 'Reconnecting...'}
            </span>
            <button
              type="button"
              onClick={() => {
                sound.playClick();
                onOpenAuth();
              }}
              className="px-3 py-1.5 rounded-lg bg-black/50 border border-white/20 text-xs font-semibold text-white hover:border-amber-400/60 transition cursor-pointer whitespace-nowrap"
            >
              {isSignedIn ? `Account: ${player.name}` : 'Register / Sign In'}
            </button>
            <button
              type="button"
              onClick={handleCopyInvite}
              className="px-3 py-1.5 rounded-lg bg-black/50 border border-amber-400/40 text-xs font-semibold text-amber-200 hover:bg-amber-500/20 transition cursor-pointer whitespace-nowrap"
            >
              {copiedInvite ? 'Shared Link Copied!' : 'Copy Friend Invite Link'}
            </button>
            <button
              type="button"
              onClick={() => {
                sound.playClick();
                onClose();
              }}
              aria-label="Close Multiplayer Hub"
              className="w-10 h-10 flex items-center justify-center text-white text-xl font-bold hover:text-amber-300 cursor-pointer"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Workspace */}
        <div className="flex-1 overflow-y-auto mafia-scroll p-4 sm:p-5 space-y-5">
          {otherOnlinePlayers.length === 0 && (
            <div className="px-4 py-3 rounded-xl bg-amber-950/35 border border-amber-500/30 space-y-2 text-xs text-amber-100">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span>
                  Only <strong>{player.name}</strong> is connected here right now. Send your friend the <strong>Shared App Link</strong> (starting with <code className="text-amber-300">ais-pre-</code>) and ensure Sharing is enabled in AI Studio—never send the private <code className="text-red-300">ais-dev-</code> dev URL, or Google Login will stop them.
                </span>
                <a
                  href={window.location.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-3 py-1.5 rounded-lg bg-[#b99142] text-black font-bold hover:brightness-110 cursor-pointer whitespace-nowrap"
                >
                  Open 2nd Player Tab
                </a>
              </div>
              <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-amber-500/20">
                <span className="text-slate-300">Friend Register Link:</span>
                <code className="flex-1 min-w-[200px] px-2.5 py-1 rounded bg-black/60 text-amber-200 truncate font-mono-num">
                  {shareableInviteUrl}
                </code>
                <button
                  type="button"
                  onClick={handleCopyInvite}
                  className="px-2.5 py-1 rounded bg-white/10 hover:bg-white/20 text-white font-semibold cursor-pointer whitespace-nowrap"
                >
                  {copiedInvite ? 'Copied!' : 'Copy'}
                </button>
              </div>
            </div>
          )}

          {/* CO-OP MISSIONS TAB */}
          {activeTab === 'coop' && (
            <div className="space-y-5">
              {/* Role Selector */}
              <div className="p-3.5 rounded-xl bg-black/40 border border-white/15 flex flex-wrap items-center justify-between gap-3">
                <div className="text-xs text-slate-300">
                  <strong className="text-amber-200">Preferred Crew Role:</strong> Choose your specialty when creating or joining a Mafia Co-op Mission.
                </div>
                <div className="flex flex-wrap items-center gap-1.5">
                  {CREW_ROLES.map((item) => (
                    <button
                      key={item.role}
                      type="button"
                      onClick={() => {
                        sound.playClick();
                        setSelectedCrewRole(item.role);
                      }}
                      title={item.bonusText}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition cursor-pointer ${
                        selectedCrewRole === item.role
                          ? 'bg-[#b99142] border-amber-300 text-black'
                          : 'bg-zinc-900 border-white/15 text-slate-300 hover:text-white'
                      }`}
                    >
                      {item.role}
                    </button>
                  ))}
                </div>
              </div>

              {/* Active / Joined Co-op Room */}
              {myCoopRoom && (
                <div className="p-4 sm:p-5 rounded-xl bg-[#1c1612] border-2 border-amber-400/60 space-y-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-0.5 rounded bg-amber-500/20 border border-amber-400/50 text-[11px] font-bold text-amber-300 uppercase">
                          {myCoopRoom.status}
                        </span>
                        <h3 className="font-display text-2xl font-bold text-white">
                          {myCoopRoom.title}
                        </h3>
                      </div>
                      <p className="text-xs text-slate-300 mt-1">{myCoopRoom.description}</p>
                    </div>
                    <div className="text-right font-mono-num text-xs">
                      <div className="text-emerald-300 font-bold">
                        Payout: ${formatCash(myCoopRoom.rewardCashPerPlayer)} + {myCoopRoom.rewardRespectPerPlayer} Resp / player
                      </div>
                      {myCoopRoom.status === 'active' && myCoopRoom.endsAt && (
                        <div className="text-amber-300 text-base font-bold mt-0.5">
                          Time Left: {formatCountdown(Math.max(0, myCoopRoom.endsAt - nowMs)).slice(3)}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Shared Co-op Progress Bar */}
                  {(myCoopRoom.status === 'active' || myCoopRoom.status === 'completed' || myCoopRoom.status === 'failed') && (
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between text-xs font-mono-num">
                        <span className="text-slate-300">Combined Crew Heist Progress</span>
                        <span className="font-bold text-amber-200">
                          {myCoopRoom.progress} / {myCoopRoom.targetProgress} (
                          {Math.min(100, Math.round((myCoopRoom.progress / myCoopRoom.targetProgress) * 100))}%)
                        </span>
                      </div>
                      <div className="w-full h-3.5 rounded-full bg-black/70 border border-white/15 overflow-hidden">
                        <div
                          className={`h-full transition-all duration-200 ${
                            myCoopRoom.status === 'failed'
                              ? 'bg-red-500'
                              : myCoopRoom.status === 'completed'
                              ? 'bg-emerald-400'
                              : 'bg-gradient-to-r from-amber-500 to-emerald-400'
                          }`}
                          style={{
                            width: `${Math.min(
                              100,
                              Math.round((myCoopRoom.progress / myCoopRoom.targetProgress) * 100)
                            )}%`,
                          }}
                        />
                      </div>
                    </div>
                  )}

                  {/* Crew Slots */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
                    {myCoopRoom.members.map((m) => (
                      <div
                        key={m.playerId}
                        className="p-3 rounded-xl bg-black/45 border border-white/15 space-y-1 text-xs"
                      >
                        <div className="flex items-center justify-between gap-1">
                          <span className="font-bold text-white truncate">
                            {m.name} {m.playerId === snapshot.selfId ? '(You)' : ''}
                          </span>
                          <span
                            className={`font-mono-num font-bold ${
                              m.ready ? 'text-emerald-400' : 'text-amber-300'
                            }`}
                          >
                            {m.ready ? 'READY' : 'WAIT'}
                          </span>
                        </div>
                        <div className="text-amber-300 font-semibold">
                          {m.crewRole} · {m.familyId.toUpperCase()}
                        </div>
                        <div className="text-slate-400 font-mono-num">
                          Power: {m.power} · Actions: {m.contributions}
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Interactive Crew Controls */}
                  <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
                    {myCoopRoom.status === 'recruiting' && (
                      <>
                        <div className="flex flex-wrap items-center gap-2">
                          {myCoopRoom.leaderId === snapshot.selfId && (
                            <button
                              type="button"
                              onClick={() => {
                                sound.playVictory();
                                onLaunchCoop(myCoopRoom.id);
                              }}
                              className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs sm:text-sm cursor-pointer"
                            >
                              Deploy Crew ({myCoopRoom.members.length}/{myCoopRoom.minPlayers}+ Ready)
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => {
                              sound.playClick();
                              onToggleCoopReady(myCoopRoom.id);
                            }}
                            className="px-3.5 py-2.5 rounded-xl bg-zinc-800 border border-white/20 text-white font-bold text-xs hover:bg-zinc-700 cursor-pointer"
                          >
                            Toggle Ready
                          </button>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            sound.playClick();
                            onLeaveCoop(myCoopRoom.id);
                          }}
                          className="px-3.5 py-2 rounded-xl bg-red-900/70 border border-red-400/40 text-white font-bold text-xs hover:bg-red-800 cursor-pointer"
                        >
                          Leave Crew
                        </button>
                      </>
                    )}

                    {myCoopRoom.status === 'active' && (
                      <div className="w-full flex flex-wrap items-center justify-between gap-3">
                        <button
                          type="button"
                          onClick={() => {
                            sound.playClick();
                            onPerformCoopAction(myCoopRoom.id);
                          }}
                          className="flex-1 min-w-[220px] h-12 rounded-xl bg-[#b99142] hover:brightness-110 active:scale-[0.98] text-black font-bold text-sm sm:text-base transition cursor-pointer shadow-lg"
                        >
                          {CREW_ROLES.find(
                            (r) =>
                              r.role ===
                              (myCoopRoom.members.find((m) => m.playerId === snapshot.selfId)?.crewRole ??
                                'Enforcer')
                          )?.actionLabel ?? 'Execute Crew Action'}{' '}
                          (Click Rapidly!)
                        </button>
                        <button
                          type="button"
                          onClick={() => onLeaveCoop(myCoopRoom.id)}
                          className="px-3.5 py-2.5 rounded-xl bg-zinc-800 text-slate-300 hover:text-white text-xs font-bold cursor-pointer"
                        >
                          Bail Out
                        </button>
                      </div>
                    )}

                    {(myCoopRoom.status === 'completed' || myCoopRoom.status === 'failed') && (
                      <div className="w-full flex items-center justify-between gap-3">
                        <span
                          className={`text-sm font-bold ${
                            myCoopRoom.status === 'completed' ? 'text-emerald-400' : 'text-red-400'
                          }`}
                        >
                          {myCoopRoom.status === 'completed'
                            ? 'Mission Accomplished! Payouts credited to every crew member.'
                            : 'Operation Timed Out. Regroup and launch another run.'}
                        </span>
                        <button
                          type="button"
                          onClick={() => onLeaveCoop(myCoopRoom.id)}
                          className="px-4 py-2 rounded-xl bg-[#b99142] text-black font-bold text-xs cursor-pointer"
                        >
                          Close Room
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Shared Co-op Action Log */}
                  <div className="rounded-lg bg-black/50 border border-white/10 p-2.5 max-h-28 overflow-y-auto mafia-scroll space-y-1 text-xs font-mono-num text-slate-300">
                    {myCoopRoom.actionLog.map((line, i) => (
                      <div key={i}>{line}</div>
                    ))}
                  </div>
                </div>
              )}

              {/* Open Recruiting Co-op Rooms */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 items-start">
                <div className="p-4 rounded-xl bg-black/40 border border-white/15 space-y-3">
                  <div className="font-bold text-sm text-amber-200">
                    Open Co-op Crew Lobbies ({openRecruitingRooms.length})
                  </div>
                  {openRecruitingRooms.length === 0 ? (
                    <p className="text-xs text-slate-400 py-4">
                      No other open crews recruiting right now. Start a Co-op Mafia Mission on the right so fellow mobsters can join!
                    </p>
                  ) : (
                    <div className="space-y-2.5">
                      {openRecruitingRooms.map((room) => (
                        <div
                          key={room.id}
                          className="p-3 rounded-xl bg-white/5 border border-white/10 flex flex-wrap items-center justify-between gap-3"
                        >
                          <div>
                            <div className="font-bold text-sm text-white">{room.title}</div>
                            <div className="text-xs text-slate-400 font-mono-num">
                              Leader: {room.leaderName} · Crew {room.members.length}/{room.maxPlayers} · ${formatCash(room.rewardCashPerPlayer)} each
                            </div>
                          </div>
                          <button
                            type="button"
                            disabled={Boolean(myCoopRoom)}
                            onClick={() => {
                              sound.playClick();
                              onJoinCoop(room.id, selectedCrewRole);
                            }}
                            className="px-3.5 py-2 rounded-lg bg-emerald-700 hover:bg-emerald-600 disabled:opacity-40 text-white font-bold text-xs cursor-pointer"
                          >
                            Join as {selectedCrewRole}
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Launch New Co-op Mission */}
                <div className="p-4 rounded-xl bg-black/40 border border-white/15 space-y-3">
                  <div className="font-bold text-sm text-white">Host a Co-op Mafia Mission</div>
                  <div className="space-y-2.5">
                    {COOP_MISSION_TEMPLATES.map((tpl) => (
                      <div
                        key={tpl.id}
                        className="p-3 rounded-xl bg-white/5 border border-white/10 flex flex-wrap items-center justify-between gap-3"
                      >
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-sm text-white">{tpl.title}</span>
                            <span className="text-[11px] font-mono-num text-amber-300">
                              {tpl.difficulty}
                            </span>
                          </div>
                          <div className="text-xs text-slate-400 mt-0.5">
                            {tpl.minPlayers}–{tpl.maxPlayers} Players · Reward:{' '}
                            <span className="font-mono-num text-emerald-300">
                              ${formatCash(tpl.rewardCashPerPlayer)} + {tpl.rewardRespectPerPlayer} Resp
                            </span>
                          </div>
                        </div>
                        <button
                          type="button"
                          disabled={Boolean(myCoopRoom)}
                          onClick={() => {
                            sound.playClick();
                            onCreateCoop(tpl.id, selectedCrewRole);
                          }}
                          className="px-3.5 py-2 rounded-lg bg-[#b99142] hover:brightness-110 disabled:opacity-40 text-black font-bold text-xs cursor-pointer whitespace-nowrap"
                        >
                          Open Lobby
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* PVP SHOWDOWNS TAB */}
          {activeTab === 'pvp' && (
            <div className="space-y-5">
              {/* Incoming PvP Challenges */}
              {incomingChallenges.length > 0 && (
                <div className="p-4 rounded-xl bg-red-950/35 border-2 border-red-400/60 space-y-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="font-bold text-sm text-red-200">
                      Incoming Street Duel Challenges ({incomingChallenges.length})
                    </span>
                    <div className="flex items-center gap-2 text-xs">
                      <span className="text-slate-300">Counter Stance:</span>
                      <select
                        value={defenseStance}
                        onChange={(e) => setDefenseStance(e.target.value as PvpStance)}
                        className="h-8 px-2 rounded bg-zinc-900 border border-white/20 text-white"
                      >
                        <option value="aggressive">Aggressive (beats Balanced)</option>
                        <option value="balanced">Balanced (beats Defensive)</option>
                        <option value="defensive">Defensive (beats Aggressive)</option>
                      </select>
                    </div>
                  </div>
                  {incomingChallenges.map((ch) => (
                    <div
                      key={ch.id}
                      className="p-3 rounded-xl bg-black/50 border border-white/15 flex flex-wrap items-center justify-between gap-3"
                    >
                      <div className="text-xs">
                        <div className="font-bold text-sm text-white">
                          {ch.challengerName}{' '}
                          <span className="text-amber-300">({ch.challengerFamilyId.toUpperCase()})</span>
                        </div>
                        <div className="font-mono-num text-slate-300 mt-0.5">
                          Wager: <strong className="text-emerald-300">${formatCash(ch.wager)}</strong>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            sound.playVictory();
                            onRespondPvp(ch.id, true, defenseStance);
                          }}
                          className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs cursor-pointer"
                        >
                          Accept &amp; Fight
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            sound.playClick();
                            onRespondPvp(ch.id, false, defenseStance);
                          }}
                          className="px-3 py-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-slate-200 font-bold text-xs cursor-pointer"
                        >
                          Decline
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Challenge Settings & Online Opponents */}
              <div className="grid grid-cols-1 lg:grid-cols-[1.15fr_0.85fr] gap-5 items-start">
                <div className="p-4 rounded-xl bg-black/40 border border-white/15 space-y-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="font-bold text-sm text-amber-200">
                      Challenge Online Mobsters (PvP)
                    </span>
                    <div className="flex items-center gap-2 text-xs">
                      <label className="flex items-center gap-1.5 text-slate-300">
                        <span>Wager $</span>
                        <input
                          type="number"
                          min={10}
                          max={5000}
                          value={pvpWager}
                          onChange={(e) => setPvpWager(e.target.value)}
                          className="w-20 h-8 px-2 rounded bg-black/70 border border-white/20 font-mono-num text-white"
                        />
                      </label>
                      <select
                        value={pvpStance}
                        onChange={(e) => setPvpStance(e.target.value as PvpStance)}
                        className="h-8 px-2 rounded bg-zinc-900 border border-white/20 text-white"
                      >
                        <option value="aggressive">Aggressive</option>
                        <option value="balanced">Balanced</option>
                        <option value="defensive">Defensive</option>
                      </select>
                    </div>
                  </div>

                  {otherOnlinePlayers.length === 0 ? (
                    <div className="py-8 text-center text-xs text-slate-400">
                      No rival mobsters online yet. Open a 2nd browser tab or invite a friend to duel for cash &amp; Respect.
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {otherOnlinePlayers.map((op) => (
                        <div
                          key={op.id}
                          className="p-3 rounded-xl bg-white/5 border border-white/10 flex flex-wrap items-center justify-between gap-3"
                        >
                          <div>
                            <div className="font-bold text-sm text-white">
                              {op.name}{' '}
                              <span className="text-xs text-amber-300">
                                ({op.familyId.toUpperCase()} · {op.role})
                              </span>
                            </div>
                            <div className="text-xs text-slate-400 font-mono-num">
                              Resp {op.respect} · ATK {op.attack} · DEF {op.defense} · HP {op.vitality}
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() => {
                              sound.playClick();
                              const w = Math.max(10, Math.round(Number(pvpWager) || 50));
                              onChallengePvp(op.id, w, pvpStance);
                            }}
                            className="px-3.5 py-2 rounded-lg bg-red-800 border border-red-400/40 hover:bg-red-700 text-white font-bold text-xs cursor-pointer"
                          >
                            Challenge (${Math.max(10, Math.round(Number(pvpWager) || 50))})
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Recent PvP Showdown Logs */}
                <div className="p-4 rounded-xl bg-black/40 border border-white/15 space-y-3">
                  <div className="font-bold text-sm text-white">Recent PvP Combat Logs</div>
                  {snapshot.challenges.length === 0 ? (
                    <p className="text-xs text-slate-400 py-6 text-center">
                      No PvP showdowns fought yet.
                    </p>
                  ) : (
                    <div className="space-y-2.5 max-h-[320px] overflow-y-auto mafia-scroll">
                      {snapshot.challenges.map((c) => (
                        <div
                          key={c.id}
                          className="p-3 rounded-xl bg-white/5 border border-white/10 text-xs space-y-1"
                        >
                          <div className="flex items-center justify-between font-bold">
                            <span className="text-white">
                              {c.challengerName} vs {c.targetName}
                            </span>
                            <span
                              className={`font-mono-num uppercase ${
                                c.status === 'completed'
                                  ? 'text-emerald-400'
                                  : c.status === 'pending'
                                  ? 'text-amber-300'
                                  : 'text-slate-400'
                              }`}
                            >
                              {c.status} · ${c.wager}
                            </span>
                          </div>
                          {c.summary && <div className="text-amber-200">{c.summary}</div>}
                          {c.rounds && (
                            <div className="text-[11px] font-mono-num text-slate-400 space-y-0.5 pt-1 border-t border-white/10">
                              {c.rounds.map((r, idx) => (
                                <div key={idx}>{r}</div>
                              ))}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* TURF & ONLINE MOBSTERS TAB */}
          {activeTab === 'turf' && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 items-start">
              <div className="p-4 rounded-xl bg-black/40 border border-white/15 space-y-3">
                <div className="font-bold text-sm text-amber-200">
                  Live Multiplayer City Turf War
                </div>
                <p className="text-xs text-slate-400">
                  Every raid shifts harbor territory across all connected players in real time (+1% Turf, +$75 Cash, +14 Respect).
                </p>
                <div className="space-y-2.5">
                  {families.map((fam) => {
                    const liveShare = snapshot.turfShares[fam.id] ?? fam.turfShare;
                    const isMine = fam.id === player.familyId;
                    return (
                      <div key={fam.id} className="p-2.5 rounded-xl bg-white/5 border border-white/10 space-y-1.5">
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-bold text-white">
                            {fam.name} {isMine ? '(Your Family)' : ''}
                          </span>
                          <span className="font-mono-num font-bold text-amber-300">{liveShare}%</span>
                        </div>
                        <div className="w-full h-2 rounded-full bg-black/70 overflow-hidden">
                          <div
                            className="h-full rounded-full transition-all duration-300"
                            style={{ width: `${liveShare}%`, backgroundColor: fam.crestColor }}
                          />
                        </div>
                        {!isMine && (
                          <div className="flex justify-end">
                            <button
                              type="button"
                              onClick={() => {
                                sound.playVictory();
                                onRaidTurf(fam.id);
                              }}
                              className="px-2.5 py-1 rounded bg-red-800/90 hover:bg-red-700 text-white text-[11px] font-bold cursor-pointer"
                            >
                              Raid Turf (+1% / $75)
                            </button>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="p-4 rounded-xl bg-black/40 border border-white/15 space-y-3">
                <div className="font-bold text-sm text-white">
                  Live Mobsters in Town ({onlinePlayers.length} Online)
                </div>
                <div className="space-y-2 max-h-[360px] overflow-y-auto mafia-scroll">
                  {snapshot.players.map((m) => (
                    <div
                      key={m.id}
                      className={`p-3 rounded-xl border flex items-center justify-between gap-2 text-xs ${
                        m.id === snapshot.selfId
                          ? 'bg-amber-500/15 border-amber-400/50'
                          : 'bg-white/5 border-white/10'
                      }`}
                    >
                      <div>
                        <div className="font-bold text-white">
                          {m.name} {m.id === snapshot.selfId ? '(You)' : ''}
                        </div>
                        <div className="text-slate-400 font-mono-num">
                          {m.familyId.toUpperCase()} · {m.role} · Resp {m.respect} · Kills {m.kills}
                        </div>
                      </div>
                      <span
                        className={`font-mono-num font-bold ${
                          m.online ? 'text-emerald-400' : 'text-slate-500'
                        }`}
                      >
                        {m.online ? 'ONLINE' : 'OFFLINE'}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* LIVE CITY CHAT & FEED TAB */}
          {activeTab === 'chat' && (
            <div className="grid grid-cols-1 lg:grid-cols-[1.15fr_0.85fr] gap-5 items-start">
              <div className="p-4 rounded-xl bg-black/40 border border-white/15 flex flex-col h-[380px]">
                <div className="flex items-center justify-between gap-2 pb-2.5 border-b border-white/10">
                  <span className="font-bold text-sm text-amber-200">Syndicate Radio Chat</span>
                  <div className="flex items-center gap-1 p-0.5 rounded-lg bg-black/60 border border-white/10">
                    {(['city', 'family'] as const).map((ch) => (
                      <button
                        key={ch}
                        type="button"
                        onClick={() => setChatChannel(ch)}
                        className={`px-2.5 py-1 rounded text-xs font-semibold cursor-pointer ${
                          chatChannel === ch ? 'bg-zinc-700 text-white' : 'text-slate-400'
                        }`}
                      >
                        {ch === 'city' ? 'City-Wide' : `${player.familyId.toUpperCase()} Only`}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex-1 overflow-y-auto mafia-scroll py-2.5 space-y-2 text-xs">
                  {visibleChat.map((msg) => (
                    <div key={msg.id} className="p-2 rounded-lg bg-white/5 border border-white/10">
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-bold text-amber-300">
                          {msg.senderName}{' '}
                          <span className="text-[10px] text-slate-400">
                            ({msg.familyId.toUpperCase()} · {msg.channel === 'family' ? 'FAMILY' : 'CITY'})
                          </span>
                        </span>
                        <span className="text-[10px] font-mono-num text-slate-500">
                          {new Date(msg.timestamp).toLocaleTimeString([], {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </span>
                      </div>
                      <p className="text-slate-100 mt-0.5">{msg.text}</p>
                    </div>
                  ))}
                </div>

                <form
                  className="pt-2.5 border-t border-white/10 flex items-center gap-2"
                  onSubmit={(e) => {
                    e.preventDefault();
                    if (!chatText.trim()) return;
                    sound.playClick();
                    onSendChat(chatText, chatChannel);
                    setChatText('');
                  }}
                >
                  <input
                    type="text"
                    value={chatText}
                    onChange={(e) => setChatText(e.target.value)}
                    placeholder={`Message ${chatChannel === 'family' ? player.familyId.toUpperCase() : 'Harbor Town'}...`}
                    maxLength={240}
                    className="flex-1 h-10 px-3 rounded-lg bg-black/70 border border-white/20 text-xs text-white focus:outline-none focus:border-amber-400"
                  />
                  <button
                    type="submit"
                    className="h-10 px-4 rounded-lg bg-[#b99142] text-black font-bold text-xs hover:brightness-110 cursor-pointer"
                  >
                    Send
                  </button>
                </form>
              </div>

              <div className="p-4 rounded-xl bg-black/40 border border-white/15 h-[380px] flex flex-col">
                <div className="font-bold text-sm text-white pb-2.5 border-b border-white/10">
                  Live Underworld Wire
                </div>
                <div className="flex-1 overflow-y-auto mafia-scroll py-2.5 space-y-2 text-xs">
                  {snapshot.feed.length === 0 ? (
                    <div className="text-slate-400 text-center py-8">
                      No multiplayer broadcasts yet.
                    </div>
                  ) : (
                    snapshot.feed.map((item) => (
                      <div key={item.id} className="p-2.5 rounded-lg bg-white/5 border border-white/10">
                        <div className="text-[10px] font-mono-num uppercase text-amber-300">
                          {item.kind} ·{' '}
                          {new Date(item.timestamp).toLocaleTimeString([], {
                            hour: '2-digit',
                            minute: '2-digit',
                            second: '2-digit',
                          })}
                        </div>
                        <div className="text-slate-200 mt-0.5">{item.text}</div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
