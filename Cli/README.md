# @ashishlekhyani/envsync-cli

The command-line client for [EnvSync](https://github.com/AshishLekhyani/EnvSync) — a secrets manager for environment variables. Pull, push, and inject secrets without ever committing a `.env` file. One runtime dependency, [`cross-spawn`](https://www.npmjs.com/package/cross-spawn) (used only by `envsync run`, for correct cross-platform command execution — it has zero dependencies of its own and is the same package npm itself relies on internally).

## Install

```
npm install -g @ashishlekhyani/envsync-cli
```

## Quick start

1. Generate a service token in EnvSync under **Settings → CLI & Tokens**.
2. Log in (reads the token from stdin so it never touches your shell history):
   ```
   echo "$TOKEN" | envsync login
   ```
   or pass it directly: `envsync login <token>`
3. Find your project/environment IDs:
   ```
   envsync projects
   envsync environments --project <projectId>
   ```
4. Pull secrets into a local `.env` file:
   ```
   envsync pull --project <projectId> --environment <environmentId>
   ```

## Commands

| Command | Description |
|---|---|
| `envsync login [token]` | Authenticate with a service token. Reads the token from stdin if omitted (`echo $TOKEN \| envsync login`), avoiding shell history. Writes credentials to `~/.envsync/credentials.json` (mode `0600`). |
| `envsync logout` | Removes local credentials. Does not revoke the token server-side — revoke it from Settings if it may have been compromised. |
| `envsync projects` | Lists every project you have access to, with its ID. |
| `envsync environments --project <id>` | Lists every environment for a project, with its ID. |
| `envsync pull --project <id> --environment <id> [--out <path>]` | Reveals and writes every secret in the environment to a `.env` file (default `./.env`). Overwrites the destination file completely. |
| `envsync push --project <id> --environment <id> [--out <path>]` | Reads a local `.env` file and upserts its keys to the server — creates new keys, updates existing ones. Never deletes remote-only keys. |
| `envsync run --project <id> --environment <id> -- <cmd> [args...]` | Runs a command with secrets injected directly into its environment variables. Nothing is written to disk. |
| `envsync status --project <id> --environment <id> [--out <path>]` | Compares your local `.env` against the server without revealing any values — metadata only, safe to run often. |

## Environment variables

| Variable | Purpose |
|---|---|
| `ENVSYNC_TOKEN` | Use a service token directly without running `login` first — the standard way to authenticate in CI (GitHub Actions, Docker builds, etc.). Takes priority over any locally saved credentials. |
| `ENVSYNC_API_URL` | Point the CLI at a self-hosted EnvSync API instead of the default (`https://envsync-api.onrender.com/api`). Must be HTTPS unless it's `localhost`/`127.0.0.1` — the CLI warns if not. |

## Notes on audit trails and security

- `pull` and `run` reveal every secret in the environment, so each key produces its own audited reveal entry — an environment with 50 secrets means 50 audit rows per pull. `status` never reveals values, so it's audit-quiet by design.
- A token's access is identity-inheriting and org-scoped: it can only do what its creator could do, and only within the org it was issued for — a leaked CI token has bounded blast radius, not account-wide access.
- Prefer `ENVSYNC_TOKEN` in CI over passing a token as a bare command-line argument on a shared host (visible via `ps`) or storing it in a credentials file on a machine you don't fully trust.

## License

MIT — see [LICENSE](https://github.com/AshishLekhyani/EnvSync/blob/main/LICENSE).
