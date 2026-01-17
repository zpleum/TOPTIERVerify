// app/error/page.tsx
"use client";

import Link from "next/link";

export default function ErrorPage() {
  const searchParams = new URLSearchParams(typeof window !== "undefined" ? window.location.search : "");
  const message = searchParams.get("message") || "เกิดข้อผิดพลาด";

  return (
    <div className="min-h-screen bg-gradient-to-br from-red-900 via-pink-900 to-purple-900 flex items-center justify-center p-4">
      <div className="bg-white/10 backdrop-blur-lg border border-white/20 rounded-2xl p-8 max-w-md w-full shadow-2xl">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="mx-auto w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center mb-4">
            <svg className="w-8 h-8 text-red-400" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd"/>
            </svg>
          </div>
          <h1 className="text-3xl font-bold text-white mb-2">เกิดข้อผิดพลาด</h1>
          <p className="text-red-200 text-lg">{message}</p>
        </div>

        {/* Error Details */}
        <div className="bg-red-800/30 border border-red-500/50 rounded-lg p-6 mb-6">
          <h2 className="text-lg font-semibold text-white mb-3 flex items-center">
            <svg className="w-5 h-5 mr-2 text-red-400" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd"/>
            </svg>
            รายละเอียดข้อผิดพลาด
          </h2>
          <div className="space-y-2 text-sm text-red-200">
            <div className="flex items-center">
              <span className="text-red-400 mr-2">•</span>
              <span>ไม่สามารถโหลดหน้าที่ต้องการได้</span>
            </div>
            <div className="flex items-center">
              <span className="text-red-400 mr-2">•</span>
              <span>กรุณาลองใหม่อีกครั้ง</span>
            </div>
            <div className="flex items-center">
              <span className="text-red-400 mr-2">•</span>
              <span>หากปัญหายังคงอยู่ กรุณาติดต่อผู้ดูแลระบบ</span>
            </div>
          </div>
        </div>

        {/* Debug Information */}
        {typeof window !== "undefined" && (
          <div className="bg-black/20 rounded-lg p-4 mb-6">
            <h3 className="text-sm font-medium text-gray-300 mb-2">ข้อมูลการดีบัก</h3>
            <div className="space-y-1 text-xs text-gray-400 font-mono">
              <div>URL: {window.location.href}</div>
              <div>Search: {window.location.search}</div>
              <div>Time: {new Date().toLocaleString('th-TH')}</div>
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex flex-col space-y-3">
          <button
            onClick={() => window.location.reload()}
            className="bg-red-600 hover:bg-red-700 text-white px-6 py-3 rounded-lg font-medium transition-colors duration-200 flex items-center justify-center"
          >
            <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 010 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm.008 9.057a1 1 0 011.276.61A5.002 5.002 0 0014.001 13H11a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0v-2.101a7.002 7.002 0 01-11.601-2.566 1 1 0 01.61-1.276z" clipRule="evenodd"/>
            </svg>
            ลองใหม่อีกครั้ง
          </button>

          <Link
            href="/api/auth/login"
            className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-medium transition-colors duration-200 flex items-center justify-center"
          >
            <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
              <path
                fillRule="evenodd"
                d="M3 3a1 1 0 011 1v12a1 1 0 11-2 0V4a1 1 0 011-1zm7.707 3.293a1 1 0 010 1.414L9.414 9H17a1 1 0 110 2H9.414l1.293 1.293a1 1 0 01-1.414 1.414l-3-3a1 1 0 010-1.414l3-3a1 1 0 011.414 0z"
                clipRule="evenodd"
              />
            </svg>
            กลับไปเข้าสู่ระบบ
          </Link>

          <Link
            href="/"
            className="bg-gray-600 hover:bg-gray-700 text-white px-6 py-3 rounded-lg font-medium transition-colors duration-200 flex items-center justify-center"
          >
            <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
              <path d="M10.707 2.293a1 1 0 00-1.414 0l-7 7a1 1 0 001.414 1.414L4 10.414V17a1 1 0 001 1h2a1 1 0 001-1v-2a1 1 0 011-1h2a1 1 0 011 1v2a1 1 0 001 1h2a1 1 0 001-1v-6.586l.293.293a1 1 0 001.414-1.414l-7-7z" />
            </svg>
            กลับหน้าหลัก
          </Link>
        </div>

        {/* Footer */}
        <div className="mt-8 pt-6 border-t border-white/10">
          <p className="text-center text-sm text-gray-400">
            หากต้องการความช่วยเหลือเพิ่มเติม กรุณาติดต่อทีมสนับสนุน
          </p>
        </div>

        {/* Footer */}
        <footer className="mt-2 py-4 text-center text-sm text-white/30">
          © 2025 zPleum. All right reserved.
        </footer>

      </div>
    </div>
  );
}