import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET() {
  const goals = await db.goal.findMany({ orderBy: { createdAt: "asc" } });
  return NextResponse.json(goals);
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const goal = await db.goal.create({
    data: {
      name: body.name,
      targetAmount: parseFloat(body.targetAmount),
      savedAmount: parseFloat(body.savedAmount || 0),
      targetDate: new Date(body.targetDate),
      icon: body.icon || "🎯",
      color: body.color || "#3b82f6",
    },
  });
  return NextResponse.json(goal, { status: 201 });
}
