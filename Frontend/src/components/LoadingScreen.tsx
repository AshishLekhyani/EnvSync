"use client";

import { useEffect, useState } from "react";
import { Icon } from "./Icon";

const SLOW_THRESHOLD_MS = 3500;

export function LoadingScreen() {
  const [slow, setSlow] = useState(false);

  useEffect(() => {
    const timer = window.setTimeout(() => setSlow(true), SLOW_THRESHOLD_MS);
    return () => window.clearTimeout(timer);
  }, []);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-md bg-[#F6F8FA] px-margin-mobile text-center dark:bg-background">
      <Icon name="progress_activity" className="animate-spin text-primary" style={{ fontSize: 32 }} />
      {slow && (
        <div className="max-w-sm">
          <p className="font-body-md text-body-md font-bold text-on-surface">
            Waking up the server...
          </p>
          <p className="mt-xs font-body-sm text-body-sm text-secondary">
            This app runs on a free-tier server that sleeps when idle — the first load after a
            while can take up to a minute. It&apos;ll be instant after that.
          </p>
        </div>
      )}
    </div>
  );
}
