'use client';

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, AlertCircle, RefreshCw } from 'lucide-react';
import { SeverityLevel } from '@/types';

// --- BUTTON ---
export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger' | 'outline';
  size?: 'xs' | 'sm' | 'md';
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

export function Button({
  variant = 'primary',
  size = 'sm',
  leftIcon,
  rightIcon,
  className = '',
  children,
  disabled,
  ...props
}: ButtonProps) {
  const base =
    'inline-flex items-center justify-center gap-1.5 font-medium rounded-md transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-[#8B5CF6]/40 disabled:opacity-45 disabled:pointer-events-none select-none';

  const variants: Record<string, string> = {
    primary:
      'bg-[#8B5CF6] hover:bg-[#7C3AED] text-[#F4F4F5] shadow-sm border border-[#A78BFA]/25',
    secondary:
      'bg-[#18181C] hover:bg-[#222228] text-[#F4F4F5] border border-[#27272A]',
    outline:
      'bg-transparent hover:bg-[#18181C] text-[#A1A1AA] hover:text-[#F4F4F5] border border-[#27272A]',
    ghost:
      'bg-transparent hover:bg-[#18181C] text-[#A1A1AA] hover:text-[#F4F4F5] border border-transparent',
    danger:
      'bg-[#EF4444]/15 hover:bg-[#EF4444]/25 text-[#EF4444] border border-[#EF4444]/30',
  };

  const sizes: Record<string, string> = {
    xs: 'px-2.5 py-1 text-[11px] h-7',
    sm: 'px-3 py-1.5 text-xs h-8',
    md: 'px-4 py-2 text-xs h-9',
  };

  return (
    <button
      disabled={disabled}
      className={`${base} ${variants[variant]} ${sizes[size]} ${className}`}
      {...props}
    >
      {leftIcon && <span className="shrink-0">{leftIcon}</span>}
      <span>{children}</span>
      {rightIcon && <span className="shrink-0">{rightIcon}</span>}
    </button>
  );
}

// --- INPUT ---
export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  leftIcon?: React.ReactNode;
  rightSlot?: React.ReactNode;
}

export function Input({
  label,
  leftIcon,
  rightSlot,
  className = '',
  ...props
}: InputProps) {
  return (
    <div className="w-full">
      {label && (
        <label className="block text-xs font-medium text-[#A1A1AA] mb-1.5">
          {label}
        </label>
      )}
      <div className="relative flex items-center">
        {leftIcon && (
          <span className="absolute left-3 text-[#71717A] pointer-events-none">
            {leftIcon}
          </span>
        )}
        <input
          className={`w-full rounded-md bg-[#0F0F12] border border-[#27272A] text-xs text-[#F4F4F5] placeholder:text-[#71717A] py-2 ${
            leftIcon ? 'pl-8' : 'pl-3'
          } ${
            rightSlot ? 'pr-12' : 'pr-3'
          } focus:outline-none focus:border-[#8B5CF6] transition-colors ${className}`}
          {...props}
        />
        {rightSlot && (
          <div className="absolute right-2.5 flex items-center">{rightSlot}</div>
        )}
      </div>
    </div>
  );
}

