"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Icon } from "./Icon";
import { Modal } from "./Modal";
import { CreateOrgForm } from "./CreateOrgForm";
import { useAuth } from "@/lib/auth-context";
import { roleBadgeClass } from "@/lib/roleBadge";
import { useOutsideClick } from "@/lib/useOutsideClick";

export function OrgSwitcher() {
  const { organizations, activeOrgId, activeOrg, switchOrg, refreshMe } = useAuth();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useOutsideClick(ref, () => {
    // The create-org modal is portaled to document.body, outside this
    // wrapper's DOM subtree — while it's open, its own backdrop/Escape
    // handling owns closing, not this outside-click listener.
    if (creating) return;
    setOpen(false);
  });

  if (!activeOrg) {
    return null;
  }

  const onSwitch = (orgId: string) => {
    if (orgId !== activeOrgId) {
      switchOrg(orgId);
      router.push("/projects");
    }
    setOpen(false);
  };

  const onOrgCreated = async (newOrg: { id: string; name: string; slug: string }) => {
    await refreshMe();
    switchOrg(newOrg.id);
    setCreating(false);
    setOpen(false);
    router.push("/projects");
  };

  const orgCreateModal = (
    <Modal open={creating} onClose={() => setCreating(false)} title="Create Organization">
      <CreateOrgForm onCreated={onOrgCreated} onCancel={() => setCreating(false)} />
    </Modal>
  );

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-xs rounded-lg px-sm py-xs text-left transition-colors hover:bg-surface-container"
      >
        <div className="max-w-[140px]">
          <div className="truncate font-label-md text-label-md font-bold leading-none text-on-surface">
            {activeOrg.name}
          </div>
        </div>
        <Icon
          name="unfold_more"
          className="text-secondary"
          style={{ fontSize: 16 }}
        />
      </button>

      {open && (
        <div className="absolute left-0 top-full z-50 mt-sm w-72 rounded-xl border border-outline-variant bg-surface shadow-lg">
          <div className="border-b border-outline-variant px-md py-sm">
            <span className="font-label-md text-[10px] uppercase tracking-wider text-secondary">
              Organizations
            </span>
          </div>
          <div className="max-h-64 overflow-y-auto py-xs">
            {organizations.map((org) => (
              <button
                key={org.id}
                type="button"
                onClick={() => onSwitch(org.id)}
                className={`flex w-full items-center justify-between gap-sm px-md py-sm text-left transition-colors hover:bg-surface-container-low ${
                  org.id === activeOrgId ? "bg-primary/5" : ""
                }`}
              >
                <div className="min-w-0">
                  <div className="truncate font-body-md text-body-md text-on-surface">
                    {org.name}
                  </div>
                  <div className="truncate font-body-sm text-[11px] text-secondary">
                    {org.slug}
                  </div>
                </div>
                <div className="flex flex-shrink-0 items-center gap-xs">
                  <span
                    className={`rounded-full px-sm py-[1px] text-[10px] font-bold uppercase ${roleBadgeClass(org.role)}`}
                  >
                    {org.role}
                  </span>
                  {org.id === activeOrgId && (
                    <Icon name="check" className="text-primary" style={{ fontSize: 16 }} />
                  )}
                </div>
              </button>
            ))}
          </div>
          <div className="border-t border-outline-variant p-md">
            <button
              type="button"
              onClick={() => {
                setCreating(true);
                setOpen(false);
              }}
              className="flex w-full items-center gap-xs font-label-md text-label-md text-primary"
            >
              <Icon name="add" style={{ fontSize: 18 }} />
              <span className="hover:underline">Create Organization</span>
            </button>
          </div>
        </div>
      )}
      {orgCreateModal}
    </div>
  );
}
