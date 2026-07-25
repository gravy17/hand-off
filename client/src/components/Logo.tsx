export function Logo({ size = 32 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" role="img" aria-label="HandOff logo">
      <defs>
        <linearGradient id="handoff-logo" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#6d5dfc" />
          <stop offset="1" stopColor="#22d3ee" />
        </linearGradient>
      </defs>
      <rect width="64" height="64" rx="14" fill="#0b1020" />
      <path
        d="M20 40c4 4 8 6 12 6s8-2 12-6M18 26l6-6M46 26l-6-6M24 20c3-3 5-4 8-4s5 1 8 4"
        fill="none"
        stroke="url(#handoff-logo)"
        strokeWidth="4"
        strokeLinecap="round"
      />
      <circle cx="32" cy="33" r="5" fill="url(#handoff-logo)" />
    </svg>
  );
}
