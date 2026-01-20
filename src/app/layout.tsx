import "./globals.css";

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ja">
      <body className="min-h-[100svh] bg-black text-white">{children}</body>
    </html>
  );
}
