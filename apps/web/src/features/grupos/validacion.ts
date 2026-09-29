// Validación del formulario, solo para la experiencia: la regla la decide la API (RF-010).
import { mensajes } from '@/messages/es-AR';

export function validarNombreDeGrupo(nombre: string): string | undefined {
  const limpio = nombre.trim();
  if (limpio === '') {
    return mensajes.comun.campoObligatorio;
  }
  return limpio.length > 60 ? mensajes.grupos.crear.nombreLargo : undefined;
}
