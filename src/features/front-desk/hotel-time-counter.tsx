"use client";

import { useEffect, useState } from "react";
import Counter from "@/components/ui/counter";

const TZ = "Africa/Juba";

type TimeParts = { hour: number; minute: number; second: number; dayPeriod: string };

function partsNow(): TimeParts {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: TZ,
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  }).formatToParts(new Date());

  const get = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((p) => p.type === type)?.value ?? "";

  return {
    hour: Number(get("hour")) || 12,
    minute: Number(get("minute")) || 0,
    second: Number(get("second")) || 0,
    dayPeriod: get("dayPeriod").toUpperCase() || "AM",
  };
}

export function HotelTimeCounter({ className }: { className?: string }) {
  const [t, setT] = useState<TimeParts | null>(null);

  useEffect(() => {
    const tick = () => setT(partsNow());
    const timeout = setTimeout(tick, 0);
    const id = setInterval(tick, 1000);
    return () => {
      clearTimeout(timeout);
      clearInterval(id);
    };
  }, []);

  const shared = {
    fontSize: 11,
    fontWeight: 600 as const,
    textColor: "inherit",
    gap: 0,
    fade: 0.15,
    duration: 0.5,
    bounce: 0.15,
    stagger: 0.02,
    motionBlur: true,
    intro: false,
    tabular: true,
    direction: "up" as const,
  };

  if (!t) {
    return (
      <span className={className} aria-label="Hotel local time EAT" title="Africa/Juba (EAT)" suppressHydrationWarning>
        --:--:-- <span style={{ marginLeft: 4, fontSize: 10, color: "var(--subtle)" }}>EAT</span>
      </span>
    );
  }

  return (
    <span className={className} aria-label={`Hotel local time ${t.hour}:${String(t.minute).padStart(2, "0")}:${String(t.second).padStart(2, "0")} ${t.dayPeriod} EAT`} title="Africa/Juba (EAT)">
      <Counter value={t.hour} minDigits={1} {...shared} />
      <span aria-hidden="true" style={{ margin: "0 1px" }}>:</span>
      <Counter value={t.minute} minDigits={2} {...shared} />
      <span aria-hidden="true" style={{ margin: "0 1px" }}>:</span>
      <Counter value={t.second} minDigits={2} {...shared} />
      <span style={{ marginLeft: 4, fontSize: 10, color: "var(--subtle)" }}>{t.dayPeriod} EAT</span>
    </span>
  );
}
