"use client";

import React, { useEffect, useState } from "react";
import AgeGate from "@/components/AgeGate";
import { readAgeOk, writeAgeOk } from "@/lib/ageGate";

export default function AgeGateGuard({ children }: { children: React.ReactNode }) {
  const [ok, setOk] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setOk(readAgeOk());
    setReady(true);
  }, []);

  if (!ready) return null; // 初期チラつき防止

  if (!ok) {
    return (
      <AgeGate
        onAllowed={() => {
          writeAgeOk(true);
          setOk(true);
        }}
      />
    );
  }

  return <>{children}</>;
}
