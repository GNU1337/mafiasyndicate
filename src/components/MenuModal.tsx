import React from 'react';
import type { ModalType } from '../types/game';
import { sound } from '../utils/sound';
import {
  BrassKnucklesIcon,
  DefamationCameraIcon,
  HotelIcon,
  KnifeIcon,
  MissionLampIcon,
  PickpocketIcon,
  RevolverIcon,
  TradeIcon,
  TrainingFistIcon,
  TutorialBookIcon,
  VintageCarIcon,
} from './GameIcons';

interface MenuModalProps {
  onClose: () => void;
  onSelectAction: (action: ModalType | 'knife') => void;
}

interface TileConfig {
  id: ModalType | 'knife';
  label: string;
  icon: React.ReactNode;
}

const TOP_ROW: TileConfig[] = [
  { id: 'pickpocket', label: 'Pickpocket', icon: <PickpocketIcon className="w-10 h-10" /> },
  { id: 'extortion', label: 'Extortion', icon: <BrassKnucklesIcon className="w-10 h-10" /> },
  { id: 'tutorial', label: 'Tutorial', icon: <TutorialBookIcon className="w-10 h-10" /> },
];

const MIDDLE_ROW: TileConfig[] = [
  { id: 'heist', label: 'Heist', icon: <VintageCarIcon className="w-10 h-10" /> },
  { id: 'knife', label: 'Knife', icon: <KnifeIcon className="w-10 h-10" /> },
  { id: 'trade', label: 'Trade', icon: <TradeIcon className="w-10 h-10" /> },
  { id: 'defamation', label: 'Defamation', icon: <DefamationCameraIcon className="w-10 h-10" /> },
];

const BOTTOM_ROW: TileConfig[] = [
  { id: 'mission', label: 'Mission', icon: <MissionLampIcon className="w-10 h-10" /> },
  { id: 'hotel', label: 'Hotel', icon: <HotelIcon className="w-10 h-10" /> },
  { id: 'kill', label: 'Kill', icon: <RevolverIcon className="w-10 h-10" /> },
  { id: 'training', label: 'Training', icon: <TrainingFistIcon className="w-10 h-10" /> },
];

function MenuTile({
  tile,
  onClick,
}: {
  tile: TileConfig;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={() => {
        sound.playClick();
        onClick();
      }}
      className="flex flex-col items-center group cursor-pointer focus:outline-none"
    >
      <span className="w-14 h-14 sm:w-16 sm:h-16 rounded-xl bg-[#b99142] border-[3px] border-[#0a0a0a] shadow-lg flex items-center justify-center group-hover:brightness-110 group-active:scale-95 transition">
        {tile.icon}
      </span>
      <span className="-mt-2 px-3 py-0.5 rounded bg-black text-xs sm:text-sm font-display font-bold italic tracking-wide text-white border border-white/10 shadow whitespace-nowrap">
        {tile.label}
      </span>
    </button>
  );
}

export const MenuModal: React.FC<MenuModalProps> = ({ onClose, onSelectAction }) => {
  return (
    <div
      className="fixed inset-0 z-40 flex items-center justify-center bg-black/45 p-3"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-[540px] rounded-2xl bg-[#342319]/95 border-[6px] border-[#450a0a] px-4 py-6 sm:px-8 sm:py-8 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          onClick={() => {
            sound.playClick();
            onClose();
          }}
          aria-label="Close Menu"
          className="absolute top-3 right-4 w-10 h-10 flex items-center justify-center text-white text-2xl font-bold hover:text-amber-300 cursor-pointer"
        >
          ✕
        </button>

        <div className="flex flex-col items-center gap-6 mt-2">
          <div className="grid grid-cols-3 gap-5 sm:gap-8">
            {TOP_ROW.map((tile) => (
              <MenuTile key={tile.label} tile={tile} onClick={() => onSelectAction(tile.id)} />
            ))}
          </div>
          <div className="grid grid-cols-4 gap-3 sm:gap-6">
            {MIDDLE_ROW.map((tile) => (
              <MenuTile key={tile.label} tile={tile} onClick={() => onSelectAction(tile.id)} />
            ))}
          </div>
          <div className="grid grid-cols-4 gap-3 sm:gap-6">
            {BOTTOM_ROW.map((tile) => (
              <MenuTile key={tile.label} tile={tile} onClick={() => onSelectAction(tile.id)} />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
