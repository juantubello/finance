import { useState, useEffect } from "react";

export function usePrivacyMode() {
  const [privacyMode, setPrivacyMode] = useState(
    () => localStorage.getItem("privacyMode") === "true"
  );

  const toggle = () => {
    const next = !privacyMode;
    setPrivacyMode(next);
    localStorage.setItem("privacyMode", String(next));
    window.dispatchEvent(new CustomEvent("privacyModeChange", { detail: next }));
  };

  useEffect(() => {
    const handler = (e: Event) => setPrivacyMode((e as CustomEvent<boolean>).detail);
    window.addEventListener("privacyModeChange", handler);
    return () => window.removeEventListener("privacyModeChange", handler);
  }, []);

  const mask = (value: string) => (privacyMode ? "***" : value);

  return { privacyMode, toggle, mask };
}
