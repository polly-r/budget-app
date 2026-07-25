import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { subMonths, startOfMonth } from "date-fns";

export async function GET() {
  const since = startOfMonth(subMonths(new Date(), 3));

  const txs = await db.transaction.findMany({
    where: { recurring: true, date: { gte: since } },
    include: { category: true },
    orderBy: { date: "desc" },
  });

  const seen = new Set<string>();
  const suggestions: object[] = [];

  for (const tx of txs) {
    const key = `${tx.description}::${tx.categoryId}`;
    if (seen.has(key)) continue;
    seen.add(key);
    suggestions.push({
      description: tx.description,
      amount: tx.amount,
      type: tx.type,
      categoryId: tx.categoryId,
      category: tx.category,
      dayOfMonth: new Date(tx.date).getDate(),
    });
  }

  return NextResponse.json(suggestions);
}
