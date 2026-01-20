"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function AdminLoginPage() {
  const router = useRouter();
  const [pw, setPw] = useState("");
  const [msg, setMsg] = useState("");

  async function login(e: React.FormEvent) {
    e.preventDefault();
    setMsg("");

    const res = await fetch("/api/admin/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password: pw }),
    });

    if (!res.ok) {
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      setMsg(`失敗: ${data.error ?? "Invalid password"}`);
      return;
    }

    router.push("/admin");
  }

  return (
    <div className="min-h-dvh bg-black text-white flex items-center justify-center p-6">
      <div className="w-full max-w-sm space-y-3">
        <h1 className="text-xl font-bold">Admin Login</h1>

        <form onSubmit={login} className="space-y-3">
          <input
            className="w-full rounded bg-white/10 p-3 outline-none"
            type="password"
            placeholder="Password"
            value={pw}
            onChange={(e) => setPw(e.target.value)}
          />

          <button className="w-full rounded bg-white text-black py-3 font-bold">
            ログイン
          </button>

          {msg && <p className="text-sm text-red-300">{msg}</p>}
        </form>
      </div>
    </div>
  );
}
