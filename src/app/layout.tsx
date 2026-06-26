import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "F1 Qualifying Study Timer",
  description: "공부 타이머를 F1 퀄리파잉으로 시각화",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "F1 Study Timer",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: "#000000",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ko">
      <head>
        <link rel="apple-touch-icon" href="/icons/icon-192.png" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="mobile-web-app-capable" content="yes" />
      </head>
      <body className="bg-black text-white overflow-hidden w-screen h-screen">
        {/* Portrait 경고 오버레이 */}
        <div
          className="portrait-warning fixed inset-0 z-[9999] bg-black hidden flex-col items-center justify-center gap-4"
          style={{ display: "none" }}
        >
          <div className="text-6xl">↻</div>
          <p className="text-white font-bold text-xl tracking-widest uppercase">
            화면을 가로로 돌려주세요
          </p>
          <p className="text-gray-500 text-sm tracking-wider">
            Rotate to Landscape
          </p>
        </div>

        {children}
      </body>
    </html>
  );
}
