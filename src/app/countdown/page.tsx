"use client";

import { useEffect, useState } from "react";
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

export default function CountdownPage() {
  const [seconds, setSeconds] = useState(10);
  const [error, setError] = useState<string | null>(null);
  const [playerData, setPlayerData] = useState<PlayerData | null>(null);
  const [loading, setLoading] = useState(true);
  const [playerName, setPlayerName] = useState<string | null>(null);
  const [shouldNavigate, setShouldNavigate] = useState(false);
  const router = useRouter();

  // ดึงข้อมูล user จาก JWT ผ่าน /api/auth/me (cookie httpOnly)
  const fetchAuthUser = async () => {
    try {
      const res = await fetch("/api/auth/me", { credentials: "include" });
      if (!res.ok) throw new Error("Not authenticated");
      const json = await res.json();
      setPlayerName(json.playerName);
      return json.playerName;
    } catch {
      setError("JWT ไม่พบ กรุณาเข้าสู่ระบบใหม่");
      setLoading(false);
      return null;
    }
  };

  // ดึงข้อมูล player จาก backend API
  const fetchPlayerData = async (playerName: string) => {
    try {
      const res = await fetch(`/api/auth/player-data?playerName=${encodeURIComponent(playerName)}`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch player data");
      const data = await res.json();
      setPlayerData(data);
    } catch (e) {
      console.error(e);
      setError("ดึงข้อมูลผู้เล่นล้มเหลว");
    }
  };

  // ใช้ countdown + fetch player data + prejoin update
  useEffect(() => {
    let intervalId: NodeJS.Timeout;
    let timer: NodeJS.Timeout;

    fetchAuthUser().then((name) => {
      if (!name) return;

      fetchPlayerData(name);
      setLoading(false);

      intervalId = setInterval(() => fetchPlayerData(name), 1000);

      fetch("/api/prejoin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ playerName: name, preJoin: true }),
      });

      timer = setInterval(() => {
        setSeconds((prev) => {
          if (prev <= 1) {
            clearInterval(timer);
            clearInterval(intervalId);
            setShouldNavigate(true);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    });

    return () => {
      if (intervalId) clearInterval(intervalId);
      if (timer) clearInterval(timer);
    };
  }, []);

  useEffect(() => {
    if (shouldNavigate) router.push("/final");
  }, [shouldNavigate, router]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-900 via-purple-900 to-indigo-900 flex items-center justify-center">
        <div className="text-white text-xl">Loading...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-900 via-pink-900 to-purple-900 flex items-center justify-center">
        <div className="bg-red-800/30 border border-red-500 rounded-lg p-8 max-w-md w-full mx-4">
          <h1 className="text-2xl font-bold text-white mb-4">Error</h1>
          <p className="text-red-200 mb-6">{error}</p>
          
          {/* Debug information */}
          <div className="mb-4 p-3 bg-black/20 rounded text-xs text-gray-300">
            <div>Current URL: {typeof window !== 'undefined' ? window.location.href : 'N/A'}</div>
            <div>Search: {typeof window !== 'undefined' ? window.location.search : 'N/A'}</div>
            <div>Cookies: {typeof document !== 'undefined' ? document.cookie : 'N/A'}</div>
          </div>
          
          <div className="flex space-x-4">
            <button
              onClick={() => window.location.reload()}
              className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg transition-colors"
            >
              Try Again
            </button>
            <a
              href="/api/auth/login"
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors"
            >
              Login Again
            </a>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-900 via-purple-900 to-indigo-900 flex items-center justify-center p-4">
      <div className="bg-white/10 backdrop-blur-lg border border-white/20 rounded-2xl p-8 max-w-2xl w-full shadow-2xl">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-white mb-2">Verification Process</h1>
          <div className="text-6xl font-mono text-yellow-400 mb-2">{seconds}</div>
          <p className="text-blue-200">Redirecting in {seconds} seconds...</p>
          {playerName && (
            <p className="text-gray-300 text-sm mt-2">Player: {playerName}</p>
          )}
        </div>

        {/* Player Data Display */}
        {playerData && (
          <div className="space-y-6">
            {/* Discord Info */}
            <div className="bg-black/20 rounded-xl p-6 border border-white/10">
              <h2 className="text-xl font-semibold text-white mb-4 flex items-center">
                <svg className="w-6 h-6 mr-2 text-blue-400" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515a.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0a12.64 12.64 0 0 0-.617-1.25a.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057a19.9 19.9 0 0 0 5.993 2.03a.078.078 0 0 0 .084-.028a14.09 14.09 0 0 0 1.226-1.994a.076.076 0 0 0-.041-.106a13.107 13.107 0 0 1-1.872-.892a.077.077 0 0 1-.008-.128a10.2 10.2 0 0 0 .372-.292a.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127a12.299 12.299 0 0 1-1.873.892a.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028a19.839 19.839 0 0 0 6.002-2.03a.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03z"/>
                </svg>
                Discord Information
              </h2>
              <div className="flex items-center space-x-4">
                <div className="relative">
                  <Image
                    src={playerData.discordAvatar}
                    alt="Discord Avatar"
                    width={64}
                    height={64}
                    className="rounded-full border-2 border-blue-400"
                  />
                  <div className={`absolute -bottom-1 -right-1 w-6 h-6 rounded-full border-2 border-white ${
                    playerData.online ? 'bg-green-500' : 'bg-red-500'
                  }`}></div>
                </div>
                <div>
                  <p className="text-lg font-semibold text-white">{playerData.discordName}</p>
                  <p className="text-blue-200 text-sm">Discord User</p>
                </div>
              </div>
            </div>

            {/* Player Details Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Player Name */}
              <div className="bg-black/20 rounded-xl p-4 border border-white/10">
                <div className="flex items-center mb-2">
                  <svg className="w-5 h-5 mr-2 text-green-400" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd"/>
                  </svg>
                  <h3 className="text-sm font-medium text-gray-300">Player Name</h3>
                </div>
                <p className="text-white font-semibold">{playerData.playerName}</p>
              </div>

              {/* IP Address */}
              <div className="bg-black/20 rounded-xl p-4 border border-white/10">
                <div className="flex items-center mb-2">
                  <svg className="w-5 h-5 mr-2 text-orange-400" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M3 4a1 1 0 011-1h12a1 1 0 011 1v2a1 1 0 01-1 1H4a1 1 0 01-1-1V4zM3 10a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H4a1 1 0 01-1-1v-6zM14 9a1 1 0 00-1 1v6a1 1 0 001 1h2a1 1 0 001-1v-6a1 1 0 00-1-1h-2z" clipRule="evenodd"/>
                  </svg>
                  <h3 className="text-sm font-medium text-gray-300">IP Address</h3>
                </div>
                <p className="text-white font-mono text-sm">{playerData.ip}</p>
              </div>

              {/* Online Status */}
              <div className="bg-black/20 rounded-xl p-4 border border-white/10">
                <div className="flex items-center mb-2">
                  <svg className="w-5 h-5 mr-2 text-blue-400" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd"/>
                  </svg>
                  <h3 className="text-sm font-medium text-gray-300">Online Status</h3>
                </div>
                <div className="flex items-center">
                  <div className={`w-3 h-3 rounded-full mr-2 ${
                    playerData.online ? 'bg-green-500' : 'bg-red-500'
                  }`}></div>
                  <p className={`font-semibold ${
                    playerData.online ? 'text-green-400' : 'text-red-400'
                  }`}>
                    {playerData.online ? 'Online' : 'Offline'}
                  </p>
                </div>
              </div>

              {/* Pre Join Status */}
              <div className="bg-black/20 rounded-xl p-4 border border-white/10">
                <div className="flex items-center mb-2">
                  <svg className="w-5 h-5 mr-2 text-purple-400" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd"/>
                  </svg>
                  <h3 className="text-sm font-medium text-gray-300">Pre Join Status</h3>
                </div>
                <div className="flex items-center">
                  <div className={`w-3 h-3 rounded-full mr-2 ${
                    playerData.preJoin ? 'bg-green-500' : 'bg-yellow-500'
                  }`}></div>
                  <p className={`font-semibold ${
                    playerData.preJoin ? 'text-green-400' : 'text-yellow-400'
                  }`}>
                    {playerData.preJoin ? 'Ready' : 'Pending'}
                  </p>
                </div>
              </div>
            </div>

            {/* Progress Bar */}
            <div className="bg-black/20 rounded-xl p-4 border border-white/10">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-medium text-gray-300">Verification Progress</h3>
                <span className="text-sm text-blue-400">{((10 - seconds) / 10 * 100).toFixed(0)}%</span>
              </div>
              <div className="w-full bg-gray-700 rounded-full h-2">
                <div 
                  className="bg-gradient-to-r from-blue-400 to-purple-500 h-2 rounded-full transition-all duration-1000"
                  style={{ width: `${(10 - seconds) / 10 * 100}%` }}
                ></div>
              </div>
            </div>

            {/* Live Indicator */}
            <div className="flex items-center justify-center space-x-2 text-green-400">
              <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
              <span className="text-sm font-medium">Live Update</span>
            </div>

            {/* Footer */}
            <footer className="mt-2 py-4 text-center text-sm text-white/30">
              © 2025 zPleum. All right reserved.
            </footer>

          </div>
        )}
      </div>
    </div>
  );
}