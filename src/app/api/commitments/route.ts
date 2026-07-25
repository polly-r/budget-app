import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET() {
  const now = new Date();
  const month = now.getMonth() + 1;
  const year = now.getFullYear();

  const rules = await db.recurringRule.findMany({
    where: { active: true },
    include: {
      category: true,
      generations: { where: { month, year } },
    },
    orderBy: { dayOfMonth: "asc" },
  });

  const enrich = (rule: typeof rules[number]) => {
    const gen = rule.generations[0] ?? null;
    const status: "paid" | "skipped" | "upcoming" =
      !gen ? "upcoming" : gen.transactionId ? "paid" : "skipped";
    const { generations: _, ...rest } = rule;
    return { ...rest, status };
  };

  const expenses = rules.filter(r => r.type === "expense").map(enrich);
  const income   = rules.filter(r => r.type === "income").map(enrich);

  const monthlyCommitted = expenses.reduce((s, r) => s + r.amount, 0);
  const monthlyIncome    = income.reduce((s, r) => s + r.amount, 0);

  return NextResponse.json({
    month, year,
    expenses, income,
    monthlyCommitted,
    monthlyIncome,
    annualised: monthlyCommitted * 12,
  });
}
