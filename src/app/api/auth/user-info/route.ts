import { NextResponse } from "next/server";
import mysql from "mysql2/promise";

interface RequestBody {
  playerName: string;
}

interface UserRow {
  player_name: string;
  online: number | boolean;
  pre_join: number | boolean;
  discord_name: string | null;
  discord_avatar: string | null;
}

export async function POST(request: Request) {
  try {
    const { playerName } = await request.json() as RequestBody;
    console.log("User-info request:", { playerName });

    if (!playerName) {
      console.error("Missing playerName in request");
      return new Response(JSON.stringify({ message: "Missing playerName" }), { status: 400 });
    }

    // ดึง IP จาก headers
    const headers = request.headers;
    const ip = headers.get("x-forwarded-for") || "Unknown";

    // เชื่อม DB
    const connection = await mysql.createConnection(process.env.DATABASE_URL!);

    // Query ข้อมูลผู้ใช้
    const [rows] = await connection.execute(
      "SELECT player_name, online, pre_join, discord_name, discord_avatar FROM staff_members WHERE LOWER(player_name) = LOWER(?)",
      [playerName]
    ) as unknown as UserRow[];
    console.log("User-info query result:", rows);

    if (!Array.isArray(rows) || rows.length === 0) {
      await connection.end();
      console.error("Player not found in database:", playerName);
      return new Response(JSON.stringify({ message: "Player not found in database" }), { status: 404 });
    }

    const { player_name, online, pre_join, discord_name, discord_avatar } = rows[0];

    await connection.end();

    return NextResponse.json({
      success: true,
      playerName: player_name,
      online: online ? true : false,
      preJoin: pre_join ? true : false,
      discordName: discord_name || "Unknown",
      discordAvatar: discord_avatar || "https://discord.com/assets/1f0bfc0865d324c2587920a7d80c609b.png",
      ip,
    });
  } catch (e) {
    console.error("Error in user-info:", e);
    return new Response(JSON.stringify({ message: "Internal Server Error" }), { status: 500 });
  }
}