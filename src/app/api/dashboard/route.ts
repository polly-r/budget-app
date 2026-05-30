import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getMonthRange } from "@/lib/utils";
import { subMonths } from "date-fns";

export async function GET() {
  const now = new Date();
  const { start, end } = getMonthRange(now);
  const prevRange = getMonthRange(subMonths(now, 1));

  const [currentTxns, prevTxns, goals, budgets] = await Promise.all([
    db.transaction.findMany({ where: { date: { gte: start, lte: end } }, include: { category: true } }),
    db.transaction.findMany({ where: { date: { gte: prevRange.start, lte: prevRange.end } } }),
    db.goal.findMany(),
    db.budget.findMany({ where: { month: now.getMonth() + 1, year: now.getFullYear() }, include: { category: true } }),
  ]);

  const income = currentTxns.filter((t) => t.type === "income").reduce((s, t) => s + t.amount, 0);
  const expenses = currentTxns.filter((t) => t.type === "expense").reduce((s, t) => s + t.amount, 0);
  const prevIncome = prevTxns.filter((t) => t.type === "income").reduce((s, t) => s + t.amount, 0);
  const prevExpenses = prevTxns.filter((t) => t.type === "expense").reduce((s, t) => s + t.amount, 0);

  const recentTransactions = currentTxns.slice(0, 8);

  const budgetsWithSpend = budgets.map((b) => {
    const spent = currentTxns
      .filter((t) => t.type === "expense" && t.categoryId === b.categoryId)
      .reduce((s, t) => s + t.amount, 0);
    return { ...b, spent, percentage: Math.min((spent / b.amount) * 100, 100) };
  });

  const expenseByCategory = currentTxns
    .filter((t) => t.type === "expense")
    .reduce((acc, t) => {
      const key = t.category.name;
      if (!acc[key]) acc[key] = { name: key, value: 0, color: t.category.color, icon: t.category.icon };
      acc[key].value += t.amount;
      return acc;
    }, {} as Record<string, { name: string; value: number; color: string; icon: string }>);

  return NextResponse.json({
    income,
    expenses,
    savings: income - expenses,
    savingsRate: income > 0 ? ((income - expenses) / income) * 100 : 0,
    prevIncome,
    prevExpenses,
    recentTransactions,
    budgets: budgetsWithSpend,
    goals,
    expenseByCategory: Object.values(expenseByCategory).sort((a, b) => b.value - a.value),
  });
}
