"use client";

import { useEffect, useState } from "react";
import { Icon } from "@/components/ui/icon";

type Theme = "light" | "dark";

export function ThemeToggle({ className }: { className?: string }) {
  const [theme, setTheme] = useState<Theme>("light");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const current = document.documentElement.dataset.theme === "dark" ? "dark" : "light";
    // Sync with the theme applied by the pre-hydration script (intentional one-time mount sync).
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setTheme(current);
    setMounted(true);
  }, []);

  function toggle() {
    const next: Theme = theme === "dark" ? "light" : "dark";
    document.documentElement.dataset.theme = next;
    try {
      localStorage.setItem("theme", next);
    } catch {
      // ignore storage failures (private mode, etc.)
    }
    setTheme(next);
  }

  const label = theme === "dark" ? "Switch to light theme" : "Switch to dark theme";

  return (
    <button
      type="button"
      className={className ?? "icon-button"}
      onClick={toggle}
      aria-label={label}
      title={label}
    >
      {mounted ? <Icon name={theme === "dark" ? "sparkles" : "clock"} size={17} /> : <Icon name="clock" size={17} />}
    </button>
  );
}
