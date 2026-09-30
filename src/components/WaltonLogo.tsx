import React, { useState } from 'react';

interface WaltonLogoProps {
  className?: string;
  variant?: 'light' | 'dark' | 'glass';
}

export const WaltonLogo: React.FC<WaltonLogoProps> = ({ className = 'h-14', variant = 'glass' }) => {
  const [imageError, setImageError] = useState(false);

  if (!imageError) {
    return (
      <img
        src="/walton-logo.jpg"
        alt="Walton Logo"
        onError={() => setImageError(true)}
        className={`${className} w-auto object-contain transition`}
        referrerPolicy="no-referrer"
      />
    );
  }

  // High-fidelity vector SVG fallback of Walton folded ribbon W
  return (
    <svg
      viewBox="0 0 240 120"
      className={`${className} w-auto`}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <linearGradient id="waltonBlue" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#0284c7" />
          <stop offset="50%" stopColor="#004b93" />
          <stop offset="100%" stopColor="#002b66" />
        </linearGradient>
        <linearGradient id="waltonRed" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#ef4444" />
          <stop offset="60%" stopColor="#b91c1c" />
          <stop offset="100%" stopColor="#7f1d1d" />
        </linearGradient>
        <linearGradient id="waltonCyan" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#38bdf8" />
          <stop offset="100%" stopColor="#0284c7" />
        </linearGradient>
      </defs>

      {/* Ribbon Left Wing (Blue) */}
      <path
        d="M38 12 L72 70 L95 28 L66 12 Z"
        fill="url(#waltonCyan)"
      />
      <path
        d="M72 70 L108 12 L132 12 L88 78 Z"
        fill="url(#waltonBlue)"
      />

      {/* Ribbon Right Wing (Red) */}
      <path
        d="M108 12 L135 62 L158 24 L132 12 Z"
        fill="url(#waltonRed)"
      />
      <path
        d="M135 62 L164 12 L198 12 L150 78 Z"
        fill="url(#waltonRed)"
      />

      {/* WALTON Wordmark */}
      <text
        x="120"
        y="112"
        textAnchor="middle"
        fontFamily="'Inter', 'Arial Black', sans-serif"
        fontWeight="900"
        fontSize="34"
        letterSpacing="2"
        fill="#004b93"
      >
        WALTON
      </text>
    </svg>
  );
};
