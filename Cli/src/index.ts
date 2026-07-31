#!/usr/bin/env node
import { runLogin } from "./commands/login";
import { runLogout } from "./commands/logout";
import { runPull } from "./commands/pull";
import { runPush } from "./commands/push";
import { runRun } from "./commands/run";
import { runStatus } from "./commands/status";
import { runProjects } from "./commands/projects";
import { runEnvironments } from "./commands/environments";
import { ApiError } from "./apiClient";

function printHelp() {
  console.log(`envsync <command> [options]

Commands:
  login [token]                                             Authenticate with a service token (reads stdin if omitted)
  logout                                                    Remove local credentials
  projects                                                  List projects in your organizations
  environments --project <id>                               List environments for a project
  pull --project <id> --environment <id> [--out <path>]     Pull secrets into a .env file
  push --project <id> --environment <id> [--out <path>]     Push a local .env file's keys to the server
  run --project <id> --environment <id> -- <cmd> [args...]  Run a command with secrets injected
  status --project <id> --environment <id> [--out <path>]   Compare local .env against remote`);
}

async function main() {
  const [, , command, ...rest] = process.argv;

  switch (command) {
    case "login":
      await runLogin(rest);
      break;
    case "logout":
      await runLogout();
      break;
    case "pull":
      await runPull(rest);
      break;
    case "push":
      await runPush(rest);
      break;
    case "run":
      await runRun(rest);
      break;
    case "status":
      await runStatus(rest);
      break;
    case "projects":
      await runProjects();
      break;
    case "environments":
      await runEnvironments(rest);
      break;
    default:
      printHelp();
      process.exitCode = command ? 1 : 0;
  }
}

main().catch((err) => {
  if (err instanceof ApiError) {
    console.error(`Error: ${err.message}`);
  } else {
    console.error(err instanceof Error ? err.message : err);
  }
  process.exitCode = 1;
});
