'use client';

import React from 'react';
import { Check, Image as ImageIcon, Palette, Sparkles, Type } from 'lucide-react';
import { Badge, Button, Dialog } from './Primitives';

export interface BackgroundThemeOption {
  id: 'aurora-wave' | 'neon-mesh' | 'dark-architecture' | 'iridescent-silk' | 'matte-3d';
  category: string;
  name: string;
  subtitle: string;
  imageUrl: string;
  overlayGradient: string;
  patternClass: string;
  recommendedFontId: FontPairingId;
}

export type FontPairingId = 'technical' | 'editorial' | 'neogrotesque';

export interface FontPairingOption {
  id: FontPairingId;
  name: string;
  headingFont: string;
  bodyFont: string;
  ctaFont: string;
  rationale: string;
}

export const BACKGROUND_COLLECTION: BackgroundThemeOption[] = [
  {
    id: 'aurora-wave',
    category: 'A. Obsidian Aurora & Radial Mesh',
    name: 'Dark Abstract Glass Wave',
    subtitle: 'Deep carbon-black canvas illuminated by diffused violet, indigo, and cyan light blooms.',
    imageUrl:
      'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=2400&q=85',
    overlayGradient:
      'radial-gradient(at 15% 15%, rgba(139, 92, 246, 0.28) 0px, transparent 50%), radial-gradient(at 85% 20%, rgba(59, 130, 246, 0.22) 0px, transparent 55%), radial-gradient(at 50% 90%, rgba(167, 139, 250, 0.16) 0px, transparent 60%)',
    patternClass: 'bg-codelens-dots',
    recommendedFontId: 'technical',
  },
  {
    id: 'neon-mesh',
    category: 'A. Obsidian Aurora & Radial Mesh',
    name: 'Deep Violet / Blue Neon Mesh',
    subtitle: 'Vibrant AI developer-tool mesh gradient with radial depth and precision dot matrix.',
    imageUrl:
      'https://images.unsplash.com/photo-1634017839464-5c339ebe3cb4?auto=format&fit=crop&w=2400&q=85',
    overlayGradient:
      'radial-gradient(at 20% 10%, rgba(139, 92, 246, 0.30) 0px, transparent 55%), radial-gradient(at 80% 80%, rgba(59, 130, 246, 0.22) 0px, transparent 55%)',
    patternClass: 'bg-codelens-dots',
    recommendedFontId: 'technical',
  },
  {
    id: 'dark-architecture',
    category: 'B. Precision Dot-Matrix & Architectural Grid',
    name: 'Minimalist Dark Architecture',
    subtitle: 'Micro-engineered 1px grid lines paired with high-contrast architectural geometry.',
    imageUrl:
      'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=2400&q=85',
    overlayGradient:
      'radial-gradient(at 50% 0%, rgba(139, 92, 246, 0.18) 0px, transparent 60%), linear-gradient(180deg, rgba(9, 9, 11, 0.35) 0%, rgba(9, 9, 11, 0.82) 100%)',
    patternClass: 'bg-codelens-grid',
    recommendedFontId: 'editorial',
  },
  {
    id: 'iridescent-silk',
    category: 'C. Frosted Alabaster & Soft Daylight Mesh',
    name: 'Soft Iridescent Silk Gradient',
    subtitle: 'Translucent pastel periwinkle, rose, and sky-blue silk diffused behind frosted glass.',
    imageUrl:
      'https://images.unsplash.com/photo-1579546929518-9e396f3cc809?auto=format&fit=crop&w=2400&q=85',
    overlayGradient:
      'radial-gradient(at 20% 20%, rgba(167, 139, 250, 0.24) 0px, transparent 55%), linear-gradient(180deg, rgba(9, 9, 11, 0.45) 0%, rgba(9, 9, 11, 0.85) 100%)',
    patternClass: 'bg-codelens-dots',
    recommendedFontId: 'editorial',
  },
  {
    id: 'matte-3d',
    category: 'D. Liquid 3D Matte Renders',
    name: 'Matte Black & Gold 3D Topology',
    subtitle: 'Tactile 3D spline topology with brushed shaders and soft ambient occlusion shadows.',
    imageUrl:
      'https://images.unsplash.com/photo-1635776062127-d379bfcba9f8?auto=format&fit=crop&w=2400&q=85',
    overlayGradient:
      'radial-gradient(at 80% 15%, rgba(245, 158, 11, 0.16) 0px, transparent 50%), radial-gradient(at 20% 80%, rgba(139, 92, 246, 0.22) 0px, transparent 55%)',
    patternClass: 'bg-codelens-grid',
    recommendedFontId: 'neogrotesque',
  },
];

