import React from 'react';

export const MafiaAvatarSvg: React.FC<{ className?: string }> = ({ className = 'w-12 h-12' }) => (
  <svg viewBox="0 0 120 120" className={className} aria-hidden="true">
    <circle cx="60" cy="60" r="58" fill="#ffffff" stroke="#000000" strokeWidth="4" />
    {/* Suit shoulders */}
    <path d="M22 110 C24 86 40 76 60 76 C80 76 96 86 98 110 Z" fill="#09090b" />
    {/* White shirt V */}
    <polygon points="48,76 72,76 60,104" fill="#ffffff" />
    {/* Red tie */}
    <polygon points="57,78 63,78 65,100 60,108 55,100" fill="#dc2626" />
    {/* Face & neck */}
    <rect x="52" y="62" width="16" height="16" fill="#ffffff" stroke="#09090b" strokeWidth="2.5" />
    <path d="M44 46 C44 63 50 70 60 70 C70 70 76 63 76 46 Z" fill="#ffffff" stroke="#09090b" strokeWidth="2.5" />
    {/* Jaw shadow & nose/mouth */}
    <path d="M56 54 L60 58 L62 56" fill="none" stroke="#09090b" strokeWidth="2" strokeLinecap="round" />
    <path d="M54 63 Q60 65 66 63" fill="none" stroke="#09090b" strokeWidth="2" strokeLinecap="round" />
    {/* Fedora shadow across eyes */}
    <path d="M44 43 L76 43 L74 50 L46 50 Z" fill="#09090b" />
    {/* Fedora brim & crown */}
    <ellipse cx="60" cy="41" rx="31" ry="7" fill="#09090b" />
    <path d="M39 40 L45 19 Q60 14 75 19 L81 40 Z" fill="#09090b" />
    <path d="M42 35 L78 35" stroke="#27272a" strokeWidth="3" />
    {/* Hand adjusting tie */}
    <circle cx="64" cy="84" r="5" fill="#ffffff" stroke="#09090b" strokeWidth="2" />
  </svg>
);

