// RF-003: formato del nombre de usuario. Es el mismo CHECK de la tabla `usuario`
// (db/migrations/20260928120002_identidad_grupos.sql); se guarda en minúsculas.
import { err, ok, type Result } from '../../../shared/result.ts';

export interface NombreDeUsuarioInvalido {
  tipo: 'NombreDeUsuarioInvalido';
}

const formato = /^[a-z0-9_.]{3,20}$/;

export function normalizarNombreDeUsuario(texto: string): Result<string, NombreDeUsuarioInvalido> {
  const normalizado = texto.trim().toLowerCase();
  return formato.test(normalizado) ? ok(normalizado) : err({ tipo: 'NombreDeUsuarioInvalido' });
}
