import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getMonthRange } from "@/lib/utils";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const month = searchParams.get("month");
  const year = searchParams.get("year");
  const type = searchParams.get("type");
  const limit = parseInt(searchParams.get("limit") || "100");

  const date = month && year
    ? new Date(parseInt(year), parseInt(month) - 1, 1)
    : new Date();
  const { start, end } = getMonthRange(date);

  const transactions = await db.transaction.findMany({
    where: {
      date: { gte: start, lte: end },
      ...(type ? { type } : {}),
    },
    include: { category: true },
    orderBy: { date: "desc" },
    take: limit,
  });

  return NextResponse.json(transactions);
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { amount, description, date, type, categoryId, recurring } = body;

  if (!amount || !description || !date || !type || !categoryId) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  const transaction = await db.transaction.create({
    data: {
      amount: parseFloat(amount),
      description,
      date: new Date(date),
      type,
      categoryId,
      recurring: recurring || false,
    },
    include: { category: true },
  });

  return NextResponse.json(transaction, { status: 201 });
}
