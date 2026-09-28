// Conventional Commits: tipo en inglés, descripción en español (ADR 0002, ADR 0015).
export default {
  extends: ['@commitlint/config-conventional'],
  rules: {
    // La descripción está en español y puede empezar con cualquier palabra.
    'subject-case': [0],
  },
};
