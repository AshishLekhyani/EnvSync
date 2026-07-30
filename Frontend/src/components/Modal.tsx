"use client";

import { useEffect } from "react";
import { createPortal } from "react-dom";
import { Icon } from "./Icon";

export function Modal({
  open,
  onClose,
  title,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
}) {
  useEffect(() => {
    if (!open) return;

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open, onClose]);

  if (!open || typeof document === "undefined") {
    return null;
  }

  return createPortal(
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center bg-black/40 p-md"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md rounded-xl border border-outline-variant bg-surface shadow-xl"
      >
        <div className="flex items-center justify-between border-b border-outline-variant px-lg py-md">
          <h2 className="font-h3 text-h3 text-on-surface">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="rounded-lg p-xs text-secondary transition-colors hover:bg-surface-container hover:text-primary"
          >
            <Icon name="close" />
          </button>
        </div>
        <div className="p-lg">{children}</div>
      </div>
    </div>,
    document.body
  );
}
