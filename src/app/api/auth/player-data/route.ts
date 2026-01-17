export const runtime = 'nodejs';

import { NextRequest, NextResponse } from "next/server";
import mysql from "mysql2/promise";
import jwt from "jsonwebtoken";

const jwtSecret = process.env.JWT_SECRET!;

interface PlayerData {
  discordName: string;
  discordAvatar: string;
  ip: string;
  playerName: string;
  online: boolean;
  preJoin: boolean;
}

interface PlayerRow {
  player_name: string;
  discord_id: string;
  discord_name: string | null;
  discord_avatar: string | null;
  ip_address: string | null;
  online: number | boolean;
  pre_join: number | boolean;
}

export async function GET(request: NextRequest) {
  try {
    const token = request.cookies.get("auth_token")?.value;
    if (!token) {
      return NextResponse.json({ error: "JWT ไม่พบ กรุณาเข้าสู่ระบบใหม่" }, { status: 401 });
    }

    let decoded: { name: string };
    try {
      decoded = jwt.verify(token, jwtSecret) as { name: string };
    } catch {
      return NextResponse.json({ error: "JWT ไม่ถูกต้อง หรือหมดอายุ" }, { status: 401 });
    }

    const playerName = decoded.name;

    const connection = await mysql.createConnection(process.env.DATABASE_URL!);

    const [rows] = await connection.execute(
      `SELECT 
        player_name, 
        discord_id, 
        discord_name, 
        discord_avatar, 
        ip_address, 
        online, 
        pre_join 
      FROM staff_members 
      WHERE LOWER(player_name) = LOWER(?)`,
      [playerName]
    ) as unknown as PlayerRow[];

    await connection.end();

    if (Array.isArray(rows) && rows.length > 0) {
      const playerInfo = rows[0];
      
      const isHash = playerInfo.discord_avatar && !playerInfo.discord_avatar.startsWith("http");
      const avatarUrl = playerInfo.discord_avatar
        ? (isHash
            ? `https://cdn.discordapp.com/avatars/${playerInfo.discord_id}/${playerInfo.discord_avatar}.png`
            : playerInfo.discord_avatar
          )
        : "https://discord.com/assets/1f0bfc0865d324c2587920a7d80c609b.png";      

      const playerData: PlayerData = {
        discordName: playerInfo.discord_name || "Unknown",
        discordAvatar: avatarUrl,
        ip: playerInfo.ip_address || "Unknown",
        playerName: playerInfo.player_name || "Unknown",
        online: Boolean(playerInfo.online),
        preJoin: Boolean(playerInfo.pre_join)
      };

      return NextResponse.json(playerData);
    } else {
      return NextResponse.json({ error: "Player not found" }, { status: 404 });
    }
  } catch (error) {
    console.error("Error fetching player data:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
