import type { Metadata } from 'next';
import {
  DM_Sans,
  IBM_Plex_Sans,
  Inter,
  JetBrains_Mono,
  Playfair_Display,
  Plus_Jakarta_Sans,
  Space_Grotesk,
} from 'next/font/google';
import './globals.css';

const plusJakarta = Plus_Jakarta_Sans({
  subsets: ['latin'],
  weight: ['500', '600', '700'],
  variable: '--font-jakarta',
  display: 'swap',
});

const inter = Inter({
  subsets: ['latin'],
  weight: ['400', '500', '600'],
  variable: '--font-inter',
  display: 'swap',
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  weight: ['400', '500', '600'],
  variable: '--font-mono',
  display: 'swap',
});

const spaceGrotesk = Space_Grotesk({
  subsets: ['latin'],
  weight: ['500', '600', '700'],
  variable: '--font-space',
  display: 'swap',
});

const playfair = Playfair_Display({
  subsets: ['latin'],
  weight: ['500', '600', '700'],
  variable: '--font-playfair',
  display: 'swap',
});

const dmSans = DM_Sans({
  subsets: ['latin'],
  weight: ['400', '500', '600'],
  variable: '--font-dm',
  display: 'swap',
});

const ibmPlexSans = IBM_Plex_Sans({
  subsets: ['latin'],
  weight: ['400', '500', '600'],
  variable: '--font-plex',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'CodeLens AI — AI-Powered Code Review Assistant',
  description:
    'Understand your code. Find what matters. Ship with confidence. Developer-grade AI code review, security auditing, and architecture intelligence.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      className={`${plusJakarta.variable} ${inter.variable} ${jetbrainsMono.variable} ${spaceGrotesk.variable} ${playfair.variable} ${dmSans.variable} ${ibmPlexSans.variable} dark`}
    >
      <body className="min-h-screen bg-[#09090B] text-[#F4F4F5] font-sans antialiased">
        {children}
      </body>
    </html>
  );
}
