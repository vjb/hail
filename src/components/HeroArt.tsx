// "The robot hails a human": hand-built SVG from the brand illustration, drawn with design
// tokens so it follows light/dark themes. Decorative wording lives in the <title>.

const ROBOT_ARM = "M935 1205 L1020 1100 L1055 905";
const FINGERS = [
  "M1036 878 L1022 806",
  "M1053 864 L1060 790",
  "M1075 869 L1098 800",
  "M1094 886 L1132 832",
  "M1030 912 L986 890",
];
const PERSON_FINGERS = ["M1126 478 L1095 400", "M1143 468 L1140 384", "M1166 470 L1185 390", "M1186 492 L1230 428", "M1112 516 L1068 514"];

export function HeroArt({ className }: { className?: string }) {
  return (
    <svg viewBox="230 300 1500 1340" className={className} role="img" aria-labelledby="hero-art-title">
      <title id="hero-art-title">A friendly robot and a person waving at each other</title>
      <circle cx="945" cy="965" r="628" fill="var(--hero-halo)" />
      <line x1="270" y1="1603" x2="1685" y2="1603" stroke="var(--ink)" strokeWidth="24" strokeLinecap="round" />

      {/* Person */}
      <g>
        <path d="M1270 830 L1165 690 L1148 520" fill="none" stroke="var(--ink)" strokeWidth="72" strokeLinecap="round" strokeLinejoin="round" />
        <circle cx="1150" cy="505" r="50" fill="var(--ink)" />
        {PERSON_FINGERS.map((d) => (
          <path key={d} d={d} stroke="var(--ink)" strokeWidth="34" strokeLinecap="round" />
        ))}
        <rect x="1280" y="1150" width="72" height="410" rx="36" fill="var(--ink)" />
        <rect x="1372" y="1150" width="72" height="410" rx="36" fill="var(--ink)" />
        <ellipse cx="1297" cy="1582" rx="64" ry="22" fill="var(--ink)" />
        <ellipse cx="1430" cy="1582" rx="64" ry="22" fill="var(--ink)" />
        <rect x="1240" y="758" width="290" height="425" rx="100" fill="var(--ink)" />
        <path d="M1505 820 L1522 1055" stroke="var(--ink)" strokeWidth="60" strokeLinecap="round" />
        <polyline points="1316,775 1360,845 1403,775" fill="none" stroke="var(--signal)" strokeWidth="18" strokeLinecap="round" strokeLinejoin="round" />
        <rect x="1452" y="1040" width="82" height="128" rx="14" fill="var(--signal)" stroke="var(--ink)" strokeWidth="16" />
        <path d="M1476 1080 H1508 M1476 1104 H1500" stroke="var(--ink)" strokeWidth="10" strokeLinecap="round" />
        <circle cx="1360" cy="630" r="100" fill="var(--ink)" />
        <circle cx="1318" cy="610" r="11" fill="var(--paper)" />
        <circle cx="1368" cy="610" r="11" fill="var(--paper)" />
        <path d="M1310 652 Q1342 684 1374 652" fill="none" stroke="var(--paper)" strokeWidth="10" strokeLinecap="round" />
      </g>

      {/* Robot */}
      <g>
        <circle cx="676" cy="1045" r="112" fill="var(--hero-glow)" />
        <path d="M595 935 L622 968 M686 908 L682 955 M775 945 L742 975" stroke="var(--ink)" strokeWidth="18" strokeLinecap="round" />
        <path d={ROBOT_ARM} fill="none" stroke="var(--ink)" strokeWidth="56" strokeLinecap="round" strokeLinejoin="round" />
        <path d={ROBOT_ARM} fill="none" stroke="var(--signal)" strokeWidth="28" strokeLinecap="round" strokeLinejoin="round" />
        {FINGERS.map((d) => (
          <path key={d} d={d} stroke="var(--ink)" strokeWidth="40" strokeLinecap="round" />
        ))}
        {FINGERS.map((d) => (
          <path key={`${d}-fill`} d={d} stroke="var(--signal)" strokeWidth="20" strokeLinecap="round" />
        ))}
        <circle cx="1060" cy="902" r="40" fill="var(--signal)" stroke="var(--ink)" strokeWidth="18" />
        <path d="M410 1195 Q330 1262 345 1365" fill="none" stroke="var(--ink)" strokeWidth="56" strokeLinecap="round" />
        <path d="M410 1195 Q330 1262 345 1365" fill="none" stroke="var(--signal)" strokeWidth="28" strokeLinecap="round" />
        <circle cx="370" cy="1380" r="40" fill="var(--signal)" stroke="var(--ink)" strokeWidth="22" />
        <circle cx="510" cy="1530" r="54" fill="var(--ink)" />
        <circle cx="510" cy="1530" r="18" fill="var(--paper)" />
        <circle cx="773" cy="1548" r="54" fill="var(--ink)" />
        <circle cx="773" cy="1548" r="18" fill="var(--paper)" />
        <g transform="rotate(4 665 1310)">
          <path d="M630 1075 A45 45 0 0 1 720 1075 Z" fill="var(--signal)" stroke="var(--ink)" strokeWidth="24" strokeLinejoin="round" />
          <rect x="405" y="1075" width="520" height="470" rx="70" fill="var(--signal)" stroke="var(--ink)" strokeWidth="28" />
          <line x1="440" y1="1165" x2="890" y2="1165" stroke="var(--ink)" strokeWidth="18" strokeLinecap="round" />
          <rect x="478" y="1222" width="375" height="232" rx="50" fill="var(--signal-ink)" />
          <path d="M560 1322 Q590 1290 622 1325 M708 1325 Q740 1293 772 1328" fill="none" stroke="var(--signal)" strokeWidth="16" strokeLinecap="round" />
          <path d="M582 1362 Q665 1432 748 1366" fill="none" stroke="var(--signal)" strokeWidth="16" strokeLinecap="round" />
          <ellipse cx="533" cy="1372" rx="26" ry="15" fill="var(--hero-cheek)" />
          <ellipse cx="795" cy="1380" rx="26" ry="15" fill="var(--hero-cheek)" />
        </g>
      </g>
    </svg>
  );
}
