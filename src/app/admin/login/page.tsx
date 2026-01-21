"use client";

import React, { useState } from "react";

export default function AdminLoginPage() {
  const [password, setPassword] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setMsg(null);
    setLoading(true);

    try {
      const r = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
        credentials: "include",
      });

      const data = await r.json().catch(() => ({}));

      if (!r.ok || !data?.ok) {
        setMsg(data?.error ?? "login failed");
        setLoading(false);
        return;
      }

      // ✅ ログイン成功 → /admin へ
      window.location.href = "/admin";
    } catch (err) {
      setMsg("network error");
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen grid place-items-center bg-black text-white p-6">
      <form onSubmit={onSubmit} className="w-full max-w-md space-y-4">
        <h1 className="text-xl font-semibold">Admin Login</h1>

        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full rounded-md bg-neutral-900 border border-neutral-700 px-4 py-3"
          placeholder="Password"
          autoComplete="current-password"
        />

        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-md bg-white text-black py-3 font-semibold disabled:opacity-60"
        >
          {loading ? "..." : "ログイン"}
        </button>

        {msg ? <p className="text-red-400 text-sm">{msg}</p> : null}
      </form>
    </div>
  );
}
