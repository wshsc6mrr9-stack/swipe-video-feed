"use client";

import { useState } from "react";

export default function AdminImportPage() {
  const [json, setJson] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit() {
    setLoading(true);
    setMsg(null);

    try {
      const r = await fetch("/api/admin/import", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${process.env.NEXT_PUBLIC_ADMIN_PASSWORD}`,
        },
        body: json,
      });

      const j = await r.json();

      if (!r.ok || !j.ok) {
        setMsg(j?.error || `failed (${r.status})`);
        return;
      }

      setMsg("✅ 追加成功");
      setJson("");
    } catch (e: any) {
      setMsg(e?.message || "network error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main style={{ padding: 20, maxWidth: 800 }}>
      <h1>Admin Import</h1>

      <textarea
        style={{ width: "100%", height: 200 }}
        placeholder="JSONを貼り付け"
        value={json}
        onChange={(e) => setJson(e.target.value)}
      />

      <button
        onClick={onSubmit}
        disabled={loading}
        style={{ marginTop: 12, padding: "8px 16px" }}
      >
        {loading ? "送信中..." : "追加"}
      </button>

      {msg && <p style={{ marginTop: 12 }}>{msg}</p>}
    </main>
  );
}
