import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { categorise } from "@/lib/categorise";

export async function POST() {
  // Find the "Uncategorised" category if it exists
  const uncategorised = await db.category.findFirst({
    where: { name: { in: ["Uncategorised", "Uncategorized", "Other"] } },
  });

  // Target: transactions that were auto-tagged OR belong to the uncategorised bucket
  const targets = await db.transaction.findMany({
    where: {
      OR: [
        { autoTagged: true },
        ...(uncategorised ? [{ categoryId: uncategorised.id }] : []),
      ],
    },
    select: { id: true, description: true, categoryId: true },
  });

  let updated = 0;
  let skipped = 0;

  for (const tx of targets) {
    const result = await categorise(tx.description);
    if (!result || result.categoryId === tx.categoryId) { skipped++; continue; }

    await db.transaction.update({
      where: { id: tx.id },
      data: {
        categoryId: result.categoryId,
        autoTagged: true,
        confidence: result.confidence,
      },
    });
    updated++;
  }

  return NextResponse.json({ scanned: targets.length, updated, skipped });
}

export async function GET() {
  const autoTaggedCount = await db.transaction.count({ where: { autoTagged: true } });
  const memoryCount = await db.merchantMemory.count();
  return NextResponse.json({ autoTaggedCount, memoryCount });
}
