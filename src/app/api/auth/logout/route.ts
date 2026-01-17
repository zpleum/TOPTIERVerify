// app/api/auth/logout/route.ts
import { NextRequest, NextResponse } from "next/server";
import mysql from "mysql2/promise"; // Import mysql2/promise

// สร้าง Pool สำหรับ MySQL
const pool = mysql.createPool({
  uri: process.env.DATABASE_URL, // ใช้ DATABASE_URL ที่เป็นรูปแบบของ MySQL
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

export async function POST(request: NextRequest) {
  let connection; // ประกาศ connection ไว้ข้างนอก try เพื่อให้ finally เข้าถึงได้
  try {
    const { playerName } = await request.json();

    if (!playerName) {
      return NextResponse.json({ error: "Player name is required" }, { status: 400 });
    }

    connection = await pool.getConnection(); // ดึง connection จาก pool
    
    // Update user status to offline and remove pre_join
    // ใน MySQL ใช้ NOW() สำหรับ TIMESTAMP และ ? สำหรับ placeholder
    // MySQL ไม่มี RETURNING * เหมือน PostgreSQL ต้องใช้ SELECT ตามหลังถ้าต้องการข้อมูลที่อัปเดต
    const updateQuery = `
      UPDATE staff_members 
      SET 
        online = false,
        pre_join = false,
        updated_at = NOW()
      WHERE player_name = ?
    `;
    
    const [result] = await connection.execute(updateQuery, [playerName]);

    // ตรวจสอบว่ามีแถวที่ถูกอัปเดตหรือไม่
    // ใน mysql2/promise, result[0].affectedRows จะบอกจำนวนแถวที่ถูกกระทบ
    if ((result as mysql.ResultSetHeader).affectedRows === 0) {
      return NextResponse.json({ error: "Player not found" }, { status: 404 });
    }
    
    // Create response with cookie removal
    const response = NextResponse.json({ 
      success: true, 
      message: "Logged out successfully" 
    });
    
    // Remove the playerName cookie
    response.cookies.set({
      name: "playerName",
      value: "",
      expires: new Date(0), // ตั้งวันหมดอายุเป็นอดีตเพื่อลบคุกกี้
      path: "/",
    });

    response.cookies.set({
      name: "auth_token",
      value: "",
      expires: new Date(0),
      path: "/",
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
    });
    
    return response;
    
  } catch (error) {
    console.error("Logout error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  } finally {
    if (connection) {
      connection.release(); // คืน connection กลับสู่ pool
    }
  }
}

// Database schema (สำหรับสร้างตาราง users ใน MySQL)
/*
CREATE TABLE users (
  id INT AUTO_INCREMENT PRIMARY KEY, -- SERIAL ใน PostgreSQL เทียบเท่ากับ INT AUTO_INCREMENT PRIMARY KEY ใน MySQL
  discord_id VARCHAR(255) UNIQUE NOT NULL,
  discord_name VARCHAR(255) NOT NULL,
  discord_avatar TEXT,
  player_name VARCHAR(255) UNIQUE NOT NULL,
  ip VARCHAR(45), -- INET ใน PostgreSQL เทียบเท่ากับ VARCHAR(45) หรือ VARBINARY(16) สำหรับ IPv6 ใน MySQL
  online BOOLEAN DEFAULT false,
  pre_join BOOLEAN DEFAULT false,
  verified_timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP, -- TIMESTAMP WITH TIME ZONE DEFAULT NOW() ใน PostgreSQL เทียบเท่ากับ TIMESTAMP DEFAULT CURRENT_TIMESTAMP ใน MySQL
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP -- เพิ่ม ON UPDATE CURRENT_TIMESTAMP สำหรับ updated_at
);

-- Index for better performance
CREATE INDEX idx_users_player_name ON users(player_name);
CREATE INDEX idx_users_online ON users(online);
CREATE INDEX idx_users_pre_join ON users(pre_join);
CREATE INDEX idx_users_verified_timestamp ON users(verified_timestamp);
*/