export const runtime = 'nodejs';

import { NextResponse } from "next/server";
import mysql from "mysql2/promise";
import jwt from "jsonwebtoken";

const client_id = process.env.DISCORD_CLIENT_ID!;
const client_secret = process.env.DISCORD_CLIENT_SECRET!;
const redirect_uri = process.env.DISCORD_REDIRECT_URI!;
const baseUrl = process.env.BASE_URL || "http://localhost:3000";
const discordWebhookUrl = process.env.DISCORD_WEBHOOK_URL!;
const jwtSecret = process.env.JWT_SECRET!;

interface DiscordUser {
  id: string;
  username: string;
  discriminator: string;
  avatar: string | null;
  global_name?: string;
}

interface StaffRow {
  player_name: string;
  online: number;
  pre_join: number;
}

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const code = url.searchParams.get("code");
    if (!code) return new Response("Missing code", { status: 400 });

    const ip = request.headers.get("x-forwarded-for") || request.headers.get("x-real-ip") || "Unknown";
    const userAgent = request.headers.get("user-agent") || "Unknown";

    let city = "Unknown";
    try {
      const ipResponse = await fetch(`https://ipapi.co/${ip}/city/`);
      city = ipResponse.ok ? await ipResponse.text() : "Unknown";
      if (city.includes("Error")) city = "Unknown";
    } catch {}

    const params = new URLSearchParams({
      client_id,
      client_secret,
      grant_type: "authorization_code",
      code,
      redirect_uri,
      scope: "identify",
    });

    const tokenRes = await fetch("https://discord.com/api/oauth2/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: params.toString(),
    });

    if (!tokenRes.ok) {
      const errText = await tokenRes.text();
      return new Response("Failed to get token: " + errText, { status: 500 });
    }

    const tokenJson = await tokenRes.json();
    const accessToken = tokenJson.access_token;

    const userRes = await fetch("https://discord.com/api/users/@me", {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (!userRes.ok) {
      const errText = await userRes.text();
      return new Response("Failed to fetch user: " + errText, { status: 500 });
    }

    const user: DiscordUser = await userRes.json();

    const connection = await mysql.createConnection(process.env.DATABASE_URL!);

    const [rows] = await connection.execute(
      "SELECT player_name, online, pre_join FROM staff_members WHERE discord_id = ?",
      [user.id]
    );

    if (!Array.isArray(rows) || rows.length === 0) {
      await connection.end();
      return NextResponse.redirect(`${baseUrl}/error?message=Player%20not%20found%20in%20database`);
    }

    const row = rows[0] as StaffRow;
    const playerName = row.player_name;
    if (!playerName) {
      await connection.end();
      return NextResponse.redirect(`${baseUrl}/error?message=Player%20name%20is%20null%20in%20database`);
    }

    const token = jwt.sign(
      { id: user.id, name: playerName, role: "staff" },
      jwtSecret,
      { expiresIn: "1d" }
    );

    const isAnimated = user.avatar?.startsWith("a_") ?? false;
    const ext = isAnimated ? "gif" : "png";
    const avatarUrl = user.avatar
      ? `https://cdn.discordapp.com/avatars/${user.id}/${user.avatar}.${ext}`
      : "https://discord.com/assets/1f0bfc0865d324c2587920a7d80c609b.png";

    await connection.execute(
      `UPDATE staff_members SET
        discord_name = ?,
        discord_avatar = ?,
        ip_address = ?,
        last_login = NOW(),
        updated_at = NOW(),
        verified_timestamp = NOW()
      WHERE discord_id = ?`,
      [user.global_name || user.username, avatarUrl, ip, user.id]
    );

    try {
      const embed = {
        title: "New Login Notification",
        color: 0x00ff00,
        timestamp: new Date().toISOString(),
        fields: [
          { name: "Player Name", value: playerName, inline: true },
          { name: "Discord Name", value: user.global_name || user.username, inline: true },
          { name: "Discord UUID", value: user.id, inline: true },
          { name: "IP Address", value: ip, inline: true },
          { name: "City", value: city, inline: true },
          { name: "Browser", value: userAgent, inline: true },
          { name: "Online Status", value: row.online ? "Online" : "Offline", inline: true },
          { name: "Pre Join Status", value: row.pre_join ? "True" : "False", inline: true },
        ],
        thumbnail: { url: avatarUrl },
      };

      await fetch(discordWebhookUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          embeds: [embed],
          username: "TOPTIERVerify Log",
          avatar_url: "https://verify.toptier.net/logo.png",
        }),
      });
    } catch (e) {
      console.error("Webhook send error:", e);
    }

    await connection.end();

    const response = NextResponse.redirect(`${baseUrl}/countdown`);
    response.cookies.set({
      name: "auth_token",
      value: token,
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      path: "/",
      maxAge: 60 * 60 * 24,
    });

    return response;
  } catch (e) {
    console.error("Callback unexpected error:", e);
    return new Response("Internal Server Error", { status: 500 });
  }
}
