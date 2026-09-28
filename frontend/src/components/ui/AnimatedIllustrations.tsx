'use client';

import React from 'react';
import { motion } from 'framer-motion';

/**
 * 1. AnimatedCodeScannerIllustration
 * Combines the custom 3D glassmorphic Neural Prism artwork (/illustrations/neural-prism.jpg)
 * with live animated SVG laser scanlines, floating AST telemetry nodes, and pulsing rings.
 * Used on the Authentication Showcase & Overview Hero Banner.
 */
export function AnimatedCodeScannerIllustration({
  compact = false,
}: {
  compact?: boolean;
}) {
  return (
    <div
      className={`relative rounded-xl overflow-hidden border border-[#27272A] bg-[#09090B] shadow-cl-modal select-none ${
        compact ? 'h-44' : 'h-60 sm:h-64'
      }`}
    >
      {/* Base 3D Glassmorphic Neural Prism Image */}
      <motion.img
        src="/illustrations/neural-prism.jpg"
        alt="CodeLens AI Neural Prism Code Scanner"
        className="w-full h-full object-cover object-center opacity-75"
        initial={{ scale: 1.03 }}
        animate={{ scale: [1.03, 1.08, 1.03] }}
        transition={{ duration: 12, repeat: Infinity, ease: 'easeInOut' }}
      />

      {/* Dark Vignette & Gradient Overlay for High Text Contrast */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            'linear-gradient(180deg, rgba(9,9,11,0.25) 0%, rgba(9,9,11,0.55) 55%, rgba(9,9,11,0.92) 100%)',
        }}
      />

      {/* Animated SVG Neural Graph & Scanning Laser Overlay */}
      <svg
        viewBox="0 0 600 260"
        className="absolute inset-0 w-full h-full pointer-events-none"
        fill="none"
      >
        <defs>
          <linearGradient id="scanLaser" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#8B5CF6" stopOpacity="0" />
            <stop offset="50%" stopColor="#A78BFA" stopOpacity="0.85" />
            <stop offset="100%" stopColor="#3B82F6" stopOpacity="0" />
          </linearGradient>
          <radialGradient id="nodeGlow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#8B5CF6" stopOpacity="0.6" />
            <stop offset="100%" stopColor="#8B5CF6" stopOpacity="0" />
          </radialGradient>
        </defs>

        {/* Animated Connecting Circuit Paths */}
        <motion.path
          d="M 80 70 L 195 115 L 300 115 L 420 75 L 520 95"
          stroke="#A78BFA"
          strokeWidth="1.2"
          strokeDasharray="6 6"
          strokeOpacity="0.45"
          animate={{ strokeDashoffset: [0, -48] }}
          transition={{ duration: 4, repeat: Infinity, ease: 'linear' }}
        />
        <motion.path
          d="M 95 185 L 210 145 L 300 130 L 405 165 L 510 150"
          stroke="#3B82F6"
          strokeWidth="1.2"
          strokeDasharray="5 7"
          strokeOpacity="0.4"
          animate={{ strokeDashoffset: [0, 48] }}
          transition={{ duration: 5, repeat: Infinity, ease: 'linear' }}
        />

        {/* Rotating Central Orbital Ring */}
        <g transform="translate(300, 122)">
          <motion.circle
            r="52"
            stroke="#A78BFA"
            strokeWidth="1"
            strokeDasharray="14 8 4 8"
            strokeOpacity="0.5"
            animate={{ rotate: 360 }}
            transition={{ duration: 18, repeat: Infinity, ease: 'linear' }}
          />
          <motion.circle
            r="36"
            stroke="#3B82F6"
            strokeWidth="1"
            strokeDasharray="8 10"
            strokeOpacity="0.45"
            animate={{ rotate: -360 }}
            transition={{ duration: 14, repeat: Infinity, ease: 'linear' }}
          />
        </g>

        {/* Vertical Sweeping Laser Line */}
        <motion.rect
          x="60"
          width="480"
          height="2"
          fill="url(#scanLaser)"
          animate={{ y: [30, 210, 30] }}
          transition={{ duration: 5.5, repeat: Infinity, ease: 'easeInOut' }}
        />

        {/* Pulsing AST Nodes */}
        {[
          { cx: 195, cy: 115, color: '#A78BFA', delay: 0 },
          { cx: 300, cy: 122, color: '#22C55E', delay: 0.5 },
          { cx: 420, cy: 75, color: '#3B82F6', delay: 1.1 },
          { cx: 405, cy: 165, color: '#F59E0B', delay: 1.6 },
        ].map((node, idx) => (
          <g key={idx}>
            <motion.circle
              cx={node.cx}
              cy={node.cy}
              r="10"
              fill={node.color}
              animate={{ opacity: [0.1, 0.35, 0.1], scale: [0.9, 1.35, 0.9] }}
              transition={{
                duration: 2.6,
                delay: node.delay,
                repeat: Infinity,
                ease: 'easeInOut',
              }}
            />
            <circle cx={node.cx} cy={node.cy} r="3" fill={node.color} />
          </g>
        ))}
      </svg>

      {/* Floating Top Telemetry Chips */}
      <div className="absolute top-3 left-3 right-3 flex items-center justify-between gap-2 pointer-events-none">
        <motion.div
          animate={{ y: [0, -3, 0] }}
          transition={{ duration: 3.5, repeat: Infinity, ease: 'easeInOut' }}
          className="px-2.5 py-1 rounded-md bg-[#0F0F12]/90 backdrop-blur-md border border-[#27272A] flex items-center gap-2 text-[10.5px] font-mono text-[#F4F4F5]"
        >
          <span className="w-2 h-2 rounded-full bg-[#22C55E] animate-pulse" />
          <span>AST Semantic Engine Active</span>
        </motion.div>

        <motion.div
          animate={{ y: [0, 3, 0] }}
          transition={{
            duration: 4,
            delay: 0.6,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
          className="px-2.5 py-1 rounded-md bg-[#0F0F12]/90 backdrop-blur-md border border-[#8B5CF6]/40 text-[10.5px] font-mono text-[#A78BFA]"
        >
          Security · Performance · Quality
        </motion.div>
      </div>

      {/* Bottom Live Code Diff & Telemetry Bar */}
      <div className="absolute bottom-3 left-3 right-3 rounded-lg bg-[#0F0F12]/90 backdrop-blur-md border border-[#27272A] p-2.5 flex items-center justify-between gap-3">
        <div className="font-mono text-[11px] truncate space-y-0.5">
          <div className="text-[#EF4444] truncate">
            - const raw = `SELECT * FROM users WHERE email = &apos;$&#123;email&#125;&apos;`;
          </div>
          <div className="text-[#22C55E] truncate">
            + const res = await db.query(&apos;SELECT * FROM users WHERE email = $1&apos;, [email]);
          </div>
        </div>
        <span className="shrink-0 px-2 py-0.5 rounded bg-[#22C55E]/15 border border-[#22C55E]/30 text-[#22C55E] font-mono text-[10px] font-semibold">
          FIXED · +52 PTS
        </span>
      </div>
    </div>
  );
}

/**
 * 2. AnimatedArchitectureRadarIllustration
 * Combines the custom Isometric Architecture Mesh (/illustrations/architecture-mesh.jpg)
 * with animated SVG data packets and layer indicators.
 * Used in Overview Quick Review card & Architecture Studio header.
 */
export function AnimatedArchitectureRadarIllustration({
  className = '',
}: {
  className?: string;
}) {
  return (
    <div
      className={`relative rounded-lg overflow-hidden border border-[#27272A] bg-[#09090B] select-none h-32 ${className}`}
    >
      <motion.img
        src="/illustrations/architecture-mesh.jpg"
        alt="CodeLens AI Isometric Architecture Topology"
        className="w-full h-full object-cover object-center opacity-70"
        animate={{ scale: [1, 1.05, 1] }}
        transition={{ duration: 10, repeat: Infinity, ease: 'easeInOut' }}
      />
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            'linear-gradient(90deg, rgba(9,9,11,0.85) 0%, rgba(9,9,11,0.35) 50%, rgba(9,9,11,0.85) 100%)',
        }}
      />

      {/* Animated SVG Data Stream Overlay */}
      <svg
        viewBox="0 0 400 130"
        className="absolute inset-0 w-full h-full pointer-events-none"
        fill="none"
      >
        <motion.path
          d="M 20 100 Q 120 35 200 65 T 380 30"
          stroke="#8B5CF6"
          strokeWidth="1.5"
          strokeDasharray="6 6"
          strokeOpacity="0.65"
          animate={{ strokeDashoffset: [0, -48] }}
          transition={{ duration: 3, repeat: Infinity, ease: 'linear' }}
        />
        <motion.path
          d="M 20 35 Q 140 95 220 60 T 380 95"
          stroke="#22C55E"
          strokeWidth="1.2"
          strokeDasharray="4 8"
          strokeOpacity="0.55"
          animate={{ strokeDashoffset: [0, 48] }}
          transition={{ duration: 3.8, repeat: Infinity, ease: 'linear' }}
        />
      </svg>

      <div className="absolute bottom-2.5 left-3 right-3 flex items-center justify-between text-[10.5px] font-mono">
        <span className="px-2 py-0.5 rounded bg-[#0F0F12]/90 border border-[#27272A] text-[#F4F4F5] flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-[#A78BFA] animate-ping" />
          Deep Context Graph
        </span>
        <span className="px-2 py-0.5 rounded bg-[#0F0F12]/90 border border-[#27272A] text-[#A1A1AA]">
          OpenAI · Local LLM Ready
        </span>
      </div>
    </div>
  );
}

