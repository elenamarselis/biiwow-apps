export function Logo() {
  return (
    <svg className="bwlogo" viewBox="0 0 100 100" aria-hidden="true" focusable="false">
      <defs>
        <linearGradient id="bwg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#3ddc97" /><stop offset=".55" stopColor="#14b8a6" /><stop offset="1" stopColor="#2f7fe0" /></linearGradient>
        <clipPath id="bwc"><rect width="100" height="100" rx="24" /></clipPath>
      </defs>
      <rect width="100" height="100" rx="24" fill="url(#bwg)" />
      <g fill="#fff" clipPath="url(#bwc)">
        <circle cx="45" cy="42" r="8.5" /><circle cx="67.5" cy="42" r="8.5" />
        <rect x="37" y="58" width="15" height="60" rx="7.5" /><rect x="59.5" y="58" width="15.5" height="60" rx="7.5" />
      </g>
    </svg>
  );
}
export function Wordmark() {
  return (
    <span className="wordmark"><Logo /><span>b<span className="ii">ii</span>wow<span className="app-name">Plate</span></span></span>
  );
}
