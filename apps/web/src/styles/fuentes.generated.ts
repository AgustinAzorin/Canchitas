// Generado por scripts/src/tokens desde docs/design-system/tokens.json. No editar.
import localFont from 'next/font/local';

export const barlow = localFont({
  src: [
    { path: './fuentes/Barlow-Regular.ttf', weight: '400', style: 'normal' },
    { path: './fuentes/Barlow-Medium.ttf', weight: '500', style: 'normal' },
    { path: './fuentes/Barlow-SemiBold.ttf', weight: '600', style: 'normal' },
    { path: './fuentes/Barlow-Bold.ttf', weight: '700', style: 'normal' },
  ],
  variable: '--font-barlow',
  display: 'swap',
});

export const barlowCondensed = localFont({
  src: [{ path: './fuentes/BarlowCondensed-Bold.ttf', weight: '700', style: 'normal' }],
  variable: '--font-barlow-condensed',
  display: 'swap',
});
