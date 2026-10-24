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

## Live data (Google Sheets)

The Sheet stays private. `apps-script/Code.gs` is attached to it and deployed
as a web app that publishes only the dashboard fields as JSON, after applying
the word replacements set in the Sheet's "Tableau de bord" tab.

1. In the Sheet: Extensions > Apps Script, paste `apps-script/Code.gs`, save.
2. Reload the Sheet and use the "Tableau de bord" menu to create the
   configuration tab and check the data.
3. Deploy > New deployment > Web app, "Execute as: Me", "Who has access:
   Anyone". Use a personal Google account: Workspace accounts put their
   domain in the web-app URL.
4. Set the URL as the repository variable `DATA_URL` (Settings > Secrets and
   variables > Actions > Variables), and locally in `.env.local` as
   `VITE_DATA_URL=…` for the offline file.

When the source is unreachable, the page keeps showing the last data loaded
in that browser, labelled as such. Anyone with the page URL can see what the
dashboard shows; the Sheet itself is never shared.

## Private data

`local-data/`, the offline HTML file and every office document are
git-ignored. Real project data must never be committed. Only the build of
the public demo is deployed (GitHub Actions, see `.github/workflows/`).

## Data format

See `src/types.ts`: a project (title, start, end), milestones, and tasks
with id, category, name, weight, due date, dependencies and completion date.
