// src/app/admin/dashboard/page.tsx
import Link from "next/link";

export default function AdminDashboardPage() {
  return (
    <div className="min-h-[100svh] bg-black text-white">
      <div className="mx-auto w-full max-w-3xl px-4 py-6 space-y-4">
        <div className="flex items-center justify-between gap-3">
          <h1 className="text-xl font-extrabold">運用ダッシュボード</h1>
          <Link
            href="/admin"
            className="rounded-xl bg-white/10 px-4 py-2 text-sm font-bold hover:bg-white/15"
          >
            管理に戻る
          </Link>
        </div>

        <div className="grid gap-3">
          <Link
            href="/admin"
            className="rounded-2xl border border-white/10 bg-white/5 p-4 hover:bg-white/10"
          >
            <div className="font-bold">動画の追加・削除</div>
            <div className="text-xs text-white/60 mt-1">/admin</div>
          </Link>

          <Link
            href="/admin/analytics"
            className="rounded-2xl border border-white/10 bg-white/5 p-4 hover:bg-white/10"
          >
            <div className="font-bold">Analytics（再生/クリック/CTR）</div>
            <div className="text-xs text-white/60 mt-1">/admin/analytics</div>
          </Link>

          <Link
            href="/api/admin/analytics"
            className="rounded-2xl border border-white/10 bg-white/5 p-4 hover:bg-white/10"
          >
            <div className="font-bold">Analytics API（JSON）</div>
            <div className="text-xs text-white/60 mt-1">/api/admin/analytics</div>
          </Link>

          <Link
            href="/"
            className="rounded-2xl border border-white/10 bg-white/5 p-4 hover:bg-white/10"
          >
            <div className="font-bold">トップ（動画フィード）</div>
            <div className="text-xs text-white/60 mt-1">/</div>
          </Link>
        </div>

        <div className="text-xs text-white/50 pt-2">
          ※ ここは「運用でよく触るページのリンク集」。必要になったら項目を増やしていけばOK。
        </div>
      </div>
    </div>
  );
}
