export const runtime = 'nodejs';

import { NextRequest, NextResponse } from "next/server";
import jwt from "jsonwebtoken";

const jwtSecret = process.env.JWT_SECRET!;

export async function GET(request: NextRequest) {
  try {
    const token = request.cookies.get("auth_token")?.value;
    if (!token) return NextResponse.json({ error: "JWT ไม่พบ" }, { status: 401 });

    const decoded = jwt.verify(token, jwtSecret) as { id: string; name: string; role: string };

    return NextResponse.json({ playerName: decoded.name, id: decoded.id, role: decoded.role });
  } catch {
    return NextResponse.json({ error: "JWT ไม่ถูกต้อง หรือหมดอายุ" }, { status: 401 });
  }
}
