export function BrandMark({ size = 22 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <path
        d="M4 19 C 9 19, 10 8, 19 5"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeDasharray="0.5 4"
        opacity="0.85"
      />
      <circle cx="4" cy="19" r="2.3" fill="currentColor" />
      <circle cx="19" cy="5" r="2.8" fill="#E08A3C" />
    </svg>
  );
}
