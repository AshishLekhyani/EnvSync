const COLORS = [
  "bg-[#CF222E]/15 text-[#CF222E] dark:bg-red-500/20 dark:text-red-400",
  "bg-[#9A6700]/15 text-[#9A6700] dark:bg-amber-500/20 dark:text-amber-400",
  "bg-[#1A7F37]/15 text-[#1A7F37] dark:bg-green-500/20 dark:text-green-400",
  "bg-[#0969DA]/15 text-[#0969DA] dark:bg-blue-500/20 dark:text-blue-400",
  "bg-[#8250DF]/15 text-[#8250DF] dark:bg-purple-500/20 dark:text-purple-400",
  "bg-primary/15 text-primary",
];

function hash(input: string) {
  let h = 0;
  for (let i = 0; i < input.length; i++) {
    h = (h * 31 + input.charCodeAt(i)) >>> 0;
  }
  return h;
}

export function initials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

export function Avatar({
  name,
  seed,
  avatarUrl,
  className = "h-8 w-8 text-sm",
}: {
  name: string;
  seed?: string;
  avatarUrl?: string | null;
  className?: string;
}) {
  if (avatarUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={avatarUrl}
        alt=""
        className={`flex-shrink-0 rounded-full border border-outline-variant object-cover ${className}`}
      />
    );
  }

  const colorClass = COLORS[hash(seed ?? name) % COLORS.length];

  return (
    <div
      className={`flex flex-shrink-0 items-center justify-center rounded-full border border-outline-variant font-label-md font-bold ${colorClass} ${className}`}
      aria-hidden
    >
      {initials(name) || "?"}
    </div>
  );
}
