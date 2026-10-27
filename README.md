# React + TypeScript + Vite

This template provides a minimal setup to get React working in Vite with HMR and some Oxlint rules.

## Running the app

Run `npm run dev` to start the development server at <http://localhost:3000>.
The dev and preview servers are pinned to port 3000 and will report an error if
that port is already in use.

## Timetable features

Add each subject code, name, faculty member, and whether it has a lab. Faculty
can teach multiple subjects. Add lecture and, when needed, lab rooms before
generating schedules for both EXCS A and EXCS B. Randomized Graph Coloring
avoids class, faculty, and room conflicts; each subject's lecture and lab are
scheduled on different days. The app also creates an individual weekly
timetable for each faculty member and one end-semester exam per subject.
Exam dates start on November 16, 2026, never fall on a Sunday, include a
randomly selected one or two free days between exams, and stay within the
November 16–December 16 exam period. Generate the timetables again to get new
randomized schedules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Oxc](https://oxc.rs)
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/)

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the Oxlint configuration

If you are developing a production application, we recommend enabling type-aware lint rules by installing `oxlint-tsgolint` and editing `.oxlintrc.json`:

```json
{
  "$schema": "./node_modules/oxlint/configuration_schema.json",
  "plugins": ["react", "typescript", "oxc"],
  "options": {
    "typeAware": true
  },
  "rules": {
    "react/rules-of-hooks": "error",
    "react/only-export-components": ["warn", { "allowConstantExport": true }]
  }
}
```

See the [Oxlint rules documentation](https://oxc.rs/docs/guide/usage/linter/rules) for the full list of rules and categories.
