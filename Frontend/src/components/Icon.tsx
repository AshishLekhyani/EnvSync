import type { CSSProperties } from "react";
import Link from "next/link";

export function Icon({
  name,
  className = "",
  filled = false,
  style,
}: {
  name: string;
  className?: string;
  filled?: boolean;
  style?: CSSProperties;
}) {
  return (
    <span
      className={`material-symbols-outlined ${className}`}
      style={{
        fontVariationSettings: filled
          ? "'FILL' 1, 'wght' 400, 'GRAD' 0, 'opsz' 24"
          : undefined,
        ...style,
      }}
    >
      {name}
    </span>
  );
}

export const AVATAR_SRC =
  "https://lh3.googleusercontent.com/aida-public/AB6AXuCn7Oy0z0W_bdGzDt302GKAgCqNeQIXWubFEJDRBMaQtvdvpuDAToD8CJFaRBEQ3bn_tFqnmIqcgYkJrcJf3ZYoWGkzAI3xyIjQhJajr8HDYFDD4q3lANwYvrJ4y6_CFiBI5l8BVApvbTLQEezxy0VItsfuZlji6qSkMb25W0JWnVpG9cAkNc3X3VE9OZElObXtQEDBfqE9Iv2Gp3ElTPibA34MTLqEfYQnoSak4S35N2w-i7piyHr7zHFK1mF9BxMOyzkkTPLMlOb-";
