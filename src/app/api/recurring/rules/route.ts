import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET() {
  const rules = await db.recurringRule.findMany({
    include: { category: true },
    orderBy: { createdAt: "asc" },
  });
  return NextResponse.json(rules);
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { description, amount, type, categoryId, dayOfMonth } = body;

  if (!description || !amount || !type || !categoryId || !dayOfMonth) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  const rule = await db.recurringRule.create({
    data: {
      description,
      amount: parseFloat(amount),
      type,
      categoryId,
      dayOfMonth: parseInt(dayOfMonth),
    },
    include: { category: true },
  });

  return NextResponse.json(rule, { status: 201 });
}
