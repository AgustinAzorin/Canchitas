// Result<T, E> para el dominio y los casos de uso (ADR 0008). Los errores de dominio son
// uniones discriminadas por `tipo`; las excepciones quedan para lo inesperado.
export { err, errAsync, ok, okAsync, Result, ResultAsync } from 'neverthrow';
