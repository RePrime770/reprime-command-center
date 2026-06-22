// Lightweight formatters — no Intl.DateTimeFormat dependency for predictable output.

export const fmtTime = (iso) => {
  if (!iso) return '';
  const d = new Date(iso);
  const hh = String(d.getHours()).padStart(2, '0');
  const mm = String(d.getMinutes()).padStart(2, '0');
  return `${hh}:${mm}`;
};

export const fmtDate = (iso) => {
  if (!iso) return '';
  const d = new Date(iso);
  const dow = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][d.getDay()];
  const mon = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'][d.getMonth()];
  return `${dow} · ${mon} ${d.getDate()}`;
};

export const fmtRelative = (iso, now = new Date('2026-05-11T10:00:00Z')) => {
  if (!iso) return '';
  const d = new Date(iso);
  const diffMin = Math.round((now - d) / 60000);
  if (diffMin < 1) return 'now';
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffH = Math.round(diffMin / 60);
  if (diffH < 24) return `${diffH}h ago`;
  const diffD = Math.round(diffH / 24);
  if (diffD < 7) return `${diffD}d ago`;
  const diffW = Math.round(diffD / 7);
  return `${diffW}w ago`;
};

export const fmtAmount = (n) => {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(n % 1_000_000 === 0 ? 0 : 1)}M`;
  if (n >= 1_000) return `$${(n / 1_000).toFixed(0)}K`;
  return `$${n}`;
};

export const isHebrew = (s) => /[֐-׿]/.test(s || '');
export const dirOf = (lang) => (lang === 'he' ? 'rtl' : 'ltr');
