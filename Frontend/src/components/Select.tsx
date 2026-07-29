import { SelectHTMLAttributes } from "react";

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  wrapperClassName?: string;
}

export function Select({
  label,
  className,
  wrapperClassName,
  id,
  ...props
}: SelectProps) {
  const select = (
    <select
      id={id}
      className={`w-full rounded-lg border border-outline-variant bg-surface-container-low px-md py-sm font-body-md text-body-md text-on-surface outline-none transition-colors focus:border-primary focus:ring-2 focus:ring-primary-container ${className ?? ""}`}
      {...props}
    />
  );

  if (!label) return select;

  return (
    <label className={`block ${wrapperClassName ?? ""}`} htmlFor={id}>
      <span className="mb-xs block font-label-md text-label-md text-on-surface">
        {label}
      </span>
      {select}
    </label>
  );
}
