import { base } from '@canchitas/eslint-config';

export default [
  ...base({ tsconfigRootDir: import.meta.dirname }),
  {
    // El dominio no lee el reloj: el tiempo entra por el puerto Clock (apps/api/CLAUDE.md).
    files: ['src/**/domain/**/*.ts'],
    rules: {
      'no-restricted-syntax': [
        'error',
        {
          selector: "CallExpression[callee.object.name='Date'][callee.property.name='now']",
          message: 'Usá el puerto Clock.',
        },
        {
          selector: "NewExpression[callee.name='Date'][arguments.length=0]",
          message: 'Usá el puerto Clock.',
        },
      ],
    },
  },
];
