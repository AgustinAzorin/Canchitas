// Casos de uso de grupos que no se ejecutan: para generar el contrato y para los tests de otras
// rutas.
import type { CasosDeUsoDeGrupos } from '../modules/grupos/http/routes.ts';

const noSeUsa = (): never => {
  throw new Error('Caso de uso de grupos no disponible acá');
};

export const gruposInertes: CasosDeUsoDeGrupos = {
  crearGrupo: noSeUsa,
  listarMisGrupos: noSeUsa,
  consultarGrupo: noSeUsa,
  regenerarLink: noSeUsa,
  consultarInvitacion: noSeUsa,
  unirsePorLink: noSeUsa,
};

/** Lo que `construirApi` necesita de grupos cuando las rutas de grupos no se usan. */
export const dependenciasDeGruposInertes = {
  grupos: gruposInertes,
  autenticar: () => Promise.resolve(null),
  urlDeLaWeb: 'https://canchitas.app',
};
