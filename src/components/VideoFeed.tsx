"use client";

import React from "react";

export default function VideoFeed() {
  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "#000",
        color: "#fff",
      }}
    >
      {/* 反映チェック用バッジ：これが見えなかったら最新コードじゃない */}
      <div
        style={{
          position: "fixed",
          top: 10,
          left: 10,
          zIndex: 999999,
          background: "rgba(0,0,0,0.75)",
          color: "#fff",
          padding: "8px 10px",
          borderRadius: 10,
          fontSize: 14,
          fontWeight: 700,
        }}
      >
        BUILD_0123
      </div>

      <div style={{ position: "absolute", inset: 0, display: "grid", placeItems: "center" }}>
        <div style={{ opacity: 0.8 }}>反映テスト中（BUILD_0123 が左上に出るはず）</div>
      </div>
    </div>
  );
}
