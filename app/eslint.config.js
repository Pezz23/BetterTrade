// Il linter serve a una cosa sola, e l'8/10/2026 è costata una schermata nera:
// prendere i nomi che non esistono (`no-undef`) e quelli rimasti inutilizzati.
// `vite build` non li guarda — per esbuild un identificatore sconosciuto è
// legittimo — e l'errore arriva al primo render, nel browser, davanti a Mattia.
//
//   npm run lint
//
// Non è un giudice di stile: il progetto ha le sue convenzioni e stanno in
// CLAUDE.md. Le regole di gusto restano spente di proposito, così quando il
// linter parla ha sempre qualcosa da dire.

import js from '@eslint/js'
import globals from 'globals'
import hooks from 'eslint-plugin-react-hooks'

export default [
  { ignores: ['dist/**', 'node_modules/**'] },

  // L'app: gira nel browser.
  {
    files: ['src/**/*.{js,jsx}'],
    ...js.configs.recommended,
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      globals: globals.browser,
      parserOptions: { ecmaFeatures: { jsx: true } },
    },
    plugins: { 'react-hooks': hooks },
    rules: {
      ...js.configs.recommended.rules,
      // Le dipendenze degli hook: avviso, non errore. Alcune sono volute
      // (`leggiGriglia` all'avvio), e un errore qui bloccherebbe per niente.
      'react-hooks/exhaustive-deps': 'warn',
      'react-hooks/rules-of-hooks': 'error',
      // Un argomento che non si usa capita nei gestori; una variabile no.
      'no-unused-vars': ['error', { args: 'none', ignoreRestSiblings: true }],
    },
  },

  // ⚠️ I nostri hook si chiamano `usaProssime`, `usaForma`, `usaIndietro`:
  // italiano, come tutto il resto del progetto. `rules-of-hooks` riconosce un
  // hook solo dal prefisso `use` e non si può istruire, quindi dentro
  // `src/hooks/` li bocciava tutti — 17 errori su 4 file che vanno benissimo.
  // Là la regola si spegne. **Si perde qualcosa**: non controlla più che un
  // hook non sia chiamato dentro un `if`. In quella cartella ogni funzione è
  // un hook e il file è corto, quindi si guarda a occhio; nelle pagine e nei
  // componenti, dove il rischio vero è, la regola resta accesa.
  { files: ['src/hooks/**/*.js'], rules: { 'react-hooks/rules-of-hooks': 'off' } },

  // Gli script: girano in Node, con .env e argomenti da riga di comando.
  {
    files: ['scripts/**/*.js', 'eslint.config.js', 'vite.config.js'],
    ...js.configs.recommended,
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      globals: { ...globals.node },
    },
    rules: {
      ...js.configs.recommended.rules,
      'no-unused-vars': ['error', { args: 'none' }],
    },
  },
]
