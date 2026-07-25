import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const data = await req.json();
  const category = await db.category.update({
    where: { id: params.id },
    data,
  });
  return NextResponse.json(category);
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const txCount = await db.transaction.count({ where: { categoryId: params.id } });
  if (txCount > 0) {
    const category = await db.category.update({
      where: { id: params.id },
      data: { archived: true },
    });
    return NextResponse.json({ archived: true, category, reason: "has transactions" });
  }
  await db.category.delete({ where: { id: params.id } });
  return NextResponse.json({ deleted: true });
}
