// RF-010: el nombre del grupo. Es el mismo CHECK de la tabla `grupo`
// (db/migrations/20260928120002_identidad_grupos.sql): de 1 a 60 caracteres sin contar los
// espacios de los extremos.
import { err, ok, type Result } from '../../../shared/result.ts';

export interface NombreDeGrupoInvalido {
  tipo: 'NombreDeGrupoInvalido';
  largoMaximo: number;
}

export const largoMaximoDelNombre = 60;

export function normalizarNombreDeGrupo(texto: string): Result<string, NombreDeGrupoInvalido> {
  const nombre = texto.trim().replace(/\s+/g, ' ');
  return nombre.length >= 1 && nombre.length <= largoMaximoDelNombre
    ? ok(nombre)
    : err({ tipo: 'NombreDeGrupoInvalido', largoMaximo: largoMaximoDelNombre });
}
