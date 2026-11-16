import React from 'react';
import type { ConfirmPromptState, ResultPromptState } from '../types/game';
import { sound } from '../utils/sound';

export const ConfirmDialog: React.FC<{
  prompt: ConfirmPromptState;
  onCancel: () => void;
}> = ({ prompt, onCancel }) => (
  <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/55 p-4">
    <div className="w-full max-w-[460px] rounded-2xl bg-[#34363b]/95 border border-white/15 px-6 py-7 text-center shadow-2xl">
      <p className="text-lg sm:text-xl font-bold text-white leading-snug mb-6">
        {prompt.message}
      </p>
      <div className="flex items-center justify-center gap-6">
        <button
          type="button"
          onClick={() => {
            sound.playClick();
            prompt.onConfirm();
          }}
          className="min-w-[130px] py-2 px-5 rounded-xl bg-black/75 border-2 border-white/85 text-lg font-bold text-white hover:bg-amber-600/30 transition cursor-pointer"
        >
          {prompt.okLabel ?? 'OK'}
        </button>
        <button
          type="button"
          onClick={() => {
            sound.playClick();
            onCancel();
          }}
          className="min-w-[130px] py-2 px-5 rounded-xl bg-black/75 border-2 border-white/85 text-lg font-bold text-white hover:bg-white/15 transition cursor-pointer"
        >
          {prompt.closeLabel ?? 'Close'}
        </button>
      </div>
    </div>
  </div>
);

export const ResultDialog: React.FC<{
  result: ResultPromptState;
  onClose: () => void;
}> = ({ result, onClose }) => {
  const bgClass =
    result.variant === 'dark'
      ? 'bg-[#2c2e33]/95 border-white/20'
      : 'bg-[#48260e]/95 border-amber-900/60';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/55 p-4">
      <div className={`w-full max-w-[460px] rounded-2xl border px-6 py-7 text-center shadow-2xl ${bgClass}`}>
        <p className="text-lg sm:text-xl font-bold text-white leading-snug mb-6">
          {result.message}
        </p>
        <button
          type="button"
          onClick={() => {
            sound.playClick();
            onClose();
          }}
          className="min-w-[140px] py-2 px-6 rounded-xl bg-black/75 border-2 border-white/85 text-lg font-bold text-white hover:bg-white/15 transition cursor-pointer"
        >
          OK
        </button>
      </div>
    </div>
  );
};
