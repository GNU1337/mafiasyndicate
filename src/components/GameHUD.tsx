import React from 'react';
import { formatCash, formatCountdown } from '../data/initialGameState';
import type { ModalType, PlayerProfile } from '../types/game';
import { sound } from '../utils/sound';
import {
  BulletsMenuIcon,
  CashStackIcon,
  ChestIcon,
  DiamondIcon,
  EnergyIcon,
  EnvelopeIcon,
  GearsIcon,
  HandshakeIcon,
  HeartbeatIcon,
  KnifeIcon,
  MafiaAvatarSvg,
  MarketChartIcon,
  MedalIcon,
  ShopCoinsIcon,
  StopwatchIcon,
  VintageCarIcon,
} from './GameIcons';

interface GameHUDProps {
  player: PlayerProfile;
  unreadMail: number;
  onlineCount: number;
  pendingMpAlerts: number;
  mpConnected: boolean;
  nowMs: number;
  onOpenModal: (modal: ModalType) => void;
  onQuickKnife: () => void;
  onQuickCar: () => void;
  onQuickChest: () => void;
  onVideoReward: () => void;
}

export const GameHUD: React.FC<GameHUDProps> = ({
  player,
  unreadMail,
  onlineCount,
  pendingMpAlerts,
  mpConnected,
  nowMs,
  onOpenModal,
  onQuickKnife,
  onQuickCar,
  onQuickChest,
  onVideoReward,
}) => {
  const missionMs = player.missionEndsAt ? Math.max(0, player.missionEndsAt - nowMs) : 0;

  return (
    <div className="pointer-events-none fixed inset-0 z-20 flex flex-col justify-between p-2.5 sm:p-4">
      {/* TOP BAR */}
      <div className="flex items-start justify-between gap-2">
        {/* Top-Left Player Identity + Stats */}
        <div className="pointer-events-auto flex items-start gap-2.5">
          {/* Avatar + Name + Diamonds + Chart */}
          <div className="flex flex-col items-center">
            <button
              type="button"
              onClick={() => {
                sound.playClick();
                onOpenModal('profile');
              }}
              aria-label="Open Player Profile"
              className="relative group cursor-pointer focus:outline-none"
            >
              <MafiaAvatarSvg className="w-14 h-14 sm:w-16 sm:h-16 drop-shadow-lg transition-transform group-hover:scale-105" />
            </button>
            <button
              type="button"
              onClick={() => {
                sound.playClick();
                onOpenModal('profile');
              }}
              className="-mt-2 px-2.5 py-0.5 rounded bg-black/90 border border-white/15 text-xs sm:text-sm font-bold italic text-white tracking-wide shadow cursor-pointer hover:border-amber-400/60"
            >
              {player.name}
            </button>
            <div className="mt-1 flex items-center gap-1.5">
              <div className="px-2.5 py-0.5 rounded bg-black/85 border border-white/10 text-xs font-mono-num font-bold text-white min-w-[38px] text-center">
                {player.diamonds}
              </div>
              <DiamondIcon className="w-5 h-5" />
              <button
                type="button"
                onClick={() => {
                  sound.playClick();
                  onOpenModal('trade');
                }}
                title="Contraband Market"
                className="ml-0.5 hover:scale-110 transition-transform cursor-pointer"
              >
                <MarketChartIcon className="w-8 h-6" />
              </button>
            </div>
          </div>

          {/* Health, Cash, Energy Stack */}
          <div className="flex flex-col gap-1.5 pt-0.5">
            <div className="flex items-center gap-1.5">
              <div className="min-w-[82px] sm:min-w-[92px] px-2.5 py-1 rounded bg-black/75 border border-white/10 text-center text-xs sm:text-sm font-mono-num font-bold text-white">
                {player.vitality}
              </div>
              <HeartbeatIcon className="w-6 h-6 sm:w-7 sm:h-7 shrink-0" />
            </div>
            <div className="flex items-center gap-1.5">
              <div className="min-w-[82px] sm:min-w-[92px] px-2.5 py-1 rounded bg-black/75 border border-white/10 text-center text-xs sm:text-sm font-mono-num font-bold text-white">
                {formatCash(player.cash)}
              </div>
              <CashStackIcon className="w-6 h-6 sm:w-7 sm:h-7 shrink-0" />
            </div>
            <div className="flex items-center gap-1.5">
              <div className="min-w-[82px] sm:min-w-[92px] px-2.5 py-1 rounded bg-black/75 border border-white/10 text-center text-xs sm:text-sm font-mono-num font-bold text-white">
                {player.energy}/{player.maxEnergy}
              </div>
              <EnergyIcon className="w-6 h-6 sm:w-7 sm:h-7 shrink-0" />
            </div>
          </div>
        </div>

        {/* Top-Center Mission Countdown Banner + Live Multiplayer Hub Button */}
        <div className="pointer-events-auto hidden xs:flex sm:flex items-center justify-center gap-2">
          <button
            type="button"
            onClick={() => {
              sound.playClick();
              onOpenModal('mission');
            }}
            className="px-4 py-1.5 rounded-lg bg-black/85 border border-white/15 text-sm sm:text-base font-bold text-white font-mono-num shadow-lg hover:border-amber-400/50 transition-colors cursor-pointer whitespace-nowrap"
          >
            {player.status === 'inMission' && missionMs > 0
              ? `In Mission ${formatCountdown(missionMs)}`
              : 'Missions Ready'}
          </button>

          <button
            type="button"
            onClick={() => {
              sound.playClick();
              onOpenModal('multiplayer');
            }}
            className="relative px-3.5 py-1.5 rounded-lg bg-[#2a1d14]/95 border border-amber-400/55 text-xs sm:text-sm font-bold text-amber-200 font-mono-num shadow-lg hover:bg-amber-500/20 transition cursor-pointer whitespace-nowrap flex items-center gap-2"
          >
            <span
              className={`w-2 h-2 rounded-full ${
                mpConnected ? 'bg-emerald-400' : 'bg-red-400'
              }`}
            />
            <span>Co-op &amp; PvP ({onlineCount})</span>
            {pendingMpAlerts > 0 && (
              <span className="px-1.5 py-0.5 rounded bg-red-600 text-[10px] font-bold text-white">
                {pendingMpAlerts}
              </span>
            )}
          </button>
        </div>

        {/* Top-Right Sidebar Icons */}
        <div className="pointer-events-auto flex flex-col items-end gap-2">
          <button
            type="button"
            onClick={() => {
              sound.playClick();
              onOpenModal('timers');
            }}
            title="Timers & Cooldowns"
            className="w-11 h-11 rounded-lg bg-[#c59b49]/90 border-2 border-[#451a03] flex items-center justify-center shadow-lg hover:brightness-110 active:scale-95 transition cursor-pointer"
          >
            <StopwatchIcon className="w-8 h-8" />
          </button>
          <button
            type="button"
            onClick={() => {
              sound.playClick();
              onOpenModal('medals');
            }}
            title="Rankings & Respect Leaderboard"
            className="w-11 h-11 rounded-lg bg-[#c59b49]/90 border-2 border-[#451a03] flex items-center justify-center shadow-lg hover:brightness-110 active:scale-95 transition cursor-pointer"
          >
            <MedalIcon className="w-8 h-8" />
          </button>
          <button
            type="button"
            onClick={() => {
              sound.playClick();
              onOpenModal('mail');
            }}
            title="Underworld Mail"
            className="relative w-10 h-10 rounded-lg bg-[#9c7a38]/85 border-2 border-[#451a03] flex items-center justify-center shadow-lg hover:brightness-110 active:scale-95 transition cursor-pointer"
          >
            <EnvelopeIcon className="w-6 h-6" />
            {unreadMail > 0 && (
              <span className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-red-600 text-[11px] font-bold flex items-center justify-center border border-black">
                {unreadMail}
              </span>
            )}
          </button>
          <button
            type="button"
            onClick={() => {
              sound.playClick();
              onOpenModal('settings');
            }}
            title="Settings & Controls"
            className="w-10 h-10 rounded-lg bg-[#9c7a38]/85 border-2 border-[#451a03] flex items-center justify-center shadow-lg hover:brightness-110 active:scale-95 transition cursor-pointer"
          >
            <GearsIcon className="w-6 h-6" />
          </button>
        </div>
      </div>

      {/* Mobile Mission + Multiplayer Buttons (only on very narrow screens) */}
      <div className="sm:hidden flex justify-center gap-2 -mt-4 pointer-events-auto">
        <button
          type="button"
          onClick={() => {
            sound.playClick();
            onOpenModal('mission');
          }}
          className="px-3 py-1 rounded bg-black/85 border border-white/15 text-xs font-mono-num font-bold text-white"
        >
          {player.status === 'inMission' && missionMs > 0
            ? `In Mission ${formatCountdown(missionMs)}`
            : 'Missions Ready'}
        </button>
        <button
          type="button"
          onClick={() => {
            sound.playClick();
            onOpenModal('multiplayer');
          }}
          className="px-3 py-1 rounded bg-[#2a1d14]/95 border border-amber-400/55 text-xs font-mono-num font-bold text-amber-200"
        >
          Co-op &amp; PvP ({onlineCount}){pendingMpAlerts > 0 ? ` · ${pendingMpAlerts}!` : ''}
        </button>
      </div>

      {/* BOTTOM & SIDE ACTION BARS */}
      <div className="flex items-end justify-between">
        {/* Left Quick-Action Stack + Menu */}
        <div className="pointer-events-auto flex flex-col items-start gap-2.5">
          <div className="flex flex-col items-center gap-2 ml-1">
            <button
              type="button"
              onClick={() => {
                sound.playClick();
                onOpenModal('pickpocket');
              }}
              title="Quick Pickpocket"
              className="w-10 h-10 rounded-lg bg-black/55 border border-white/15 flex items-center justify-center hover:scale-105 active:scale-95 transition cursor-pointer"
            >
              <CashStackIcon className="w-7 h-7" />
            </button>
            <button
              type="button"
              onClick={() => {
                sound.playClick();
                onQuickCar();
              }}
              title="Highway Getaway Mini-Game"
              className="w-10 h-10 rounded-lg bg-[#c59b49]/90 border-2 border-[#451a03] flex items-center justify-center shadow hover:brightness-110 active:scale-95 transition cursor-pointer"
            >
              <VintageCarIcon className="w-7 h-7" />
            </button>
            <button
              type="button"
              onClick={() => {
                sound.playClick();
                onQuickKnife();
              }}
              title="Knife Throw Mini-Game"
              className="w-10 h-10 rounded-lg bg-[#c59b49]/90 border-2 border-[#451a03] flex items-center justify-center shadow hover:brightness-110 active:scale-95 transition cursor-pointer"
            >
              <KnifeIcon className="w-7 h-7" />
            </button>
          </div>

          <div className="flex items-end gap-3">
            <button
              type="button"
              onClick={() => {
                sound.playClick();
                onOpenModal('menu');
              }}
              className="flex flex-col items-center group cursor-pointer"
            >
              <span className="w-14 h-14 rounded-lg bg-[#c59b49] border-2 border-[#451a03] flex items-center justify-center shadow-xl group-hover:brightness-110 active:scale-95 transition">
                <BulletsMenuIcon className="w-10 h-10" />
              </span>
              <span className="-mt-1.5 px-3 py-0.5 rounded bg-black/95 text-sm font-display font-bold italic tracking-wider text-white border border-white/10">
                Menu
              </span>
            </button>

            <button
              type="button"
              onClick={() => {
                sound.playClick();
                onQuickChest();
              }}
              title="Claim Harbor Chest"
              className="w-12 h-12 rounded-lg bg-black/50 border border-amber-400/35 flex items-center justify-center hover:scale-105 active:scale-95 transition cursor-pointer"
            >
              <ChestIcon className="w-9 h-9" />
            </button>
          </div>
        </div>

        {/* Bottom-Right Family, Shop & Video Reward */}
        <div className="pointer-events-auto flex items-end gap-3">
          <button
            type="button"
            onClick={() => {
              sound.playClick();
              onVideoReward();
            }}
            title="Sponsor Cash & Energy Drop"
            className="w-11 h-11 rounded-full bg-gradient-to-br from-amber-400 to-orange-600 border-2 border-amber-200/70 flex items-center justify-center shadow-xl hover:scale-105 active:scale-95 transition cursor-pointer"
          >
            <svg viewBox="0 0 24 24" className="w-5 h-5 fill-white">
              <path d="M15 8v8H5V8h10m1-2H4c-.55 0-1 .45-1 1v10c0 .55.45 1 1 1h12c.55 0 1-.45 1-1v-3.5l4 4v-11l-4 4V7c0-.55-.45-1-1-1z" />
            </svg>
          </button>

          <div className="flex flex-col items-center gap-2.5">
            <button
              type="button"
              onClick={() => {
                sound.playClick();
                onOpenModal('family');
              }}
              className="flex flex-col items-center group cursor-pointer"
            >
              <span className="w-12 h-12 rounded-lg bg-[#c59b49] border-2 border-[#451a03] flex items-center justify-center shadow-lg group-hover:brightness-110 active:scale-95 transition">
                <HandshakeIcon className="w-8 h-8" />
              </span>
              <span className="-mt-1.5 px-2.5 py-0.5 rounded bg-black/95 text-xs font-display font-bold italic tracking-wider text-white border border-white/10">
                Family
              </span>
            </button>

            <button
              type="button"
              onClick={() => {
                sound.playClick();
                onOpenModal('shop');
              }}
              className="flex flex-col items-center group cursor-pointer"
            >
              <span className="w-12 h-12 rounded-lg bg-[#c59b49] border-2 border-[#451a03] flex items-center justify-center shadow-lg group-hover:brightness-110 active:scale-95 transition">
                <ShopCoinsIcon className="w-8 h-8" />
              </span>
              <span className="-mt-1.5 px-2.5 py-0.5 rounded bg-black/95 text-xs font-display font-bold italic tracking-wider text-white border border-white/10">
                SHOP
              </span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
