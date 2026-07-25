import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET() {
  const now = new Date();
  const month = now.getMonth() + 1;
  const year = now.getFullYear();

  const rules = await db.recurringRule.findMany({
    where: {
      active: true,
      generations: { none: { month, year } },
    },
    include: { category: true },
    orderBy: { dayOfMonth: "asc" },
  });

  return NextResponse.json({ month, year, rules });
}
