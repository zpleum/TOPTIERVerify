export const runtime = 'nodejs';

import { NextRequest, NextResponse } from "next/server";
import mysql from "mysql2/promise";
import jwt from "jsonwebtoken";

// Helper แปลง DATABASE_URL เป็น config object
function parseDatabaseUrl(url: string) {
  const { hostname, port, pathname, username, password } = new URL(url);
  return {
    host: hostname,
    port: Number(port),
    user: username,
    password,
    database: pathname.replace("/", ""),
  };
}

interface JwtPayload {
  id: string;
  name?: string;
  role?: string;
  iat?: number;
  exp?: number;
}

export async function POST(req: NextRequest) {
  try {
    // ดึง token จาก cookie
    const cookieHeader = req.headers.get("cookie") || "";
    const cookies = Object.fromEntries(
      cookieHeader
        .split("; ")
        .map((c) => {
          const [k, v] = c.split("=");
          return [k, v];
        })
    );
    const token = cookies["auth_token"];
    if (!token) {
      return NextResponse.json({ error: "Unauthorized: No token" }, { status: 401 });
    }

    // verify JWT token
    let payload: JwtPayload;
    try {
      payload = jwt.verify(token, process.env.JWT_SECRET!) as JwtPayload;
    } catch {
      return NextResponse.json({ error: "Unauthorized: Invalid token" }, { status: 401 });
    }

    const userId = payload.id;
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized: Invalid token payload" }, { status: 401 });
    }

    // เชื่อม DB
    const config = parseDatabaseUrl(process.env.DATABASE_URL!);
    const connection = await mysql.createConnection(config);

    // อัปเดตสถานะ user ให้ออฟไลน์ + ล้าง pre_join
    await connection.execute(
      "UPDATE staff_members SET online = 0, pre_join = 0 WHERE discord_id = ?",
      [userId]
    );
    await connection.end();

    // ตอบกลับ ลบ cookie ทั้ง auth_token และ playerName
    const response = NextResponse.json({ success: true, message: "Logged out" });
    response.cookies.set({
      name: "auth_token",
      value: "",
      expires: new Date(0),
      path: "/",
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
    });
    response.cookies.set({
      name: "playerName",
      value: "",
      expires: new Date(0),
      path: "/",
    });

    return response;

  } catch (error) {
    console.error("Logout error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}