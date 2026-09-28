'use client';

import React from 'react';

interface CodeLensLogoProps {
  size?: 'sm' | 'md' | 'lg';
  showText?: boolean;
  subtitle?: string;
}

export function CodeLensLogo({
  size = 'md',
  showText = true,
  subtitle,
}: CodeLensLogoProps) {
  const dim = size === 'sm' ? 24 : size === 'lg' ? 36 : 28;

  return (
    <div className="inline-flex items-center gap-2.5 select-none">
      <div
        className="relative flex items-center justify-center rounded-lg bg-[#141418] border border-[#27272A] shadow-inner shrink-0"
        style={{ width: dim, height: dim }}
      >
        <svg
          width={dim * 0.72}
          height={dim * 0.72}
          viewBox="0 0 24 24"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          {/* Outer Lens Ring */}
          <circle
            cx="11.5"
            cy="11.5"
            r="7.5"
            stroke="#8B5CF6"
            strokeWidth="1.75"
            strokeOpacity="0.9"
          />
          {/* Left Code Bracket */}
          <path
            d="M9.5 9L7 11.5L9.5 14"
            stroke="#F4F4F5"
            strokeWidth="1.6"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          {/* Right Code Bracket */}
          <path
            d="M13.5 9L16 11.5L13.5 14"
            stroke="#A78BFA"
            strokeWidth="1.6"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          {/* AI Intelligence Core Dot */}
          <circle cx="11.5" cy="11.5" r="1.25" fill="#A78BFA" />
          {/* Inspection Handle */}
          <path
            d="M17.2 17.2L20.5 20.5"
            stroke="#8B5CF6"
            strokeWidth="1.8"
            strokeLinecap="round"
          />
        </svg>
      </div>

      {showText && (
        <div className="flex flex-col">
          <div className="flex items-center gap-1.5 leading-none">
            <span className="font-semibold tracking-tight text-[#F4F4F5] text-sm">
              CodeLens
            </span>
            <span className="text-[10px] font-mono font-semibold uppercase tracking-wider px-1.5 py-0.5 rounded bg-[#8B5CF6]/15 text-[#A78BFA] border border-[#8B5CF6]/30">
              AI
            </span>
          </div>
          {subtitle && (
            <span className="text-[11px] text-[#71717A] mt-0.5 leading-none">
              {subtitle}
            </span>
          )}
        </div>
      )}
    </div>
  );
}
