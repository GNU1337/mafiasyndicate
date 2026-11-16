import React, { useState } from 'react';
import type { CrimeFamily, FamilyRole, PlayerProfile } from '../types/game';
import { sound } from '../utils/sound';
import { FamilyCrestBanner } from './GameIcons';

interface FamilyModalProps {
  families: CrimeFamily[];
  initialFamilyId: string;
  player: PlayerProfile;
  onClose: () => void;
  onChangeRole: (familyId: string, memberId: string, newRole: FamilyRole | 'DEMOTE') => void;
}

type FamilyTab = 'info' | 'members' | 'promote';

export const FamilyModal: React.FC<FamilyModalProps> = ({
  families,
  initialFamilyId,
  player,
  onClose,
  onChangeRole,
}) => {
  const [selectedFamilyId, setSelectedFamilyId] = useState(initialFamilyId);
  const [tab, setTab] = useState<FamilyTab>('info');

  const family = families.find((f) => f.id === selectedFamilyId) ?? families[0];
  const isPlayerFamily = family.id === player.familyId;

  const [targetMemberId, setTargetMemberId] = useState<string>(() => {
    const playerMem = family.members.find((m) => m.isPlayer);
    return playerMem ? playerMem.id : family.members[0]?.id ?? '';
  });

  const sortedMembers = [...family.members].sort((a, b) => b.respect - a.respect);
  const top5 = sortedMembers.slice(0, 5);
  const selectedMember =
    family.members.find((m) => m.id === targetMemberId) ??
    family.members.find((m) => m.isPlayer) ??
    family.members[0];

  const slots: Array<[string, string]> = [
    ['BOSS :', family.boss],
    ['CONSIG :', family.consig],
    ['CAPO  ATTACK I  :', family.capoAttack1],
    ['CAPO  ATTACK II :', family.capoAttack2],
    ['CAPO DEFENCE I :', family.capoDefense1],
    ['CAPO DEFENCE II :', family.capoDefense2],
  ];

  return (
    <div
      className="fixed inset-0 z-40 flex items-center justify-center bg-black/55 p-3"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-[700px] rounded-2xl bg-[#111318]/95 border border-white/15 px-4 py-5 sm:px-7 sm:py-6 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          onClick={() => {
            sound.playClick();
            onClose();
          }}
          aria-label="Close Family Modal"
          className="absolute top-3 right-4 w-10 h-10 flex items-center justify-center text-white text-2xl font-bold hover:text-amber-300 cursor-pointer"
        >
          ✕
        </button>

        {/* Family Switcher Strip */}
        <div className="flex flex-wrap items-center gap-1.5 mb-3 pr-8">
          {families.map((f) => (
            <button
              key={f.id}
              type="button"
              onClick={() => {
                sound.playClick();
                setSelectedFamilyId(f.id);
                const p = f.members.find((m) => m.isPlayer) ?? f.members[0];
                if (p) setTargetMemberId(p.id);
              }}
              className={`px-2.5 py-1 rounded text-xs font-semibold transition cursor-pointer ${
                f.id === family.id
                  ? 'bg-amber-500 text-black'
                  : 'bg-white/10 text-slate-300 hover:bg-white/20'
              }`}
            >
              {f.name}
            </button>
          ))}
        </div>

        <h2 className="text-center font-display text-2xl sm:text-3xl font-bold text-white tracking-wide mb-3">
          {family.fullTitle}
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-[150px_1fr] gap-4 items-start">
          {/* Left Crest & Tab Stack matching IMG_0473 / IMG_0475 */}
          <div className="flex sm:flex-col items-center justify-between gap-2">
            <FamilyCrestBanner color={family.crestColor} emblem={family.emblem} />

            <div className="flex sm:flex-col gap-2 w-full">
              {(
                [
                  ['info', 'Fam Info'],
                  ['members', 'Members'],
                  ['promote', 'Promote'],
                ] as const
              ).map(([key, label]) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => {
                    sound.playClick();
                    setTab(key);
                  }}
                  className={`flex-1 sm:w-full py-2 px-3 rounded-lg border text-sm font-bold transition cursor-pointer whitespace-nowrap ${
                    tab === key
                      ? 'bg-gradient-to-b from-zinc-600 to-zinc-800 border-amber-400/70 text-white shadow'
                      : 'bg-gradient-to-b from-zinc-700/70 to-zinc-900/80 border-white/20 text-slate-200 hover:border-white/40'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* Right Framed Content Box */}
          <div className="rounded-xl border-2 border-white/65 bg-black/50 p-4 sm:p-5 min-h-[285px] flex flex-col justify-between">
            {tab === 'info' && (
              <>
                <div className="space-y-2.5">
                  {slots.map(([label, holder]) => (
                    <div key={label} className="grid grid-cols-[160px_1fr] items-center gap-3">
                      <span className="text-right font-display font-bold text-base sm:text-lg text-white tracking-wide">
                        {label}
                      </span>
                      <div className="h-8 rounded-md bg-gradient-to-b from-zinc-600/80 to-zinc-800/90 border border-white/15 px-3 flex items-center text-sm font-semibold text-amber-200 shadow-inner">
                        {holder || '—'}
                      </div>
                    </div>
                  ))}
                </div>
                <div className="mt-4 pt-2 border-t border-white/10 text-xs sm:text-sm text-slate-200 text-center">
                  <span className="font-semibold text-slate-300">Top 5 Members: </span>
                  <span className="font-medium text-white">
                    {top5.map((m) => m.name).join('   ')}
                  </span>
                </div>
              </>
            )}

            {tab === 'members' && (
              <div className="max-h-[260px] overflow-y-auto mafia-scroll space-y-1.5 pr-1">
                {sortedMembers.map((m) => (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => {
                      sound.playClick();
                      setTargetMemberId(m.id);
                    }}
                    className={`w-full flex items-center justify-between px-3 py-2 rounded-lg border text-left transition cursor-pointer ${
                      m.id === selectedMember?.id
                        ? 'bg-amber-500/20 border-amber-400/70'
                        : 'bg-white/5 border-white/10 hover:bg-white/10'
                    }`}
                  >
                    <div>
                      <span className="font-bold text-sm text-white">
                        {m.name} {m.isPlayer ? '(You)' : ''}
                      </span>
                      <span className="ml-2 text-xs text-amber-300">{m.role}</span>
                    </div>
                    <div className="text-xs font-mono-num text-slate-300">
                      Resp: {m.respect} · ATK {m.attack} · DEF {m.defense}
                    </div>
                  </button>
                ))}
              </div>
            )}

            {tab === 'promote' && (
              <div className="flex flex-col gap-3">
                {!isPlayerFamily ? (
                  <div className="text-center text-sm text-slate-300 py-8">
                    You belong to the <strong className="text-amber-300">{player.familyId.toUpperCase()}</strong> family. Switch to your family to claim promotions.
                  </div>
                ) : (
                  <>
                    <div className="flex items-center justify-between gap-2 text-xs text-slate-300">
                      <span>Target Member:</span>
                      <select
                        value={selectedMember?.id}
                        onChange={(e) => setTargetMemberId(e.target.value)}
                        className="bg-zinc-900 border border-white/20 rounded px-2 py-1 text-white text-xs"
                      >
                        {family.members.map((m) => (
                          <option key={m.id} value={m.id}>
                            {m.name} ({m.role} · {m.respect} Resp)
                          </option>
                        ))}
                      </select>
                    </div>

                    <button
                      type="button"
                      onClick={() => selectedMember && onChangeRole(family.id, selectedMember.id, 'Godfather')}
                      className="w-full py-2 rounded-lg bg-gradient-to-b from-zinc-600 to-zinc-800 border border-white/25 text-sm font-bold text-white hover:brightness-110 cursor-pointer"
                    >
                      Promote to Godfather
                    </button>
                    <button
                      type="button"
                      onClick={() => selectedMember && onChangeRole(family.id, selectedMember.id, 'Consiglieri')}
                      className="w-full py-2 rounded-lg bg-gradient-to-b from-zinc-600 to-zinc-800 border border-white/25 text-sm font-bold text-white hover:brightness-110 cursor-pointer"
                    >
                      Promote to Consiglieri
                    </button>

                    <div className="grid grid-cols-2 gap-2">
                      {(
                        [
                          ['Capo Attack I', 'Promote to Capo Attack I'],
                          ['Capo Attack II', 'Promote to Capo Attack II'],
                          ['Capo Defense I', 'Promote to Capo Defense I'],
                          ['Capo Defense II', 'Promote to Capo Defense II'],
                        ] as const
                      ).map(([role, label]) => (
                        <button
                          key={role}
                          type="button"
                          onClick={() => selectedMember && onChangeRole(family.id, selectedMember.id, role)}
                          className="py-2 px-2 rounded-lg bg-gradient-to-b from-zinc-600 to-zinc-800 border border-white/25 text-xs sm:text-sm font-bold text-white hover:brightness-110 cursor-pointer whitespace-nowrap"
                        >
                          {label}
                        </button>
                      ))}
                    </div>

                    <div className="flex justify-center pt-1">
                      <button
                        type="button"
                        onClick={() => selectedMember && onChangeRole(family.id, selectedMember.id, 'DEMOTE')}
                        className="px-10 py-2 rounded-lg bg-gradient-to-b from-red-800 to-red-950 border border-red-400/40 text-sm font-bold text-white hover:brightness-110 cursor-pointer"
                      >
                        Demote
                      </button>
                    </div>
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
