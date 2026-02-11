"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";

type Item = {
  id: string;
  title?: string;
  pageUrl?: string;
  affUrl?: string;
  createdAt?: number;
  [k: string]: any;
};

const LS_KEY = "admin_import_password_v1";

export default function ImportQueueClient() {
  const [pw, setPw] = useState<string>("");
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string>("");

  useEffect(() => {
    try {
      const saved = localStorage.getItem(LS_KEY) || "";
      setPw(saved);
    } catch {}
  }, []);

  const headers = useMemo((): HeadersInit => {
    const h: Record<string, string> = {};
    if (pw) h["x-admin-password"] = pw;
    return h;
  }, [pw]);

  const refresh = useCallback(async () => {
    setLoading(true);
    setErr("");
    try {
      const res = await fetch("/api/admin/import/list?limit=50", {
        method: "GET",
        headers,
        cache: "no-store",
      });

      const j = await res.json().catch(() => ({} as any));

      if (!res.ok || !j?.ok) {
        setItems([]);
        setErr(j?.error || (res.status === 401 ? "Unauthorized" : `HTTP ${res.status}`));
        return;
      }

      setItems(Array.isArray(j.items) ? j.items : []);
    } catch (e: any) {
      setItems([]);
      setErr(String(e?.message || e || "Fetch failed"));
    } finally {
      setLoading(false);
    }
  }, [headers]);

  const remove = useCallback(
    async (id: string) => {
      if (!id) return;
      setLoading(true);
      setErr("");
      try {
        const res = await fetch("/api/admin/import/done", {
          method: "POST",
          headers: { ...headers, "content-type": "application/json" },
          body: JSON.stringify({ id }),
        });

        const j = await res.json().catch(() => ({} as any));

        if (!res.ok || !j?.ok) {
          setErr(j?.error || (res.status === 401 ? "Unauthorized" : `HTTP ${res.status}`));
          return;
        }

        // 画面即反映
        setItems((xs) => xs.filter((x) => x.id !== id));
      } catch (e: any) {
        setErr(String(e?.message || e || "Remove failed"));
      } finally {
        setLoading(false);
      }
    },
    [headers]
  );

  useEffect(() => {
    // パスワードが入ってる場合だけ初回取得
    if (pw) refresh();
  }, [pw, refresh]);

  return (
    <div>
      <div className="flex items-center gap-2">
        <input
          value={pw}
          onChange={(e) => setPw(e.target.value)}
          placeholder="ADMIN_PASSWORD を入力"
          className="w-full rounded border border-white/20 bg-black/40 px-3 py-2 text-sm"
        />
        <button
          onClick={() => {
            try {
              localStorage.setItem(LS_KEY, pw || "");
            } catch {}
            refresh();
          }}
          className="rounded bg-white/10 px-3 py-2 text-sm"
        >
          Save
        </button>

        <button
          onClick={refresh}
          className="rounded bg-white/10 px-3 py-2 text-sm"
          disabled={loading}
        >
          {loading ? "Loading..." : "Reload"}
        </button>
      </div>

      {err ? <p className="mt-3 text-sm text-red-400">{err}</p> : null}
      {!loading && items.length === 0 ? <p className="mt-3 text-sm opacity-70">キューは空です</p> : null}

      <ul className="mt-4 space-y-3">
        {items.map((it) => (
          <li key={it.id} className="rounded border border-white/10 bg-white/5 p-3">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="truncate text-sm font-semibold">{it.title || it.id}</div>
                {it.pageUrl ? (
                  <a className="mt-1 block truncate text-xs opacity-80 underline" href={it.pageUrl} target="_blank" rel="noreferrer">
                    {it.pageUrl}
                  </a>
                ) : null}
              </div>

              <button
                onClick={() => remove(it.id)}
                className="shrink-0 rounded bg-red-500/20 px-3 py-1 text-sm"
              >
                削除
              </button>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
