import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function POST(req: NextRequest) {
  const { month, year, items, skipped } = await req.json();
  const lastDay = new Date(year, month, 0).getDate();
  let created = 0;

  for (const item of items ?? []) {
    const existing = await db.recurringGeneration.findUnique({
      where: { ruleId_month_year: { ruleId: item.ruleId, month, year } },
    });
    if (existing) continue;

    const rule = await db.recurringRule.findUnique({ where: { id: item.ruleId } });
    if (!rule) continue;

    const day = Math.min(rule.dayOfMonth, lastDay);
    const tx = await db.transaction.create({
      data: {
        amount: parseFloat(item.amount),
        description: rule.description,
        date: new Date(year, month - 1, day),
        type: rule.type,
        categoryId: rule.categoryId,
        recurring: true,
      },
    });

    await db.recurringGeneration.create({
      data: { ruleId: item.ruleId, month, year, transactionId: tx.id },
    });

    created++;
  }

  for (const ruleId of skipped ?? []) {
    await db.recurringGeneration.upsert({
      where: { ruleId_month_year: { ruleId, month, year } },
      create: { ruleId, month, year, transactionId: null },
      update: {},
    });
  }

  return NextResponse.json({ created });
}
