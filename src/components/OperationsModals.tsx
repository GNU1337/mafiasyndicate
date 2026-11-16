import React, { useState } from 'react';
import { formatCash, formatCountdown, SHOP_CATALOG } from '../data/initialGameState';
import type { GameState, ModalType, ShopItem } from '../types/game';
import { sound } from '../utils/sound';

interface OperationsModalsProps {
  modal: ModalType;
  state: GameState;
  nowMs: number;
  onClose: () => void;
  onCrimeAction: (kind: 'pickpocket' | 'extortion' | 'defamation' | 'kill', targetIndex?: number) => void;
  onLaunchCarHeist: () => void;
  onLaunchKnifeGame: () => void;
  onStartMission: (name: string, durationMs: number, cashReward: number, respectReward: number) => void;
  onFinishMissionNow: () => void;
  onHotelRest: (tier: 'room' | 'suite') => void;
  onTrainStat: (stat: 'attack' | 'defense' | 'hp') => void;
  onBankAction: (action: 'deposit' | 'withdraw', amount: number) => void;
  onPubDrink: (tier: 'bourbon' | 'reserve') => void;
  onBuyShopItem: (item: ShopItem) => void;
  onDominationRaid: (familyId: string) => void;
  onMarkMailRead: (mailId: string) => void;
  onToggleSound: () => void;
  onResetSave: () => void;
  onClaimLuckyReward: () => void;
  onOpenMultiplayer: (tab: 'coop' | 'pvp' | 'turf' | 'chat') => void;
}