export const FONT_PAIRINGS: FontPairingOption[] = [
  {
    id: 'technical',
    name: 'Pairing 1: The Precision Technical Stack',
    headingFont: 'Plus Jakarta Sans (600–700, -0.025em)',
    bodyFont: 'Inter (400–500, line-height 1.6)',
    ctaFont: 'Inter SemiBold + JetBrains Mono',
    rationale:
      'High x-height and open apertures prevent light bleed on dark aurora backgrounds while keeping dense code tables razor-sharp.',
  },
  {
    id: 'editorial',
    name: 'Pairing 2: The Editorial Luxury & Modern SaaS Stack',
    headingFont: 'Playfair Display Serif (500–700)',
    bodyFont: 'DM Sans (400–500, line-height 1.65)',
    ctaFont: 'DM Sans Medium',
    rationale:
      'High-contrast editorial serif headings signal craftsmanship against architectural & silk backgrounds while DM Sans keeps UI controls effortless to scan.',
  },
  {
    id: 'neogrotesque',
    name: 'Pairing 3: The Neo-Grotesque Enterprise Stack',
    headingFont: 'Space Grotesk (600–700, -0.03em)',
    bodyFont: 'IBM Plex Sans (400–500)',
    ctaFont: 'Space Grotesk Medium + JetBrains Mono',
    rationale:
      'Squared-off curves and technical ink traps echo 3D geometric topology while IBM Plex Sans prevents eye fatigue across multi-column dashboards.',
  },
];

