export function PeaceScenery() {
  return (
    <div className="pointer-events-none fixed inset-0 overflow-hidden" aria-hidden="true">
      {/* Subtle morning sky rainbow arc */}
      <svg
        className="absolute left-1/2 top-8 w-[125%] max-w-4xl -translate-x-1/2 opacity-45"
        viewBox="0 0 800 320"
        fill="none"
      >
        <path d="M90 290 C210 70, 590 70, 710 290" stroke="#93c5fd" strokeWidth="14" strokeLinecap="round" strokeOpacity="0.45" />
        <path d="M108 290 C222 92, 578 92, 692 290" stroke="#86efac" strokeWidth="14" strokeLinecap="round" strokeOpacity="0.42" />
        <path d="M126 290 C234 114, 566 114, 674 290" stroke="#fde68a" strokeWidth="14" strokeLinecap="round" strokeOpacity="0.45" />
        <path d="M144 290 C246 136, 554 136, 656 290" stroke="#c7d2fe" strokeWidth="12" strokeLinecap="round" strokeOpacity="0.35" />
        {/* Soft clouds */}
        <ellipse cx="165" cy="96" rx="58" ry="18" fill="#ffffff" fillOpacity="0.65" />
        <ellipse cx="195" cy="88" rx="34" ry="16" fill="#ffffff" fillOpacity="0.65" />
        <ellipse cx="625" cy="116" rx="64" ry="19" fill="#ffffff" fillOpacity="0.6" />
        <ellipse cx="600" cy="108" rx="36" ry="15" fill="#ffffff" fillOpacity="0.6" />
      </svg>

      {/* Rolling green meadow hills at the bottom */}
      <svg
        className="absolute bottom-0 left-0 right-0 h-56 w-full"
        viewBox="0 0 1440 240"
        preserveAspectRatio="none"
        fill="none"
      >
        <path
          d="M0 135 C280 70, 560 155, 920 110 C1160 80, 1320 100, 1440 125 L1440 240 L0 240 Z"
          fill="#bfe2ca"
          fillOpacity="0.5"
        />
        <path
          d="M0 165 C340 120, 700 190, 1080 142 C1260 120, 1360 140, 1440 158 L1440 240 L0 240 Z"
          fill="#9fd3b2"
          fillOpacity="0.52"
        />
      </svg>
    </div>
  );
}

