// Exporta tokens.json a la web y a Android, y verifica el contraste (ADR 0017, RNF-019).
//   node scripts/src/tokens/main.ts           escribe los archivos generados
//   node scripts/src/tokens/main.ts --check   falla si están desactualizados o si falla el contraste
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, relative } from 'node:path';

import { fallar, raiz } from '../proceso.ts';
import { colorKt, dimensionesKt, recursoDeFuente, shapeKt, themeKt, typeKt } from './android.ts';
import { paresAVerificar } from './contraste.ts';
import { leerTokens } from './leer.ts';
import { archivoDeFuenteWeb, cssDeTokens, fuentesDeNext } from './web.ts';

const tokens = leerTokens();
const web = join(raiz, 'apps', 'web', 'src', 'styles');
const android = join(
  raiz,
  'apps',
  'android',
  'core',
  'designsystem',
  'src',
  'generated',
  'kotlin',
  ...tokens.meta.android.package.split('.'),
);

const archivos: Record<string, string> = {
  [join(web, 'tokens.generated.css')]: cssDeTokens(tokens),
  [join(web, 'fuentes.generated.ts')]: fuentesDeNext(tokens),
  [join(android, 'Color.kt')]: colorKt(tokens),
  [join(android, 'Type.kt')]: typeKt(tokens),
  [join(android, 'Shape.kt')]: shapeKt(tokens),
  [join(android, 'Dimensiones.kt')]: dimensionesKt(tokens),
  [join(android, 'Theme.kt')]: themeKt(tokens),
};

// Los archivos de fuentes no se generan: se verifican los que pide tokens.json.
const fuentesAndroid = join(
  raiz,
  'apps',
  'android',
  'core',
  'designsystem',
  'src',
  'main',
  'res',
  'font',
);
const faltantes = Object.values(tokens.typography.fonts)
  .flatMap(({ family, weights }) =>
    weights.flatMap((peso) => [
      join(web, 'fuentes', archivoDeFuenteWeb(family, peso)),
      join(fuentesAndroid, `${recursoDeFuente(family, peso)}.ttf`),
    ]),
  )
  .filter((ruta) => !existsSync(ruta))
  .map((ruta) => relative(raiz, ruta));
if (faltantes.length > 0) {
  fallar(`Faltan archivos de fuentes (Google Fonts, licencia OFL):\n${faltantes.join('\n')}`);
}

const fallas = paresAVerificar(tokens).filter((par) => par.valor < par.minimo);
for (const par of fallas) {
  process.stderr.write(
    `Contraste insuficiente (${par.tema}): ${par.texto} sobre ${par.fondo} = ${par.valor.toFixed(2)}, mínimo ${String(par.minimo)}\n`,
  );
}
if (fallas.length > 0) {
  fallar('tokens.json no cumple WCAG 2.1 AA (RNF-019).');
}

if (process.argv.includes('--check')) {
  const viejos = Object.entries(archivos)
    .filter(([ruta, contenido]) => !existsSync(ruta) || readFileSync(ruta, 'utf8') !== contenido)
    .map(([ruta]) => relative(raiz, ruta));
  if (viejos.length > 0) {
    fallar(`Archivos generados desactualizados; corré pnpm tokens:\n${viejos.join('\n')}`);
  }
} else {
  for (const [ruta, contenido] of Object.entries(archivos)) {
    mkdirSync(dirname(ruta), { recursive: true });
    writeFileSync(ruta, contenido);
  }
}
process.stdout.write('Tokens al día y contraste AA verificado.\n');
