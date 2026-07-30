"use client";

import { useState } from "react";
import { TeamPageShell } from "../TeamPageShell";
import { MembersSection } from "../MembersSection";

export default function TeamMembersPage() {
  const [search, setSearch] = useState("");

  return (
    <TeamPageShell onSearch={setSearch}>
      <MembersSection search={search} />
    </TeamPageShell>
  );
}
