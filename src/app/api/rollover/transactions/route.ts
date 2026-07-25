import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { subMonths, startOfMonth, endOfMonth } from "date-fns";

export async function POST() {
  const now = new Date();
  const thisStart = startOfMonth(now);
  const thisEnd = endOfMonth(now);
  const prevStart = startOfMonth(subMonths(now, 1));
  const prevEnd = endOfMonth(subMonths(now, 1));

  const [prevRecurring, thisRecurring] = await Promise.all([
    db.transaction.findMany({ where: { date: { gte: prevStart, lte: prevEnd }, recurring: true } }),
    db.transaction.findMany({ where: { date: { gte: thisStart, lte: thisEnd }, recurring: true } }),
  ]);

  if (prevRecurring.length === 0) return NextResponse.json({ created: 0 });

  const lastDayOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  const descriptions: string[] = [];

  for (const tx of prevRecurring) {
    const exists = thisRecurring.some(
      t => t.categoryId === tx.categoryId && t.description === tx.description
    );
    if (!exists) {
      const day = Math.min(tx.date.getDate(), lastDayOfMonth);
      await db.transaction.create({
        data: {
          amount: tx.amount,
          description: tx.description,
          date: new Date(now.getFullYear(), now.getMonth(), day),
          type: tx.type,
          categoryId: tx.categoryId,
          recurring: true,
        },
      });
      descriptions.push(tx.description);
    }
  }

  return NextResponse.json({ created: descriptions.length, descriptions });
}
