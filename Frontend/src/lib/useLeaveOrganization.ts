"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { useAuth } from "./auth-context";
import { useConfirm } from "./confirm-context";
import { api, ApiError, OrgSummary } from "./api";
import { queryKeys } from "./query-keys";

export function useLeaveOrganization(target?: OrgSummary) {
  const { activeOrg, activeOrgId, organizations, refreshMe, switchOrg } = useAuth();
  const org = target ?? activeOrg;
  const confirm = useConfirm();
  const queryClient = useQueryClient();
  const router = useRouter();
  const [leaving, setLeaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const leave = async () => {
    if (!org) return;
    if (
      !(await confirm({
        title: "Leave Organization",
        message: `Leave ${org.name}? You'll lose access immediately.`,
        confirmLabel: "Leave",
        danger: true,
      }))
    ) {
      return;
    }
    setLeaving(true);
    setError(null);
    try {
      await api.leaveOrganization(org.id);
      const remaining = organizations.filter((o) => o.id !== org.id);
      await refreshMe();
      await queryClient.invalidateQueries({ queryKey: queryKeys.orgProjects(org.id) });

      if (org.id === activeOrgId) {
        if (remaining[0]) {
          switchOrg(remaining[0].id);
        }
        router.push("/projects");
      }
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to leave organization");
      setLeaving(false);
    }
  };

  return { leave, leaving, error, canLeave: !!org && org.role !== "OWNER" };
}
