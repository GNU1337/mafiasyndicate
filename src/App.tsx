import React, { useCallback, useEffect, useState } from 'react';
import { AuthModal, type AuthAccountPayload } from './components/AuthModal';
import { CarDodgeGameOverlay } from './components/CarDodgeGameOverlay';
import { CityViewport3D } from './components/CityViewport3D';
import { FamilyModal } from './components/FamilyModal';
import { GameHUD } from './components/GameHUD';
import { KnifeGameOverlay } from './components/KnifeGameOverlay';
import { MenuModal } from './components/MenuModal';
import { MultiplayerModal, type MpTab } from './components/MultiplayerModal';
import { OperationsModals } from './components/OperationsModals';
import { ProfileModal } from './components/ProfileModal';
import { ConfirmDialog, ResultDialog } from './components/PromptDialogs';
import { TradeModal } from './components/TradeModal';
import {
  createInitialGameState,
  formatCash,
  loadSavedGameState,
  STORAGE_KEY,
} from './data/initialGameState';
import { type RewardGrantEvent, useMultiplayer } from './hooks/useMultiplayer';
import type {
  AutoTradeRule,
  ConfirmPromptState,
  FamilyRole,
  GameState,
  MiniGameType,
  ModalType,
  ResultPromptState,
  ShopItem,
  TradeRecord,
  WorldPin,
} from './types/game';
import { sound } from './utils/sound';

const AUTH_TOKEN_KEY = 'don_brojim_auth_token_v1';

