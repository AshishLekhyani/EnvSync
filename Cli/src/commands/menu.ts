import { apiRequest } from "../apiClient";
import { readLink, writeLink } from "../link";
import { askChoice, askYesNo, ask, closePrompt } from "../prompt";
import { requireSession } from "../session";
import { runLogout } from "./logout";
import { runPull } from "./pull";
import { runPush } from "./push";
import { runRun } from "./run";
import { runStatus } from "./status";
import { EnvironmentSummary, OrgSummary, ProjectSummary } from "../types";

async function pickProjectAndEnvironment(): Promise<{ projectId: string; environmentId: string }> {
  const credentials = requireSession();

  const link = readLink();
  if (link && (await askYesNo(`Use the project/environment linked to this folder?`))) {
    return link;
  }

  const orgs = await apiRequest<OrgSummary[]>(credentials.token, credentials.apiUrl, "/orgs");
  if (orgs.length === 0) {
    console.error("No organizations found. Create one in the web app first.");
    process.exit(1);
  }
  const orgId =
    orgs.length === 1
      ? orgs[0].id
      : await askChoice(
          "Organization",
          orgs.map((o) => ({ label: `${o.name} (${o.role})`, value: o.id }))
        );

  const projects = await apiRequest<ProjectSummary[]>(
    credentials.token,
    credentials.apiUrl,
    `/orgs/${orgId}/projects`
  );
  const accessible = projects.filter((p) => p.hasAccess !== false);
  if (accessible.length === 0) {
    console.error("No accessible projects in that organization.");
    process.exit(1);
  }
  const projectId = await askChoice(
    "Project",
    accessible.map((p) => ({ label: p.name, value: p.id }))
  );

  const environments = await apiRequest<EnvironmentSummary[]>(
    credentials.token,
    credentials.apiUrl,
    `/projects/${projectId}/environments`
  );
  if (environments.length === 0) {
    console.error("That project has no environments yet.");
    process.exit(1);
  }
  const environmentId = await askChoice(
    "Environment",
    environments.map((e) => ({ label: `${e.name} (${e.type})`, value: e.id }))
  );

  if (await askYesNo("Link this folder to that project/environment for next time?")) {
    writeLink({ projectId, environmentId });
  }

  return { projectId, environmentId };
}

export async function runMenu(): Promise<void> {
  try {
    const { projectId, environmentId } = await pickProjectAndEnvironment();
    const flags = ["--project", projectId, "--environment", environmentId];

    while (true) {
      console.log("");
      const action = await askChoice("What do you want to do?", [
        { label: "Pull secrets into .env", value: "pull" },
        { label: "Push .env back to the server", value: "push" },
        { label: "Run a command with secrets injected", value: "run" },
        { label: "Check status (diff against .env)", value: "status" },
        { label: "Log out", value: "logout" },
        { label: "Exit", value: "exit" },
      ]);

      if (action === "exit") {
        return;
      }

      if (action === "logout") {
        await runLogout();
        return;
      }

      if (action === "run") {
        const cmd = await ask("Command to run (e.g. npm start): ");
        if (!cmd) continue;
        await runRun([...flags, "--", ...cmd.split(" ")]);
        continue;
      }

      if (action === "pull") await runPull(flags);
      if (action === "push") await runPush(flags);
      if (action === "status") await runStatus(flags);
    }
  } finally {
    closePrompt();
  }
}
