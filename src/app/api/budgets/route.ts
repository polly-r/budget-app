import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getMonthRange } from "@/lib/utils";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const month = parseInt(searchParams.get("month") || String(new Date().getMonth() + 1));
  const year = parseInt(searchParams.get("year") || String(new Date().getFullYear()));

  const { start, end } = getMonthRange(new Date(year, month - 1, 1));

  const [budgets, transactions] = await Promise.all([
    db.budget.findMany({
      where: { month, year },
      include: { category: true },
    }),
    db.transaction.findMany({
      where: { date: { gte: start, lte: end }, type: "expense" },
      include: { category: true },
    }),
  ]);

  const result = budgets.map((budget) => {
    const spent = transactions
      .filter((t) => t.categoryId === budget.categoryId)
      .reduce((sum, t) => sum + t.amount, 0);
    return { ...budget, spent, remaining: budget.amount - spent, percentage: Math.min((spent / budget.amount) * 100, 100) };
  });

  return NextResponse.json(result);
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { categoryId, amount, period, month, year } = body;

  const budget = await db.budget.upsert({
    where: { categoryId_month_year: { categoryId, month: parseInt(month), year: parseInt(year) } },
    update: { amount: parseFloat(amount), period },
    create: { categoryId, amount: parseFloat(amount), period, month: parseInt(month), year: parseInt(year) },
    include: { category: true },
  });

  return NextResponse.json(budget, { status: 201 });
}