export default function App() {
  const [gameState, setGameState] = useState<GameState>(() => loadSavedGameState());
  const [authToken, setAuthToken] = useState<string | null>(() => {
    try {
      return localStorage.getItem(AUTH_TOKEN_KEY);
    } catch {
      return null;
    }
  });
  const [authAccountId, setAuthAccountId] = useState<string | null>(null);
  const [authModalOpen, setAuthModalOpen] = useState<boolean>(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      const hasInvite = params.get('invite') === 'register';
      const hasToken = Boolean(localStorage.getItem(AUTH_TOKEN_KEY));
      return hasInvite && !hasToken;
    } catch {
      return false;
    }
  });
  const [activeModal, setActiveModal] = useState<ModalType>(null);
  const [mpInitialTab, setMpInitialTab] = useState<MpTab>('coop');
  const [mpToast, setMpToast] = useState<string | null>(null);
  const [selectedFamilyId, setSelectedFamilyId] = useState<string>('gambino');
  const [activeMiniGame, setActiveMiniGame] = useState<MiniGameType>(null);
  const [confirmPrompt, setConfirmPrompt] = useState<ConfirmPromptState | null>(null);
  const [resultPrompt, setResultPrompt] = useState<ResultPromptState | null>(null);
  const [nowMs, setNowMs] = useState<number>(() => Date.now());

  // Sync sound engine & localStorage persistence
  useEffect(() => {
    sound.enabled = gameState.soundEnabled;
    try {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({ ...gameState, lastSavedAt: Date.now() })
      );
    } catch {
      // Ignore storage quota errors
    }
  }, [gameState]);

  // Keep player's mirrored member record synced inside their crime family
  const syncPlayerInFamilies = useCallback(
    (
      families: GameState['families'],
      player: GameState['player']
    ): GameState['families'] => {
      const playerSlot = {
        id: 'm-player',
        name: player.name,
        role: player.role,
        respect: player.respect,
        attack: player.attack,
        defense: player.defense,
        kills: player.kills,
        isPlayer: true,
      };
      return families.map((fam) => {
        const filtered = fam.members.filter((m) => !m.isPlayer);
        if (fam.id === player.familyId) {
          return { ...fam, members: [...filtered, playerSlot] };
        }
        return filtered.length === fam.members.length ? fam : { ...fam, members: filtered };
      });
    },
    []
  );

  const applyMarketTick = useCallback(
    (
      prev: GameState,
      now: number,
      playerOverride?: GameState['player'],
      newsOverride?: GameState['news'],
      fee = 0
    ): {
      player: GameState['player'];
      contraband: GameState['contraband'];
      priceAlerts: GameState['priceAlerts'];
      autoTradeRules: GameState['autoTradeRules'];
      tradeHistory: GameState['tradeHistory'];
      news: GameState['news'];
      marketNextTickAt: number;
    } => {
      let workingPlayer = { ...(playerOverride ?? prev.player) };
      if (fee > 0) {
        workingPlayer.cash = Number(Math.max(0, workingPlayer.cash - fee).toFixed(2));
      }

      let workingContraband = prev.contraband.map((item) => {
        const volFactor =
          item.volatilityLabel === 'High'
            ? 0.28
            : item.volatilityLabel === 'Medium'
            ? 0.2
            : 0.14;
        const meanReversion = ((item.basePrice - item.currentPrice) / item.basePrice) * 0.22;
        const swing = 1 + meanReversion + (Math.random() - 0.5) * volFactor;
        const newPrice = Math.max(
          Math.round(item.basePrice * 0.55),
          Math.min(Math.round(item.basePrice * 1.65), Math.round(item.currentPrice * swing))
        );
        return {
          ...item,
          previousPrice: item.currentPrice,
          currentPrice: newPrice,
          priceHistory: [...item.priceHistory.slice(-23), newPrice],
        };
      });

      let workingNews = [...(newsOverride ?? prev.news)];
      const triggeredNames: string[] = [];
      const nextAlerts = prev.priceAlerts.map((alert) => {
        if (alert.triggered) return alert;
        const g = workingContraband.find((c) => c.id === alert.goodId);
        if (!g) return alert;
        const hit =
          (alert.condition === 'below' && g.currentPrice <= alert.targetPrice) ||
          (alert.condition === 'above' && g.currentPrice >= alert.targetPrice);
        if (hit) {
          triggeredNames.push(`${g.name} ($${formatCash(g.currentPrice)})`);
          return { ...alert, triggered: true };
        }
        return alert;
      });

      if (triggeredNames.length > 0) {
        workingNews = [
          {
            id: `n-alert-${now}`,
            timestamp: now,
            headline: `Market Alert Triggered: ${triggeredNames.join(', ')}`,
            category: 'market' as const,
          },
          ...workingNews,
        ].slice(0, 20);
      }

      let workingHistory: TradeRecord[] = [...prev.tradeHistory];
      const nextAutoRules: AutoTradeRule[] = prev.autoTradeRules.map((rule) => {
        if (!rule.enabled) return rule;
        const goodIdx = workingContraband.findIndex((c) => c.id === rule.goodId);
        if (goodIdx === -1) return rule;
        const good = workingContraband[goodIdx];
        const triggered =
          (rule.condition === 'below' && good.currentPrice <= rule.targetPrice) ||
          (rule.condition === 'above' && good.currentPrice >= rule.targetPrice);
        if (!triggered) return rule;

        if (rule.side === 'BUY') {
          const totalOwned = workingContraband.reduce((acc, g) => acc + g.owned, 0);
          const cargoFree = Math.max(0, prev.cargoCapacity - totalOwned);
          const maxAfford = Math.floor(workingPlayer.cash / Math.max(1, good.currentPrice));
          const wanted = rule.qty === 'ALL' ? cargoFree : rule.qty;
          const execQty = Math.min(wanted, cargoFree, maxAfford);
          if (execQty <= 0) return rule;

          const totalValue = Number((good.currentPrice * execQty).toFixed(2));
          const newQty = good.owned + execQty;
          const weightedAvg =
            newQty > 0 ? (good.owned * good.avgBuyPrice + execQty * good.currentPrice) / newQty : 0;

          workingPlayer = {
            ...workingPlayer,
            cash: Number((workingPlayer.cash - totalValue).toFixed(2)),
          };
          workingContraband = workingContraband.map((g, idx) =>
            idx === goodIdx
              ? {
                  ...g,
                  owned: newQty,
                  avgBuyPrice: Number(weightedAvg.toFixed(2)),
                  totalBought: g.totalBought + execQty,
                }
              : g
          );
          workingHistory = [
            {
              id: `tr-auto-${now}-${rule.id.slice(-4)}`,
              timestamp: now,
              goodId: good.id,
              goodName: `${good.name} (Auto)`,
              side: 'BUY' as const,
              qty: execQty,
              unitPrice: good.currentPrice,
              total: totalValue,
            },
            ...workingHistory,
          ].slice(0, 60);
          workingNews = [
            {
              id: `n-auto-${now}-${rule.id.slice(-4)}`,
              timestamp: now,
              headline: `Auto-Trade bought ${execQty}× ${good.name} @ $${formatCash(good.currentPrice)}.`,
              category: 'market' as const,
            },
            ...workingNews,
          ].slice(0, 20);
          return {
            ...rule,
            executedCount: rule.executedCount + 1,
            lastTriggeredAt: now,
            enabled: rule.repeat,
          };
        } else {
          const execQty = rule.qty === 'ALL' ? good.owned : Math.min(good.owned, rule.qty);
          if (execQty <= 0) return rule;

          const totalValue = Number((good.currentPrice * execQty).toFixed(2));
          const realizedDelta = Number(((good.currentPrice - good.avgBuyPrice) * execQty).toFixed(2));
          const respectGain = Math.max(1, Math.floor(execQty / 2));
          const rem = good.owned - execQty;

          workingPlayer = {
            ...workingPlayer,
            cash: Number((workingPlayer.cash + totalValue).toFixed(2)),
            respect: workingPlayer.respect + respectGain,
          };
          workingContraband = workingContraband.map((g, idx) =>
            idx === goodIdx
              ? {
                  ...g,
                  owned: rem,
                  avgBuyPrice: rem > 0 ? g.avgBuyPrice : 0,
                  totalSold: g.totalSold + execQty,
                  realizedProfit: Number((g.realizedProfit + realizedDelta).toFixed(2)),
                }
              : g
          );
          workingHistory = [
            {
              id: `tr-auto-${now}-${rule.id.slice(-4)}`,
              timestamp: now,
              goodId: good.id,
              goodName: `${good.name} (Auto)`,
              side: 'SELL' as const,
              qty: execQty,
              unitPrice: good.currentPrice,
              total: totalValue,
              realizedDelta,
            },
            ...workingHistory,
          ].slice(0, 60);
          workingNews = [
            {
              id: `n-auto-${now}-${rule.id.slice(-4)}`,
              timestamp: now,
              headline: `Auto-Trade sold ${execQty}× ${good.name} @ $${formatCash(good.currentPrice)} (${
                realizedDelta >= 0 ? '+' : '-'
              }$${formatCash(Math.abs(realizedDelta))}).`,
              category: 'market' as const,
            },
            ...workingNews,
          ].slice(0, 20);
          return {
            ...rule,
            executedCount: rule.executedCount + 1,
            lastTriggeredAt: now,
            enabled: rule.repeat,
          };
        }
      });

      return {
        player: workingPlayer,
        contraband: workingContraband,
        priceAlerts: nextAlerts,
        autoTradeRules: nextAutoRules,
        tradeHistory: workingHistory,
        news: workingNews,
        marketNextTickAt: now + 30 * 1000,
      };
    },
    []
  );

  // 1-second simulation tick: mission timer, energy regen, AI market/auto-trade/news
  useEffect(() => {
    let tickCounter = 0;
    const timer = window.setInterval(() => {
      const now = Date.now();
      setNowMs(now);
      tickCounter += 1;

      setGameState((prev) => {
        let changed = false;
        let nextPlayer = { ...prev.player };
        let nextNews = prev.news;
        let nextContraband = prev.contraband;

        // Check mission completion
        if (
          nextPlayer.status === 'inMission' &&
          nextPlayer.missionEndsAt &&
          now >= nextPlayer.missionEndsAt
        ) {
          changed = true;
          const cashGain = nextPlayer.missionRewardCash;
          const respGain = nextPlayer.missionRewardRespect;
          const completedName = nextPlayer.missionName ?? 'Mission';
          nextPlayer = {
            ...nextPlayer,
            status: 'Idle',
            missionEndsAt: null,
            missionName: null,
            cash: Number((nextPlayer.cash + cashGain).toFixed(2)),
            respect: nextPlayer.respect + respGain,
          };
          nextNews = [
            {
              id: `n-${now}`,
              timestamp: now,
              headline: `${nextPlayer.name} wrapped up "${completedName}" for $${formatCash(cashGain)} and +${respGain} Respect.`,
              category: 'crime' as const,
            },
            ...prev.news,
          ].slice(0, 20);
        }

        // Regenerate 1 energy every 45 seconds
        if (tickCounter % 45 === 0 && nextPlayer.energy < nextPlayer.maxEnergy) {
          changed = true;
          nextPlayer = {
            ...nextPlayer,
            energy: Math.min(nextPlayer.maxEnergy, nextPlayer.energy + 1),
          };
        }

        let nextAlerts = prev.priceAlerts;
        let nextAutoRules = prev.autoTradeRules;
        let nextTradeHistory = prev.tradeHistory;
        let nextMarketAt = prev.marketNextTickAt;

        // Market price drift, 24h rolling history, alert & Auto-Trade evaluation every 30s
        if (now >= prev.marketNextTickAt) {
          changed = true;
          const tickResult = applyMarketTick(prev, now, nextPlayer, nextNews, 0);
          nextPlayer = tickResult.player;
          nextContraband = tickResult.contraband;
          nextAlerts = tickResult.priceAlerts;
          nextAutoRules = tickResult.autoTradeRules;
          nextTradeHistory = tickResult.tradeHistory;
          nextNews = tickResult.news;
          nextMarketAt = tickResult.marketNextTickAt;
        }

        if (!changed) return prev;
        return {
          ...prev,
          player: nextPlayer,
          families: syncPlayerInFamilies(prev.families, nextPlayer),
          contraband: nextContraband,
          priceAlerts: nextAlerts,
          autoTradeRules: nextAutoRules,
          tradeHistory: nextTradeHistory,
          marketNextTickAt: nextMarketAt,
          news: nextNews,
        };
      });
    }, 1000);

    return () => window.clearInterval(timer);
  }, [applyMarketTick, syncPlayerInFamilies]);

  // Windows PC Escape key closes modals
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !activeMiniGame) {
        if (resultPrompt) setResultPrompt(null);
        else if (confirmPrompt) setConfirmPrompt(null);
        else if (activeModal) setActiveModal(null);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [activeMiniGame, activeModal, confirmPrompt, resultPrompt]);

  const showResult = (message: string, variant: 'mahogany' | 'dark' = 'mahogany') => {
    setResultPrompt({ message, variant });
  };

  const openKnifeFlow = () => {
    setActiveModal(null);
    setConfirmPrompt({
      message:
        "Someone's taking you for a little knife game—don't worry, it'll be over quick. (Reach 15 !)",
      okLabel: 'OK',
      closeLabel: 'Close',
      onConfirm: () => {
        setConfirmPrompt(null);
        setActiveMiniGame('knife');
      },
    });
  };

  const openCarFlow = () => {
    if (gameState.player.energy < 1) {
      showResult('Not enough energy to start a Highway Getaway! Visit the Pub or Hotel.');
      return;
    }
    setActiveModal(null);
    setGameState((prev) => ({
      ...prev,
      player: { ...prev.player, energy: prev.player.energy - 1 },
    }));
    setActiveMiniGame('car');
  };

  const handleKnifeFinish = useCallback(
    (won: boolean, score: number) => {
      setActiveMiniGame(null);
      const earnedRespect = won ? 45 : Math.max(2, score + 1);
      const earnedCash = won ? 250 : Math.max(6, score * 2 + 2);

      setGameState((prev) => {
        const nextPlayer = {
          ...prev.player,
          respect: prev.player.respect + earnedRespect,
          cash: Number((prev.player.cash + earnedCash).toFixed(2)),
          knifeBestScore: Math.max(prev.player.knifeBestScore, score),
        };
        return {
          ...prev,
          player: nextPlayer,
          families: syncPlayerInFamilies(prev.families, nextPlayer),
        };
      });

      if (won) {
        sound.playCash();
        showResult(
          `Sharp hand, Boss! You sank all 15 blades and earned ${earnedRespect} respect and ${earnedCash} money.`
        );
      } else {
        showResult(
          `Not your lucky night Pal... but hey, you earned ${earnedRespect} respect and ${earnedCash} money.`
        );
      }
    },
    [syncPlayerInFamilies]
  );

  const handleCarFinish = useCallback(
    (won: boolean, score: number) => {
      setActiveMiniGame(null);
      const earnedRespect = won ? 60 : Math.max(3, Math.floor(score * 0.75) + 2);
      const earnedCash = won ? 420 : Math.max(12, score * 4 + 6);

      setGameState((prev) => {
        const nextPlayer = {
          ...prev.player,
          respect: prev.player.respect + earnedRespect,
          cash: Number((prev.player.cash + earnedCash).toFixed(2)),
          carBestScore: Math.max(prev.player.carBestScore, score),
        };
        return {
          ...prev,
          player: nextPlayer,
          families: syncPlayerInFamilies(prev.families, nextPlayer),
        };
      });

      if (won) {
        sound.playCash();
        showResult(
          `Clean getaway! You cleared all 40 cars and hauled ${earnedRespect} respect and ${earnedCash} money.`
        );
      } else {
        showResult(
          `Wrecked on the avenue... but you still salvaged ${earnedRespect} respect and ${earnedCash} money.`
        );
      }
    },
    [syncPlayerInFamilies]
  );

  const handlePinSelect = (pin: WorldPin) => {
    if (pin.targetFamilyId) {
      setSelectedFamilyId(pin.targetFamilyId);
      setActiveModal('family');
    } else if (pin.targetModal) {
      setActiveModal(pin.targetModal);
    }
  };

  const handleQuickChest = () => {
    const now = Date.now();
    if (gameState.player.cooldowns.chestUntil > now) {
      showResult('Harbor chest is locked until the next shipment arrives.');
      return;
    }
    const cashBonus = 45 + Math.floor(Math.random() * 65);
    const diamondBonus = Math.random() < 0.45 ? 1 : 0;
    sound.playCash();
    setGameState((prev) => ({
      ...prev,
      player: {
        ...prev.player,
        cash: Number((prev.player.cash + cashBonus).toFixed(2)),
        diamonds: prev.player.diamonds + diamondBonus,
        cooldowns: { ...prev.player.cooldowns, chestUntil: now + 1000 * 60 * 5 },
      },
    }));
    showResult(
      `You cracked open the Harbor Chest and found $${formatCash(cashBonus)}${
        diamondBonus ? ' + 1 Diamond' : ''
      }!`
    );
  };

  const handleVideoReward = () => {
    const now = Date.now();
    if (gameState.player.cooldowns.videoRewardUntil > now) {
      showResult('Syndicate courier drop is already on cooldown. Check back in a couple minutes.');
      return;
    }
    sound.playCash();
    setGameState((prev) => ({
      ...prev,
      player: {
        ...prev.player,
        cash: Number((prev.player.cash + 65).toFixed(2)),
        energy: Math.min(prev.player.maxEnergy, prev.player.energy + 3),
        cooldowns: { ...prev.player.cooldowns, videoRewardUntil: now + 1000 * 60 * 3 },
      },
    }));
    showResult('Courier drop received: +$65,00 Cash and +3 Energy!');
  };

  const handleCrimeAction = (
    kind: 'pickpocket' | 'extortion' | 'defamation' | 'kill',
    targetIndex = 0
  ) => {
    const p = gameState.player;
    const energyCost =
      kind === 'pickpocket' ? targetIndex + 1 : kind === 'extortion' ? targetIndex + 2 : kind === 'defamation' ? 2 : 3;

    if (p.energy < energyCost) {
      showResult('Not enough energy! Grab a drink at the Pub or rest at the Hotel.');
      return;
    }

    if (kind === 'pickpocket') {
      const chances = [0.9, 0.72, 0.54];
      const minPayout = [18, 40, 85];
      const maxPayout = [38, 75, 150];
      const success = Math.random() < chances[targetIndex];
      const cashGain = success
        ? minPayout[targetIndex] + Math.random() * (maxPayout[targetIndex] - minPayout[targetIndex])
        : 0;
      const respGain = success ? 4 + targetIndex * 3 : 1;

      if (success) sound.playCash();
      setGameState((prev) => {
        const nextPlayer = {
          ...prev.player,
          energy: prev.player.energy - energyCost,
          cash: Number((prev.player.cash + cashGain).toFixed(2)),
          respect: prev.player.respect + respGain,
          vitality: success ? prev.player.vitality : Math.max(20, prev.player.vitality - 18),
        };
        return {
          ...prev,
          player: nextPlayer,
          families: syncPlayerInFamilies(prev.families, nextPlayer),
        };
      });

      showResult(
        success
          ? `Smooth hands! You lifted $${formatCash(cashGain)} and gained ${respGain} respect.`
          : 'The mark spotted your hand! You lost 18 Health escaping down the alley, +1 respect.'
      );
      return;
    }

    if (kind === 'extortion') {
      const minCut = [55, 90, 180];
      const maxCut = [95, 150, 290];
      const attackBoost = 1 + p.attack * 0.008;
      const cashGain =
        (minCut[targetIndex] + Math.random() * (maxCut[targetIndex] - minCut[targetIndex])) *
        attackBoost;
      const respGain = 8 + targetIndex * 5;

      sound.playCash();
      setGameState((prev) => {
        const nextPlayer = {
          ...prev.player,
          energy: prev.player.energy - energyCost,
          cash: Number((prev.player.cash + cashGain).toFixed(2)),
          respect: prev.player.respect + respGain,
        };
        return {
          ...prev,
          player: nextPlayer,
          families: syncPlayerInFamilies(prev.families, nextPlayer),
        };
      });

      showResult(
        `Protection fee paid in full: +$${formatCash(cashGain)} Cash and +${respGain} Respect.`
      );
      return;
    }

    if (kind === 'defamation') {
      const rivals = gameState.families.filter((f) => f.id !== p.familyId);
      const target = rivals[targetIndex] ?? rivals[0];
      sound.playClick();
      setGameState((prev) => {
        const nextPlayer = {
          ...prev.player,
          energy: prev.player.energy - energyCost,
          respect: prev.player.respect + 12,
        };
        const nextFamilies = prev.families.map((f) => {
          if (f.id === target.id) return { ...f, turfShare: Math.max(5, f.turfShare - 1) };
          if (f.id === p.familyId) return { ...f, turfShare: Math.min(45, f.turfShare + 1) };
          return f;
        });
        return {
          ...prev,
          player: nextPlayer,
          families: syncPlayerInFamilies(nextFamilies, nextPlayer),
          news: [
            {
              id: `n-${Date.now()}`,
              timestamp: Date.now(),
              headline: `Scandalous reels leaked against ${target.name} Crime Family—${p.name} claims +12 Respect.`,
              category: 'family' as const,
            },
            ...prev.news,
          ].slice(0, 20),
        };
      });
      showResult(`Press smear hit the papers! ${target.name} lost 1% turf and you earned +12 Respect.`);
      return;
    }

    if (kind === 'kill') {
      const rivals = gameState.families
        .filter((f) => f.id !== p.familyId)
        .map((f) => ({ fam: f, member: f.members[f.members.length - 1] }));
      const target = rivals[targetIndex] ?? rivals[0];
      const playerPower = p.attack + p.respect * 0.1 + Math.random() * 35;
      const targetPower = target.member.defense + Math.random() * 25;
      const won = playerPower >= targetPower;

      if (won) {
        sound.playVictory();
        const bounty = 140 + Math.floor(Math.random() * 110);
        setGameState((prev) => {
          const nextPlayer = {
            ...prev.player,
            energy: prev.player.energy - energyCost,
            kills: prev.player.kills + 1,
            respect: prev.player.respect + 24,
            cash: Number((prev.player.cash + bounty).toFixed(2)),
          };
          return {
            ...prev,
            player: nextPlayer,
            families: syncPlayerInFamilies(prev.families, nextPlayer),
            news: [
              {
                id: `n-${Date.now()}`,
                timestamp: Date.now(),
                headline: `${p.name} whacked ${target.member.name} (${target.fam.name}) in a midnight ambush!`,
                category: 'crime' as const,
              },
              ...prev.news,
            ].slice(0, 20),
          };
        });
        showResult(
          `Target eliminated! You whacked ${target.member.name}, earning $${formatCash(bounty)} and +24 Respect.`
        );
      } else {
        sound.playCrash();
        setGameState((prev) => ({
          ...prev,
          player: {
            ...prev.player,
            energy: prev.player.energy - energyCost,
            vitality: Math.max(15, prev.player.vitality - 55),
          },
        }));
        showResult(
          `${target.member.name} survived the ambush! Train your Attack or buy a revolver in the Shop (-55 Health).`
        );
      }
    }
  };

  const handleChangeFamilyRole = (
    familyId: string,
    memberId: string,
    newRole: FamilyRole | 'DEMOTE'
  ) => {
    const fam = gameState.families.find((f) => f.id === familyId);
    const target = fam?.members.find((m) => m.id === memberId);
    if (!fam || !target) return;

    if (newRole === 'DEMOTE') {
      sound.playClick();
      setGameState((prev) => {
        const nextPlayer =
          target.isPlayer ? { ...prev.player, role: 'Member' as FamilyRole } : prev.player;
        const nextFamilies = prev.families.map((f) => {
          if (f.id !== familyId) return f;
          return {
            ...f,
            boss: f.boss === target.name ? '' : f.boss,
            consig: f.consig === target.name ? '' : f.consig,
            capoAttack1: f.capoAttack1 === target.name ? '' : f.capoAttack1,
            capoAttack2: f.capoAttack2 === target.name ? '' : f.capoAttack2,
            capoDefense1: f.capoDefense1 === target.name ? '' : f.capoDefense1,
            capoDefense2: f.capoDefense2 === target.name ? '' : f.capoDefense2,
            members: f.members.map((m) => (m.id === memberId ? { ...m, role: 'Member' as FamilyRole } : m)),
          };
        });
        return { ...prev, player: nextPlayer, families: nextFamilies };
      });
      showResult(`${target.name} has been demoted to Member.`);
      return;
    }

    const reqRespect: Record<FamilyRole, number> = {
      Member: 0,
      'Capo Defense II': 150,
      'Capo Defense I': 220,
      'Capo Attack II': 300,
      'Capo Attack I': 420,
      Consiglieri: 650,
      Godfather: 1000,
    };

    if (target.isPlayer && target.respect < reqRespect[newRole]) {
      showResult(
        `Need at least ${reqRespect[newRole]} Respect to claim ${newRole} (you have ${target.respect}).`
      );
      return;
    }

    sound.playVictory();
    setGameState((prev) => {
      const nextPlayer = target.isPlayer ? { ...prev.player, role: newRole } : prev.player;
      const nextFamilies = prev.families.map((f) => {
        if (f.id !== familyId) return f;
        const slotPatch: Partial<typeof f> = {};
        if (newRole === 'Godfather') slotPatch.boss = target.name;
        if (newRole === 'Consiglieri') slotPatch.consig = target.name;
        if (newRole === 'Capo Attack I') slotPatch.capoAttack1 = target.name;
        if (newRole === 'Capo Attack II') slotPatch.capoAttack2 = target.name;
        if (newRole === 'Capo Defense I') slotPatch.capoDefense1 = target.name;
        if (newRole === 'Capo Defense II') slotPatch.capoDefense2 = target.name;

        return {
          ...f,
          ...slotPatch,
          members: f.members.map((m) => (m.id === memberId ? { ...m, role: newRole } : m)),
        };
      });
      return { ...prev, player: nextPlayer, families: nextFamilies };
    });
    showResult(`${target.name} promoted to ${newRole}!`);
  };

  const handleMultiplayerReward = useCallback(
    (grant: RewardGrantEvent) => {
      if (grant.cashDelta > 0) sound.playCash();
      else if (grant.vitalityDelta < 0) sound.playCrash();

      setGameState((prev) => {
        const nextPlayer = {
          ...prev.player,
          cash: Number(Math.max(0, prev.player.cash + grant.cashDelta).toFixed(2)),
          respect: Math.max(0, prev.player.respect + grant.respectDelta),
          kills: Math.max(0, prev.player.kills + grant.killsDelta),
          vitality: Math.max(
            15,
            Math.min(prev.player.maxVitality, prev.player.vitality + grant.vitalityDelta)
          ),
        };
        return {
          ...prev,
          player: nextPlayer,
          families: syncPlayerInFamilies(prev.families, nextPlayer),
          news: grant.message
            ? [
                {
                  id: `n-mp-${Date.now()}`,
                  timestamp: Date.now(),
                  headline: grant.message,
                  category: 'family' as const,
                },
                ...prev.news,
              ].slice(0, 20)
            : prev.news,
        };
      });

      if (grant.message) {
        setMpToast(grant.message);
      }
    },
    [syncPlayerInFamilies]
  );

  const handleMultiplayerToast = useCallback((msg: string) => {
    setMpToast(msg);
  }, []);

  const mp = useMultiplayer(
    gameState.player,
    handleMultiplayerReward,
    handleMultiplayerToast,
    authAccountId
  );

  // Restore saved account session on load if token exists
  useEffect(() => {
    if (!authToken) return;
    let cancelled = false;
    fetch('/api/auth/me', {
      headers: { Authorization: `Bearer ${authToken}` },
    })
      .then(async (res) => {
        if (!res.ok) throw new Error('unauthorized');
        return (await res.json()) as { account: AuthAccountPayload['account'] };
      })
      .then(({ account }) => {
        if (cancelled) return;
        setAuthAccountId(account.id);
        setGameState((prev) => {
          const base = createInitialGameState().player;
          const nextPlayer = {
            ...base,
            ...(account.profile ?? {}),
            name: account.username,
            familyId: account.profile?.familyId || account.familyId || prev.player.familyId,
          };
          return {
            ...prev,
            player: nextPlayer,
            families: syncPlayerInFamilies(prev.families, nextPlayer),
          };
        });
      })
      .catch(() => {
        if (cancelled) return;
        setAuthToken(null);
        setAuthAccountId(null);
        try {
          localStorage.removeItem(AUTH_TOKEN_KEY);
        } catch {
          // ignore
        }
      });
    return () => {
      cancelled = true;
    };
  }, [authToken, syncPlayerInFamilies]);

  // Periodically save signed-in player progress to server
  useEffect(() => {
    if (!authToken || !authAccountId) return;
    const id = window.setTimeout(() => {
      fetch('/api/auth/save', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({ profile: gameState.player }),
      }).catch(() => {
        // ignore transient network errors
      });
    }, 3000);
    return () => window.clearTimeout(id);
  }, [authToken, authAccountId, gameState.player]);

  const handleAuthSuccess = (payload: AuthAccountPayload, isNewRegistration: boolean) => {
    setAuthToken(payload.token);
    setAuthAccountId(payload.account.id);
    try {
      localStorage.setItem(AUTH_TOKEN_KEY, payload.token);
    } catch {
      // ignore
    }

    const fresh = createInitialGameState();
    setGameState((prev) => {
      const nextPlayer = isNewRegistration || !payload.account.profile
        ? {
            ...fresh.player,
            name: payload.account.username,
            familyId: payload.account.familyId,
            bio: `Fresh recruit in the ${payload.account.familyId.toUpperCase()} family.`,
            status: 'Idle' as const,
            missionEndsAt: null,
            missionName: null,
          }
        : {
            ...fresh.player,
            ...payload.account.profile,
            name: payload.account.username,
          };
      return {
        ...prev,
        player: nextPlayer,
        families: syncPlayerInFamilies(fresh.families, nextPlayer),
      };
    });

    setAuthModalOpen(false);
    setMpToast(
      isNewRegistration
        ? `Welcome to Harbor Town, ${payload.account.username}! Open Co-op & PvP to join your crew.`
        : `Welcome back, ${payload.account.username}!`
    );
  };

  const handleSignOut = () => {
    setAuthToken(null);
    setAuthAccountId(null);
    try {
      localStorage.removeItem(AUTH_TOKEN_KEY);
    } catch {
      // ignore
    }
    setMpToast('Signed out. Playing with local guest save.');
  };

  useEffect(() => {
    if (!mpToast) return;
    const id = window.setTimeout(() => setMpToast(null), 5500);
    return () => window.clearTimeout(id);
  }, [mpToast]);

  const unreadMail = gameState.mail.filter((m) => !m.read).length;
  const playerFamily =
    gameState.families.find((f) => f.id === gameState.player.familyId) ?? gameState.families[0];
  const onlineCount = mp.snapshot.players.filter((p) => p.online).length;
  const pendingMpAlerts = mp.snapshot.challenges.filter(
    (c) => c.status === 'pending' && c.targetId === mp.snapshot.selfId
  ).length;

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-[#060d19]">
      {/* 3D Night Harbor Town */}
      <CityViewport3D
        onPinSelect={handlePinSelect}
        onChestClick={handleQuickChest}
        paused={Boolean(activeModal || activeMiniGame || confirmPrompt || resultPrompt)}
      />

      {/* Live Multiplayer Notification Toast */}
      {mpToast && (
        <div className="fixed top-14 left-1/2 -translate-x-1/2 z-50 max-w-md w-[92vw]">
          <button
            type="button"
            onClick={() => {
              setMpToast(null);
              setActiveModal('multiplayer');
            }}
            className="w-full px-4 py-2.5 rounded-xl bg-[#261a12] border-2 border-amber-400/75 text-xs sm:text-sm font-semibold text-amber-100 shadow-2xl text-center hover:brightness-110 cursor-pointer"
          >
            {mpToast}
          </button>
        </div>
      )}

      {/* Top/Side/Bottom HUD */}
      <GameHUD
        player={gameState.player}
        unreadMail={unreadMail}
        onlineCount={onlineCount}
        pendingMpAlerts={pendingMpAlerts}
        mpConnected={mp.snapshot.connected}
        nowMs={nowMs}
        onOpenModal={(m) => {
          if (m === 'family') setSelectedFamilyId(gameState.player.familyId);
          setActiveModal(m);
        }}
        onQuickKnife={openKnifeFlow}
        onQuickCar={openCarFlow}
        onQuickChest={handleQuickChest}
        onVideoReward={handleVideoReward}
      />

      {/* 11-Tile Main Menu */}
      {activeModal === 'menu' && (
        <MenuModal
          onClose={() => setActiveModal(null)}
          onSelectAction={(action) => {
            if (action === 'knife') {
              openKnifeFlow();
            } else {
              setActiveModal(action);
            }
          }}
        />
      )}

      {/* Player Profile */}
      {activeModal === 'profile' && (
        <ProfileModal
          player={gameState.player}
          familyName={playerFamily.name}
          isSignedIn={Boolean(authAccountId)}
          onOpenAuth={() => setAuthModalOpen(true)}
          onClose={() => setActiveModal(null)}
          onSaveProfile={(name, bio) => {
            setGameState((prev) => {
              const nextPlayer = { ...prev.player, name, bio };
              return {
                ...prev,
                player: nextPlayer,
                families: syncPlayerInFamilies(prev.families, nextPlayer),
              };
            });
          }}
        />
      )}

      {/* Crime Family Modal */}
      {activeModal === 'family' && (
        <FamilyModal
          families={gameState.families}
          initialFamilyId={selectedFamilyId}
          player={gameState.player}
          onClose={() => setActiveModal(null)}
          onChangeRole={handleChangeFamilyRole}
        />
      )}

      {/* District, Crime, Market, Bank, Shop, Mail, Settings Modals */}
      <OperationsModals
        modal={activeModal}
        state={gameState}
        nowMs={nowMs}
        onClose={() => setActiveModal(null)}
        onCrimeAction={handleCrimeAction}
        onLaunchCarHeist={openCarFlow}
        onLaunchKnifeGame={openKnifeFlow}
        onStartMission={(name, durationMs, cashReward, respectReward) => {
          sound.playClick();
          setGameState((prev) => ({
            ...prev,
            player: {
              ...prev.player,
              status: 'inMission',
              missionName: name,
              missionEndsAt: Date.now() + durationMs,
              missionRewardCash: cashReward,
              missionRewardRespect: respectReward,
            },
          }));
          setActiveModal(null);
          showResult(`Deployed on "${name}". Watch the countdown banner at top-center!`);
        }}
        onFinishMissionNow={() => {
          if (gameState.player.energy < 2) {
            showResult('Need 2 Energy to speed up and complete your mission immediately.');
            return;
          }
          sound.playVictory();
          const cashGain = gameState.player.missionRewardCash;
          const respGain = gameState.player.missionRewardRespect;
          setGameState((prev) => {
            const nextPlayer = {
              ...prev.player,
              energy: prev.player.energy - 2,
              status: 'Idle' as const,
              missionEndsAt: null,
              missionName: null,
              cash: Number((prev.player.cash + cashGain).toFixed(2)),
              respect: prev.player.respect + respGain,
            };
            return {
              ...prev,
              player: nextPlayer,
              families: syncPlayerInFamilies(prev.families, nextPlayer),
            };
          });
          showResult(`Mission completed! Earned $${formatCash(cashGain)} and +${respGain} Respect.`);
        }}
        onHotelRest={(tier) => {
          const cost = tier === 'room' ? 45 : 110;
          if (gameState.player.cash < cost) {
            showResult(`Need $${formatCash(cost)} Cash for the Hotel.`);
            return;
          }
          sound.playCash();
          setGameState((prev) => ({
            ...prev,
            player: {
              ...prev.player,
              cash: Number((prev.player.cash - cost).toFixed(2)),
              vitality:
                tier === 'suite'
                  ? prev.player.maxVitality
                  : Math.min(prev.player.maxVitality, prev.player.vitality + 120),
              energy:
                tier === 'suite'
                  ? prev.player.maxEnergy
                  : Math.min(prev.player.maxEnergy, prev.player.energy + 4),
            },
          }));
          showResult(
            tier === 'suite'
              ? 'Penthouse rest complete—Health & Energy fully restored!'
              : 'Rested up: +120 Health and +4 Energy.'
          );
        }}
        onTrainStat={(stat) => {
          if (gameState.player.cash < 40 || gameState.player.energy < 1) {
            showResult('Training requires $40,00 Cash and 1 Energy.');
            return;
          }
          sound.playClick();
          setGameState((prev) => {
            const nextPlayer = {
              ...prev.player,
              cash: Number((prev.player.cash - 40).toFixed(2)),
              energy: prev.player.energy - 1,
              attack: stat === 'attack' ? prev.player.attack + 3 : prev.player.attack,
              defense: stat === 'defense' ? prev.player.defense + 3 : prev.player.defense,
              hpStat: stat === 'hp' ? prev.player.hpStat + 5 : prev.player.hpStat,
              maxVitality: stat === 'hp' ? prev.player.maxVitality + 15 : prev.player.maxVitality,
              vitality: stat === 'hp' ? prev.player.vitality + 15 : prev.player.vitality,
            };
            return {
              ...prev,
              player: nextPlayer,
              families: syncPlayerInFamilies(prev.families, nextPlayer),
            };
          });
        }}
        onBankAction={(action, amount) => {
          if (amount <= 0) return;
          if (action === 'deposit') {
            if (gameState.player.cash < amount) {
              showResult('Insufficient cash on hand to deposit.');
              return;
            }
            sound.playCash();
            setGameState((prev) => ({
              ...prev,
              player: {
                ...prev.player,
                cash: Number((prev.player.cash - amount).toFixed(2)),
                bankBalance: Number((prev.player.bankBalance + amount).toFixed(2)),
              },
            }));
          } else {
            if (gameState.player.bankBalance < amount) {
              showResult('Insufficient funds in the Harbor Bank vault.');
              return;
            }
            sound.playCash();
            setGameState((prev) => ({
              ...prev,
              player: {
                ...prev.player,
                cash: Number((prev.player.cash + amount).toFixed(2)),
                bankBalance: Number((prev.player.bankBalance - amount).toFixed(2)),
              },
            }));
          }
        }}
        onPubDrink={(tier) => {
          const cost = tier === 'bourbon' ? 30 : 75;
          if (gameState.player.cash < cost) {
            showResult(`Need $${formatCash(cost)} Cash for the bartender.`);
            return;
          }
          sound.playCash();
          const eGain = tier === 'bourbon' ? 3 : 7;
          const rGain = tier === 'bourbon' ? 2 : 8;
          setGameState((prev) => {
            const nextPlayer = {
              ...prev.player,
              cash: Number((prev.player.cash - cost).toFixed(2)),
              energy: Math.min(prev.player.maxEnergy, prev.player.energy + eGain),
              respect: prev.player.respect + rGain,
            };
            return {
              ...prev,
              player: nextPlayer,
              families: syncPlayerInFamilies(prev.families, nextPlayer),
            };
          });
          showResult(`Cheers! Restored +${eGain} Energy and gained +${rGain} Respect.`);
        }}
        onBuyShopItem={(item: ShopItem) => {
          if (item.priceDiamonds && gameState.player.diamonds < item.priceDiamonds) {
            showResult(`Need ${item.priceDiamonds} Diamonds for ${item.name}.`);
            return;
          }
          if (item.priceCash && gameState.player.cash < item.priceCash) {
            showResult(`Need $${formatCash(item.priceCash)} Cash for ${item.name}.`);
            return;
          }
          sound.playCash();
          setGameState((prev) => {
            const nextPlayer = {
              ...prev.player,
              cash: Number((prev.player.cash - (item.priceCash ?? 0)).toFixed(2)),
              diamonds: prev.player.diamonds - (item.priceDiamonds ?? 0),
              attack: prev.player.attack + item.attackBonus,
              defense: prev.player.defense + item.defenseBonus,
              hpStat: prev.player.hpStat + item.hpBonus,
              maxVitality: prev.player.maxVitality + item.hpBonus * 2,
              vitality: prev.player.vitality + item.hpBonus * 2,
              ownedItems: {
                ...prev.player.ownedItems,
                [item.id]: (prev.player.ownedItems[item.id] ?? 0) + 1,
              },
            };
            return {
              ...prev,
              player: nextPlayer,
              families: syncPlayerInFamilies(prev.families, nextPlayer),
            };
          });
          showResult(`Purchased ${item.name}! Combat stats upgraded.`);
        }}
        onDominationRaid={(targetFamId) => {
          if (gameState.player.energy < 2) {
            showResult('Need 2 Energy to launch a Turf Raid.');
            return;
          }
          const target = gameState.families.find((f) => f.id === targetFamId);
          if (!target) return;
          sound.playVictory();
          setGameState((prev) => {
            const nextPlayer = {
              ...prev.player,
              energy: prev.player.energy - 2,
              respect: prev.player.respect + 15,
              cash: Number((prev.player.cash + 85).toFixed(2)),
            };
            const nextFamilies = prev.families.map((f) => {
              if (f.id === targetFamId) return { ...f, turfShare: Math.max(4, f.turfShare - 2) };
              if (f.id === prev.player.familyId) return { ...f, turfShare: Math.min(50, f.turfShare + 2) };
              return f;
            });
            return {
              ...prev,
              player: nextPlayer,
              families: syncPlayerInFamilies(nextFamilies, nextPlayer),
              news: [
                {
                  id: `n-${Date.now()}`,
                  timestamp: Date.now(),
                  headline: `${prev.player.name} raided ${target.name} blocks, seizing 2% city turf!`,
                  category: 'turf' as const,
                },
                ...prev.news,
              ].slice(0, 20),
            };
          });
          showResult(`Turf Raid succeeded against ${target.name}! +$85,00 Cash & +15 Respect.`);
        }}
        onMarkMailRead={(mailId) => {
          setGameState((prev) => ({
            ...prev,
            mail: prev.mail.map((m) => (m.id === mailId ? { ...m, read: true } : m)),
          }));
        }}
        onToggleSound={() => {
          setGameState((prev) => ({ ...prev, soundEnabled: !prev.soundEnabled }));
        }}
        onResetSave={() => {
          setActiveModal(null);
          setConfirmPrompt({
            message: 'Reset your Don BroJim career save back to starting stats?',
            okLabel: 'Reset',
            closeLabel: 'Cancel',
            onConfirm: () => {
              setConfirmPrompt(null);
              const fresh = createInitialGameState();
              setGameState(fresh);
              showResult('Career save reset to Day 1.');
            },
          });
        }}
        onClaimLuckyReward={() => {
          setActiveModal(null);
          handleQuickChest();
        }}
        onOpenMultiplayer={(tab) => {
          setMpInitialTab(tab);
          setActiveModal('multiplayer');
        }}
      />

      {/* Live WebSocket Multiplayer Hub (Co-op Missions, PvP, Turf Wars, City Chat) */}
      {activeModal === 'multiplayer' && (
        <MultiplayerModal
          snapshot={mp.snapshot}
          player={gameState.player}
          families={gameState.families}
          nowMs={nowMs}
          initialTab={mpInitialTab}
          onClose={() => setActiveModal(null)}
          onSendChat={mp.sendChat}
          onChallengePvp={mp.challengePvp}
          onRespondPvp={mp.respondPvp}
          onCreateCoop={mp.createCoopRoom}
          onJoinCoop={mp.joinCoopRoom}
          onLeaveCoop={mp.leaveCoopRoom}
          onToggleCoopReady={mp.toggleCoopReady}
          onLaunchCoop={mp.launchCoopRoom}
          onPerformCoopAction={mp.performCoopAction}
          onRaidTurf={mp.raidMultiplayerTurf}
          onShowToast={handleMultiplayerToast}
          onOpenAuth={() => setAuthModalOpen(true)}
          isSignedIn={Boolean(authAccountId)}
        />
      )}

      {/* Mobster Registration & Login Modal */}
      {authModalOpen && (
        <AuthModal
          families={gameState.families}
          initialMode="register"
          currentUsername={gameState.player.name}
          isSignedIn={Boolean(authAccountId)}
          onSuccess={handleAuthSuccess}
          onSignOut={handleSignOut}
          onClose={() => setAuthModalOpen(false)}
        />
      )}

      {/* Redesigned Contraband Exchange (Trade Desk) */}
      {activeModal === 'trade' && (
        <TradeModal
          state={gameState}
          nowMs={nowMs}
          onClose={() => setActiveModal(null)}
          onExecuteTrade={(goodId, side, qty) => {
            const good = gameState.contraband.find((g) => g.id === goodId);
            if (!good || qty <= 0) return;
            const totalUnits = gameState.contraband.reduce((acc, g) => acc + g.owned, 0);
            const totalValue = Number((good.currentPrice * qty).toFixed(2));

            if (side === 'BUY') {
              if (totalUnits + qty > gameState.cargoCapacity) {
                showResult(`Cargo hold full! Expand capacity or sell crates first (${totalUnits}/${gameState.cargoCapacity}).`);
                return;
              }
              if (gameState.player.cash < totalValue) {
                showResult(`Need $${formatCash(totalValue)} Cash to buy ${qty}× ${good.name}.`);
                return;
              }
              sound.playCash();
              setGameState((prev) => ({
                ...prev,
                player: {
                  ...prev.player,
                  cash: Number((prev.player.cash - totalValue).toFixed(2)),
                },
                contraband: prev.contraband.map((g) => {
                  if (g.id !== goodId) return g;
                  const newQty = g.owned + qty;
                  const weightedAvg =
                    newQty > 0
                      ? (g.owned * g.avgBuyPrice + qty * g.currentPrice) / newQty
                      : 0;
                  return {
                    ...g,
                    owned: newQty,
                    avgBuyPrice: Number(weightedAvg.toFixed(2)),
                    totalBought: g.totalBought + qty,
                  };
                }),
                tradeHistory: [
                  {
                    id: `tr-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
                    timestamp: Date.now(),
                    goodId: good.id,
                    goodName: good.name,
                    side: 'BUY' as const,
                    qty,
                    unitPrice: good.currentPrice,
                    total: totalValue,
                  },
                  ...prev.tradeHistory,
                ].slice(0, 60),
              }));
            } else {
              if (good.owned < qty) return;
              sound.playCash();
              const realizedDelta = Number(
                ((good.currentPrice - good.avgBuyPrice) * qty).toFixed(2)
              );
              const respectGain = Math.max(1, Math.floor(qty / 2));
              setGameState((prev) => {
                const nextPlayer = {
                  ...prev.player,
                  cash: Number((prev.player.cash + totalValue).toFixed(2)),
                  respect: prev.player.respect + respectGain,
                };
                return {
                  ...prev,
                  player: nextPlayer,
                  families: syncPlayerInFamilies(prev.families, nextPlayer),
                  contraband: prev.contraband.map((g) => {
                    if (g.id !== goodId) return g;
                    const rem = g.owned - qty;
                    return {
                      ...g,
                      owned: rem,
                      avgBuyPrice: rem > 0 ? g.avgBuyPrice : 0,
                      totalSold: g.totalSold + qty,
                      realizedProfit: Number((g.realizedProfit + realizedDelta).toFixed(2)),
                    };
                  }),
                  tradeHistory: [
                    {
                      id: `tr-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
                      timestamp: Date.now(),
                      goodId: good.id,
                      goodName: good.name,
                      side: 'SELL' as const,
                      qty,
                      unitPrice: good.currentPrice,
                      total: totalValue,
                      realizedDelta,
                    },
                    ...prev.tradeHistory,
                  ].slice(0, 60),
                };
              });
            }
          }}
          onRefreshMarket={() => {
            if (gameState.player.cash < 5) {
              showResult('Need $5,00 Cash to bribe harbor scouts for fresh quotes.');
              return;
            }
            const now = Date.now();
            setGameState((prev) => {
              const tickResult = applyMarketTick(prev, now, prev.player, prev.news, 5);
              return {
                ...prev,
                player: tickResult.player,
                families: syncPlayerInFamilies(prev.families, tickResult.player),
                contraband: tickResult.contraband,
                priceAlerts: tickResult.priceAlerts,
                autoTradeRules: tickResult.autoTradeRules,
                tradeHistory: tickResult.tradeHistory,
                news: tickResult.news,
                marketNextTickAt: tickResult.marketNextTickAt,
              };
            });
          }}
          onUpgradeCargo={() => {
            if (gameState.player.cash < 200) {
              showResult('Need $200,00 Cash to expand your harbor cargo hold by +10 crates.');
              return;
            }
            sound.playCash();
            setGameState((prev) => ({
              ...prev,
              player: {
                ...prev.player,
                cash: Number((prev.player.cash - 200).toFixed(2)),
              },
              cargoCapacity: prev.cargoCapacity + 10,
            }));
          }}
          onAddAlert={(goodId, condition, targetPrice) => {
            const g = gameState.contraband.find((c) => c.id === goodId);
            if (!g) return;
            setGameState((prev) => ({
              ...prev,
              priceAlerts: [
                {
                  id: `al-${Date.now()}`,
                  goodId: g.id,
                  goodName: g.name,
                  condition,
                  targetPrice,
                  triggered: false,
                },
                ...prev.priceAlerts,
              ].slice(0, 12),
            }));
          }}
          onRemoveAlert={(alertId) => {
            setGameState((prev) => ({
              ...prev,
              priceAlerts: prev.priceAlerts.filter((a) => a.id !== alertId),
            }));
          }}
          onAddAutoTrade={(rule) => {
            setGameState((prev) => ({
              ...prev,
              autoTradeRules: [
                {
                  ...rule,
                  id: `at-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
                  executedCount: 0,
                },
                ...prev.autoTradeRules,
              ].slice(0, 16),
            }));
          }}
          onToggleAutoTrade={(ruleId) => {
            setGameState((prev) => ({
              ...prev,
              autoTradeRules: prev.autoTradeRules.map((r) =>
                r.id === ruleId ? { ...r, enabled: !r.enabled } : r
              ),
            }));
          }}
          onRemoveAutoTrade={(ruleId) => {
            setGameState((prev) => ({
              ...prev,
              autoTradeRules: prev.autoTradeRules.filter((r) => r.id !== ruleId),
            }));
          }}
        />
      )}

      {/* Playable Arcade Mini-Games */}
      {activeMiniGame === 'knife' && (
        <KnifeGameOverlay
          onClose={() => setActiveMiniGame(null)}
          onFinish={handleKnifeFinish}
        />
      )}

      {activeMiniGame === 'car' && (
        <CarDodgeGameOverlay
          onClose={() => setActiveMiniGame(null)}
          onFinish={handleCarFinish}
        />
      )}

      {/* Confirmation & Result Popups */}
      {confirmPrompt && (
        <ConfirmDialog
          prompt={confirmPrompt}
          onCancel={() => setConfirmPrompt(null)}
        />
      )}

      {resultPrompt && (
        <ResultDialog
          result={resultPrompt}
          onClose={() => setResultPrompt(null)}
        />
      )}
    </div>
  );
}
