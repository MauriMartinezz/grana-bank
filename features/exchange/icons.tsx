import type { ComponentProps } from "react";

/** A dollar sign inside a coin, in the outline style of components/icons.tsx. */
export function DollarIcon(props: ComponentProps<"svg">) {
  return (
    <svg
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...props}
    >
      <circle cx="12" cy="12" r="8.5" />
      <path d="M12 6.5v11M14.8 9.2c-.4-.9-1.5-1.5-2.8-1.5-1.6 0-2.8.9-2.8 2.1 0 2.9 5.8 1.6 5.8 4.4 0 1.2-1.3 2.1-3 2.1-1.4 0-2.5-.6-3-1.6" />
    </svg>
  );
}
