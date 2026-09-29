// Escribe contract/openapi.json desde los esquemas de las rutas (ADR 0007). No toca la base:
// las dependencias son de mentira porque solo importa la forma de las rutas.
import { writeFileSync } from 'node:fs';
import { join } from 'node:path';

import { ok } from 'neverthrow';

import { construirApi } from './composition/api.ts';
import { cuentasInertes } from './composition/cuentas-inertes.ts';
import { dependenciasDeGruposInertes } from './composition/grupos-inertes.ts';
import { relojDelSistema } from './shared/clock.ts';
import { crearLogger } from './shared/logger.ts';

const app = await construirApi({
  cuentas: cuentasInertes,
  ...dependenciasDeGruposInertes,
  clock: relojDelSistema,
  logger: crearLogger('silent', 'contrato'),
  consultarSalud: () =>
    Promise.resolve(ok({ estado: 'ok', version: 'contrato', instante: new Date(0) })),
});
await app.ready();

const contrato = app.swagger();
await app.close();

// fastify-type-provider-zod registra cada esquema dos veces (entrada y salida). Se quitan los
// que ninguna ruta usa, para que los clientes generados no tengan modelos de más.
const esquemas = 'components' in contrato ? (contrato.components.schemas ?? {}) : {};
const referenciado = (nombre: string): boolean => {
  const otros = Object.entries(esquemas).filter(([otro]) => otro !== nombre);
  return JSON.stringify({ paths: contrato.paths, otros }).includes(
    `"#/components/schemas/${nombre}"`,
  );
};
let sinUso = Object.keys(esquemas).filter((nombre) => !referenciado(nombre));
while (sinUso.length > 0) {
  for (const nombre of sinUso) {
    Reflect.deleteProperty(esquemas, nombre);
  }
  sinUso = Object.keys(esquemas).filter((nombre) => !referenciado(nombre));
}

const destino = join(import.meta.dirname, '..', '..', '..', 'contract', 'openapi.json');
writeFileSync(destino, `${JSON.stringify(contrato, null, 2)}\n`);
