// One badge design per rank: Intern → Fund Manager.
const RANK_STYLES = [
  { fill: "#a16207", ring: "#ca8a04" }, // Intern — bronze
  { fill: "#64748b", ring: "#cbd5e1" }, // Junior Analyst — silver
  { fill: "#1d4ed8", ring: "#60a5fa" }, // Analyst — blue
  { fill: "#15803d", ring: "#4ade80" }, // Trader — green
  { fill: "#7e22ce", ring: "#c084fc" }, // Senior Trader — purple
  { fill: "#b45309", ring: "#fde047" }, // Fund Manager — gold
];

/** index = major rank (0–5); sub = sub-rank 0–2, shown as I / II / III. */
export function RankBadge({ index, sub, size = 40 }: { index: number; sub?: number; size?: number }) {
  const s = RANK_STYLES[Math.min(index, RANK_STYLES.length - 1)]!;
  const shape =
    index <= 1 ? (
      <circle cx="20" cy="20" r="16" fill={s.fill} stroke={s.ring} strokeWidth="2.5" />
    ) : index <= 3 ? (
      <path d="M20 3 L35 9 V20 C35 29 28 35 20 38 C12 35 5 29 5 20 V9 Z" fill={s.fill} stroke={s.ring} strokeWidth="2.5" />
    ) : (
      <path
        d="M20 2 L25 13 L37 14 L28 22 L31 35 L20 28 L9 35 L12 22 L3 14 L15 13 Z"
        fill={s.fill}
        stroke={s.ring}
        strokeWidth="2.5"
        strokeLinejoin="round"
      />
    );
  // Chevrons show seniority within the shape family.
  const chevrons = index === 5 ? 0 : (index % 2) + 1;
  const roman = sub === undefined ? null : ["I", "II", "III"][sub];
  return (
    <svg width={size} height={size} viewBox="0 0 40 40" aria-hidden style={{ overflow: "visible" }}>
      {shape}
      {index === 5 ? (
        <path d="M12 24 L13 15 L17 19 L20 13 L23 19 L27 15 L28 24 Z" fill={s.ring} />
      ) : (
        Array.from({ length: chevrons }).map((_, k) => (
          <path
            key={k}
            d={`M13 ${22 - k * 6} L20 ${16 - k * 6} L27 ${22 - k * 6}`}
            fill="none"
            stroke={s.ring}
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
            transform="translate(0 3)"
          />
        ))
      )}
      {roman && (
        <g>
          <rect x={26} y={27} width={roman.length * 4.2 + 5} height={11} rx={5.5} fill="var(--color-background)" stroke={s.ring} strokeWidth={1.2} />
          <text x={28.5 + (roman.length * 4.2) / 2} y={35.3} textAnchor="middle" fontSize={7.5} fontWeight={800} fill={s.ring}>
            {roman}
          </text>
        </g>
      )}
    </svg>
  );
}
