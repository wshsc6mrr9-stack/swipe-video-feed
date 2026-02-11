"use client";


import { useEffect, useState } from "react";

const API_BASE = "/api/admin/import";

export default function ImportAdminPage() {
  const [count, setCount] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const token = prompt("ADMIN_PASSWORDを入力"); // 雑でOK（後で改善）

  async function fetchCount() {
    const res = await fetch(`${API_BASE}/list`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    const json = await res.json();
    setCount(json.count ?? 0);
  }

  async function flush() {
    setLoading(true);
    await fetch(`${API_BASE}/flush`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    await fetchCount();
    setLoading(false);
  }

  useEffect(() => {
    fetchCount();
  }, []);

  return (
    <div style={{ padding: 24 }}>
      <h1>Import 管理</h1>

      <p>
        未flush件数：
        <strong style={{ marginLeft: 8 }}>
          {count === null ? "取得中…" : `${count} 件`}
        </strong>
      </p>

      {count !== null && count > 0 && (
        <button onClick={flush} disabled={loading}>
          {loading ? "公開中…" : "Flushして公開する"}
        </button>
      )}

      {count === 0 && <p>すべて公開済み 🎉</p>}
    </div>
  );
}
