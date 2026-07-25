import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { subMonths } from "date-fns";

export async function POST() {
  const now = new Date();
  const thisMonth = now.getMonth() + 1;
  const thisYear = now.getFullYear();
  const prev = subMonths(now, 1);
  const prevMonth = prev.getMonth() + 1;
  const prevYear = prev.getFullYear();

  const existing = await db.budget.count({ where: { month: thisMonth, year: thisYear } });
  if (existing > 0) return NextResponse.json({ created: 0 });

  const prevBudgets = await db.budget.findMany({ where: { month: prevMonth, year: prevYear } });
  if (prevBudgets.length === 0) return NextResponse.json({ created: 0 });

  await db.budget.createMany({
    data: prevBudgets.map(b => ({
      categoryId: b.categoryId,
      amount: b.amount,
      period: b.period,
      month: thisMonth,
      year: thisYear,
    })),
    skipDuplicates: true,
  });

  return NextResponse.json({ created: prevBudgets.length });
}
