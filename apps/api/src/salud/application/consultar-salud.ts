// Estado de la API para que los clientes sepan si pueden operar. Hito M0 (docs/ROADMAP.md).
import type { Clock } from '../../shared/clock.ts';
import { err, ok, type Result } from '../../shared/result.ts';

/** Puerto: responde si la base atiende consultas. */
export interface SondaDeBase {
  responde(): Promise<boolean>;
}

export interface Salud {
  estado: 'ok';
  version: string;
  instante: Date;
}

export interface BaseNoDisponible {
  tipo: 'BaseNoDisponible';
}

export type ConsultarSalud = () => Promise<Result<Salud, BaseNoDisponible>>;

export function crearConsultarSalud(deps: {
  sonda: SondaDeBase;
  clock: Clock;
  version: string;
}): ConsultarSalud {
  return async () => {
    if (!(await deps.sonda.responde())) {
      return err({ tipo: 'BaseNoDisponible' });
    }
    return ok({ estado: 'ok', version: deps.version, instante: deps.clock.ahora() });
  };
}
