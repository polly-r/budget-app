import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { subMonths, startOfMonth, endOfMonth, format } from "date-fns";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const months = parseInt(searchParams.get("months") || "6");

  const now = new Date();
  const monthlyData = [];

  for (let i = months - 1; i >= 0; i--) {
    const date = subMonths(now, i);
    const start = startOfMonth(date);
    const end = endOfMonth(date);

    const transactions = await db.transaction.findMany({
      where: { date: { gte: start, lte: end } },
      include: { category: true },
    });

    const income = transactions.filter((t) => t.type === "income").reduce((s, t) => s + t.amount, 0);
    const expenses = transactions.filter((t) => t.type === "expense").reduce((s, t) => s + t.amount, 0);

    const byCategory: Record<string, { name: string; color: string; icon: string; amount: number }> = {};
    transactions
      .filter((t) => t.type === "expense")
      .forEach((t) => {
        if (!byCategory[t.categoryId]) {
          byCategory[t.categoryId] = { name: t.category.name, color: t.category.color, icon: t.category.icon, amount: 0 };
        }
        byCategory[t.categoryId].amount += t.amount;
      });

    monthlyData.push({
      month: format(date, "MMM yyyy"),
      income,
      expenses,
      savings: income - expenses,
      categories: Object.values(byCategory).sort((a, b) => b.amount - a.amount),
    });
  }

  // Net worth trend (cumulative savings)
  let cumulative = 0;
  const netWorth = monthlyData.map((m) => {
    cumulative += m.savings;
    return { month: m.month, value: cumulative };
  });

  return NextResponse.json({ monthly: monthlyData, netWorth });
}
