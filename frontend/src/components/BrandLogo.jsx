export default function BrandLogo({ compact = false }) {
  return <span className={`brand-lockup ${compact ? 'brand-lockup-compact' : ''}`}>
    <svg className="brand-mark" role="img" aria-label="EchoBox logo" viewBox="0 0 48 48">
      <defs><linearGradient id="echo-gradient" x1="0" y1="0" x2="1" y2="1"><stop stopColor="#1687ff"/><stop offset="1" stopColor="#004ded"/></linearGradient></defs>
      <rect x="2" y="2" width="44" height="44" rx="15" fill="url(#echo-gradient)"/>
      <path d="M12 18a3 3 0 0 1 3-3h18a3 3 0 0 1 3 3v12a3 3 0 0 1-3 3H21l-7 5v-5a3 3 0 0 1-2-3V18Z" fill="white"/>
      <path d="M17 24h2l2-4 3 9 3-7 2 3h3" fill="none" stroke="#0758d8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
    {!compact && <span className="brand-wordmark">EchoBox</span>}
  </span>;
}
