// app/dashboard/DashboardClient.tsx
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";

interface TeamMember {
  discord_id: number;
  discordName: string;
  discordAvatar: string;
  playerName: string;
  ip_address: string;
  online: boolean;
  preJoin: boolean;
  verified_timestamp: string;
}

interface DashboardClientProps {
  playerName: string;
}

export default function DashboardClient({ playerName }: DashboardClientProps) {
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [currentUser, setCurrentUser] = useState<TeamMember | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [logoutLoading, setLogoutLoading] = useState(false);
  const [sendingMessage, setSendingMessage] = useState(false);
  const [messageSuccess, setMessageSuccess] = useState(false);
  const router = useRouter();

  // State สำหรับ Discord embed
  const [embedData, setEmbedData] = useState({
    title: "",
    description: "",
    fields: [{ name: "", value: "" }],
    thumbnail: "",
    image: "",
    footerText: "",
  });

  const fetchTeamData = async () => {
    try {
      const res = await fetch("/api/dashboard/team-members", {
        credentials: "include",
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Failed to fetch team data");
        setLoading(false);
        return;
      }

      setTeamMembers(data.teamMembers || []);
      setCurrentUser(data.currentUser || null);
      setLoading(false);
    } catch {
      setError("Error fetching team data");
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTeamData();
    const interval = setInterval(fetchTeamData, 30000);
    return () => clearInterval(interval);
  }, []);

  const handleLogout = async () => {
    setLogoutLoading(true);
    try {
      const res = await fetch("/api/auth/logout", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ playerName }),
      });

      if (res.ok) {
        document.cookie = "playerName=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
        router.push("/");
      } else {
        const data = await res.json();
        setError(data.error || "Logout failed");
      }
    } catch (e) {
      console.error("Error logging out:", e);
      setError("Error logging out");
    } finally {
      setLogoutLoading(false);
    }
  };

  const handleAddField = () => {
    setEmbedData((prev) => ({
      ...prev,
      fields: [...prev.fields, { name: "", value: "" }],
    }));
  };

  const handleRemoveField = (index: number) => {
    setEmbedData((prev) => ({
      ...prev,
      fields: prev.fields.filter((_, i) => i !== index),
    }));
  };

  const handleFieldChange = (index: number, key: "name" | "value", value: string) => {
    setEmbedData((prev) => {
      const newFields = [...prev.fields];
      newFields[index][key] = value;
      return { ...prev, fields: newFields };
    });
  };

  const handleSendDiscordMessage = async () => {
    if (!embedData.title.trim() && !embedData.description.trim() && embedData.fields.every(field => !field.name.trim() && !field.value.trim())) {
      setError("กรุณากรอกอย่างน้อย title, description หรือ field หนึ่งช่อง");
      return;
    }

    setSendingMessage(true);
    setError(null);
    setMessageSuccess(false);

    const customEmbed = {
      title: embedData.title || "📢 Dashboard Announcement",
      description: embedData.description || "ไม่มีคำอธิบาย",
      color: 0x5865F2,
      fields: embedData.fields
        .filter(field => field.name.trim() && field.value.trim())
        .map(field => ({
          name: field.name,
          value: field.value,
          inline: true,
        })),
      thumbnail: embedData.thumbnail ? { url: embedData.thumbnail } : undefined,
      image: embedData.image ? { url: embedData.image } : undefined,
      timestamp: new Date().toISOString(),
      footer: embedData.footerText
        ? {
            text: embedData.footerText,
            icon_url: currentUser?.discordAvatar,
          }
        : {
            text: `Sent by ${currentUser?.discordName || playerName}`,
            icon_url: currentUser?.discordAvatar,
          },
    };

    try {
      const res = await fetch("/api/dashboard/send-discord-message", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({
          message: "",
          senderName: currentUser?.discordName || playerName,
          senderAvatar: currentUser?.discordAvatar,
          embeds: [customEmbed],
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "ส่งข้อความไม่สำเร็จ");
        return;
      }

      setMessageSuccess(true);

      setTimeout(() => setMessageSuccess(false), 3000);
    } catch (e) {
      setError("ส่งข้อความไม่สำเร็จ");
    } finally {
      setSendingMessage(false);
    }
  };

  const formatVerifiedTime = (timestamp: string) => {
    if (!timestamp) return "ไม่ได้ยืนยัน";

    const verifiedDate = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - verifiedDate.getTime();

    const diffMinutes = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    let timeAgo = "";
    if (diffDays > 0) {
      timeAgo = `${diffDays} วันที่แล้ว`;
    } else if (diffHours > 0) {
      timeAgo = `${diffHours} ชั่วโมงที่แล้ว`;
    } else if (diffMinutes > 0) {
      timeAgo = `${diffMinutes} นาทีที่แล้ว`;
    } else {
      timeAgo = "เพิ่งยืนยัน";
    }

    return {
      formatted: verifiedDate.toLocaleString('th-TH', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      }),
      ago: timeAgo,
    };
  };

  const handleForceLogout = async (id: number) => {
    try {
      const res = await fetch("/api/dashboard/force-logout", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ id }),
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error || "บังคับออกจากระบบไม่สำเร็จ");
        return;
      }

      fetchTeamData();
    } catch (e) {
      setError("บังคับออกจากระบบไม่สำเร็จ");
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
        <div className="flex items-center justify-center min-h-screen">
          <div className="bg-white/10 backdrop-blur-lg p-8 rounded-3xl shadow-2xl border border-white/20">
            <div className="flex flex-col items-center space-y-4">
              <div className="w-12 h-12 border-4 border-white/30 border-t-white rounded-full animate-spin"></div>
              <p className="text-white text-lg">กำลังโหลดข้อมูล...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error && !teamMembers.length) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-900 via-red-800 to-red-900">
        <div className="flex items-center justify-center min-h-screen">
          <div className="bg-white/10 backdrop-blur-lg p-8 rounded-3xl shadow-2xl border border-white/20 text-center">
            <div className="w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h2 className="text-2xl font-bold text-white mb-2">เกิดข้อผิดพลาด</h2>
            <p className="text-white/80 mb-4">{error}</p>
            <button
              onClick={() => window.location.reload()}
              className="px-6 py-2 bg-white/20 hover:bg-white/30 text-white rounded-xl transition-all duration-300"
            >
              ลองใหม่
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
      {/* Header */}
      <div className="bg-white/5 backdrop-blur-lg border-b border-white/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center">
              <h1 className="text-2xl font-bold text-white">Team Dashboard Rossetta Stone</h1>
            </div>
            <div className="flex items-center space-x-4">
              {currentUser && (
                <div className="flex items-center space-x-3">
                  <Image
                    src={currentUser.discordAvatar}
                    alt="Your Avatar"
                    width={32}
                    height={32}
                    className="rounded-full border-2 border-white/20"
                  />
                  <span className="text-white font-medium">{currentUser.discordName}</span>
                </div>
              )}
              <button
                onClick={handleLogout}
                disabled={logoutLoading}
                className="cursor-pointer inline-flex items-center px-4 py-2 bg-red-500/20 hover:bg-red-500/30 text-red-400 hover:text-red-300 rounded-xl transition-all duration-300 border border-red-500/20 disabled:opacity-50"
              >
                {logoutLoading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-red-400/30 border-t-red-400 rounded-full animate-spin mr-2"></div>
                    กำลังออกจากระบบ...
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                    </svg>
                    ออกจากระบบ
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Error Alert */}
        {error && teamMembers.length > 0 && (
          <div className="mb-6 bg-red-500/20 border border-red-500/30 rounded-xl p-4 flex items-center">
            <svg className="w-5 h-5 text-red-400 mr-3 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p className="text-red-300">{error}</p>
            <button
              onClick={() => setError(null)}
              className="cursor-pointer ml-auto text-red-400 hover:text-red-300"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        )}

        {/* Success Alert */}
        {messageSuccess && (
          <div className="mb-6 bg-green-500/20 border border-green-500/30 rounded-xl p-4 flex items-center">
            <svg className="w-5 h-5 text-green-400 mr-3 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p className="text-green-300">ส่งข้อความไป Discord สำเร็จ!</p>
          </div>
        )}

        {/* Discord Message Section */}
        <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 border border-white/20 mb-8">
          <div className="flex items-center mb-4">
            <div className="w-10 h-10 bg-indigo-500/20 rounded-full flex items-center justify-center mr-3">
              <svg className="w-5 h-5 text-indigo-400" fill="currentColor" viewBox="0 0 24 24">
                <path d="M20.317 4.3698a19.7913 19.7913 0 00-4.8851-1.5152.0741.0741 0 00-.0785.0371c-.211.3753-.4447.8648-.6083 1.2495-1.8447-.2762-3.68-.2762-5.4868 0-.1636-.3933-.4058-.8742-.6177-1.2495a.077.077 0 00-.0785-.037 19.7363 19.7363 0 00-4.8852 1.515.0699.0699 0 00-.0321.0277C.5334 9.0458-.319 13.5799.0992 18.0578a.0824.0824 0 00.0312.0561c2.0528 1.5076 4.0413 2.4228 5.9929 3.0294a.0777.0777 0 00.0842-.0276c.4616-.6304.8731-1.2952 1.226-1.9942a.076.076 0 00-.0416-.1057c-.6528-.2476-1.2743-.5495-1.8722-.8923a.077.077 0 01-.0076-.1277c.1258-.0943.2517-.1923.3718-.2914a.0743.0743 0 01.0776-.0105c3.9278 1.7933 8.18 1.7933 12.0614 0a.0739.0739 0 01.0785.0095c.1202.099.246.1981.3728.2924a.077.077 0 01-.0066.1276 12.2986 12.2986 0 01-1.873.8914.0766.0766 0 00-.0407.1067c.3604.698.7719 1.3628 1.225 1.9932a.076.076 0 00.0842.0286c1.961-.6067 3.9495-1.5219 6.0023-3.0294a.077.077 0 00.0313-.0552c.5004-5.177-.8382-9.6739-3.5485-13.6604a.061.061 0 00-.0312-.0286zM8.02 15.3312c-1.1825 0-2.1569-1.0857-2.1569-2.419 0-1.3332.9555-2.4189 2.157-2.4189 1.2108 0 2.1757 1.0952 2.1568 2.419-.0002 1.3332-.9555 2.4189-2.1569 2.4189zm7.9748 0c-1.1825 0-2.1569-1.0857-2.1569-2.419 0-1.3332.9554-2.4189 2.1569-2.4189 1.2108 0 2.1757 1.0952 2.1568 2.419 0 1.3332-.9555 2.4189-2.1568 2.4189Z"/>
              </svg>
            </div>
            <h2 className="text-xl font-bold text-white">ส่งข้อความไป Discord</h2>
          </div>

          <div className="space-y-4">
            {/* Title */}
            <div>
              <label className="block text-sm font-medium text-white/70 mb-2">
                หัวข้อ (Title)
              </label>
              <input
                type="text"
                value={embedData.title}
                onChange={(e) => setEmbedData({ ...embedData, title: e.target.value })}
                placeholder="กรอกหัวข้อของ Embed..."
                className="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-3 text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500/50"
                disabled={sendingMessage}
                maxLength={256}
              />
            </div>
            
            {/* Description */}
            <div>
              <label className="block text-sm font-medium text-white/70 mb-2 flex justify-between items-center">
                คำอธิบาย (Description)
                <span className={`text-sm text-white/60 ${embedData.description.length > 2000 ? 'text-red-400' : ''}`}>
                  {embedData.description.length}/2000
                </span>
              </label>
              <textarea
                value={embedData.description}
                onChange={(e) => setEmbedData({ ...embedData, description: e.target.value })}
                placeholder="กรอกคำอธิบายของ Embed..."
                rows={4}
                className="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-3 text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500/50 resize-none"
                disabled={sendingMessage}
                maxLength={2000}
              />
            </div>

            {/* Fields */}
            <div>
              <div className="flex justify-between items-center mb-2">
                <label className="block text-sm font-medium text-white/70">
                  ฟิลด์ (Fields)
                </label>
                <button
                  onClick={handleAddField}
                  className="cursor-pointer text-indigo-400 hover:text-indigo-300 text-sm"
                  disabled={sendingMessage || embedData.fields.length >= 25}
                >
                  + เพิ่มฟิลด์
                </button>
              </div>
              {embedData.fields.map((field, index) => (
                <div key={index} className="flex space-x-2 mb-2">
                  <div className="flex-1">
                    <input
                      type="text"
                      value={field.name}
                      onChange={(e) => handleFieldChange(index, "name", e.target.value)}
                      placeholder="ชื่อฟิลด์..."
                      className="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-2 text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500/50"
                      disabled={sendingMessage}
                      maxLength={256}
                    />
                  </div>
                  <div className="flex-1">
                    <input
                      type="text"
                      value={field.value}
                      onChange={(e) => handleFieldChange(index, "value", e.target.value)}
                      placeholder="ค่าฟิลด์..."
                      className="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-2 text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500/50"
                      disabled={sendingMessage}
                      maxLength={1024}
                    />
                  </div>
                  <button
                    onClick={() => handleRemoveField(index)}
                    className="cursor-pointer text-red-400 hover:text-red-300"
                    disabled={sendingMessage || embedData.fields.length === 1}
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              ))}
            </div>

            {/* Thumbnail URL */}
            <div>
              <label className="block text-sm font-medium text-white/70 mb-2">
                URL รูป Thumbnail
              </label>
              <input
                type="text"
                value={embedData.thumbnail}
                onChange={(e) => setEmbedData({ ...embedData, thumbnail: e.target.value })}
                placeholder="กรอก URL รูป Thumbnail..."
                className="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-3 text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500/50"
                disabled={sendingMessage}
              />
            </div>

            {/* Image URL */}
            <div>
              <label className="block text-sm font-medium text-white/70 mb-2">
                URL รูป Image
              </label>
              <input
                type="text"
                value={embedData.image}
                onChange={(e) => setEmbedData({ ...embedData, image: e.target.value })}
                placeholder="กรอก URL รูป Image..."
                className="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-3 text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500/50"
                disabled={sendingMessage}
              />
            </div>

            {/* Footer Text */}
            <div>
              <label className="block text-sm font-medium text-white/70 mb-2">
                ข้อความ Footer
              </label>
              <input
                type="text"
                value={embedData.footerText}
                onChange={(e) => setEmbedData({ ...embedData, footerText: e.target.value })}
                placeholder="กรอกข้อความ Footer..."
                className="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-3 text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500/50"
                disabled={sendingMessage}
                maxLength={2048}
              />
            </div>

            {/* Character Count and Send Button */}
            <div className="flex items-center justify-between">
              <button
                onClick={handleSendDiscordMessage}
                disabled={
                  sendingMessage ||
                  (!embedData.title.trim() &&
                    !embedData.description.trim() &&
                    embedData.fields.every(field => !field.name.trim() && !field.value.trim())) ||
                  embedData.description.length > 2000 ||
                  embedData.title.length > 256 ||
                  embedData.footerText.length > 2048 ||
                  embedData.fields.some(field => field.name.length > 256 || field.value.length > 1024)
                }
                className="cursor-pointer inline-flex items-center px-6 py-2 bg-indigo-500/20 hover:bg-indigo-500/30 text-indigo-400 hover:text-indigo-300 rounded-xl transition-all duration-300 border border-indigo-500/20 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {sendingMessage ? (
                  <>
                    <div className="w-4 h-4 border-2 border-indigo-400/30 border-t-indigo-400 rounded-full animate-spin mr-2"></div>
                    กำลังส่ง...
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                    </svg>
                    ส่งข้อความ
                  </>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 border border-white/20">
            <div className="flex items-center">
              <div className="w-12 h-12 bg-blue-500/20 rounded-full flex items-center justify-center mr-4">
                <svg className="w-6 h-6 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              </div>
              <div>
                <p className="text-white/70 text-sm">สมาชิกทั้งหมด</p>
                <p className="text-2xl font-bold text-white">{teamMembers.length}</p>
              </div>
            </div>
          </div>

          <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 border border-white/20">
            <div className="flex items-center">
              <div className="w-12 h-12 bg-green-500/20 rounded-full flex items-center justify-center mr-4">
                <svg className="w-6 h-6 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div>
                <p className="text-white/70 text-sm">ออนไลน์</p>
                <p className="text-2xl font-bold text-white">
                  {teamMembers.filter(member => member.online).length}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 border border-white/20">
            <div className="flex items-center">
              <div className="w-12 h-12 bg-purple-500/20 rounded-full flex items-center justify-center mr-4">
                <svg className="w-6 h-6 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-1a4 4 0 11-8 0 4 4 0 018 0z" />
                </svg>
              </div>
              <div>
                <p className="text-white/70 text-sm">Pre-Join</p>
                <p className="text-2xl font-bold text-white">
                  {teamMembers.filter(member => member.preJoin).length}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Team Members Table */}
        <div className="bg-white/10 backdrop-blur-lg rounded-2xl border border-white/20 overflow-hidden">
          <div className="px-6 py-4 border-b border-white/10">
            <h2 className="text-xl font-bold text-white">สมาชิกทีมงาน</h2>
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-white/5">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-white/70 uppercase tracking-wider">สมาชิก</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-white/70 uppercase tracking-wider">สถานะ</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-white/70 uppercase tracking-wider">IP Address</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-white/70 uppercase tracking-wider">ยืนยันตัวตน</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-white/70 uppercase tracking-wider">ระยะเวลา</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-white/70 uppercase tracking-wider">ทีมงาน</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/10">
                {teamMembers.map((member) => {
                  const verifiedTime = formatVerifiedTime(member.verified_timestamp);
                  return (
                    <tr key={`${member.discord_id}-${member.playerName}`} className="hover:bg-white/5 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="relative">
                            <Image
                              src={member.discordAvatar}
                              alt={member.discordName}
                              width={40}
                              height={40}
                              className="rounded-full border-2 border-white/20"
                            />
                            <div className={`absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-2 border-slate-900 ${member.online ? 'bg-green-500' : 'bg-red-500'}`}></div>
                          </div>
                          <div className="ml-4">
                            <div className="text-sm font-medium text-white">{member.discordName}</div>
                            <div className="text-sm text-white/60">{member.playerName}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex space-x-2">
                          <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${member.online ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
                            {member.online ? 'ออนไลน์' : 'ออฟไลน์'}
                          </span>
                          <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${member.preJoin ? 'bg-purple-500/20 text-purple-400' : 'bg-gray-500/20 text-gray-400'}`}>
                            {member.preJoin ? 'Pre-Join' : 'รอ'}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="text-sm text-white/80 font-mono bg-white/10 px-2 py-1 rounded">
                          {member.ip_address}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-white/80">
                          {typeof verifiedTime === 'string' ? verifiedTime : verifiedTime.formatted}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-white/60">
                          {typeof verifiedTime === 'string' ? '-' : verifiedTime.ago}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <button
                          onClick={() => handleForceLogout(member.discord_id)}
                          disabled={logoutLoading}
                          className="cursor-pointer inline-flex items-center px-4 py-2 bg-red-500/20 hover:bg-red-500/30 text-red-400 hover:text-red-300 rounded-xl transition-all duration-300 border border-red-500/20 disabled:opacity-50"
                        >
                          {logoutLoading ? (
                            <>
                              <div className="w-4 h-4 border-2 border-red-400/30 border-t-red-400 rounded-full animate-spin mr-2"></div>
                              กำลังออกจากระบบ...
                            </>
                          ) : (
                            <>
                              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                              </svg>
                              ออกจากระบบ
                            </>
                          )}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Auto-refresh indicator */}
        <div className="mt-6 text-center">
          <p className="text-white/60 text-sm">
            ข้อมูลจะอัพเดทอัตโนมัติทุก 30 วินาที
          </p>
          <div className="flex justify-center mt-2">
            <div className="w-2 h-2 bg-white/40 rounded-full animate-pulse mx-1"></div>
            <div className="w-2 h-2 bg-white/40 rounded-full animate-pulse mx-1 animation-delay-200"></div>
            <div className="w-2 h-2 bg-white/40 rounded-full animate-pulse mx-1 animation-delay-400"></div>
          </div>
        </div>

        {/* Footer */}
        <footer className="mt-2 py-4 text-center text-sm text-white/30">
          © 2025 zPleum. All right reserved.
        </footer>

      </div>
    </div>
  );
}