import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { normaliseMerchant } from "@/lib/normaliseMerchant";
import { trainModel, saveModel, getModelStats } from "@/lib/classifier";

export async function GET() {
  const stats = await getModelStats();
  return NextResponse.json(stats);
}

export async function POST() {
  // Train only on manually-categorised transactions (not auto-tagged)
  const transactions = await db.transaction.findMany({
    where: { autoTagged: false },
    select: { description: true, categoryId: true },
  });

  const docs = transactions
    .map(t => ({ text: normaliseMerchant(t.description), categoryId: t.categoryId }))
    .filter(d => d.text.length > 0);

  if (docs.length < 5) {
    return NextResponse.json(
      { error: "Not enough manually-categorised transactions to train (need at least 5)" },
      { status: 400 }
    );
  }

  const model = trainModel(docs);
  await saveModel(model);

  return NextResponse.json({
    trainedOn: model.trainedOn,
    categoryCount: model.categoryCount,
    trainedAt: model.trainedAt,
  });
}
