import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET() {
  const now = new Date();
  const month = now.getMonth() + 1;
  const year = now.getFullYear();
  const monthStart = new Date(year, month - 1, 1);
  const monthEnd   = new Date(year, month, 1);

  const [incomeAgg, expenseAgg, incomeRules, expenseRules, goals] = await Promise.all([
    db.transaction.aggregate({
      where: { type: "income", date: { gte: monthStart, lt: monthEnd } },
      _sum: { amount: true },
    }),
    db.transaction.aggregate({
      where: { type: "expense", date: { gte: monthStart, lt: monthEnd } },
      _sum: { amount: true },
    }),
    db.recurringRule.findMany({
      where: { type: "income", active: true, generations: { none: { month, year } } },
      select: { amount: true },
    }),
    db.recurringRule.findMany({
      where: { type: "expense", active: true, generations: { none: { month, year } } },
      select: { amount: true },
    }),
    db.goal.findMany({ where: { targetDate: { gt: now } } }),
  ]);

  const incomeReceived  = incomeAgg._sum.amount ?? 0;
  const expenseSpent    = expenseAgg._sum.amount ?? 0;
  const incomeExpected  = incomeRules.reduce((s, r) => s + r.amount, 0);
  const expenseCommitted = expenseRules.reduce((s, r) => s + r.amount, 0);

  const goalBreakdown = goals
    .filter(g => g.savedAmount < g.targetAmount)
    .map(g => {
      const target = new Date(g.targetDate);
      const months = Math.max(
        1,
        (target.getFullYear() - now.getFullYear()) * 12 +
        (target.getMonth() - now.getMonth()),
      );
      return {
        name: g.name,
        icon: g.icon,
        monthlyContribution: (g.targetAmount - g.savedAmount) / months,
      };
    });

  const goalReserve = goalBreakdown.reduce((s, g) => s + g.monthlyContribution, 0);

  // Main figure excludes goals; afterGoals shows the stricter view alongside it
  const leftToSpend =
    (incomeReceived + incomeExpected) - expenseSpent - expenseCommitted;
  const afterGoals = leftToSpend - goalReserve;

  return NextResponse.json({
    month, year,
    incomeReceived, incomeExpected,
    expenseSpent, expenseCommitted,
    goalReserve, goalBreakdown,
    leftToSpend, afterGoals,
  });
}
