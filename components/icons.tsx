import type { ComponentProps } from "react";

type IconProps = ComponentProps<"svg">;

function Outline({ children, ...props }: IconProps) {
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
      {children}
    </svg>
  );
}

function Filled({ children, ...props }: IconProps) {
  return (
    <svg
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden="true"
      {...props}
    >
      {children}
    </svg>
  );
}

export function HomeIcon(props: IconProps) {
  return (
    <Outline {...props}>
      <path d="M4 10.5 12 4l8 6.5V19a1.5 1.5 0 0 1-1.5 1.5H16v-5a4 4 0 0 0-8 0v5H5.5A1.5 1.5 0 0 1 4 19z" />
    </Outline>
  );
}

export function ListIcon(props: IconProps) {
  return (
    <Outline {...props}>
      <rect x="5" y="3.5" width="14" height="17" rx="4" />
      <path d="M9 9h4M9 12.5h6M9 16h3" />
    </Outline>
  );
}

export function LogoutIcon(props: IconProps) {
  return (
    <Outline {...props}>
      <path d="M14 5.5V5a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2v-.5" />
      <path d="M9 12h12M17.5 8.5 21 12l-3.5 3.5" />
    </Outline>
  );
}

export function SearchIcon(props: IconProps) {
  return (
    <Outline strokeWidth="2.4" {...props}>
      <circle cx="10" cy="10" r="6" />
      <path d="m15 15 5.5 5.5" />
    </Outline>
  );
}

export function BellIcon(props: IconProps) {
  return (
    <Outline {...props}>
      <path d="M6 10a6 6 0 1 1 12 0c0 5 2 6.5 2 6.5H4S6 15 6 10z" />
      <path d="M10 20a2.2 2.2 0 0 0 4 0" />
    </Outline>
  );
}

export function EyeIcon(props: IconProps) {
  return (
    <Outline {...props}>
      <path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12z" />
      <circle cx="12" cy="12" r="3" />
    </Outline>
  );
}

export function EyeOffIcon(props: IconProps) {
  return (
    <Outline {...props}>
      <path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12z" />
      <circle cx="12" cy="12" r="3" />
      <path d="m4 4 16 16" />
    </Outline>
  );
}

export function CloseIcon(props: IconProps) {
  return (
    <Outline {...props}>
      <path d="m6 6 12 12M18 6 6 18" />
    </Outline>
  );
}

export function BackIcon(props: IconProps) {
  return (
    <Outline strokeWidth="2.2" {...props}>
      <path d="M15 5.5 8.5 12l6.5 6.5" />
    </Outline>
  );
}

export function ArrowDownIcon(props: IconProps) {
  return (
    <Filled {...props}>
      <path d="M9.5 3.5h5V12H19l-7 8.5L5 12h4.5z" />
    </Filled>
  );
}

export function ArrowUpIcon(props: IconProps) {
  return (
    <Filled {...props}>
      <path d="M9.5 20.5h5V12H19l-7-8.5L5 12h4.5z" />
    </Filled>
  );
}

export function SwapIcon(props: IconProps) {
  return (
    <Filled {...props}>
      <path d="M6 12.5h4V8h3L8 2.5 3 8h3z" />
      <path d="M14 11.5h4V16h3l-5 5.5-5-5.5h3z" />
    </Filled>
  );
}

const STAR_PATH =
  "m12 3.5 2.6 5.3 5.8.8-4.2 4.1 1 5.8-5.2-2.7-5.2 2.7 1-5.8-4.2-4.1 5.8-.8z";

export function StarIcon({ filled = false, ...props }: IconProps & { filled?: boolean }) {
  return filled ? (
    <Filled {...props}>
      <path d={STAR_PATH} />
    </Filled>
  ) : (
    <Outline {...props}>
      <path d={STAR_PATH} />
    </Outline>
  );
}

export function PlusIcon(props: IconProps) {
  return (
    <Outline strokeWidth="2.2" {...props}>
      <path d="M12 5v14M5 12h14" />
    </Outline>
  );
}

export function CheckIcon(props: IconProps) {
  return (
    <Outline strokeWidth="2.4" {...props}>
      <path d="m5 12.5 4.5 4.5L19 7.5" />
    </Outline>
  );
}

export function ReceiptIcon(props: IconProps) {
  return (
    <Outline {...props}>
      <path d="M6 3.5h12v17l-2.5-1.5-2 1.5-1.5-1.2-1.5 1.2-2-1.5L6 20.5z" />
      <path d="M9 8.5h6M9 12h6M9 15.5h3" />
    </Outline>
  );
}

export function TopUpIcon(props: IconProps) {
  return (
    <Outline {...props}>
      <rect x="6.5" y="2.5" width="11" height="19" rx="2.5" />
      <path d="M12 8v6M9.5 11.5 12 14l2.5-2.5M10.5 18.5h3" />
    </Outline>
  );
}

export function CardIcon(props: IconProps) {
  return (
    <Outline {...props}>
      <rect x="3" y="5.5" width="18" height="13" rx="2.5" />
      <path d="M3 10h18M7 15h3" />
    </Outline>
  );
}

export function MastercardLogo(props: IconProps) {
  return (
    <svg width="36" height="24" viewBox="0 0 36 24" aria-hidden="true" {...props}>
      <circle cx="12" cy="12" r="12" fill="#eb2a18" />
      <circle cx="24" cy="12" r="12" fill="#f79e1b" fillOpacity="0.9" />
    </svg>
  );
}

export function TagIcon(props: IconProps) {
  return (
    <Outline {...props}>
      <path d="M3.5 12.2V4.5a1 1 0 0 1 1-1h7.7a1 1 0 0 1 .7.3l7.8 7.8a1 1 0 0 1 0 1.4l-7.7 7.7a1 1 0 0 1-1.4 0l-7.8-7.8a1 1 0 0 1-.3-.7z" />
      <circle cx="8.2" cy="8.2" r="1.4" />
    </Outline>
  );
}
