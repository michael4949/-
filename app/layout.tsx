import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "滨海市 城市级 AI Token 运营平台",
  description: "城市级 AI Token / 算力 / 模型一体化运营平台 Demo",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-CN">
      <body className="bg-slate-50 text-slate-800 antialiased">{children}</body>
    </html>
  );
}
