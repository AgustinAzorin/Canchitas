// tokens.json → CSS de Tailwind v4 y fuentes de next/font para apps/web (ADR 0017).
// Los nombres de variables son los de shadcn/ui (--background, --primary, …).
import { colorDeRol, rolesDe, type Tokens } from './leer.ts';

const encabezado =
  'Generado por scripts/src/tokens desde docs/design-system/tokens.json. No editar.';

const kebab = (texto: string): string => texto.toLowerCase().replaceAll(' ', '-');
const px = (valor: number): string => `${String(valor / 16)}rem`;

function variableDeFuente(familia: string): string {
  return `--font-${kebab(familia)}`;
}

export function cssDeTokens(tokens: Tokens): string {
  const roles = rolesDe(tokens);
  const bloque = (tema: 'light' | 'dark', sangria: string): string =>
    roles.map((rol) => `${sangria}--${rol}: ${colorDeRol(tokens, tema, rol)};`).join('\n');

  const { fonts, scale } = tokens.typography;
  const texto = Object.entries(scale).flatMap(([nombre, estilo]) => [
    `  --text-${nombre}: ${px(estilo.size)};`,
    `  --text-${nombre}--line-height: ${px(estilo.lineHeight)};`,
    `  --text-${nombre}--font-weight: ${String(estilo.weight)};`,
    ...(estilo.tracking === undefined
      ? []
      : [`  --text-${nombre}--letter-spacing: ${String(estilo.tracking)}em;`]),
  ]);

  return [
    `/* ${encabezado} */`,
    '',
    ':root {',
    bloque('light', '  '),
    ...Object.entries(tokens.motion.duration).map(
      ([nombre, ms]) => `  --duration-${nombre}: ${String(ms)}ms;`,
    ),
    '}',
    '',
    '/* Modo oscuro siguiendo el sistema (GUIDELINES, supuestos). */',
    '@media (prefers-color-scheme: dark) {',
    '  :root {',
    bloque('dark', '    '),
    '  }',
    '}',
    '',
    '/* Solo roles semánticos: se vacían los colores, tamaños, radios y sombras por defecto de',
    '   Tailwind para que no se puedan usar primitivos ni valores sueltos. */',
    '@theme inline {',
    '  --color-*: initial;',
    ...roles.map((rol) => `  --color-${rol}: var(--${rol});`),
    '',
    '  --font-*: initial;',
    `  --font-sans: var(${variableDeFuente(fonts.sans.family)}), ${fonts.sans.fallback};`,
    `  --font-display: var(${variableDeFuente(fonts.display.family)}), ${fonts.display.fallback};`,
    '',
    '  --text-*: initial;',
    ...texto,
    '',
    `  --spacing: ${px(tokens.spacing.base)};`,
    '',
    '  --radius-*: initial;',
    ...Object.entries(tokens.radius).map(([nombre, valor]) =>
      nombre === 'full'
        ? '  --radius-full: calc(infinity * 1px);'
        : `  --radius-${nombre}: ${px(valor)};`,
    ),
    '',
    '  --shadow-*: initial;',
    ...Object.entries(tokens.elevation).map(
      ([nombre, { shadow }]) => `  --shadow-${nombre}: ${shadow};`,
    ),
    '',
    '  --ease-*: initial;',
    ...Object.entries(tokens.motion.easing).map(
      ([nombre, curva]) => `  --ease-${nombre}: cubic-bezier(${curva.join(', ')});`,
    ),
    '}',
    '',
  ].join('\n');
}

const nombreDeArchivo: Record<number, string> = {
  400: 'Regular',
  500: 'Medium',
  600: 'SemiBold',
  700: 'Bold',
};

/** Archivo de la fuente en apps/web/src/styles/fuentes/ (licencia OFL, junto a los archivos). */
export function archivoDeFuenteWeb(familia: string, peso: number): string {
  return `${familia.replaceAll(' ', '')}-${nombreDeArchivo[peso] ?? String(peso)}.ttf`;
}

/** Fuentes locales con next/font: el build no depende de Google Fonts. */
export function fuentesDeNext(tokens: Tokens): string {
  const { sans, display } = tokens.typography.fonts;
  const declaracion = (familia: string, pesos: number[]): string => {
    const constante = familia.replaceAll(' ', '').replace(/^./, (c) => c.toLowerCase());
    return [
      `export const ${constante} = localFont({`,
      '  src: [',
      ...pesos.map(
        (p) =>
          `    { path: './fuentes/${archivoDeFuenteWeb(familia, p)}', weight: '${String(p)}', style: 'normal' },`,
      ),
      '  ],',
      `  variable: '${variableDeFuente(familia)}',`,
      "  display: 'swap',",
      '});',
    ].join('\n');
  };
  return [
    `// ${encabezado}`,
    "import localFont from 'next/font/local';",
    '',
    declaracion(sans.family, sans.weights),
    '',
    declaracion(display.family, display.weights),
    '',
  ].join('\n');
}
