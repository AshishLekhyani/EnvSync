import { DocsShell } from "@/components/DocsShell";

export const metadata = { title: "CLI Reference — EnvSync Docs" };

const COMMANDS = [
  {
    cmd: "envsync login [token]",
    desc: "Authenticate with a service token generated in Settings → CLI & Tokens. Writes credentials to ~/.envsync/credentials.json. Reads the token from stdin if omitted (e.g. echo $TOKEN | envsync login), avoiding shell history.",
  },
  {
    cmd: "envsync logout",
    desc: "Removes local credentials. Does not revoke the token server-side — revoke it from Settings if it may have been compromised.",
  },
  {
    cmd: "envsync (no command) / envsync menu",
    desc: "Interactive mode — once logged in, walks you through picking a project and environment (or reusing a linked one), then an action to run. No flags or IDs to remember.",
  },
  {
    cmd: "envsync projects",
    desc: "Lists every project you have access to, with its ID.",
  },
  {
    cmd: "envsync environments [--project <id>]",
    desc: "Lists every environment for a project, with its ID. --project can be omitted once you've linked this folder.",
  },
  {
    cmd: "envsync link --project <id> --environment <id>",
    desc: "Remembers a project/environment for the current folder (writes .envsync.json there), so every command below can drop --project/--environment entirely.",
  },
  {
    cmd: "envsync pull [--project <id> --environment <id>] [--out <path>]",
    desc: "Reveals and writes every secret in the environment to a .env file (default ./.env). Overwrites the destination file completely.",
  },
  {
    cmd: "envsync push [--project <id> --environment <id>] [--out <path>]",
    desc: "Reads a local .env file and upserts its keys to the server — creates new keys, updates existing ones. Never deletes keys that exist remotely but not locally.",
  },
  {
    cmd: "envsync run [--project <id> --environment <id>] -- <cmd> [args...]",
    desc: "Runs a command with secrets injected directly into its environment variables. Nothing is written to disk.",
  },
  {
    cmd: "envsync status [--project <id> --environment <id>] [--out <path>]",
    desc: "Compares your local .env against the server — shows each key's last-updated time and flags anything changed remotely since your last pull. Never reveals values, so it's safe to run often.",
  },
];

export default function CliDocsPage() {
  return (
    <DocsShell>
      <p className="mb-xs font-label-md text-label-md uppercase tracking-wider text-primary">
        Docs
      </p>
      <h1 className="mb-md font-h1 text-h1 text-on-surface">CLI Reference</h1>
      <p className="mb-xl font-body-lg text-body-lg text-secondary">
        Every command below is real — this list matches the actual command surface, not an
        aspirational one. The CLI has one runtime dependency,{" "}
        <code className="rounded bg-surface-container px-1 font-code-sm text-code-sm">
          cross-spawn
        </code>
        , used only by <code className="rounded bg-surface-container px-1 font-code-sm text-code-sm">run</code>{" "}
        for correct cross-platform command execution.
      </p>

      <div className="mb-lg overflow-hidden rounded-lg border border-[#30363D]">
        <div className="code-block-header flex items-center px-md py-sm">
          <span className="font-code-sm text-code-sm text-[#8B949E]">Install</span>
        </div>
        <div className="code-block-body p-md">
          <code className="font-code-md text-code-md text-[#E6EDF3]">
            <span className="text-[#FF7B72]">npm</span> install -g @ashishlekhyani/envsync-cli
          </code>
        </div>
      </div>

      <div className="mb-lg rounded-lg border-l-4 border-primary bg-surface-container p-md">
        <p className="font-body-md text-body-md font-bold text-on-surface">Fastest way to start</p>
        <p className="mt-xs font-body-sm text-body-sm text-on-surface-variant">
          Run <code className="rounded bg-surface-container-high px-1 font-code-sm text-code-sm">envsync login &lt;token&gt;</code>,
          then just run <code className="rounded bg-surface-container-high px-1 font-code-sm text-code-sm">envsync</code> with
          no arguments — it launches an interactive menu that picks your project, environment,
          and action for you. Everything below also works directly if you prefer flags and scripts.
        </p>
      </div>

      <div className="mb-lg overflow-hidden rounded-lg border border-[#30363D]">
        <div className="code-block-header flex items-center px-md py-sm">
          <span className="font-code-sm text-code-sm text-[#8B949E]">
            Example session (illustrative — your org/project names will differ)
          </span>
        </div>
        <div className="code-block-body p-md">
          <pre className="whitespace-pre-wrap font-code-sm text-code-sm text-[#E6EDF3]">
{`$ envsync login <token>
Logged in as jordan@example.com

$ envsync
? Project ›
❯ Core API
  Marketing Site

? Environment ›
❯ Production
  Staging
  Development

? Link this folder to that project/environment for next time? › yes

? What do you want to do? ›
❯ Pull secrets into .env
  Push .env back to the server
  Run a command with secrets injected
  Check status (diff against .env)
  Log out
  Exit

Pulled 6 secret(s) into ./.env

? What do you want to do? ›
❯ Exit`}
          </pre>
        </div>
      </div>

      <div className="flex flex-col divide-y divide-outline-variant rounded-xl border border-outline-variant bg-white dark:bg-surface-container-lowest">
        {COMMANDS.map((c) => (
          <div key={c.cmd} className="p-md">
            <p className="mb-xs font-code-md text-code-md font-bold text-on-surface">{c.cmd}</p>
            <p className="font-body-sm text-body-sm text-on-surface-variant">{c.desc}</p>
          </div>
        ))}
      </div>

      <p className="mt-lg font-body-sm text-body-sm text-secondary">
        A note on audit trails: <code className="rounded bg-surface-container px-1 font-code-sm text-code-sm">pull</code> and{" "}
        <code className="rounded bg-surface-container px-1 font-code-sm text-code-sm">run</code> reveal every secret in the
        environment, so each key produces its own audited reveal entry — an environment with
        50 secrets means 50 audit rows per pull. <code className="rounded bg-surface-container px-1 font-code-sm text-code-sm">status</code> never reveals
        values, so it&apos;s audit-quiet by design.
      </p>

      <p className="mt-md font-body-sm text-body-sm text-secondary">
        A note on token storage: <code className="rounded bg-surface-container px-1 font-code-sm text-code-sm">envsync login &lt;token&gt;</code> writes
        the token to <code className="rounded bg-surface-container px-1 font-code-sm text-code-sm">~/.envsync/credentials.json</code>, readable
        only by your user account. Setting an{" "}
        <code className="rounded bg-surface-container px-1 font-code-sm text-code-sm">ENVSYNC_TOKEN</code> environment variable instead (common in CI)
        skips that file, but environment variables are inherited by child processes and can be
        visible to other tools or users on the same machine — prefer it only in environments
        you trust, and never pass a token as a bare command-line argument on a shared host.
      </p>

      <p className="mt-md font-body-sm text-body-sm text-secondary">
        A service token is always scoped to the single organization it was created in — the CLI
        (and the interactive menu) can only ever see that one organization, regardless of how
        many others the token creator personally belongs to.
      </p>
    </DocsShell>
  );
}
