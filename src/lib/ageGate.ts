// src/lib/ageGate.ts
export const AGE_OK_KEY = "age_ok_v1";

export function readAgeOk(): boolean {
  try {
    return localStorage.getItem(AGE_OK_KEY) === "1";
  } catch {
    return false;
  }
}

export function writeAgeOk(ok: boolean) {
  try {
    localStorage.setItem(AGE_OK_KEY, ok ? "1" : "0");
  } catch {}
}
