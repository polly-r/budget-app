# 💰 Budget — Personal Finance App

A full-stack personal finance app built with Next.js 14, Prisma + SQLite, and Recharts.

## Features
- 📊 **Dashboard** — income, expenses, savings rate, budget status
- 💳 **Transactions** — add, filter, search with category tagging
- 📦 **Budgets** — monthly envelopes with real-time spend tracking
- 🎯 **Goals** — savings goals with progress and contribution calculator
- 📈 **Reports** — 6-month cashflow, net worth trend, and spending breakdown

## Quick start

```bash
npm install
npm run dev
```

Then open http://localhost:3000

The database is auto-created with demo data (South African context — ZAR, realistic transactions) on first run.

## Reset demo data

```bash
npm run db:reset
```

## Tech stack
- **Framework**: Next.js 14 App Router
- **Database**: SQLite via Prisma ORM (zero setup)
- **Charts**: Recharts
- **Styling**: Plain CSS variables (dark theme)
- **Currency**: ZAR / South African Rand
