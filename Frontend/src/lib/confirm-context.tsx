"use client";

import { createContext, useCallback, useContext, useRef, useState } from "react";
import { Modal } from "@/components/Modal";

interface ConfirmOptions {
  title?: string;
  message: string;
  confirmLabel?: string;
  danger?: boolean;
}

type ConfirmFn = (options: ConfirmOptions | string) => Promise<boolean>;

const ConfirmContext = createContext<ConfirmFn | null>(null);

export function useConfirm(): ConfirmFn {
  const ctx = useContext(ConfirmContext);
  if (!ctx) throw new Error("useConfirm must be used within ConfirmProvider");
  return ctx;
}

export function ConfirmProvider({ children }: { children: React.ReactNode }) {
  const [pending, setPending] = useState<ConfirmOptions | null>(null);
  const resolver = useRef<((value: boolean) => void) | null>(null);

  const confirm = useCallback<ConfirmFn>((options) => {
    const normalized = typeof options === "string" ? { message: options } : options;
    return new Promise<boolean>((resolve) => {
      resolver.current = resolve;
      setPending(normalized);
    });
  }, []);

  const close = (result: boolean) => {
    resolver.current?.(result);
    resolver.current = null;
    setPending(null);
  };

  return (
    <ConfirmContext.Provider value={confirm}>
      {children}
      <Modal open={!!pending} onClose={() => close(false)} title={pending?.title ?? "Confirm"}>
        {pending && (
          <div className="flex flex-col gap-md">
            <p className="font-body-md text-body-md text-on-surface">{pending.message}</p>
            <div className="flex justify-end gap-sm">
              <button
                type="button"
                onClick={() => close(false)}
                className="rounded-lg border border-outline-variant px-md py-sm font-label-md text-label-md text-on-surface transition-colors hover:bg-surface-container"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => close(true)}
                className={
                  pending.danger
                    ? "rounded-lg bg-[#CF222E] px-md py-sm font-label-md text-label-md text-white transition-colors hover:bg-[#a40e26]"
                    : "rounded-lg bg-primary-container px-md py-sm font-label-md text-label-md text-on-primary transition-opacity hover:opacity-90"
                }
              >
                {pending.confirmLabel ?? "Confirm"}
              </button>
            </div>
          </div>
        )}
      </Modal>
    </ConfirmContext.Provider>
  );
}
