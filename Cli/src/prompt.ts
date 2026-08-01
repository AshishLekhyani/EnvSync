import prompts from "prompts";

function onCancel(): never {
  console.log("\nCancelled.");
  process.exit(1);
}

export async function ask(question: string): Promise<string> {
  const res = await prompts({ type: "text", name: "value", message: question }, { onCancel });
  return (res.value ?? "").trim();
}

export async function askChoice(
  label: string,
  options: { label: string; value: string }[]
): Promise<string> {
  const res = await prompts(
    {
      type: "select",
      name: "value",
      message: label,
      choices: options.map((o) => ({ title: o.label, value: o.value })),
    },
    { onCancel }
  );
  return res.value;
}

export async function askYesNo(question: string, defaultYes = true): Promise<boolean> {
  const res = await prompts(
    {
      type: "toggle",
      name: "value",
      message: question,
      initial: defaultYes,
      active: "yes",
      inactive: "no",
    },
    { onCancel }
  );
  return res.value;
}
