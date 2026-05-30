import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  await db.transaction.delete({ where: { id: params.id } });
  return NextResponse.json({ success: true });
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const body = await req.json();
  const transaction = await db.transaction.update({
    where: { id: params.id },
    data: {
      ...(body.amount !== undefined && { amount: parseFloat(body.amount) }),
      ...(body.description && { description: body.description }),
      ...(body.date && { date: new Date(body.date) }),
      ...(body.categoryId && { categoryId: body.categoryId }),
    },
    include: { category: true },
  });
  return NextResponse.json(transaction);
}
