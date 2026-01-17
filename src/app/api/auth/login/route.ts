import { NextResponse } from "next/server";

const client_id = process.env.DISCORD_CLIENT_ID;
const redirect_uri = encodeURIComponent(process.env.DISCORD_REDIRECT_URI ?? "");
const scope = encodeURIComponent("identify");

export async function GET() {
  const discordAuthUrl = `https://discord.com/api/oauth2/authorize?client_id=${client_id}&redirect_uri=${redirect_uri}&response_type=code&scope=${scope}`;
  return NextResponse.redirect(discordAuthUrl);
}
