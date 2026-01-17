import { NextResponse } from "next/server";
import mysql from "mysql2/promise";
import type { ResultSetHeader } from "mysql2";

interface RequestBody {
  playerName: string;
  preJoin: boolean;
}

export async function POST(request: Request) {
  try {
    const { playerName, preJoin } = await request.json() as RequestBody;
    console.log("Prejoin request:", { playerName, preJoin });

    if (!playerName) {
      console.error("Missing playerName in request");
      return new Response(JSON.stringify({ message: "Missing playerName" }), { status: 400 });
    }

    // เชื่อม DB
    const connection = await mysql.createConnection(process.env.DATABASE_URL!);

    // ตรวจสอบ player_name
    const [rows] = await connection.execute(
      "SELECT player_name FROM staff_members WHERE LOWER(player_name) = LOWER(?)",
      [playerName]
    );
    console.log("Check player_name result:", rows);

    if (!Array.isArray(rows) || rows.length === 0) {
      await connection.end();
      console.error("Player not found in database:", playerName);
      return new Response(JSON.stringify({ message: "Player not found in database" }), { status: 404 });
    }

    // อัปเดต pre_join
    const [result] = await connection.execute<ResultSetHeader>(
      "UPDATE staff_members SET pre_join = ? WHERE LOWER(player_name) = LOWER(?)",
      [preJoin ? 1 : 0, playerName]
    );
    console.log("Prejoin update result:", result, "playerName:", playerName);

    if (result.affectedRows === 0) {
      await connection.end();
      console.error("No rows updated, player not found:", playerName);
      return new Response(JSON.stringify({ message: "Player not found in database" }), { status: 404 });
    }

    await connection.end();
    return NextResponse.json({ success: true, playerName, preJoin });
  } catch (e) {
    console.error("Error in prejoin:", e);
    return new Response(JSON.stringify({ message: "Internal Server Error" }), { status: 500 });
  }
}