// Lee y valida docs/design-system/tokens.json, y resuelve las referencias {familia.paso}.
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { z } from 'zod';

import { raiz } from '../proceso.ts';

const Hex = z.string().regex(/^#(?:[0-9A-Fa-f]{6}|[0-9A-Fa-f]{8})$/);
const Referencia = z.string().regex(/^\{[a-z]+\.\d+\}$/);

const Estilo = z.object({
  font: z.enum(['sans', 'display']),
  size: z.number(),
  lineHeight: z.number(),
  weight: z.number(),
  tracking: z.number().optional(),
});

const Tokens = z.object({
  meta: z.object({
    version: z.string(),
    android: z.object({ package: z.string(), rPackage: z.string() }),
  }),
  primitives: z.object({ color: z.record(z.string(), z.record(z.string(), Hex)) }),
  semantic: z.object({
    light: z.record(z.string(), z.union([Hex, Referencia])),
    dark: z.record(z.string(), z.union([Hex, Referencia])),
  }),
  typography: z.object({
    fonts: z.object({
      sans: z.object({ family: z.string(), fallback: z.string(), weights: z.array(z.number()) }),
      display: z.object({ family: z.string(), fallback: z.string(), weights: z.array(z.number()) }),
    }),
    scale: z.record(z.string(), Estilo),
  }),
  spacing: z.object({ base: z.number(), scale: z.record(z.string(), z.number()) }),
  radius: z.record(z.string(), z.number()),
  elevation: z.record(z.string(), z.object({ shadow: z.string(), dp: z.number() })),
  motion: z.object({
    duration: z.record(z.string(), z.number()),
    easing: z.record(z.string(), z.tuple([z.number(), z.number(), z.number(), z.number()])),
  }),
  contrastPairs: z.array(z.tuple([z.string(), z.string(), z.number()])),
});

export type Tokens = z.infer<typeof Tokens>;
export type Tema = 'light' | 'dark';
export type EstiloDeTexto = z.infer<typeof Estilo>;

export const rutaDeTokens = join(raiz, 'docs', 'design-system', 'tokens.json');

export function leerTokens(): Tokens {
  return Tokens.parse(JSON.parse(readFileSync(rutaDeTokens, 'utf8')));
}

/** Color hex de un rol semántico en un tema, con las referencias a primitivos resueltas. */
export function colorDeRol(tokens: Tokens, tema: Tema, rol: string): string {
  const valor = tokens.semantic[tema][rol];
  if (valor === undefined) {
    throw new Error(`tokens.json: falta el rol ${rol} en ${tema}`);
  }
  if (valor.startsWith('#')) {
    return valor.toUpperCase();
  }
  const [familia = '', paso = ''] = valor.slice(1, -1).split('.');
  const color = tokens.primitives.color[familia]?.[paso];
  if (color === undefined) {
    throw new Error(`tokens.json: ${rol} en ${tema} apunta a ${valor}, que no existe`);
  }
  return color.toUpperCase();
}

export function rolesDe(tokens: Tokens): string[] {
  return Object.keys(tokens.semantic.light);
}
