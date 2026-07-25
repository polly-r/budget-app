# 💰 Budget — Personal Finance App

A full-stack personal finance app built with Next.js 14, Prisma + SQLite, and Recharts. Runs entirely on your own machine — your financial data never leaves your device.

## Features

- 🔐 **Login gate** — the whole app sits behind a password you choose; sessions last 30 days
- 📊 **Dashboard** — income, expenses, savings rate, budget status, and a **"Left to spend"** figure showing what you can still freely spend this month (with a transparent breakdown)
- 💳 **Transactions** — add, filter, search, with smart auto-categorisation that learns your merchants (and never overwrites a category you set manually)
- 🔁 **Recurring rules** — define monthly commitments (rent, insurance, subscriptions, salary) once; each month the dashboard asks you to confirm, edit, or skip them — nothing is ever written silently
- 📋 **Commitments** — one page showing every fixed obligation, its due day, paid/skipped/upcoming status, and your total monthly + annualised committed cost
- 📦 **Budgets** — monthly envelopes with real-time spend tracking
- 🎯 **Goals** — savings goals with progress and suggested monthly contributions
- 📈 **Reports** — cashflow, net worth trend, spending breakdown, and a **cash-flow forecast** projecting your balance ~3 months ahead
- 💾 **Automatic backups** — the database is snapshotted to `backups/` on every startup

## Quick start

**1. Install dependencies**

```bash
npm install
```

**2. Create your environment file**

Copy `.env.example` to `.env.local` and set your own password and session secret:

```bash
cp .env.example .env.local   # macOS/Linux
copy .env.example .env.local # Windows
```

Then edit `.env.local`:
- `APP_PASSWORD` — the password you'll log in with
- `SESSION_SECRET` — any random string of 32+ characters (generation commands are in the file)

**3. Run**

```bash
npm run dev
```

Open http://localhost:3000 and log in with your password. On first run the SQLite database is created automatically and seeded with sample data (South African context — ZAR) so you can explore; replace it with your own transactions as you go.

## Your data stays yours

- Everything lives in a local SQLite file (`prisma/dev.db`) — no cloud, no accounts, no telemetry
- `prisma/dev.db`, `.env.local`, and `backups/` are gitignored, so nothing personal can end up in the repo
- To start over from scratch: `npm run db:reset` (⚠️ wipes the database and re-seeds sample data)

## Tech stack

- **Framework**: Next.js 14 App Router
- **Database**: SQLite via Prisma ORM (zero setup)
- **Auth**: signed httpOnly session cookie (HMAC-SHA256 via Web Crypto — no external auth dependencies)
- **Charts**: Recharts
- **Styling**: plain CSS variables (dark theme)
- **Currency**: ZAR / South African Rand
