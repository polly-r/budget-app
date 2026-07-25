import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const body = await req.json();
  const data: Record<string, unknown> = {};

  if (body.description !== undefined) data.description = body.description;
  if (body.amount !== undefined) data.amount = parseFloat(body.amount);
  if (body.type !== undefined) data.type = body.type;
  if (body.categoryId !== undefined) data.categoryId = body.categoryId;
  if (body.dayOfMonth !== undefined) data.dayOfMonth = parseInt(body.dayOfMonth);
  if (body.active !== undefined) data.active = body.active;

  const rule = await db.recurringRule.update({
    where: { id: params.id },
    data,
    include: { category: true },
  });

  return NextResponse.json(rule);
}

export async function DELETE(_: NextRequest, { params }: { params: { id: string } }) {
  await db.recurringRule.delete({ where: { id: params.id } });
  return NextResponse.json({ ok: true });
}