/**
 * 3. AnimatedAiReviewOrb
 * Pure SVG + Framer Motion orbital scanner used inside the 4-step AI Review Process Modal.
 */
export function AnimatedAiReviewOrb() {
  return (
    <div className="relative w-16 h-16 flex items-center justify-center mx-auto">
      <motion.div
        className="absolute inset-0 rounded-full bg-[#8B5CF6]/20 blur-md"
        animate={{ scale: [0.9, 1.25, 0.9], opacity: [0.4, 0.8, 0.4] }}
        transition={{ duration: 2.4, repeat: Infinity, ease: 'easeInOut' }}
      />
      <svg viewBox="0 0 64 64" className="w-16 h-16" fill="none">
        <motion.circle
          cx="32"
          cy="32"
          r="28"
          stroke="#8B5CF6"
          strokeWidth="1.5"
          strokeDasharray="16 10 6 10"
          animate={{ rotate: 360 }}
          transition={{ duration: 6, repeat: Infinity, ease: 'linear' }}
          style={{ originX: '32px', originY: '32px' }}
        />
        <motion.circle
          cx="32"
          cy="32"
          r="20"
          stroke="#A78BFA"
          strokeWidth="1.5"
          strokeDasharray="10 8"
          animate={{ rotate: -360 }}
          transition={{ duration: 4.5, repeat: Infinity, ease: 'linear' }}
          style={{ originX: '32px', originY: '32px' }}
        />
        <motion.polygon
          points="32,18 44,25 44,39 32,46 20,39 20,25"
          stroke="#22C55E"
          strokeWidth="1.5"
          fill="rgba(139,92,246,0.15)"
          animate={{ scale: [0.95, 1.06, 0.95] }}
          transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
        />
        <circle cx="32" cy="32" r="4" fill="#F4F4F5" />
      </svg>
    </div>
  );
}
