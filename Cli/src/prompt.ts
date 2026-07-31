import readline from "node:readline/promises";

let rl: readline.Interface | null = null;

function getInterface(): readline.Interface {
  if (!rl) {
    rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  }
  return rl;
}

export function closePrompt(): void {
  rl?.close();
  rl = null;
}

export async function ask(question: string): Promise<string> {
  return (await getInterface().question(question)).trim();
}

export async function askChoice(
  label: string,
  options: { label: string; value: string }[]
): Promise<string> {
  options.forEach((opt, i) => console.log(`  ${i + 1}. ${opt.label}`));

  while (true) {
    const raw = await ask(`${label} (1-${options.length}): `);
    const n = Number(raw);
    if (Number.isInteger(n) && n >= 1 && n <= options.length) {
      return options[n - 1].value;
    }
    console.log(`Enter a number between 1 and ${options.length}.`);
  }
}

export async function askYesNo(question: string, defaultYes = true): Promise<boolean> {
  const suffix = defaultYes ? "[Y/n]" : "[y/N]";
  const raw = (await ask(`${question} ${suffix}: `)).toLowerCase();
  if (!raw) return defaultYes;
  return raw === "y" || raw === "yes";
}
