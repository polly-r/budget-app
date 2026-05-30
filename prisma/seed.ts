import { PrismaClient } from "@prisma/client";
import { subDays, subMonths, startOfMonth } from "date-fns";

const prisma = new PrismaClient();

async function main() {
  // Skip if data already exists
  const existing = await prisma.category.count();
  if (existing > 0) return;

  // Categories
  const cats = await Promise.all([
    prisma.category.create({ data: { name: "Salary", icon: "💼", color: "#22c55e", type: "income" } }),
    prisma.category.create({ data: { name: "Freelance", icon: "💻", color: "#3b82f6", type: "income" } }),
    prisma.category.create({ data: { name: "Investments", icon: "📈", color: "#8b5cf6", type: "income" } }),
    prisma.category.create({ data: { name: "Groceries", icon: "🛒", color: "#f59e0b", type: "expense" } }),
    prisma.category.create({ data: { name: "Rent", icon: "🏠", color: "#ef4444", type: "expense" } }),
    prisma.category.create({ data: { name: "Transport", icon: "🚗", color: "#06b6d4", type: "expense" } }),
    prisma.category.create({ data: { name: "Dining", icon: "🍽️", color: "#f97316", type: "expense" } }),
    prisma.category.create({ data: { name: "Entertainment", icon: "🎬", color: "#a855f7", type: "expense" } }),
    prisma.category.create({ data: { name: "Health", icon: "💊", color: "#10b981", type: "expense" } }),
    prisma.category.create({ data: { name: "Shopping", icon: "🛍️", color: "#ec4899", type: "expense" } }),
    prisma.category.create({ data: { name: "Utilities", icon: "⚡", color: "#eab308", type: "expense" } }),
  ]);

  const [salary, freelance, investments, groceries, rent, transport, dining, entertainment, health, shopping, utilities] = cats;

  const now = new Date();
  const txns = [];

  // 3 months of transactions
  for (let m = 2; m >= 0; m--) {
    const base = subMonths(startOfMonth(now), m);

    txns.push(
      { amount: 45000, description: "Monthly salary", date: new Date(base.getFullYear(), base.getMonth(), 25), type: "income", categoryId: salary.id, recurring: true },
      { amount: 8500, description: "Web project", date: new Date(base.getFullYear(), base.getMonth(), 10), type: "income", categoryId: freelance.id },
      { amount: 2200, description: "Dividend payout", date: new Date(base.getFullYear(), base.getMonth(), 15), type: "income", categoryId: investments.id },
      { amount: 15000, description: "Apartment rent", date: new Date(base.getFullYear(), base.getMonth(), 1), type: "expense", categoryId: rent.id, recurring: true },
      { amount: 3200, description: "Checkers grocery run", date: new Date(base.getFullYear(), base.getMonth(), 5), type: "expense", categoryId: groceries.id },
      { amount: 1800, description: "Pick n Pay weekly", date: new Date(base.getFullYear(), base.getMonth(), 12), type: "expense", categoryId: groceries.id },
      { amount: 1200, description: "Uber rides", date: new Date(base.getFullYear(), base.getMonth(), 8), type: "expense", categoryId: transport.id },
      { amount: 900, description: "Fuel", date: new Date(base.getFullYear(), base.getMonth(), 18), type: "expense", categoryId: transport.id },
      { amount: 650, description: "Nando's dinner", date: new Date(base.getFullYear(), base.getMonth(), 6), type: "expense", categoryId: dining.id },
      { amount: 420, description: "Coffee & lunch", date: new Date(base.getFullYear(), base.getMonth(), 14), type: "expense", categoryId: dining.id },
      { amount: 350, description: "Netflix & Showmax", date: new Date(base.getFullYear(), base.getMonth(), 3), type: "expense", categoryId: entertainment.id },
      { amount: 280, description: "Gym membership", date: new Date(base.getFullYear(), base.getMonth(), 1), type: "expense", categoryId: health.id, recurring: true },
      { amount: 2100, description: "Clothing & shoes", date: new Date(base.getFullYear(), base.getMonth(), 20), type: "expense", categoryId: shopping.id },
      { amount: 1400, description: "Electricity & water", date: new Date(base.getFullYear(), base.getMonth(), 7), type: "expense", categoryId: utilities.id, recurring: true },
    );
  }

  await prisma.transaction.createMany({ data: txns });

  // Budgets for current month
  const month = now.getMonth() + 1;
  const year = now.getFullYear();
  await prisma.budget.createMany({
    data: [
      { categoryId: groceries.id, amount: 6000, period: "monthly", month, year },
      { categoryId: rent.id, amount: 15000, period: "monthly", month, year },
      { categoryId: transport.id, amount: 2500, period: "monthly", month, year },
      { categoryId: dining.id, amount: 2000, period: "monthly", month, year },
      { categoryId: entertainment.id, amount: 800, period: "monthly", month, year },
      { categoryId: shopping.id, amount: 3000, period: "monthly", month, year },
      { categoryId: utilities.id, amount: 1600, period: "monthly", month, year },
    ],
  });

  // Goals
  await prisma.goal.createMany({
    data: [
      { name: "Emergency Fund", targetAmount: 50000, savedAmount: 22000, targetDate: new Date(year, 11, 31), icon: "🛡️", color: "#22c55e" },
      { name: "Holiday — Cape Town", targetAmount: 18000, savedAmount: 7500, targetDate: new Date(year, 7, 1), icon: "✈️", color: "#3b82f6" },
      { name: "New Laptop", targetAmount: 25000, savedAmount: 12000, targetDate: new Date(year, 5, 1), icon: "💻", color: "#8b5cf6" },
      { name: "Down Payment", targetAmount: 200000, savedAmount: 45000, targetDate: new Date(year + 2, 0, 1), icon: "🏠", color: "#f59e0b" },
    ],
  });

  console.log("✅ Seed complete");
}

main().catch(console.error).finally(() => prisma.$disconnect());
