export const runtime = 'nodejs';

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import jwt from "jsonwebtoken";
import DashboardClient from "./DashboardClient";

const jwtSecret = process.env.JWT_SECRET!;

export default async function DashboardPage() {
  const cookieStore = await cookies();
  const token = cookieStore.get("auth_token")?.value;

  if (!token) {
    redirect("/api/auth/login");
  }

  let decoded: { name: string };

  try {
    decoded = jwt.verify(token, jwtSecret) as { name: string };
  } catch {
    redirect("/api/auth/login");
  }

  const playerName = decoded.name;

  return <DashboardClient playerName={playerName} />;
}
