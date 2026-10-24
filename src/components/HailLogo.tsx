// Wordmark: "h" + amber signal block with bold "ai" + "l". Mark: the signal block alone.
export function HailLogo({ variant = "full", height = 32, className }: { variant?: "full" | "mark"; height?: number; className?: string }) {
  if (variant === "mark") {
    return (
      <svg viewBox="0 0 48 48" height={height} width={height} role="img" aria-label="Hail" className={className}>
        <title>Hail</title>
        <rect x="2" y="8" width="44" height="32" rx="16" fill="var(--signal)" />
        <text x="24" y="31.5" textAnchor="middle" fontFamily="var(--font-display)" fontWeight="800" fontSize="22" fill="var(--signal-ink)">
          ai
        </text>
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 104 48" height={height} width={(height * 104) / 48} role="img" aria-label="Hail" className={className}>
      <title>Hail</title>
      <text x="0" y="35" fontFamily="var(--font-display)" fontWeight="400" fontSize="36" fill="var(--ink)" textLength="21" lengthAdjust="spacingAndGlyphs">
        h
      </text>
      <rect x="24" y="9" width="50" height="34" rx="17" fill="var(--signal)" />
      <text x="49" y="35" textAnchor="middle" fontFamily="var(--font-display)" fontWeight="800" fontSize="30" fill="var(--signal-ink)" textLength="30" lengthAdjust="spacingAndGlyphs">
        ai
      </text>
      <text x="78" y="35" fontFamily="var(--font-display)" fontWeight="400" fontSize="36" fill="var(--ink)" textLength="9" lengthAdjust="spacingAndGlyphs">
        l
      </text>
    </svg>
  );
}
