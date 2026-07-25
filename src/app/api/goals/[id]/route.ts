import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const body = await req.json();
  const goal = await db.goal.update({
    where: { id: params.id },
    data: {
      ...(body.savedAmount !== undefined && { savedAmount: parseFloat(body.savedAmount) }),
      ...(body.name !== undefined && { name: body.name }),
      ...(body.targetAmount !== undefined && { targetAmount: parseFloat(body.targetAmount) }),
      ...(body.targetDate !== undefined && { targetDate: new Date(body.targetDate) }),
      ...(body.icon !== undefined && { icon: body.icon }),
      ...(body.color !== undefined && { color: body.color }),
    },
  });
  return NextResponse.json(goal);
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  await db.goal.delete({ where: { id: params.id } });
  return NextResponse.json({ success: true });
}
