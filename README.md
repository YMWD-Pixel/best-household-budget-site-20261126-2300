# NestEgg — Household Budget

[![make.fun · best-household-budget-site-20261126-1457](https://make.fun/badge/best-household-budget-site-20261126-1457.svg)](https://make.fun/bounty/best-household-budget-site-20261126-1457?utm_source=github&utm_medium=readme&utm_campaign=best-household-budget-site-20261126-1457)
[![rank](https://make.fun/badge/best-household-budget-site-20261126-1457/YMWD-Pixel/best-household-budget-site-20261126-2300/rank.svg)](https://make.fun/bounty/best-household-budget-site-20261126-1457/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=best-household-budget-site-20261126-1457)
[![reward](https://make.fun/badge/best-household-budget-site-20261126-1457/YMWD-Pixel/best-household-budget-site-20261126-2300/reward.svg)](https://make.fun/bounty/best-household-budget-site-20261126-1457?utm_source=github&utm_medium=readme&utm_campaign=best-household-budget-site-20261126-1457)

NestEgg keeps one household's whole budget in one place: what comes in, what goes out, what is left for the things that matter. It runs entirely in the browser from static files — no server, no account, no network request — and saves to localStorage, so the family's numbers never leave their own device.

## What it does

- **Dashboard** — the month at a glance: money in, money out, left to save; a donut of where the money went; the budgets closest to the edge; recent transactions and bills still to pay.
- **Transactions** — every dollar in and out, with add / edit / delete, filters by kind, category and search, and totals that follow the filters.
- **Budgets** — a monthly limit per category with progress bars and over-budget warnings; tap a number to change the limit and the whole site follows.
- **Bills & Goals** — recurring bills with due dates and mark-paid ticking, plus savings goals with progress bars, add-money and new-goal forms.
- **Reports** — income vs spending over three months, average daily spend, the biggest single expenses, and a plain-words read of where the month went.
- **Extras** — month picker (Sep–Nov 2026 demo books included), CSV export of the month, and a reset-demo button.

## How it is built

- `app/` — the site: `index.html`, `style.css`, and ES modules with one job each (`data.js` seed books, `store.js` state + persistence, `charts.js` hand-drawn canvas charts, `views.js` the five sections, `app.js` routing + forms). No framework, no external files.
- `main.ts` — the hand-in program (Node 22): copies `app/` and `screenshots/` to the output directory and writes `dossier.json` with the vendored make.fun library.
- `vendor/makefun-frontend.ts` — the kit's copy, unchanged.
- `screenshots/` — real renders of the site in a browser, desktop and phone sizes.

## Run it locally

```sh
node serve.ts        # then open http://localhost:8080
```

Or open `app/index.html` straight from disk — the site loads nothing over the network.

## Hand it in

```sh
mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
```

<sub>Entered on [make.fun](https://make.fun/?ref=fxcrjdqj&utm_source=github&utm_medium=readme&utm_campaign=best-household-budget-site-20261126-1457) · AI agents build software for cash rewards</sub>
