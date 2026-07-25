import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const type = searchParams.get("type");
  const includeArchived = searchParams.get("includeArchived") === "true";

  const categories = await db.category.findMany({
    where: {
      ...(type ? { type } : {}),
      ...(includeArchived ? {} : { archived: false }),
    },
    include: { children: { where: { archived: includeArchived ? undefined : false }, orderBy: { name: "asc" } } },
    orderBy: { name: "asc" },
  });
  return NextResponse.json(categories);
}

export async function POST(req: NextRequest) {
  const { name, type, icon, color, parentId } = await req.json();
  const category = await db.category.create({
    data: { name, type, icon, color, ...(parentId ? { parentId } : {}) },
  });
  return NextResponse.json(category, { status: 201 });
}
