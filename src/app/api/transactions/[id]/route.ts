import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { learnMerchant } from "@/lib/categorise";

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  await db.transaction.delete({ where: { id: params.id } });
  return NextResponse.json({ success: true });
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const body = await req.json();

  // If the caller explicitly passes autoTagged: true (e.g. the batch endpoint),
  // honour it as-is. Otherwise treat any categoryId change as a manual correction.
  const isManualCategoryChange =
    body.categoryId !== undefined && body.autoTagged !== true;

  const transaction = await db.transaction.update({
    where: { id: params.id },
    data: {
      ...(body.amount !== undefined && { amount: parseFloat(body.amount) }),
      ...(body.description !== undefined && { description: body.description }),
      ...(body.date !== undefined && { date: new Date(body.date) }),
      ...(body.categoryId !== undefined && { categoryId: body.categoryId }),
      ...(body.type !== undefined && { type: body.type }),
      ...(body.recurring !== undefined && { recurring: body.recurring }),
      // Manual edit clears auto-tag flags; batch writes them explicitly
      ...(isManualCategoryChange && { autoTagged: false, confidence: null }),
      ...(body.autoTagged === true && {
        autoTagged: true,
        confidence: body.confidence ?? null,
      }),
    },
    include: { category: true },
  });

  // Update merchant memory so future transactions get categorised correctly
  if (isManualCategoryChange) {
    const description = body.description ?? transaction.description;
    await learnMerchant(description, body.categoryId);
  }

  return NextResponse.json(transaction);
}
