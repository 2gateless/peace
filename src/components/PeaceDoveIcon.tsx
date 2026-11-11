export function PeaceDoveIcon({ className = "w-7 h-7" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 128 128" fill="none" aria-hidden="true">
      <circle cx="64" cy="64" r="46" stroke="#52796f" strokeOpacity="0.4" strokeWidth="3" />
      <path d="M26 78C38 92 60 98 84 90C96 86 104 78 108 70" stroke="#84a98c" strokeWidth="4" strokeLinecap="round" />
      <path
        d="M36 68L58 46L78 52L96 34L86 60L100 68L72 74L52 84L58 68L36 68Z"
        fill="#84a98c"
        fillOpacity="0.22"
        stroke="#84a98c"
        strokeWidth="3.5"
        strokeLinejoin="round"
      />
      <path d="M58 46L66 28L78 52" stroke="#cad2c5" strokeWidth="3" strokeLinejoin="round" />
      <circle cx="88" cy="44" r="2.6" fill="#cad2c5" />
    </svg>
  );
}
