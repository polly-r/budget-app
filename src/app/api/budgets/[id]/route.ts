import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const { amount } = await req.json();
  const budget = await db.budget.update({
    where: { id: params.id },
    data: { amount: parseFloat(amount) },
    include: { category: true },
  });
  return NextResponse.json(budget);
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  await db.budget.delete({ where: { id: params.id } });
  return NextResponse.json({ success: true });
}
