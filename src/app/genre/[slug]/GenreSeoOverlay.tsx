"use client";

import { useMemo, useState } from "react";

export default function GenreSeoOverlay({
  label,
  desc,
}: {
  label: string;
  desc: string;
}) {
  const [open, setOpen] = useState(false);

  const summary = useMemo(() => {
    const s = String(desc ?? "");
    return s.length > 110 ? s.slice(0, 110) + "…" : s;
  }, [desc]);

  return (
    <div className="absolute top-0 left-0 right-0 z-30 pointer-events-none">
      {/* パネル本体だけ操作できるようにする */}
      <div className="pointer-events-auto max-w-3xl mx-auto p-4">
        <div className="rounded-2xl bg-black/75 backdrop-blur border border-white/10 shadow-lg">
          <div className="px-4 pt-3 pb-3">
            <div className="flex items-start gap-3">
              <div className="min-w-0 flex-1">
                <h1 className="text-lg font-bold text-white truncate">
                  {label}
                </h1>
                {!open && (
                  <p className="mt-1 text-xs text-neutral-300 leading-relaxed">
                    {summary}
                  </p>
                )}
              </div>

              <button
                type="button"
                onClick={() => setOpen((v) => !v)}
                className="shrink-0 rounded-full border border-white/15 bg-white/5 px-3 py-1 text-xs text-white hover:bg-white/10 active:scale-[0.99] transition"
              >
                {open ? "閉じる" : "続きを読む"}
              </button>
            </div>

            {open && (
              <div className="mt-3 max-h-[55svh] overflow-auto pr-1">
                <p className="text-sm text-neutral-200 leading-relaxed">
                  {desc}
                </p>

                <div className="mt-4 space-y-3 text-sm text-neutral-200">
                  <section>
                    <h2 className="font-semibold text-white mb-1">
                      このジャンルについて
                    </h2>
                    <p className="leading-relaxed">
                      このページでは「{label}」の短尺動画を、縦スワイプでテンポよく
                      チェックできるようにまとめています。
                    </p>
                  </section>

                  <section>
                    <h2 className="font-semibold text-white mb-1">
                      このページでできること
                    </h2>
                    <ul className="list-disc list-inside space-y-1">
                      <li>縦スワイプで次々と視聴</li>
                      <li>気になったらPRボタンから詳細へ</li>
                      <li>ジャンルに沿った動画だけを集中して探せる</li>
                    </ul>
                  </section>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 上の読みやすさ用グラデ（動画はフル画面のまま） */}
      <div className="h-10 bg-gradient-to-b from-black/60 to-transparent" />
    </div>
  );
}
