import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const type = searchParams.get("type");
  const categories = await db.category.findMany({
    where: type ? { type } : {},
    orderBy: { name: "asc" },
  });
  return NextResponse.json(categories);
}
