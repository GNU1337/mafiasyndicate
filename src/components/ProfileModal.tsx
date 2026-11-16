import React, { useState } from 'react';
import type { PlayerProfile } from '../types/game';
import { sound } from '../utils/sound';
import { MafiaAvatarSvg } from './GameIcons';

interface ProfileModalProps {
  player: PlayerProfile;
  familyName: string;
  isSignedIn: boolean;
  onOpenAuth: () => void;
  onClose: () => void;
  onSaveProfile: (name: string, bio: string) => void;
}

export const ProfileModal: React.FC<ProfileModalProps> = ({
  player,
  familyName,
  isSignedIn,
  onOpenAuth,
  onClose,
  onSaveProfile,
}) => {
  const [editing, setEditing] = useState(false);
  const [nameInput, setNameInput] = useState(player.name);
  const [bioInput, setBioInput] = useState(player.bio);

  const stats: Array<[string, string | number]> = [
    ['Family:', familyName],
    ['Family Role:', player.role],
    ['Respect:', player.respect],
    ['Kills:', player.kills],
    ['Succesful Defenses:', player.successfulDefenses],
    ['HP:', player.hpStat],
    ['Attack:', player.attack],
    ['Defense:', player.defense],
    ['Status:', player.status],
  ];

  const handleSave = () => {
    sound.playClick();
    onSaveProfile(nameInput.trim() || player.name, bioInput.trim());
    setEditing(false);
  };

  return (
    <div
      className="fixed inset-0 z-40 flex items-center justify-center bg-black/55 p-3"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-[680px] rounded-2xl bg-[#111318]/95 border border-white/15 px-5 py-6 sm:px-8 sm:py-7 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          onClick={() => {
            sound.playClick();
            onClose();
          }}
          aria-label="Close Profile"
          className="absolute top-3 right-4 w-10 h-10 flex items-center justify-center text-white text-2xl font-bold hover:text-amber-300 cursor-pointer"
        >
          ✕
        </button>

        <div className="grid grid-cols-1 sm:grid-cols-[200px_1fr] gap-6 items-center">
          {/* Left Portrait + Edit Star */}
          <div className="flex flex-col items-center">
            {editing ? (
              <input
                type="text"
                value={nameInput}
                maxLength={18}
                onChange={(e) => setNameInput(e.target.value)}
                className="mb-2 w-40 px-2 py-1 rounded bg-black/70 border border-amber-400/60 text-center text-lg font-bold text-white focus:outline-none"
              />
            ) : (
              <h2 className="text-2xl font-bold text-white mb-2">{player.name}</h2>
            )}

            <MafiaAvatarSvg className="w-36 h-36 sm:w-44 sm:h-44 drop-shadow-xl" />

            <button
              type="button"
              onClick={() => {
                if (editing) {
                  handleSave();
                } else {
                  sound.playClick();
                  setEditing(true);
                }
              }}
              className="mt-3 flex flex-col items-center px-4 py-1.5 rounded-lg bg-black/45 border border-white/15 hover:border-amber-400/60 cursor-pointer transition"
            >
              <span className="text-2xl leading-none text-amber-400">★</span>
              <span className="text-xs font-semibold text-white mt-0.5">
                {editing ? 'Save' : 'Edit'}
              </span>
            </button>

            <button
              type="button"
              onClick={() => {
                sound.playClick();
                onOpenAuth();
              }}
              className="mt-2 px-3 py-1.5 rounded-lg bg-[#261a12] border border-amber-400/50 text-xs font-semibold text-amber-200 hover:bg-amber-500/20 cursor-pointer transition whitespace-nowrap"
            >
              {isSignedIn ? 'Switch / Sign Out' : 'Register / Sign In'}
            </button>
          </div>

          {/* Right Stat Rows */}
          <div className="space-y-1.5 text-base sm:text-lg">
            {stats.map(([label, val]) => (
              <div key={label} className="grid grid-cols-[1fr_130px] items-center gap-4">
                <span className="text-slate-200 font-medium">{label}</span>
                <span className="text-white font-semibold font-mono-num">{val}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Bottom Bio Bar matching IMG_0477 */}
        <div className="mt-5 rounded-xl bg-gradient-to-r from-white/15 via-white/10 to-white/15 border border-white/10 px-4 py-3">
          {editing ? (
            <input
              type="text"
              value={bioInput}
              maxLength={90}
              onChange={(e) => setBioInput(e.target.value)}
              placeholder="Write your mobster bio..."
              className="w-full bg-transparent text-sm text-white placeholder-slate-400 focus:outline-none"
            />
          ) : (
            <p className="text-sm text-slate-200 min-h-[20px]">{player.bio}</p>
          )}
        </div>
      </div>
    </div>
  );
};
