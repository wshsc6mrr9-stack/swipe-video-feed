"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function AdminLoginPage() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    setLoading(true);

    try {
      const r = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
        credentials: "include",
      });

      const j = await r.json().catch(() => null);

      if (!r.ok || !j?.ok) {
        setErr(j?.error ?? `login failed (${r.status})`);
        setLoading(false);
        return;
      }

      // ✅ Cookie付いた前提で /admin へ
      router.replace("/admin");
      router.refresh();
    } catch (e: any) {
      setErr(e?.message ?? "network error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-black text-white flex items-center justify-center p-6">
      <form onSubmit={onSubmit} className="w-full max-w-md space-y-4">
        <h1 className="text-2xl font-bold">Admin Login</h1>

        <input
          className="w-full px-4 py-3 rounded bg-neutral-800 outline-none"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="password"
        />

        <button
          className="w-full px-4 py-3 rounded bg-white text-black font-bold disabled:opacity-60"
          disabled={loading}
          type="submit"
        >
          {loading ? "..." : "ログイン"}
        </button>

        {err ? <p className="text-red-400 text-sm">{err}</p> : null}
      </form>
    </main>
  );
}