// --- BADGE & SEVERITY BADGE ---
export function Badge({
  children,
  variant = 'neutral',
  className = '',
}: {
  children: React.ReactNode;
  variant?: 'neutral' | 'purple' | 'success' | 'warning' | 'critical' | 'info';
  className?: string;
}) {
  const styles: Record<string, string> = {
    neutral: 'bg-[#18181C] text-[#A1A1AA] border-[#27272A]',
    purple: 'bg-[#8B5CF6]/15 text-[#A78BFA] border-[#8B5CF6]/30',
    success: 'bg-[#22C55E]/15 text-[#22C55E] border-[#22C55E]/30',
    warning: 'bg-[#F59E0B]/15 text-[#F59E0B] border-[#F59E0B]/30',
    critical: 'bg-[#EF4444]/15 text-[#EF4444] border-[#EF4444]/30',
    info: 'bg-[#3B82F6]/15 text-[#3B82F6] border-[#3B82F6]/30',
  };

  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium border ${styles[variant]} ${className}`}
    >
      {children}
    </span>
  );
}

export function SeverityBadge({
  severity,
  size = 'sm',
}: {
  severity: SeverityLevel | string;
  size?: 'xs' | 'sm';
}) {
  const norm = String(severity || 'Medium').toLowerCase();
  let style = 'bg-[#3B82F6]/15 text-[#3B82F6] border-[#3B82F6]/30';
  let dot = 'bg-[#3B82F6]';
  let label = 'MEDIUM';

  if (norm === 'critical') {
    style = 'bg-[#EF4444]/15 text-[#EF4444] border-[#EF4444]/35';
    dot = 'bg-[#EF4444]';
    label = 'CRITICAL';
  } else if (norm === 'high') {
    style = 'bg-[#F59E0B]/15 text-[#F59E0B] border-[#F59E0B]/35';
    dot = 'bg-[#F59E0B]';
    label = 'HIGH';
  } else if (norm === 'low') {
    style = 'bg-[#27272A]/60 text-[#A1A1AA] border-[#27272A]';
    dot = 'bg-[#71717A]';
    label = 'LOW';
  }

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded font-mono font-semibold tracking-wider border ${style} ${
        size === 'xs' ? 'px-1.5 py-0.5 text-[10px]' : 'px-2 py-0.5 text-[10.5px]'
      }`}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${dot}`} />
      {label}
    </span>
  );
}

// --- CARD ---
export function Card({
  children,
  className = '',
  interactive = false,
  onClick,
}: {
  children: React.ReactNode;
  className?: string;
  interactive?: boolean;
  onClick?: () => void;
}) {
  return (
    <motion.div
      whileHover={interactive ? { y: -1 } : undefined}
      transition={{ duration: 0.16 }}
      onClick={onClick}
      className={`rounded-lg bg-[#141418] border border-[#27272A] shadow-cl-card ${
        interactive
          ? 'cursor-pointer hover:border-[#8B5CF6]/50 hover:bg-[#18181C]/90 transition-colors'
          : ''
      } ${className}`}
    >
      {children}
    </motion.div>
  );
}

// --- STAT CARD (Section 7: Compact Statistics) ---
export function StatCard({
  label,
  value,
  trend,
  supportingText,
  icon,
  accentColor = '#8B5CF6',
}: {
  label: string;
  value: string | number;
  trend?: string;
  supportingText: string;
  icon: React.ReactNode;
  accentColor?: string;
}) {
  return (
    <div className="rounded-lg bg-[#141418] border border-[#27272A] p-3.5 flex flex-col justify-between">
      <div className="flex items-center justify-between text-xs text-[#A1A1AA]">
        <span className="font-medium">{label}</span>
        <span className="text-[#71717A]">{icon}</span>
      </div>
      <div className="mt-2 flex items-baseline justify-between gap-2">
        <span className="text-xl font-semibold tracking-tight text-[#F4F4F5] font-mono">
          {value}
        </span>
        {trend && (
          <span
            className="text-[11px] font-mono px-1.5 py-0.5 rounded bg-[#18181C] border border-[#27272A]"
            style={{ color: accentColor }}
          >
            {trend}
          </span>
        )}
      </div>
      <div className="mt-1.5 text-[11px] text-[#71717A] truncate">
        {supportingText}
      </div>
    </div>
  );
}

// --- DIALOG / MODAL ---
export function Dialog({
  isOpen,
  onClose,
  title,
  subtitle,
  children,
  maxWidth = 'max-w-lg',
}: {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  maxWidth?: string;
}) {
  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-[2px]">
          <motion.div
            initial={{ opacity: 0, scale: 0.98, y: 6 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.98, y: 6 }}
            transition={{ duration: 0.18 }}
            className={`w-full ${maxWidth} rounded-xl bg-[#141418] border border-[#27272A] shadow-cl-modal overflow-hidden`}
          >
            <div className="flex items-start justify-between px-5 py-4 border-b border-[#27272A] bg-[#0F0F12]">
              <div>
                <h3 className="text-sm font-semibold text-[#F4F4F5]">{title}</h3>
                {subtitle && (
                  <p className="text-xs text-[#A1A1AA] mt-0.5">{subtitle}</p>
                )}
              </div>
              <button
                type="button"
                onClick={onClose}
                className="p-1 rounded-md text-[#71717A] hover:text-[#F4F4F5] hover:bg-[#18181C] transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-5">{children}</div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}

// --- SKELETON ---
export function Skeleton({ className = '' }: { className?: string }) {
  return (
    <div
      className={`animate-pulse rounded-md bg-[#18181C] border border-[#27272A]/50 ${className}`}
    />
  );
}

// --- EMPTY STATE (Section 19) ---
export function EmptyState({
  title,
  description,
  actionLabel,
  onAction,
  icon,
}: {
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
  icon?: React.ReactNode;
}) {
  return (
    <div className="rounded-lg border border-dashed border-[#27272A] bg-[#0F0F12]/60 p-10 text-center flex flex-col items-center justify-center">
      <div className="w-10 h-10 rounded-lg bg-[#141418] border border-[#27272A] flex items-center justify-center text-[#A78BFA] mb-3">
        {icon}
      </div>
      <h4 className="text-sm font-semibold text-[#F4F4F5]">{title}</h4>
      <p className="text-xs text-[#A1A1AA] max-w-sm mt-1 mb-4">{description}</p>
      {actionLabel && onAction && (
        <Button variant="primary" size="sm" onClick={onAction}>
          {actionLabel}
        </Button>
      )}
    </div>
  );
}

// --- INLINE ERROR STATE (Section 21) ---
export function InlineErrorState({
  title,
  message,
  onRetry,
  secondaryActionLabel,
  onSecondaryAction,
}: {
  title: string;
  message: string;
  onRetry?: () => void;
  secondaryActionLabel?: string;
  onSecondaryAction?: () => void;
}) {
  return (
    <div className="rounded-lg border border-[#EF4444]/30 bg-[#EF4444]/10 p-3.5 flex flex-wrap items-center justify-between gap-3">
      <div className="flex items-start gap-2.5">
        <AlertCircle className="w-4 h-4 text-[#EF4444] shrink-0 mt-0.5" />
        <div>
          <div className="text-xs font-semibold text-[#F4F4F5]">{title}</div>
          <div className="text-xs text-[#A1A1AA] mt-0.5">{message}</div>
        </div>
      </div>
      <div className="flex items-center gap-2">
        {onRetry && (
          <Button
            variant="secondary"
            size="xs"
            leftIcon={<RefreshCw className="w-3 h-3" />}
            onClick={onRetry}
          >
            Retry
          </Button>
        )}
        {secondaryActionLabel && onSecondaryAction && (
          <Button variant="outline" size="xs" onClick={onSecondaryAction}>
            {secondaryActionLabel}
          </Button>
        )}
      </div>
    </div>
  );
}