export const HeartbeatIcon: React.FC<{ className?: string }> = ({ className = 'w-7 h-7' }) => (
  <svg viewBox="0 0 36 36" className={className} aria-hidden="true">
    <path
      d="M18 31s-12-7.5-12-16.5C6 9.5 10 6 14.5 6c2.5 0 4.5 1.3 5.5 3.2C21 7.3 23 6 25.5 6 30 6 34 9.5 34 14.5 34 23.5 18 31 18 31z"
      transform="translate(-2 0)"
      fill="#b91c1c"
      stroke="#fca5a5"
      strokeWidth="1.2"
    />
    <polyline
      points="4,17 11,17 14,10 18,24 22,13 25,17 32,17"
      fill="none"
      stroke="#facc15"
      strokeWidth="2.2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

export const CashStackIcon: React.FC<{ className?: string }> = ({ className = 'w-7 h-7' }) => (
  <svg viewBox="0 0 36 36" className={className} aria-hidden="true">
    <rect x="4" y="18" width="26" height="10" rx="1.5" fill="#4d7c66" stroke="#1f3a2e" strokeWidth="1.2" />
    <rect x="6" y="13" width="26" height="10" rx="1.5" fill="#6aa387" stroke="#1f3a2e" strokeWidth="1.2" />
    <rect x="8" y="8" width="26" height="10" rx="1.5" fill="#86c2a3" stroke="#1f3a2e" strokeWidth="1.2" />
    <rect x="17" y="8" width="7" height="20" fill="#e5e7eb" opacity="0.85" />
    <circle cx="20.5" cy="13" r="2.2" fill="#2d5744" />
  </svg>
);

export const EnergyIcon: React.FC<{ className?: string }> = ({ className = 'w-7 h-7' }) => (
  <svg viewBox="0 0 36 36" className={className} aria-hidden="true">
    <circle cx="18" cy="18" r="14" fill="none" stroke="#4ade80" strokeWidth="2.4" strokeDasharray="38 6" />
    <polygon points="20,7 11,19 18,19 16,29 25,16 18,16" fill="#4ade80" stroke="#dcfce7" strokeWidth="1" />
  </svg>
);

export const DiamondIcon: React.FC<{ className?: string }> = ({ className = 'w-6 h-6' }) => (
  <svg viewBox="0 0 36 36" className={className} aria-hidden="true">
    <polygon points="8,11 24,11 29,17 16,30 3,17" fill="#fbbf24" stroke="#fef08a" strokeWidth="1.4" />
    <polygon points="8,11 16,17 24,11" fill="#fde68a" />
    <polygon points="16,17 16,30 29,17" fill="#d97706" />
    <polygon points="22,6 32,6 34,10 27,18 20,10" fill="#f59e0b" stroke="#fef3c7" strokeWidth="1" />
  </svg>
);

export const MarketChartIcon: React.FC<{ className?: string }> = ({ className = 'w-9 h-7' }) => (
  <svg viewBox="0 0 44 32" className={className} aria-hidden="true">
    <rect x="8" y="3" width="33" height="23" rx="3" fill="#422006" stroke="#d97706" strokeWidth="1.8" />
    <path d="M13 8 V21 M21 8 V21 M29 8 V21 M36 8 V21 M11 13 H38 M11 18 H38" stroke="#92400e" strokeWidth="1" />
    <polyline points="12,20 19,15 26,17 36,8" fill="none" stroke="#facc15" strokeWidth="2.2" strokeLinecap="round" />
    <circle cx="11" cy="22" r="7" fill="#f59e0b" stroke="#fef08a" strokeWidth="1.5" />
    <text x="11" y="25.5" textAnchor="middle" fontSize="10" fontWeight="bold" fill="#422006">$</text>
  </svg>
);

export const BulletsMenuIcon: React.FC<{ className?: string }> = ({ className = 'w-9 h-9' }) => (
  <svg viewBox="0 0 40 40" className={className} aria-hidden="true">
    {[10, 20, 30].map((x) => (
      <g key={x}>
        <rect x={x - 3} y="15" width="6" height="19" rx="1" fill="#b45309" stroke="#451a03" strokeWidth="1" />
        <path d={`M${x - 3} 15 L${x} 6 L${x + 3} 15 Z`} fill="#fde68a" stroke="#451a03" strokeWidth="0.9" />
      </g>
    ))}
  </svg>
);

export const VintageCarIcon: React.FC<{ className?: string }> = ({ className = 'w-8 h-8' }) => (
  <svg viewBox="0 0 40 40" className={className} aria-hidden="true">
    <path d="M8 22 L12 12 L27 12 L31 20 L35 22 L35 28 L5 28 L5 23 Z" fill="#78532a" stroke="#1c1108" strokeWidth="1.4" />
    <rect x="14" y="14" width="6" height="6" fill="#fef3c7" opacity="0.7" />
    <rect x="22" y="14" width="5" height="6" fill="#fef3c7" opacity="0.7" />
    <circle cx="11" cy="29" r="4.5" fill="#18181b" stroke="#d4a373" strokeWidth="1.5" />
    <circle cx="29" cy="29" r="4.5" fill="#18181b" stroke="#d4a373" strokeWidth="1.5" />
  </svg>
);

export const KnifeIcon: React.FC<{ className?: string }> = ({ className = 'w-8 h-8' }) => (
  <svg viewBox="0 0 40 40" className={className} aria-hidden="true">
    <g transform="rotate(42 20 20)">
      <path d="M17 6 L20 2 L23 6 L23 22 L17 22 Z" fill="#cbd5e1" stroke="#334155" strokeWidth="1.2" />
      <line x1="20" y1="6" x2="20" y2="21" stroke="#94a3b8" strokeWidth="1" />
      <rect x="14" y="22" width="12" height="3" rx="1" fill="#78350f" />
      <rect x="17.5" y="25" width="5" height="10" rx="1.2" fill="#92400e" stroke="#451a03" strokeWidth="1" />
    </g>
  </svg>
);

export const PickpocketIcon: React.FC<{ className?: string }> = ({ className = 'w-8 h-8' }) => (
  <svg viewBox="0 0 40 40" className={className} aria-hidden="true">
    <path
      d="M15 34 L15 22 L11 16 L13 14 L17 18 L17 8 L20 8 L20 17 L22 6 L25 6 L25 17 L27 8 L30 9 L28 21 L27 34 Z"
      fill="#94a3b8"
      stroke="#1e293b"
      strokeWidth="1.4"
      strokeLinejoin="round"
    />
  </svg>
);

export const BrassKnucklesIcon: React.FC<{ className?: string }> = ({ className = 'w-8 h-8' }) => (
  <svg viewBox="0 0 40 40" className={className} aria-hidden="true">
    <path
      d="M6 17 C6 12 34 12 34 17 L34 23 C34 27 28 29 20 29 C12 29 6 27 6 23 Z"
      fill="#92400e"
      stroke="#271406"
      strokeWidth="1.5"
    />
    {[11, 17, 23, 29].map((cx) => (
      <circle key={cx} cx={cx} cy="19" r="2.6" fill="#facc15" stroke="#451a03" strokeWidth="1" />
    ))}
  </svg>
);

export const TutorialBookIcon: React.FC<{ className?: string }> = ({ className = 'w-8 h-8' }) => (
  <svg viewBox="0 0 40 40" className={className} aria-hidden="true">
    <path d="M7 11 L24 7 L33 13 L33 30 L16 34 L7 28 Z" fill="#fef3c7" stroke="#451a03" strokeWidth="1.5" />
    <path d="M7 11 L16 17 L33 13" fill="none" stroke="#78350f" strokeWidth="1.5" />
    <line x1="16" y1="17" x2="16" y2="34" stroke="#78350f" strokeWidth="1.5" />
    <line x1="19" y1="21" x2="29" y2="18.5" stroke="#92400e" strokeWidth="1.3" />
    <line x1="19" y1="25" x2="29" y2="22.5" stroke="#92400e" strokeWidth="1.3" />
  </svg>
);

export const TradeIcon: React.FC<{ className?: string }> = ({ className = 'w-8 h-8' }) => (
  <svg viewBox="0 0 40 40" className={className} aria-hidden="true">
    <g transform="rotate(-18 20 20)">
      <rect x="6" y="13" width="24" height="13" rx="2" fill="#3f6212" stroke="#1a2e05" strokeWidth="1.5" />
      <circle cx="18" cy="19.5" r="4" fill="#bef264" />
    </g>
    <rect x="11" y="19" width="23" height="12" rx="2" fill="#65a30d" stroke="#1a2e05" strokeWidth="1.5" />
    <circle cx="22.5" cy="25" r="3.5" fill="#ecfccb" />
  </svg>
);

export const DefamationCameraIcon: React.FC<{ className?: string }> = ({ className = 'w-8 h-8' }) => (
  <svg viewBox="0 0 40 40" className={className} aria-hidden="true">
    <circle cx="15" cy="12" r="5" fill="#92400e" stroke="#1c1917" strokeWidth="1.4" />
    <circle cx="25" cy="12" r="5" fill="#92400e" stroke="#1c1917" strokeWidth="1.4" />
    <rect x="11" y="17" width="16" height="10" rx="2" fill="#78350f" stroke="#1c1917" strokeWidth="1.4" />
    <polygon points="27,20 34,17 34,27 27,24" fill="#b45309" stroke="#1c1917" strokeWidth="1.2" />
    <line x1="16" y1="27" x2="11" y2="35" stroke="#451a03" strokeWidth="2.2" />
    <line x1="20" y1="27" x2="20" y2="35" stroke="#451a03" strokeWidth="2.2" />
    <line x1="24" y1="27" x2="29" y2="35" stroke="#451a03" strokeWidth="2.2" />
  </svg>
);

export const MissionLampIcon: React.FC<{ className?: string }> = ({ className = 'w-8 h-8' }) => (
  <svg viewBox="0 0 40 40" className={className} aria-hidden="true">
    <rect x="18.5" y="16" width="3" height="19" fill="#451a03" />
    <path d="M10 16 L30 16" stroke="#451a03" strokeWidth="2" />
    <polygon points="9,12 13,12 12,17 10,17" fill="#fef08a" stroke="#78350f" strokeWidth="1" />
    <polygon points="27,12 31,12 30,17 28,17" fill="#fef08a" stroke="#78350f" strokeWidth="1" />
    <polygon points="18,8 22,8 21,14 19,14" fill="#fef08a" stroke="#78350f" strokeWidth="1" />
  </svg>
);

export const HotelIcon: React.FC<{ className?: string }> = ({ className = 'w-8 h-8' }) => (
  <svg viewBox="0 0 40 40" className={className} aria-hidden="true">
    <polygon points="20,6 5,19 35,19" fill="#92400e" stroke="#271406" strokeWidth="1.5" />
    <rect x="9" y="19" width="22" height="15" fill="#d6b88d" stroke="#271406" strokeWidth="1.5" />
    <rect x="17" y="24" width="6" height="10" fill="#5c3a21" />
    <rect x="12" y="22" width="3.5" height="3.5" fill="#fef08a" />
    <rect x="24.5" y="22" width="3.5" height="3.5" fill="#fef08a" />
  </svg>
);

export const RevolverIcon: React.FC<{ className?: string }> = ({ className = 'w-8 h-8' }) => (
  <svg viewBox="0 0 40 40" className={className} aria-hidden="true">
    <path d="M6 16 L28 16 L28 20 L18 20 L14 32 L8 30 L12 20 L6 20 Z" fill="#475569" stroke="#0f172a" strokeWidth="1.4" />
    <rect x="13" y="14" width="7" height="6" rx="1" fill="#64748b" stroke="#0f172a" strokeWidth="1.2" />
    <rect x="28" y="17" width="8" height="2.6" fill="#94a3b8" />
  </svg>
);

export const TrainingFistIcon: React.FC<{ className?: string }> = ({ className = 'w-8 h-8' }) => (
  <svg viewBox="0 0 40 40" className={className} aria-hidden="true">
    <path
      d="M11 18 C11 13 28 13 28 18 L28 26 C28 29 24 32 19 32 L14 32 C11 32 9 28 9 24 Z"
      fill="#d6b88d"
      stroke="#271406"
      strokeWidth="1.5"
    />
    <line x1="15" y1="15" x2="15" y2="21" stroke="#451a03" strokeWidth="1.3" />
    <line x1="20" y1="15" x2="20" y2="21" stroke="#451a03" strokeWidth="1.3" />
    <line x1="24" y1="15" x2="24" y2="21" stroke="#451a03" strokeWidth="1.3" />
  </svg>
);

export const ChestIcon: React.FC<{ className?: string }> = ({ className = 'w-9 h-9' }) => (
  <svg viewBox="0 0 40 40" className={className} aria-hidden="true">
    <rect x="6" y="16" width="28" height="16" rx="2" fill="#92400e" stroke="#451a03" strokeWidth="1.5" />
    <path d="M6 16 C6 10 34 10 34 16 Z" fill="#b45309" stroke="#451a03" strokeWidth="1.5" />
    <rect x="17" y="15" width="6" height="8" rx="1" fill="#facc15" stroke="#78350f" strokeWidth="1.2" />
    <line x1="11" y1="12" x2="11" y2="32" stroke="#fbbf24" strokeWidth="2.2" />
    <line x1="29" y1="12" x2="29" y2="32" stroke="#fbbf24" strokeWidth="2.2" />
  </svg>
);

export const StopwatchIcon: React.FC<{ className?: string }> = ({ className = 'w-8 h-8' }) => (
  <svg viewBox="0 0 40 40" className={className} aria-hidden="true">
    <rect x="17" y="4" width="6" height="4" rx="1" fill="#d97706" />
    <circle cx="20" cy="22" r="13" fill="#fef3c7" stroke="#92400e" strokeWidth="2.4" />
    <line x1="20" y1="22" x2="20" y2="14" stroke="#1c1917" strokeWidth="2" strokeLinecap="round" />
    <line x1="20" y1="22" x2="26" y2="24" stroke="#b91c1c" strokeWidth="1.8" strokeLinecap="round" />
  </svg>
);

export const MedalIcon: React.FC<{ className?: string }> = ({ className = 'w-8 h-8' }) => (
  <svg viewBox="0 0 40 40" className={className} aria-hidden="true">
    <polygon points="12,5 20,5 17,17 11,17" fill="#dc2626" />
    <polygon points="20,5 28,5 29,17 23,17" fill="#b91c1c" />
    <circle cx="20" cy="24" r="10" fill="#fbbf24" stroke="#78350f" strokeWidth="1.8" />
    <circle cx="20" cy="24" r="6.5" fill="none" stroke="#fef08a" strokeWidth="1.2" />
  </svg>
);

export const EnvelopeIcon: React.FC<{ className?: string }> = ({ className = 'w-7 h-7' }) => (
  <svg viewBox="0 0 40 40" className={className} aria-hidden="true">
    <rect x="5" y="10" width="30" height="20" rx="2" fill="#f8fafc" stroke="#334155" strokeWidth="1.8" />
    <polyline points="5,11 20,23 35,11" fill="none" stroke="#475569" strokeWidth="1.8" />
  </svg>
);

export const GearsIcon: React.FC<{ className?: string }> = ({ className = 'w-7 h-7' }) => (
  <svg viewBox="0 0 40 40" className={className} aria-hidden="true">
    <circle cx="16" cy="22" r="7" fill="#b45309" stroke="#fef3c7" strokeWidth="2" strokeDasharray="3 2" />
    <circle cx="16" cy="22" r="2.8" fill="#271406" />
    <circle cx="27" cy="14" r="5.5" fill="#d97706" stroke="#fef3c7" strokeWidth="1.8" strokeDasharray="3 2" />
    <circle cx="27" cy="14" r="2" fill="#271406" />
  </svg>
);

export const HandshakeIcon: React.FC<{ className?: string }> = ({ className = 'w-8 h-8' }) => (
  <svg viewBox="0 0 40 40" className={className} aria-hidden="true">
    <path d="M5 17 L13 13 L21 20 L16 26 L8 23 Z" fill="#e5b887" stroke="#271406" strokeWidth="1.4" />
    <path d="M35 17 L27 13 L19 20 L24 26 L32 23 Z" fill="#d4a373" stroke="#271406" strokeWidth="1.4" />
    <line x1="16" y1="22" x2="21" y2="27" stroke="#451a03" strokeWidth="1.4" />
  </svg>
);

export const ShopCoinsIcon: React.FC<{ className?: string }> = ({ className = 'w-8 h-8' }) => (
  <svg viewBox="0 0 40 40" className={className} aria-hidden="true">
    <circle cx="15" cy="13" r="8" fill="#fbbf24" stroke="#78350f" strokeWidth="1.5" />
    <text x="15" y="16.5" textAnchor="middle" fontSize="9" fontWeight="bold" fill="#78350f">X</text>
    <ellipse cx="14" cy="29" rx="7" ry="3" fill="#f59e0b" stroke="#78350f" strokeWidth="1.2" />
    <ellipse cx="14" cy="25" rx="7" ry="3" fill="#fbbf24" stroke="#78350f" strokeWidth="1.2" />
    <ellipse cx="27" cy="30" rx="7" ry="3" fill="#f59e0b" stroke="#78350f" strokeWidth="1.2" />
    <ellipse cx="27" cy="26" rx="7" ry="3" fill="#fbbf24" stroke="#78350f" strokeWidth="1.2" />
    <ellipse cx="27" cy="22" rx="7" ry="3" fill="#fde047" stroke="#78350f" strokeWidth="1.2" />
  </svg>
);

export const FamilyCrestBanner: React.FC<{ color: string; emblem: string }> = ({ color, emblem }) => (
  <div className="relative w-24 h-36 mx-auto flex items-center justify-center">
    <svg viewBox="0 0 100 150" className="w-full h-full drop-shadow-lg" aria-hidden="true">
      <path
        d="M12 8 L88 8 L85 110 L72 138 L60 118 L48 144 L36 120 L22 136 L14 112 Z"
        fill={color}
        stroke="#1f1235"
        strokeWidth="3"
      />
      {emblem === 'dice' && (
        <g transform="translate(22,34)">
          <rect x="2" y="10" width="26" height="26" rx="4" transform="rotate(-12 15 23)" fill="#93c5fd" stroke="#0f172a" strokeWidth="2.5" />
          <circle cx="10" cy="18" r="2.2" fill="#0f172a" />
          <circle cx="20" cy="26" r="2.2" fill="#0f172a" />
          <rect x="26" y="22" width="28" height="28" rx="4" transform="rotate(14 40 36)" fill="#ffffff" stroke="#0f172a" strokeWidth="2.5" />
          <circle cx="34" cy="30" r="2.2" fill="#0f172a" />
          <circle cx="40" cy="36" r="2.2" fill="#0f172a" />
          <circle cx="46" cy="42" r="2.2" fill="#0f172a" />
        </g>
      )}
      {emblem === 'cards' && (
        <g transform="translate(26,38)">
          <rect x="4" y="6" width="24" height="34" rx="3" transform="rotate(-10 16 23)" fill="#ffffff" stroke="#111827" strokeWidth="2" />
          <rect x="20" y="10" width="24" height="34" rx="3" transform="rotate(12 32 27)" fill="#f8fafc" stroke="#111827" strokeWidth="2" />
          <text x="27" y="33" fontSize="16" fill="#dc2626">♥</text>
        </g>
      )}
      {emblem === 'hand' && (
        <path
          d="M36 92 L36 62 L30 50 L35 48 L41 58 L41 36 L47 36 L47 56 L51 32 L57 32 L57 56 L62 36 L67 38 L64 62 L62 92 Z"
          fill="#09090b"
        />
      )}
      {emblem !== 'dice' && emblem !== 'cards' && emblem !== 'hand' && (
        <circle cx="50" cy="64" r="22" fill="#0f172a" opacity="0.45" stroke="#fde68a" strokeWidth="2.5" />
      )}
    </svg>
  </div>
);
