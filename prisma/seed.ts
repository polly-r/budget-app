import { PrismaClient } from "@prisma/client";
import { subMonths, startOfMonth } from "date-fns";

const prisma = new PrismaClient();

async function main() {
  const existing = await prisma.category.count();
  if (existing > 0) return;

  // ── Categories ────────────────────────────────────────────────────────────

  const cats = await Promise.all([
    // Income
    prisma.category.create({ data: { name: "Salary",           icon: "💼", color: "#22c55e", type: "income"  } }),

    // Fixed expenses
    prisma.category.create({ data: { name: "Rent / Bond",      icon: "🏠", color: "#ef4444", type: "expense" } }),
    prisma.category.create({ data: { name: "Medical Aid",      icon: "🏥", color: "#10b981", type: "expense" } }),
    prisma.category.create({ data: { name: "School Fees",      icon: "🎓", color: "#3b82f6", type: "expense" } }),
    prisma.category.create({ data: { name: "Insurance",        icon: "🛡️", color: "#6366f1", type: "expense" } }),
    prisma.category.create({ data: { name: "Utilities",        icon: "⚡", color: "#eab308", type: "expense" } }),
    prisma.category.create({ data: { name: "Gym",              icon: "🏋️", color: "#f97316", type: "expense" } }),

    // Variable expenses
    prisma.category.create({ data: { name: "Groceries",        icon: "🛒", color: "#f59e0b", type: "expense" } }),
    prisma.category.create({ data: { name: "Petrol",           icon: "⛽", color: "#06b6d4", type: "expense" } }),
    prisma.category.create({ data: { name: "Transport",        icon: "🚗", color: "#0ea5e9", type: "expense" } }),
    prisma.category.create({ data: { name: "Eating Out",       icon: "🍽️", color: "#f97316", type: "expense" } }),
    prisma.category.create({ data: { name: "Alcohol",          icon: "🍺", color: "#a855f7", type: "expense" } }),
    prisma.category.create({ data: { name: "Airtime / Data",   icon: "📱", color: "#ec4899", type: "expense" } }),
    prisma.category.create({ data: { name: "Home Maintenance", icon: "🔧", color: "#78716c", type: "expense" } }),
    prisma.category.create({ data: { name: "Shopping",         icon: "🛍️", color: "#e879f9", type: "expense" } }),
    prisma.category.create({ data: { name: "Entertainment",    icon: "🎬", color: "#8b5cf6", type: "expense" } }),
    prisma.category.create({ data: { name: "Health",           icon: "💊", color: "#14b8a6", type: "expense" } }),
  ]);

  const [
    salary,
    rent, medicalAid, schoolFees, insurance, utilities, gym,
    groceries, petrol, transport, eatingOut, alcohol, airtime, homeMaintenance, shopping, entertainment, health,
  ] = cats;

  // ── Sample transactions (current month only — light touch) ────────────────

  const now  = new Date();
  const base = startOfMonth(now);
  const y    = base.getFullYear();
  const m    = base.getMonth();

  await prisma.transaction.createMany({
    data: [
      // Income
      { amount: 35000, description: "Monthly salary",      date: new Date(y, m, 25), type: "income",  categoryId: salary.id,          recurring: true  },

      // Fixed
      { amount: 12000, description: "Bond / rent",         date: new Date(y, m,  1), type: "expense", categoryId: rent.id,            recurring: true  },
      { amount: 3500,  description: "Medical aid premium", date: new Date(y, m,  1), type: "expense", categoryId: medicalAid.id,      recurring: true  },
      { amount: 2500,  description: "School fees",         date: new Date(y, m,  3), type: "expense", categoryId: schoolFees.id,      recurring: true  },
      { amount: 1800,  description: "Car insurance",       date: new Date(y, m,  1), type: "expense", categoryId: insurance.id,       recurring: true  },
      { amount: 1400,  description: "Electricity & water", date: new Date(y, m,  7), type: "expense", categoryId: utilities.id,       recurring: true  },
      { amount: 399,   description: "Gym membership",      date: new Date(y, m,  1), type: "expense", categoryId: gym.id,             recurring: true  },

      // Variable
      { amount: 3000,  description: "Weekly groceries",    date: new Date(y, m,  5), type: "expense", categoryId: groceries.id,       recurring: false },
      { amount: 1200,  description: "Petrol",              date: new Date(y, m,  6), type: "expense", categoryId: petrol.id,          recurring: false },
      { amount: 650,   description: "Dinner out",          date: new Date(y, m,  8), type: "expense", categoryId: eatingOut.id,       recurring: false },
      { amount: 320,   description: "Airtime & data",      date: new Date(y, m,  2), type: "expense", categoryId: airtime.id,         recurring: false },
      { amount: 280,   description: "Wine & drinks",       date: new Date(y, m, 10), type: "expense", categoryId: alcohol.id,         recurring: false },
      { amount: 500,   description: "Netflix & DStv",      date: new Date(y, m,  3), type: "expense", categoryId: entertainment.id,   recurring: true  },
    ],
  });

  // ── Budgets (current month) ───────────────────────────────────────────────

  const month = now.getMonth() + 1;
  const year  = now.getFullYear();

  await prisma.budget.createMany({
    data: [
      { categoryId: rent.id,            amount: 12000, period: "monthly", month, year },
      { categoryId: medicalAid.id,      amount: 3500,  period: "monthly", month, year },
      { categoryId: schoolFees.id,      amount: 2500,  period: "monthly", month, year },
      { categoryId: insurance.id,       amount: 1800,  period: "monthly", month, year },
      { categoryId: utilities.id,       amount: 1500,  period: "monthly", month, year },
      { categoryId: groceries.id,       amount: 4000,  period: "monthly", month, year },
      { categoryId: petrol.id,          amount: 2000,  period: "monthly", month, year },
      { categoryId: eatingOut.id,       amount: 1500,  period: "monthly", month, year },
      { categoryId: alcohol.id,         amount: 800,   period: "monthly", month, year },
      { categoryId: airtime.id,         amount: 400,   period: "monthly", month, year },
      { categoryId: homeMaintenance.id, amount: 1000,  period: "monthly", month, year },
      { categoryId: shopping.id,        amount: 1500,  period: "monthly", month, year },
      { categoryId: entertainment.id,   amount: 600,   period: "monthly", month, year },
    ],
  });

  // ── Goals ─────────────────────────────────────────────────────────────────

  const year2 = now.getFullYear();
  await prisma.goal.create({
    data: {
      name:         "House Deposit",
      targetAmount: 300000,
      savedAmount:  0,
      targetDate:   new Date(year2 + 3, 0, 1),
      icon:         "🏠",
      color:        "#22c55e",
    },
  });

  console.log("✅ Seed complete — your personal budget is ready");
}

main().catch(console.error).finally(() => prisma.$disconnect());