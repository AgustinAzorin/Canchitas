// Agrega a la base las reglas de React para la web.
import globals from 'globals';
import tseslint from 'typescript-eslint';

import { base } from './index.js';

/**
 * @param {{ tsconfigRootDir: string }} options
 */
export function react(options) {
  return tseslint.config(...base(options), {
    languageOptions: { globals: { ...globals.browser } },
  });
}
