// Raíz de composición: acá se crean los adaptadores y se cablean los casos de uso, a mano.
import type { Logger } from 'pino';

import { crearConsultarSalud, type ConsultarSalud } from '../salud/application/consultar-salud.ts';
import { crearSondaDeBase } from '../salud/infrastructure/sonda-de-base-kysely.ts';
import { relojDelSistema } from '../shared/clock.ts';
import type { Config } from '../shared/config.ts';
import { conectar, type BaseDeDatos } from '../shared/db/conexion.ts';
import { crearLogger } from '../shared/logger.ts';

export interface Dependencias {
  logger: Logger;
  db: BaseDeDatos;
  consultarSalud: ConsultarSalud;
  cerrar(): Promise<void>;
}

export function crearDependencias(config: Config, nombre: 'api' | 'worker'): Dependencias {
  const logger = crearLogger(config.LOG_LEVEL, nombre);
  const db = conectar(config.DATABASE_URL);
  return {
    logger,
    db,
    consultarSalud: crearConsultarSalud({
      sonda: crearSondaDeBase(db),
      clock: relojDelSistema,
      version: config.APP_VERSION,
    }),
    cerrar: () => db.destroy(),
  };
}
