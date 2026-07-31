#!/usr/bin/env node
import { runLink } from "./commands/link";
import { runLogin } from "./commands/login";
import { runLogout } from "./commands/logout";
import { runMenu } from "./commands/menu";
import { runPull } from "./commands/pull";
import { runPush } from "./commands/push";
import { runRun } from "./commands/run";
import { runStatus } from "./commands/status";
import { runProjects } from "./commands/projects";
import { runEnvironments } from "./commands/environments";
import { ApiError } from "./apiClient";
import { hasSession } from "./session";

function printHelp() {
  console.log(`envsync <command> [options]

Run \`envsync\` with no command (once logged in) for an interactive menu that
walks you through picking a project/environment and an action — no flags needed.

Commands:
  login [token]                                             Authenticate with a service token (reads stdin if omitted)
  logout                                                    Remove local credentials
  menu                                                       Interactive: pick a project/environment, then an action
  projects                                                  List projects in your organizations
  environments [--project <id>]                             List environments for a project
  link --project <id> --environment <id>                    Remember a project/environment for this folder
  pull [--project <id> --environment <id>] [--out <path>]   Pull secrets into a .env file
  push [--project <id> --environment <id>] [--out <path>]   Push a local .env file's keys to the server
  run [--project <id> --environment <id>] -- <cmd> [args...] Run a command with secrets injected
  status [--project <id> --environment <id>] [--out <path>] Compare local .env against remote

--project/--environment can be omitted on environments/pull/push/run/status once
you've run \`envsync link\` in this folder.`);
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
    case "link":
      await runLink(rest);
      break;
    case "environments":
      await runEnvironments(rest);
      break;
    case "menu":
      await runMenu();
      break;
    case "help":
    case "--help":
    case "-h":
      printHelp();
      break;
    case undefined:
      if (hasSession()) {
        await runMenu();
      } else {
        printHelp();
      }
      break;
    default:
      printHelp();
      process.exitCode = 1;
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
