// Contraste WCAG 2.1 AA sobre los roles semánticos (RNF-019, ADR 0017).
import { colorDeRol, rolesDe, type Tema, type Tokens } from './leer.ts';

function luminancia(hex: string): number {
  const canal = (inicio: number): number => {
    const c = Number.parseInt(hex.slice(inicio, inicio + 2), 16) / 255;
    return c <= 0.040_45 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * canal(1) + 0.7152 * canal(3) + 0.0722 * canal(5);
}

export function contraste(a: string, b: string): number {
  const [claro, oscuro] = [luminancia(a), luminancia(b)].sort((x, y) => y - x);
  return ((claro ?? 0) + 0.05) / ((oscuro ?? 0) + 0.05);
}

export interface Par {
  tema: Tema;
  texto: string;
  fondo: string;
  minimo: number;
  valor: number;
}

/**
 * Pares obligatorios: cada rol con su `-foreground` (texto, 4,5:1), el texto secundario sobre los
 * fondos donde aparece, y los pares extra de `contrastPairs` (no texto, con su mínimo propio).
 */
export function paresAVerificar(tokens: Tokens): Par[] {
  const roles = rolesDe(tokens);
  const opacos = (tema: Tema, rol: string): boolean => colorDeRol(tokens, tema, rol).length === 7;
  const pares: Omit<Par, 'valor'>[] = [];
  for (const tema of ['light', 'dark'] as const) {
    for (const rol of roles) {
      if (roles.includes(`${rol}-foreground`) && opacos(tema, rol)) {
        pares.push({ tema, texto: `${rol}-foreground`, fondo: rol, minimo: 4.5 });
      }
    }
    pares.push({ tema, texto: 'foreground', fondo: 'background', minimo: 4.5 });
    for (const fondo of ['background', 'surface']) {
      pares.push({ tema, texto: 'muted-foreground', fondo, minimo: 4.5 });
    }
    for (const [texto, fondo, minimo] of tokens.contrastPairs) {
      pares.push({ tema, texto, fondo, minimo });
    }
  }
  return pares.map((par) => ({
    ...par,
    valor: contraste(
      colorDeRol(tokens, par.tema, par.texto),
      colorDeRol(tokens, par.tema, par.fondo),
    ),
  }));
}
