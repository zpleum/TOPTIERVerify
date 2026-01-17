export const runtime = 'nodejs';

import { NextResponse } from "next/server";
import mysql from "mysql2/promise";
import jwt from "jsonwebtoken";

interface RequestBody {
  playerName?: string;  // กรณี fallback
}

interface StaffStatusRow {
  online: number;
}

interface UpdateResult {
  affectedRows: number;
}

interface JwtPayload {
  id: string;
  name: string;
  role?: string;
  iat?: number;
  exp?: number;
}

export async function POST(request: Request) {
  try {
    // อ่าน cookie จาก request.headers.get("cookie")
    const cookie = request.headers.get("cookie") || "";
    const authToken = cookie
      .split(";")
      .map(c => c.trim())
      .find(c => c.startsWith("auth_token="))
      ?.split("=")[1];

    if (!authToken) {
      return new Response(
        JSON.stringify({ message: "Unauthorized: no token" }),
        { status: 401 }
      );
    }

    // verify JWT
    let decodedRaw = jwt.verify(authToken, process.env.JWT_SECRET!);

    if (typeof decodedRaw === "string") {
      try {
        decodedRaw = JSON.parse(decodedRaw);
      } catch {
        return new Response(
          JSON.stringify({ message: "Unauthorized: invalid token format" }),
          { status: 401 }
        );
      }
    }

    const decoded = decodedRaw as JwtPayload;

    // ดึง playerName จาก payload (priority สูงสุด)
    const playerName = decoded.name;

    let finalPlayerName: string | undefined = decoded.name;

    if (!finalPlayerName) {
      const body = (await request.json()) as RequestBody;
      finalPlayerName = body.playerName;
    }
    
    if (!finalPlayerName) {
      return new Response(
        JSON.stringify({ message: "Missing playerName" }),
        { status: 400 }
      );
    }
    
    console.log("Check-online request for player:", playerName);

    const connection = await mysql.createConnection(process.env.DATABASE_URL!);

    // ดึงสถานะ online ของผู้เล่น
    const [rows] = (await connection.execute(
      "SELECT online FROM staff_members WHERE LOWER(player_name) = LOWER(?)",
      [playerName]
    )) as unknown as StaffStatusRow[];

    if (Array.isArray(rows) && rows.length > 0) {
      const online = rows[0].online;
      const preJoinValue = online ? 1 : 0;

      // อัปเดต pre_join ตาม online status
      const [result] = (await connection.execute(
        "UPDATE staff_members SET pre_join = ? WHERE LOWER(player_name) = LOWER(?)",
        [preJoinValue, playerName]
      )) as unknown as UpdateResult[];

      await connection.end();

      if (result.affectedRows === 0) {
        console.error("No rows updated in check-online, player not found:", playerName);
        return new Response(
          JSON.stringify({ message: "Player not found in database" }),
          { status: 404 }
        );
      }

      return NextResponse.json({ success: true, online, preJoin: preJoinValue });
    } else {
      await connection.end();
      console.error("Player not found in check-online:", playerName);
      return new Response(
        JSON.stringify({ message: "Player not found in database" }),
        { status: 404 }
      );
    }
  } catch (e) {
    console.error("Error in check-online:", e);
    return new Response(
      JSON.stringify({ message: "Internal Server Error" }),
      { status: 500 }
    );
  }
}
