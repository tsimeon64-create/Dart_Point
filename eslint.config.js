import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import tseslint from 'typescript-eslint'
import { defineConfig, globalIgnores } from 'eslint/config'

export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      js.configs.recommended,
      tseslint.configs.recommended,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      globals: globals.browser,
    },
  },
  // Le code de l'app est en .jsx (App.jsx, AppJeux.jsx, …) : la config ci-dessus ne le
  // couvrait PAS → une icône utilisée mais non importée (ex. <X/>) passait inaperçue et
  // provoquait un écran noir à l'exécution. Ce bloc lint les .jsx UNIQUEMENT sur les
  // règles « plantage » (identifiant/composant non défini, mauvais usage des hooks) — sans
  // les règles de style, pour que `npm run lint` reste lisible et ne crie que sur un vrai bug.
  {
    files: ['src/**/*.{js,jsx}'],
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      globals: globals.browser,
      parserOptions: { ecmaFeatures: { jsx: true } },
    },
    // On n'active que des règles « plantage » ici ; les vieux commentaires
    // `eslint-disable` ciblant des règles de style non activées ne doivent pas faire de bruit.
    linterOptions: { reportUnusedDisableDirectives: 'off' },
    plugins: { 'react-hooks': reactHooks },
    rules: {
      'no-undef': 'error',                    // attrape les imports manquants (icônes, helpers…)
      'react-hooks/rules-of-hooks': 'error',  // attrape les hooks appelés conditionnellement
    },
  },
])
