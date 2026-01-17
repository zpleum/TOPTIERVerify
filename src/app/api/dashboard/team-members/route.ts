import { NextResponse } from "next/server";
import mysql from "mysql2/promise";
import type { RowDataPacket } from "mysql2";
import { cookies } from "next/headers";
import jwt from "jsonwebtoken";

const pool = mysql.createPool({
  uri: process.env.DATABASE_URL,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
});

interface TeamMember extends RowDataPacket {
  discord_id: number;
  discordName: string;
  discordAvatar: string;
  playerName: string;
  ip_address: string;
  online: boolean;
  preJoin: boolean;
  verified_timestamp: string;
}

interface JwtPayload {
  id: string;
  name: string;
  role?: string;
  iat?: number;
  exp?: number;
}

export async function GET() {
  let connection;
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get("auth_token")?.value;

    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    let decoded: JwtPayload;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET!) as JwtPayload;
    } catch {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const playerName = decoded.name;
    if (!playerName) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    connection = await pool.getConnection();

    // ดึงสมาชิกทีม
    const teamQuery = `
      SELECT 
        discord_id,
        discord_name as discordName,
        discord_avatar as discordAvatar, 
        player_name as playerName,
        ip_address,
        online,
        pre_join as preJoin,
        verified_timestamp
      FROM staff_members 
      ORDER BY verified_timestamp DESC
    `;

    const [teamRows] = await connection.execute<TeamMember[]>(teamQuery);

    // ดึงข้อมูล user ปัจจุบัน
    const userQuery = `
      SELECT 
        discord_id,
        discord_name as discordName,
        discord_avatar as discordAvatar, 
        player_name as playerName,
        ip_address,
        online,
        pre_join as preJoin,
        verified_timestamp
      FROM staff_members 
      WHERE player_name = ?
    `;

    const [userRows] = await connection.execute<TeamMember[]>(userQuery, [playerName]);

    return NextResponse.json({
      teamMembers: teamRows,
      currentUser: userRows[0] || null,
    });
  } catch (error) {
    console.error("Database error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  } finally {
    if (connection) connection.release();
  }
}