function ModalShell({
  title,
  onClose,
  children,
  maxWidth = 'max-w-[580px]',
}: {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
  maxWidth?: string;
}) {
  return (
    <div
      className="fixed inset-0 z-40 flex items-center justify-center bg-black/60 p-3"
      onClick={onClose}
    >
      <div
        className={`relative w-full ${maxWidth} max-h-[88vh] flex flex-col rounded-2xl bg-[#161311]/95 border-2 border-[#b99142]/70 shadow-2xl overflow-hidden`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 py-3.5 bg-[#2a1d14] border-b border-amber-500/25">
          <h2 className="font-display text-2xl font-bold text-amber-200 tracking-wide">
            {title}
          </h2>
          <button
            type="button"
            onClick={() => {
              sound.playClick();
              onClose();
            }}
            aria-label="Close Modal"
            className="w-9 h-9 flex items-center justify-center text-white text-xl font-bold hover:text-amber-300 cursor-pointer"
          >
            ✕
          </button>
        </div>
        <div className="p-4 sm:p-5 overflow-y-auto mafia-scroll space-y-4">
          {children}
        </div>
      </div>
    </div>
  );
}

export const OperationsModals: React.FC<OperationsModalsProps> = ({
  modal,
  state,
  nowMs,
  onClose,
  onCrimeAction,
  onLaunchCarHeist,
  onLaunchKnifeGame,
  onStartMission,
  onFinishMissionNow,
  onHotelRest,
  onTrainStat,
  onBankAction,
  onPubDrink,
  onBuyShopItem,
  onDominationRaid,
  onMarkMailRead,
  onToggleSound,
  onResetSave,
  onClaimLuckyReward,
  onOpenMultiplayer,
}) => {
  const [bankInput, setBankInput] = useState('100');
  const { player, families, news, mail } = state;

  if (
    !modal ||
    modal === 'menu' ||
    modal === 'profile' ||
    modal === 'family' ||
    modal === 'trade' ||
    modal === 'multiplayer'
  ) {
    return null;
  }

  if (modal === 'pickpocket') {
    const targets = [
      { name: 'Dockside Clerk', reward: '$18 – $38', risk: 'Low (90%)', energy: 1 },
      { name: 'Harbor Merchant', reward: '$40 – $75', risk: 'Moderate (72%)', energy: 2 },
      { name: 'Visiting Diplomat', reward: '$85 – $150', risk: 'High (54%)', energy: 3 },
    ];
    return (
      <ModalShell title="Pickpocket — Street Targets" onClose={onClose}>
        <p className="text-sm text-slate-300">
          Swipe pockets around the docks to earn quick cash and street respect. Energy: <strong className="text-emerald-400 font-mono-num">{player.energy}/{player.maxEnergy}</strong>
        </p>
        <div className="space-y-2.5">
          {targets.map((t, idx) => (
            <div key={t.name} className="flex items-center justify-between gap-3 p-3 rounded-xl bg-white/5 border border-white/10">
              <div>
                <div className="font-bold text-white">{t.name}</div>
                <div className="text-xs text-slate-400">
                  Payout: {t.reward} · Chance: {t.risk} · Cost: {t.energy} Energy
                </div>
              </div>
              <button
                type="button"
                onClick={() => onCrimeAction('pickpocket', idx)}
                className="px-4 py-2 rounded-lg bg-[#b99142] text-black font-bold text-sm hover:brightness-110 cursor-pointer whitespace-nowrap"
              >
                Swipe
              </button>
            </div>
          ))}
        </div>
      </ModalShell>
    );
  }

  if (modal === 'extortion') {
    const shops = [
      { name: 'Pier 4 Fishmonger', reward: '$55 – $95', energy: 2 },
      { name: 'Cobblestone Tailor', reward: '$90 – $150', energy: 3 },
      { name: 'Palazzo Jewelry Vault', reward: '$180 – $290', energy: 4 },
    ];
    return (
      <ModalShell title="Extortion — Protection Rackets" onClose={onClose}>
        <p className="text-sm text-slate-300">
          Collect protection fees from neighborhood merchants. Higher Attack increases your intimidation payout.
        </p>
        <div className="space-y-2.5">
          {shops.map((s, idx) => (
            <div key={s.name} className="flex items-center justify-between gap-3 p-3 rounded-xl bg-white/5 border border-white/10">
              <div>
                <div className="font-bold text-white">{s.name}</div>
                <div className="text-xs text-slate-400">
                  Cut: {s.reward} · Cost: {s.energy} Energy
                </div>
              </div>
              <button
                type="button"
                onClick={() => onCrimeAction('extortion', idx)}
                className="px-4 py-2 rounded-lg bg-[#b99142] text-black font-bold text-sm hover:brightness-110 cursor-pointer whitespace-nowrap"
              >
                Collect
              </button>
            </div>
          ))}
        </div>
      </ModalShell>
    );
  }

  if (modal === 'heist') {
    return (
      <ModalShell title="Heist — Getaway Operations" onClose={onClose}>
        <div className="p-4 rounded-xl bg-amber-950/35 border border-amber-500/30 space-y-2">
          <div className="font-bold text-lg text-amber-200">Highway Getaway Run (Reach 40!)</div>
          <p className="text-sm text-slate-300">
            Take the wheel of the orange coupe and dodge 40 oncoming traffic sedans across 3 lanes to haul the armored heist loot. Best score: <strong className="font-mono-num text-white">{player.carBestScore}</strong>
          </p>
          <button
            type="button"
            onClick={onLaunchCarHeist}
            className="mt-2 px-5 py-2.5 rounded-lg bg-[#b99142] text-black font-bold text-sm hover:brightness-110 cursor-pointer"
          >
            Start Highway Getaway (1 Energy)
          </button>
        </div>

        <div className="p-4 rounded-xl bg-white/5 border border-white/10 space-y-2">
          <div className="font-bold text-lg text-white">Alley Knife Challenge (Reach 15!)</div>
          <p className="text-sm text-slate-300">
            Sink 15 daggers into the spinning timber target without clipping another blade. Best score: <strong className="font-mono-num text-white">{player.knifeBestScore}</strong>
          </p>
          <button
            type="button"
            onClick={onLaunchKnifeGame}
            className="mt-2 px-5 py-2.5 rounded-lg bg-zinc-700 border border-white/25 text-white font-bold text-sm hover:bg-zinc-600 cursor-pointer"
          >
            Play Knife Throw
          </button>
        </div>
      </ModalShell>
    );
  }

  if (modal === 'defamation') {
    const rivalFamilies = families.filter((f) => f.id !== player.familyId);
    return (
      <ModalShell title="Defamation — Smear Campaigns" onClose={onClose}>
        <p className="text-sm text-slate-300">
          Plant scandalous reels in the city press to weaken rival families&apos; turf share and boost your own Respect. Cost: 2 Energy.
        </p>
        <div className="space-y-2.5">
          {rivalFamilies.map((fam, idx) => (
            <div key={fam.id} className="flex items-center justify-between gap-3 p-3 rounded-xl bg-white/5 border border-white/10">
              <div>
                <div className="font-bold text-white">{fam.fullTitle}</div>
                <div className="text-xs text-slate-400">
                  Boss: {fam.boss} · Turf Control: {fam.turfShare}%
                </div>
              </div>
              <button
                type="button"
                onClick={() => onCrimeAction('defamation', idx)}
                className="px-4 py-2 rounded-lg bg-[#b99142] text-black font-bold text-sm hover:brightness-110 cursor-pointer"
              >
                Smear
              </button>
            </div>
          ))}
        </div>
      </ModalShell>
    );
  }

  if (modal === 'kill') {
    const targets = families
      .filter((f) => f.id !== player.familyId)
      .map((f) => ({ family: f, member: f.members[f.members.length - 1] }));
    return (
      <ModalShell title="Contract Hits — Rival Mobsters" onClose={onClose}>
        <div className="p-3 rounded-xl bg-amber-950/35 border border-amber-500/35 flex flex-wrap items-center justify-between gap-2 text-xs">
          <span className="text-amber-100">
            Want to fight real players? Challenge online mobsters to high-stakes PvP duels.
          </span>
          <button
            type="button"
            onClick={() => onOpenMultiplayer('pvp')}
            className="px-3 py-1.5 rounded-lg bg-[#b99142] text-black font-bold hover:brightness-110 cursor-pointer whitespace-nowrap"
          >
            Live PvP Arena →
          </button>
        </div>
        <p className="text-sm text-slate-300">
          Order a hit on a rival soldier. Your Attack (<strong className="text-amber-300 font-mono-num">{player.attack}</strong>) is weighed against their Defense. Cost: 3 Energy.
        </p>
        <div className="space-y-2.5">
          {targets.map(({ family, member }, idx) => (
            <div key={member.id} className="flex items-center justify-between gap-3 p-3 rounded-xl bg-white/5 border border-white/10">
              <div>
                <div className="font-bold text-white">
                  {member.name} <span className="text-xs text-slate-400">({family.name})</span>
                </div>
                <div className="text-xs text-slate-400 font-mono-num">
                  DEF: {member.defense} · Respect: {member.respect}
                </div>
              </div>
              <button
                type="button"
                onClick={() => onCrimeAction('kill', idx)}
                className="px-4 py-2 rounded-lg bg-red-800 border border-red-400/40 text-white font-bold text-sm hover:bg-red-700 cursor-pointer"
              >
                Whack
              </button>
            </div>
          ))}
        </div>
      </ModalShell>
    );
  }

  if (modal === 'mission') {
    const remaining = player.missionEndsAt ? Math.max(0, player.missionEndsAt - nowMs) : 0;
    const missions = [
      { name: 'Pier Smuggling Run', mins: 10, cash: 95, respect: 16 },
      { name: 'Harbor Dock Watch', mins: 30, cash: 185, respect: 32 },
      { name: 'Midnight Syndicate Convoy', mins: 60, cash: 340, respect: 58 },
    ];
    return (
      <ModalShell title="Missions — Timed & Co-op Contracts" onClose={onClose}>
        <div className="p-3 rounded-xl bg-emerald-950/35 border border-emerald-500/35 flex flex-wrap items-center justify-between gap-2 text-xs">
          <span className="text-emerald-100">
            Team up with crewmates for real-time <strong>Co-op Mafia Missions</strong> and bigger vault payouts.
          </span>
          <button
            type="button"
            onClick={() => onOpenMultiplayer('coop')}
            className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold cursor-pointer whitespace-nowrap"
          >
            Co-op Mafia Missions →
          </button>
        </div>
        {player.status === 'inMission' && remaining > 0 ? (
          <div className="p-4 rounded-xl bg-amber-950/40 border border-amber-400/40 space-y-3">
            <div className="flex items-center justify-between">
              <span className="font-bold text-white text-lg">{player.missionName}</span>
              <span className="font-mono-num font-bold text-amber-300 text-lg">
                {formatCountdown(remaining)}
              </span>
            </div>
            <p className="text-xs text-slate-300">
              Pending Payout: ${formatCash(player.missionRewardCash)} & +{player.missionRewardRespect} Respect
            </p>
            <button
              type="button"
              onClick={onFinishMissionNow}
              className="px-4 py-2 rounded-lg bg-[#b99142] text-black font-bold text-sm hover:brightness-110 cursor-pointer"
            >
              Speed Up & Complete (2 Energy)
            </button>
          </div>
        ) : (
          <div className="space-y-2.5">
            {missions.map((m) => (
              <div key={m.name} className="flex items-center justify-between gap-3 p-3 rounded-xl bg-white/5 border border-white/10">
                <div>
                  <div className="font-bold text-white">{m.name}</div>
                  <div className="text-xs text-slate-400">
                    Duration: {m.mins}m · Reward: ${formatCash(m.cash)} + {m.respect} Respect
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => onStartMission(m.name, m.mins * 60 * 1000, m.cash, m.respect)}
                  className="px-4 py-2 rounded-lg bg-[#b99142] text-black font-bold text-sm hover:brightness-110 cursor-pointer"
                >
                  Deploy
                </button>
              </div>
            ))}
          </div>
        )}
      </ModalShell>
    );
  }

  if (modal === 'hotel') {
    return (
      <ModalShell title="Grand Harbor Hotel — Recovery" onClose={onClose}>
        <p className="text-sm text-slate-300">
          Lay low, patch wounds, and restore your vitality and energy before hitting the streets again.
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="p-4 rounded-xl bg-white/5 border border-white/10 space-y-2">
            <div className="font-bold text-white">Back-Alley Room</div>
            <div className="text-xs text-slate-400">Restores +120 Health & +4 Energy</div>
            <button
              type="button"
              onClick={() => onHotelRest('room')}
              className="w-full py-2 rounded-lg bg-[#b99142] text-black font-bold text-sm hover:brightness-110 cursor-pointer"
            >
              Check In ($45,00)
            </button>
          </div>
          <div className="p-4 rounded-xl bg-white/5 border border-white/10 space-y-2">
            <div className="font-bold text-amber-200">Penthouse Suite</div>
            <div className="text-xs text-slate-400">Full Health & Full 10/10 Energy</div>
            <button
              type="button"
              onClick={() => onHotelRest('suite')}
              className="w-full py-2 rounded-lg bg-[#b99142] text-black font-bold text-sm hover:brightness-110 cursor-pointer"
            >
              Check In ($110,00)
            </button>
          </div>
        </div>
      </ModalShell>
    );
  }

  if (modal === 'training') {
    return (
      <ModalShell title="Underground Gym — Training" onClose={onClose}>
        <p className="text-sm text-slate-300">
          Sharpen your combat fundamentals. Each session costs $40,00 Cash + 1 Energy.
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="p-3.5 rounded-xl bg-white/5 border border-white/10 text-center space-y-2">
            <div className="text-xs text-slate-400">Attack</div>
            <div className="text-2xl font-bold font-mono-num text-white">{player.attack}</div>
            <button
              type="button"
              onClick={() => onTrainStat('attack')}
              className="w-full py-2 rounded-lg bg-[#b99142] text-black font-bold text-xs hover:brightness-110 cursor-pointer"
            >
              Train +3 ATK
            </button>
          </div>
          <div className="p-3.5 rounded-xl bg-white/5 border border-white/10 text-center space-y-2">
            <div className="text-xs text-slate-400">Defense</div>
            <div className="text-2xl font-bold font-mono-num text-white">{player.defense}</div>
            <button
              type="button"
              onClick={() => onTrainStat('defense')}
              className="w-full py-2 rounded-lg bg-[#b99142] text-black font-bold text-xs hover:brightness-110 cursor-pointer"
            >
              Train +3 DEF
            </button>
          </div>
          <div className="p-3.5 rounded-xl bg-white/5 border border-white/10 text-center space-y-2">
            <div className="text-xs text-slate-400">Combat HP</div>
            <div className="text-2xl font-bold font-mono-num text-white">{player.hpStat}</div>
            <button
              type="button"
              onClick={() => onTrainStat('hp')}
              className="w-full py-2 rounded-lg bg-[#b99142] text-black font-bold text-xs hover:brightness-110 cursor-pointer"
            >
              Train +5 HP
            </button>
          </div>
        </div>
      </ModalShell>
    );
  }


  if (modal === 'bank') {
    const val = Math.max(0, parseFloat(bankInput.replace(',', '.')) || 0);
    return (
      <ModalShell title="Harbor Bank — Vault" onClose={onClose}>
        <div className="grid grid-cols-2 gap-3">
          <div className="p-3.5 rounded-xl bg-white/5 border border-white/10">
            <div className="text-xs text-slate-400">Cash on Hand</div>
            <div className="text-xl font-bold font-mono-num text-white">${formatCash(player.cash)}</div>
          </div>
          <div className="p-3.5 rounded-xl bg-white/5 border border-white/10">
            <div className="text-xs text-slate-400">Safe Vault Balance</div>
            <div className="text-xl font-bold font-mono-num text-amber-300">${formatCash(player.bankBalance)}</div>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <input
            type="text"
            value={bankInput}
            onChange={(e) => setBankInput(e.target.value)}
            className="flex-1 min-w-[140px] px-3 py-2 rounded-lg bg-black/60 border border-white/20 text-white font-mono-num"
          />
          <button
            type="button"
            onClick={() => onBankAction('deposit', val)}
            className="px-4 py-2 rounded-lg bg-emerald-700 text-white font-bold text-sm hover:bg-emerald-600 cursor-pointer"
          >
            Deposit
          </button>
          <button
            type="button"
            onClick={() => onBankAction('withdraw', val)}
            className="px-4 py-2 rounded-lg bg-[#b99142] text-black font-bold text-sm hover:brightness-110 cursor-pointer"
          >
            Withdraw
          </button>
        </div>
      </ModalShell>
    );
  }

  if (modal === 'pub') {
    return (
      <ModalShell title="Dockside Pub — Drinks & Rumors" onClose={onClose}>
        <p className="text-sm text-slate-300">
          Grab a glass at the waterfront bar to recover energy and hear street rumors from fellow mobsters.
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="p-4 rounded-xl bg-white/5 border border-white/10 space-y-2">
            <div className="font-bold text-white">Neat Bourbon Glass</div>
            <div className="text-xs text-slate-400">Restores +3 Energy & +2 Respect</div>
            <button
              type="button"
              onClick={() => onPubDrink('bourbon')}
              className="w-full py-2 rounded-lg bg-[#b99142] text-black font-bold text-sm hover:brightness-110 cursor-pointer"
            >
              Order ($30,00)
            </button>
          </div>
          <div className="p-4 rounded-xl bg-white/5 border border-white/10 space-y-2">
            <div className="font-bold text-amber-200">Top-Shelf Syndicate Round</div>
            <div className="text-xs text-slate-400">Restores +7 Energy & +8 Respect</div>
            <button
              type="button"
              onClick={() => onPubDrink('reserve')}
              className="w-full py-2 rounded-lg bg-[#b99142] text-black font-bold text-sm hover:brightness-110 cursor-pointer"
            >
              Order ($75,00)
            </button>
          </div>
        </div>
      </ModalShell>
    );
  }

  if (modal === 'domination') {
    return (
      <ModalShell title="City Domination — Turf Control" onClose={onClose}>
        <p className="text-sm text-slate-300">
          Control across the harbor districts. Launch a turf raid (2 Energy) to expand your family&apos;s slice of the town.
        </p>
        <div className="space-y-3">
          {families.map((fam) => (
            <div key={fam.id} className="p-3 rounded-xl bg-white/5 border border-white/10 space-y-1.5">
              <div className="flex items-center justify-between text-sm">
                <span className="font-bold text-white">
                  {fam.name} {fam.id === player.familyId ? '(Your Family)' : ''}
                </span>
                <span className="font-mono-num text-amber-300">{fam.turfShare}%</span>
              </div>
              <div className="w-full h-2.5 rounded-full bg-black/60 overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-300"
                  style={{ width: `${fam.turfShare}%`, backgroundColor: fam.crestColor }}
                />
              </div>
              {fam.id !== player.familyId && (
                <div className="flex justify-end pt-1">
                  <button
                    type="button"
                    onClick={() => onDominationRaid(fam.id)}
                    className="px-3 py-1 rounded bg-red-800/90 text-white text-xs font-bold hover:bg-red-700 cursor-pointer"
                  >
                    Raid Turf (2 Energy)
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      </ModalShell>
    );
  }

  if (modal === 'news') {
    return (
      <ModalShell title="Underworld Gazette — City News" onClose={onClose}>
        <div className="space-y-2.5">
          {news.map((item) => (
            <div key={item.id} className="p-3 rounded-xl bg-white/5 border border-white/10">
              <div className="text-xs text-amber-300 uppercase tracking-wider font-semibold">
                {item.category} · {new Date(item.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </div>
              <p className="text-sm text-white mt-1">{item.headline}</p>
            </div>
          ))}
        </div>
      </ModalShell>
    );
  }

  if (modal === 'shop') {
    return (
      <ModalShell title="Black Market Shop" onClose={onClose} maxWidth="max-w-[650px]">
        <div className="flex items-center justify-between text-sm text-slate-300">
          <span>Cash: <strong className="text-white font-mono-num">${formatCash(player.cash)}</strong></span>
          <span>Diamonds: <strong className="text-amber-300 font-mono-num">{player.diamonds}</strong></span>
        </div>
        <div className="space-y-2.5">
          {SHOP_CATALOG.map((item) => {
            const count = player.ownedItems[item.id] ?? 0;
            return (
              <div key={item.id} className="flex flex-wrap items-center justify-between gap-3 p-3 rounded-xl bg-white/5 border border-white/10">
                <div className="max-w-[380px]">
                  <div className="font-bold text-white">
                    {item.name} {count > 0 ? <span className="text-xs text-amber-300">(Owned ×{count})</span> : null}
                  </div>
                  <div className="text-xs text-slate-400">{item.description}</div>
                  <div className="text-xs text-emerald-300 mt-0.5 font-mono-num">
                    +{item.attackBonus} ATK · +{item.defenseBonus} DEF · +{item.hpBonus} HP
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => onBuyShopItem(item)}
                  className="px-4 py-2 rounded-lg bg-[#b99142] text-black font-bold text-xs hover:brightness-110 cursor-pointer whitespace-nowrap"
                >
                  {item.priceDiamonds ? `Buy (${item.priceDiamonds} Diamonds)` : `Buy ($${formatCash(item.priceCash ?? 0)})`}
                </button>
              </div>
            );
          })}
        </div>
      </ModalShell>
    );
  }

  if (modal === 'timers') {
    const missionLeft = player.missionEndsAt ? Math.max(0, player.missionEndsAt - nowMs) : 0;
    const rows = [
      ['Active Mission', missionLeft > 0 ? formatCountdown(missionLeft) : 'Ready'],
      ['Harbor Chest', player.cooldowns.chestUntil > nowMs ? formatCountdown(player.cooldowns.chestUntil - nowMs) : 'Ready'],
      ['Sponsor Drop', player.cooldowns.videoRewardUntil > nowMs ? formatCountdown(player.cooldowns.videoRewardUntil - nowMs) : 'Ready'],
      ['Energy Regen', '1 Energy / 45s'],
    ];
    return (
      <ModalShell title="Cooldowns & Timers" onClose={onClose}>
        <div className="space-y-2">
          {rows.map(([label, status]) => (
            <div key={label} className="flex items-center justify-between p-3 rounded-xl bg-white/5 border border-white/10">
              <span className="font-semibold text-white">{label}</span>
              <span className="font-mono-num text-sm text-amber-300">{status}</span>
            </div>
          ))}
        </div>
      </ModalShell>
    );
  }

  if (modal === 'medals') {
    const allMobsters = families
      .flatMap((f) => f.members.map((m) => ({ ...m, familyName: f.name })))
      .sort((a, b) => b.respect - a.respect);
    return (
      <ModalShell title="Town Rankings — Top Mobsters" onClose={onClose} maxWidth="max-w-[640px]">
        <div className="space-y-1.5">
          {allMobsters.slice(0, 14).map((m, idx) => (
            <div
              key={m.id}
              className={`flex items-center justify-between px-3 py-2 rounded-lg border ${
                m.isPlayer ? 'bg-amber-500/20 border-amber-400/70' : 'bg-white/5 border-white/10'
              }`}
            >
              <div className="flex items-center gap-3">
                <span className="w-6 text-center font-mono-num font-bold text-amber-300">#{idx + 1}</span>
                <div>
                  <div className="font-bold text-sm text-white">
                    {m.name} {m.isPlayer ? '(You)' : ''}
                  </div>
                  <div className="text-xs text-slate-400">
                    {m.familyName} · {m.role}
                  </div>
                </div>
              </div>
              <div className="text-xs font-mono-num text-white font-semibold">
                {m.respect} Respect
              </div>
            </div>
          ))}
        </div>
      </ModalShell>
    );
  }

  if (modal === 'mail') {
    return (
      <ModalShell title="Family Dispatches — Mail" onClose={onClose}>
        <div className="space-y-2.5">
          {mail.map((msg) => (
            <div
              key={msg.id}
              onClick={() => onMarkMailRead(msg.id)}
              className={`p-3.5 rounded-xl border cursor-pointer transition ${
                msg.read ? 'bg-white/5 border-white/10' : 'bg-amber-950/35 border-amber-400/50'
              }`}
            >
              <div className="flex items-center justify-between gap-2">
                <span className="font-bold text-white text-sm">{msg.subject}</span>
                <span className="text-xs text-amber-300">{msg.read ? 'Read' : 'New'}</span>
              </div>
              <div className="text-xs text-slate-400 mt-0.5">From: {msg.sender}</div>
              <p className="text-sm text-slate-200 mt-2">{msg.body}</p>
            </div>
          ))}
        </div>
      </ModalShell>
    );
  }

  if (modal === 'tutorial') {
    return (
      <ModalShell title="Don BroJim — Underworld Guide" onClose={onClose}>
        <ul className="space-y-2 text-sm text-slate-200 list-disc pl-5">
          <li><strong>Explore the 3D Harbor</strong>: Drag or use <kbd className="px-1.5 py-0.5 rounded bg-white/10">WASD</kbd> / Arrow keys to pan, scroll or pinch to zoom, and click any circular pin (`Pub`, `Bank`, `Domination`, `News`, or Family HQs).</li>
          <li><strong>Knife Throw (Reach 15!)</strong>: Tap/click or press <kbd className="px-1.5 py-0.5 rounded bg-white/10">Space</kbd> to sink 15 blades into the rotating log without striking an existing knife.</li>
          <li><strong>Highway Getaway (Reach 40!)</strong>: Use the yellow left/right arrows or <kbd className="px-1.5 py-0.5 rounded bg-white/10">A</kbd>/<kbd className="px-1.5 py-0.5 rounded bg-white/10">D</kbd> keys to weave past 40 oncoming cars.</li>
          <li><strong>Rise in the Gambino Family</strong>: Build Respect via Missions, Extortion, and Hits, then claim Capo, Consiglieri, or Godfather seats inside the Family modal.</li>
        </ul>
      </ModalShell>
    );
  }

  if (modal === 'luckyReward') {
    return (
      <ModalShell title="Lucky Street Drop" onClose={onClose}>
        <p className="text-sm text-slate-300">
          An unmarked syndicate parcel was spotted along the eastern row. Grab it before rival scouts sweep the alley.
        </p>
        <button
          type="button"
          onClick={onClaimLuckyReward}
          className="px-5 py-2.5 rounded-lg bg-[#b99142] text-black font-bold text-sm hover:brightness-110 cursor-pointer"
        >
          Collect Lucky Drop
        </button>
      </ModalShell>
    );
  }

  if (modal === 'settings') {
    return (
      <ModalShell title="Settings & Controls" onClose={onClose}>
        <div className="flex items-center justify-between p-3.5 rounded-xl bg-white/5 border border-white/10">
          <div>
            <div className="font-bold text-white">Sound Effects</div>
            <div className="text-xs text-slate-400">Synthesized UI clicks, knife impacts, and cash chimes</div>
          </div>
          <button
            type="button"
            onClick={onToggleSound}
            className={`px-4 py-2 rounded-lg font-bold text-xs cursor-pointer ${
              state.soundEnabled ? 'bg-emerald-600 text-white' : 'bg-zinc-700 text-slate-300'
            }`}
          >
            {state.soundEnabled ? 'Enabled' : 'Muted'}
          </button>
        </div>

        <div className="p-3.5 rounded-xl bg-white/5 border border-white/10 space-y-1 text-xs text-slate-300">
          <div className="font-bold text-white text-sm mb-1">Windows PC & Mobile Controls</div>
          <div>3D City Map: Mouse drag / Touch pan, Scroll / Pinch zoom, WASD or Arrow keys</div>
          <div>Knife Throw: Click / Tap anywhere or Spacebar / Enter</div>
          <div>Highway Getaway: Yellow Left/Right chevrons or A / D / Left / Right Arrows</div>
        </div>

        <div className="flex justify-end">
          <button
            type="button"
            onClick={onResetSave}
            className="px-4 py-2 rounded-lg bg-red-800/90 border border-red-400/40 text-white font-bold text-xs hover:bg-red-700 cursor-pointer"
          >
            Reset Career Save
          </button>
        </div>
      </ModalShell>
    );
  }

  return null;
};
