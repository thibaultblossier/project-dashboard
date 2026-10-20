# Tableau de bord projet

Single-page dashboard showing a project's progress: weighted progress curve
(planned vs. actual), key indicators, per-category progress, a watch list,
a task timeline and the dependency graph. Everything is visible at once,
with no menus or hidden panels.

The public build ships **fictional demo data only** (`src/data/demo.ts`).

## Commands

```bash
npm install
npm run dev       # dev server, uses local-data/project.json when present
npm run build     # public build in dist/ (demo data)
npm run offline   # single self-contained HTML file with local data
```

Dev-only URL parameters: `?src=demo` forces the demo data, and
`?today=YYYY-MM-DD` previews the dashboard at another date.

## Private data

`local-data/`, the offline HTML file and every office document are
git-ignored. Real project data must never be committed. Only the build of
the public demo is deployed (GitHub Actions, see `.github/workflows/`).

## Data format

See `src/types.ts`: a project (title, start, end), milestones, and tasks
with id, category, name, weight, due date, dependencies and completion date.
