export default function BulldogIcon({ className = "w-6 h-6" }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="currentColor"
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* Bulldog face */}
      <ellipse cx="12" cy="13" rx="9" ry="8" fill="currentColor" opacity="0.9" />
      {/* Ears */}
      <ellipse cx="4.5" cy="8" rx="2.5" ry="3" fill="currentColor" />
      <ellipse cx="19.5" cy="8" rx="2.5" ry="3" fill="currentColor" />
      {/* Eyes */}
      <circle cx="8.5" cy="11" r="2" fill="white" />
      <circle cx="15.5" cy="11" r="2" fill="white" />
      <circle cx="9" cy="11.5" r="1" fill="#1a1a2e" />
      <circle cx="16" cy="11.5" r="1" fill="#1a1a2e" />
      {/* Nose */}
      <ellipse cx="12" cy="15" rx="2.5" ry="1.8" fill="#1a1a2e" />
      {/* Jowls */}
      <ellipse cx="8" cy="17" rx="2.5" ry="2" fill="currentColor" opacity="0.7" />
      <ellipse cx="16" cy="17" rx="2.5" ry="2" fill="currentColor" opacity="0.7" />
      {/* Mouth line */}
      <path d="M10 18 Q12 20 14 18" stroke="#1a1a2e" strokeWidth="0.8" fill="none" />
    </svg>
  );
}
