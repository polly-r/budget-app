import { NextResponse } from "next/server";
import { seal, SESSION_COOKIE, makeExpiryMs, SESSION_DURATION_DAYS } from "@/lib/session";

export async function POST(req: Request) {
  const { password } = await req.json();

  if (!process.env.APP_PASSWORD || password !== process.env.APP_PASSWORD) {
    return NextResponse.json({ error: "Incorrect password" }, { status: 401 });
  }

  const expires = makeExpiryMs();
  const token = await seal({ authenticated: true, expires });

  const res = NextResponse.json({ ok: true });
  res.cookies.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: SESSION_DURATION_DAYS * 24 * 60 * 60,
    path: "/",
  });

  return res;
}
