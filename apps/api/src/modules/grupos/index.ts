// API pública del módulo de grupos. Otros módulos (votaciones, partidos, pagos) autorizan sus
// acciones con este módulo de políticas (RN-07, RNF-013).
export {
  accionesPermitidas,
  autorizar,
  decidir,
  rolDelActor,
  type Accion,
  type Decision,
  type Membresia,
  type MotivoDeRechazo,
  type NoAutorizado,
  type Rol,
} from './domain/politicas.ts';
