// Cliente de la API generado desde contract/openapi.json (ADR 0007). Web y API comparten
// origen detrás de Caddy, así que las rutas son relativas (/v1/…).
import createClient from 'openapi-fetch';

import type { paths } from './esquema.generated';

export const api = createClient<paths>({ baseUrl: '' });
export type { components } from './esquema.generated';
