"use client";

import { useEffect, useState, Suspense } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";

interface PlayerData {
  discordName: string;
  discordAvatar: string;
  ip: string;
  playerName: string;
  online: boolean;
  preJoin: boolean;
}

function FinalPageContent() {
  const [playerData, setPlayerData] = useState<PlayerData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const interval = setInterval(fetchPlayerData, 10000);

    async function fetchPlayerData() {
      try {
        // fetch แบบ include cookie (ส่ง cookie httpOnly ไปด้วย)
        const res = await fetch("/api/auth/player-data", { credentials: "include" });
        if (res.status === 401) {
          setError("JWT ไม่พบ กรุณาเข้าสู่ระบบใหม่");
          setLoading(false);
          return;
        }
        if (!res.ok) {
          const data = await res.json();
          setError(data.error || "ดึงข้อมูลผู้เล่นล้มเหลว");
          setLoading(false);
          return;
        }
        const data = await res.json();
        setPlayerData(data);
        setLoading(false);
      } catch (e) {
        console.error(e);
        setError("ไม่สามารถดึงข้อมูลได้");
        setLoading(false);
      }
    }

    fetchPlayerData();

    return () => clearInterval(interval);
  }, [router]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-600 via-blue-600 to-indigo-800">
        <div className="bg-white/10 backdrop-blur-lg p-8 rounded-3xl shadow-2xl border border-white/20">
          <div className="flex flex-col items-center space-y-6">
            <div className="relative">
              <div className="w-16 h-16 border-4 border-white/30 border-t-white rounded-full animate-spin"></div>
              <div className="absolute inset-0 w-16 h-16 border-4 border-transparent border-t-blue-400 rounded-full animate-spin animation-delay-75"></div>
            </div>
            <h1 className="text-3xl font-bold text-white animate-pulse">Loading...</h1>
            <p className="text-white/70 text-center">กำลังตรวจสอบข้อมูลผู้เล่น</p>
          </div>
        </div>
      </div>
    );
  }

  if (error || !playerData) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-red-500 via-pink-500 to-rose-600">
        <div className="bg-white/10 backdrop-blur-lg p-8 rounded-3xl shadow-2xl border border-white/20 text-center max-w-md w-full mx-4">
          <h1 className="text-3xl font-bold text-white mb-2">เกิดข้อผิดพลาด</h1>
          <p className="text-white/80 text-lg">{error || "ไม่พบข้อมูลผู้เล่น"}</p>
          <a
            href="/api/auth/login"
            className="mt-6 inline-flex items-center px-6 py-3 bg-white/20 hover:bg-white/30 text-white font-semibold rounded-xl transition-all duration-300 transform hover:scale-105 backdrop-blur-sm border border-white/20"
          >
            เข้าสู่ระบบใหม่
          </a>
        </div>
      </div>
    );
  }

  if (!playerData.online) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-orange-500 via-red-500 to-pink-600">
        <div className="bg-white/10 backdrop-blur-lg p-8 rounded-3xl shadow-2xl border border-white/20 text-center max-w-md w-full mx-4">
          <h1 className="text-3xl font-bold text-white mb-2">ต้องการการยืนยัน</h1>
          <p className="text-white/80 text-lg">กรุณายืนยันตัวตนใหม่</p>
          <a
            href="/api/auth/login"
            className="mt-6 inline-flex items-center px-6 py-3 bg-white/20 hover:bg-white/30 text-white font-semibold rounded-xl transition-all duration-300 transform hover:scale-105 backdrop-blur-sm border border-white/20"
          >
            ยืนยันตัวตน
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-emerald-500 via-teal-600 to-cyan-700">
      <div className="bg-white/10 backdrop-blur-lg p-8 rounded-3xl shadow-2xl border border-white/20 max-w-lg w-full mx-4">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">ข้อมูลผู้เล่น</h1>
        </div>

        <div className="flex items-center mb-8 p-4 bg-white/5 rounded-2xl border border-white/10">
          <div className="relative">
            <Image
              src={playerData.discordAvatar}
              alt="Discord Avatar"
              width={80}
              height={80}
              className="rounded-full border-4 border-white/20 shadow-lg"
            />
            <div className={`absolute -bottom-2 -right-2 w-6 h-6 rounded-full border-4 border-white ${playerData.online ? 'bg-green-500' : 'bg-red-500'}`}></div>
          </div>
          <div className="ml-6 flex-1">
            <p className="text-xl font-bold text-white mb-1">{playerData.discordName}</p>
            <p className="text-white/70 text-lg">{playerData.playerName}</p>
          </div>
        </div>

        <div className="space-y-4">
          <InfoCard label="IP Address" value={playerData.ip} />
          <StatusCard label="Online" active={playerData.online} />
          <StatusCard label="Pre-Join" active={playerData.preJoin} />
        </div>

        {playerData.preJoin && (
          <div className="mt-6 text-center">
            <button
              onClick={() => router.push("/dashboard")}
              className="cursor-pointer inline-flex items-center bg-white/5 rounded-2xl px-6 py-4 border border-white/10 text-white font-semibold transition-all duration-300 transform hover:scale-105"
            >
              ไปยัง Dashboard
            </button>
          </div>
        )}

        <div className="mt-8 text-center text-white/60 text-sm">
          ระบบจะตรวจสอบสถานะทุก 10 วินาที
        </div>
      </div>
    </div>
  );
}

// ✅ แยก Card ย่อย
function InfoCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-white/5 rounded-2xl p-4 border border-white/10">
      <div className="flex items-center justify-between">
        <span className="text-white font-medium">{label}</span>
        <span className="text-white/80 font-mono text-sm bg-white/10 px-3 py-1 rounded-lg">
          {value}
        </span>
      </div>
    </div>
  );
}

function StatusCard({ label, active }: { label: string; active: boolean }) {
  return (
    <div className="bg-white/5 rounded-2xl p-4 border border-white/10">
      <div className="flex items-center justify-between">
        <span className="text-white font-medium">{label}</span>
        <span className={`font-semibold px-3 py-1 rounded-lg ${active ? 'text-green-400 bg-green-500/20' : 'text-red-400 bg-red-500/20'}`}>
          {active ? "ใช้งานอยู่" : "ไม่พร้อมใช้งาน"}
        </span>
      </div>
    </div>
  );
}

// ✅ Export หน้า page พร้อม Suspense
export default function FinalPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-black text-white flex items-center justify-center">Loading FinalPage...</div>}>
      <FinalPageContent />
    </Suspense>
  );
}