export function CodeLensBackgroundCanvas({
  themeId,
  imageOpacity = 0.42,
}: {
  themeId: BackgroundThemeOption['id'];
  imageOpacity?: number;
}) {
  const activeTheme =
    BACKGROUND_COLLECTION.find((b) => b.id === themeId) ||
    BACKGROUND_COLLECTION[0];

  return (
    <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden bg-[#09090B]">
      {/* High-Resolution Curated Background Image */}
      <div
        className="absolute inset-0 bg-cover bg-center bg-no-repeat transition-all duration-500 scale-105"
        style={{
          backgroundImage: `url('${activeTheme.imageUrl}')`,
          opacity: imageOpacity,
        }}
      />

      {/* Aurora Radial Mesh Gradient Layer */}
      <div
        className="absolute inset-0 transition-all duration-500"
        style={{
          backgroundImage: activeTheme.overlayGradient,
        }}
      />

      {/* Precision Dot-Matrix or Architectural 1px Grid Layer */}
      <div className={`absolute inset-0 ${activeTheme.patternClass} opacity-85`} />

      {/* Controlled Dark Vignette for Foreground Text Readability */}
      <div
        className="absolute inset-0"
        style={{
          background:
            'radial-gradient(circle at 50% 35%, rgba(9, 9, 11, 0.32) 0%, rgba(9, 9, 11, 0.78) 100%)',
        }}
      />
    </div>
  );
}

interface ThemeStudioModalProps {
  isOpen: boolean;
  onClose: () => void;
  activeThemeId: BackgroundThemeOption['id'];
  onChangeThemeId: (id: BackgroundThemeOption['id']) => void;
  activeFontId: FontPairingId;
  onChangeFontId: (id: FontPairingId) => void;
  imageOpacity: number;
  onChangeImageOpacity: (opacity: number) => void;
}

export function ThemeStudioModal({
  isOpen,
  onClose,
  activeThemeId,
  onChangeThemeId,
  activeFontId,
  onChangeFontId,
  imageOpacity,
  onChangeImageOpacity,
}: ThemeStudioModalProps) {
  return (
    <Dialog
      isOpen={isOpen}
      onClose={onClose}
      title="Background & Typography Studio"
      subtitle="Switch between the curated high-resolution website backgrounds and recommended font pairings in real time."
      maxWidth="max-w-3xl"
    >
      <div className="space-y-6 max-h-[75vh] overflow-y-auto pr-1">
        {/* Background Image Collection */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ImageIcon className="w-4 h-4 text-[#A78BFA]" />
              <h3 className="text-xs font-semibold uppercase tracking-wider text-[#F4F4F5]">
                1. Curated High-Resolution Background Collection
              </h3>
            </div>
            <div className="flex items-center gap-2 text-xs text-[#A1A1AA]">
              <span>Image Intensity:</span>
              <input
                type="range"
                min={0.15}
                max={0.75}
                step={0.05}
                value={imageOpacity}
                onChange={(e) => onChangeImageOpacity(parseFloat(e.target.value))}
                className="w-24 accent-[#8B5CF6] cursor-pointer"
              />
              <span className="font-mono text-[11px] text-[#F4F4F5] w-9">
                {Math.round(imageOpacity * 100)}%
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {BACKGROUND_COLLECTION.map((bg) => {
              const selected = bg.id === activeThemeId;
              return (
                <button
                  key={bg.id}
                  type="button"
                  onClick={() => {
                    onChangeThemeId(bg.id);
                    onChangeFontId(bg.recommendedFontId);
                  }}
                  className={`group text-left rounded-xl overflow-hidden border transition-all ${
                    selected
                      ? 'border-[#8B5CF6] ring-1 ring-[#8B5CF6] bg-[#18181C]'
                      : 'border-[#27272A] bg-[#0F0F12] hover:border-[#71717A]'
                  }`}
                >
                  {/* Live High-Res Thumbnail Preview */}
                  <div className="h-24 w-full relative overflow-hidden bg-[#09090B]">
                    <div
                      className="absolute inset-0 bg-cover bg-center transition-transform duration-300 group-hover:scale-105"
                      style={{ backgroundImage: `url('${bg.imageUrl}')` }}
                    />
                    <div
                      className="absolute inset-0"
                      style={{
                        background:
                          'linear-gradient(to top, rgba(9,9,11,0.92) 0%, rgba(9,9,11,0.2) 100%)',
                      }}
                    />
                    <div className="absolute top-2 left-2.5 right-2.5 flex items-center justify-between">
                      <span className="px-2 py-0.5 rounded bg-[#09090B]/80 backdrop-blur-md border border-[#27272A] text-[10px] font-mono text-[#A78BFA]">
                        {bg.category.split('.')[0]}
                      </span>
                      {selected && (
                        <span className="w-5 h-5 rounded-full bg-[#8B5CF6] text-white flex items-center justify-center shadow">
                          <Check className="w-3 h-3" />
                        </span>
                      )}
                    </div>
                    <div className="absolute bottom-2 left-2.5 right-2.5">
                      <div className="text-xs font-semibold text-[#F4F4F5] truncate">
                        {bg.name}
                      </div>
                    </div>
                  </div>

                  <div className="p-2.5 space-y-1">
                    <div className="text-[10.5px] font-mono text-[#A78BFA] truncate">
                      {bg.category}
                    </div>
                    <p className="text-[11px] text-[#A1A1AA] line-clamp-2 leading-relaxed">
                      {bg.subtitle}
                    </p>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Font Pairings */}
        <div className="space-y-3 pt-2 border-t border-[#27272A]">
          <div className="flex items-center gap-2">
            <Type className="w-4 h-4 text-[#A78BFA]" />
            <h3 className="text-xs font-semibold uppercase tracking-wider text-[#F4F4F5]">
              2. Recommended Font Pairings (Headings, Body &amp; CTA)
            </h3>
          </div>

          <div className="grid grid-cols-1 gap-2.5">
            {FONT_PAIRINGS.map((fp) => {
              const selected = fp.id === activeFontId;
              return (
                <button
                  key={fp.id}
                  type="button"
                  onClick={() => onChangeFontId(fp.id)}
                  className={`w-full text-left p-3.5 rounded-xl border transition-all ${
                    selected
                      ? 'border-[#8B5CF6] bg-[#8B5CF6]/10'
                      : 'border-[#27272A] bg-[#0F0F12] hover:border-[#71717A]'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2 mb-1.5">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-semibold text-[#F4F4F5]">
                        {fp.name}
                      </span>
                      {selected && <Badge variant="primary">Active</Badge>}
                    </div>
                    {selected && <Check className="w-4 h-4 text-[#A78BFA]" />}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-[11px] mb-2">
                    <div className="px-2.5 py-1.5 rounded bg-[#141418] border border-[#27272A]">
                      <span className="text-[#71717A] block text-[10px]">
                        HEADINGS
                      </span>
                      <span className="text-[#F4F4F5] font-medium">
                        {fp.headingFont}
                      </span>
                    </div>
                    <div className="px-2.5 py-1.5 rounded bg-[#141418] border border-[#27272A]">
                      <span className="text-[#71717A] block text-[10px]">
                        BODY TEXT
                      </span>
                      <span className="text-[#F4F4F5] font-medium">
                        {fp.bodyFont}
                      </span>
                    </div>
                    <div className="px-2.5 py-1.5 rounded bg-[#141418] border border-[#27272A]">
                      <span className="text-[#71717A] block text-[10px]">
                        CTA &amp; ACCENTS
                      </span>
                      <span className="text-[#A78BFA] font-mono">
                        {fp.ctaFont}
                      </span>
                    </div>
                  </div>

                  <p className="text-[11px] text-[#A1A1AA] leading-relaxed">
                    {fp.rationale}
                  </p>
                </button>
              );
            })}
          </div>
        </div>

        <div className="flex items-center justify-between pt-2 border-t border-[#27272A]">
          <span className="text-[11px] text-[#71717A] flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-[#A78BFA]" />
            Selections are saved automatically and applied across all screens.
          </span>
          <Button variant="primary" size="sm" onClick={onClose}>
            Done
          </Button>
        </div>
      </div>
    </Dialog>
  );
}
