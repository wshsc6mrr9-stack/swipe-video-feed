"use client";

import React, { useEffect, useState } from "react";

type Props = {
  onAllowed: () => void;
};

const KEY_AGE_OK = "age_ok_v1";

export default function AgeGate({ onAllowed }: Props) {
  const [checked, setChecked] = useState(false);
  const [allowed, setAllowed] = useState(false);
  const [denied, setDenied] = useState(false);

  useEffect(() => {
    // 既にOKなら通す
    try {
      const ok = localStorage.getItem(KEY_AGE_OK) === "1";
      setAllowed(ok);
      setChecked(true);
      if (ok) onAllowed();
    } catch {
      setChecked(true);
    }
  }, [onAllowed]);

  if (!checked) return null;
  if (allowed) return null;

  return (
    <div
      className="fixed inset-0 z-[9999] grid place-items-center bg-black"
      style={{ touchAction: "none" }}
    >
      <div className="w-[92vw] max-w-md rounded-2xl border border-white/10 bg-neutral-950/95 p-5 text-white backdrop-blur">
        <div className="text-lg font-extrabold">このサイトは18歳以上向けです</div>
        <div className="mt-2 text-sm text-white/70">
          18歳以上ですか？
        </div>

        {!denied ? (
          <div className="mt-4 flex gap-3">
            <button
              className="flex-1 rounded-xl bg-white text-black py-3 font-extrabold"
              onClick={() => {
                try {
                  localStorage.setItem(KEY_AGE_OK, "1");
                } catch {}
                setAllowed(true);
                onAllowed();
              }}
            >
              はい
            </button>

            <button
              className="flex-1 rounded-xl bg-white/10 text-white py-3 font-extrabold"
              onClick={() => setDenied(true)}
            >
              いいえ
            </button>
          </div>
        ) : (
          <div className="mt-4">
            <div className="rounded-xl bg-white/10 p-4 text-sm text-white/80">
              申し訳ありません。18歳未満の方は閲覧できません。
            </div>
            <button
              className="mt-3 w-full rounded-xl bg-white/10 py-3 font-bold"
              onClick={() => {
                // ここは好みで：戻る/閉じる
                history.back();
              }}
            >
              戻る
            </button>
          </div>
        )}

        <div className="mt-4 text-xs text-white/40">
          ※「はい」を選ぶと、この端末では次回以降表示しません。
        </div>
      </div>
    </div>
  );
}
