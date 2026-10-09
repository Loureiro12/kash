/** Ícones de traço do Kash (caminhos do protótipo + os que o app usa). */
const PATHS = {
  home: 'M3 11l9-7 9 7v9a1 1 0 01-1 1h-5v-6H9v6H4a1 1 0 01-1-1z',
  cards: 'M4 5h16a2 2 0 012 2v10a2 2 0 01-2 2H4a2 2 0 01-2-2V7a2 2 0 012-2zM2 10h20',
  wallet: 'M5 5h12a2 2 0 012 2v1h1a1 1 0 011 1v8a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2zM16 13h.01',
  bills: 'M5 4h14a2 2 0 012 2v13a2 2 0 01-2 2H5a2 2 0 01-2-2V6a2 2 0 012-2zM8 2v4M16 2v4M3 10h18',
  goals: 'M12 3a9 9 0 110 18 9 9 0 010-18zM12 8a4 4 0 110 8 4 4 0 010-8z',
  report: 'M5 20V11M12 20V5M19 20v-6',
  forecast: 'M3 17l6-6 4 4 8-8M15 7h6v6',
  list: 'M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01',
  plus: 'M12 5v14M5 12h14',
  eye: 'M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12zM12 9a3 3 0 110 6 3 3 0 010-6z',
  eyeOff: 'M3 3l18 18M10.6 5.1A10.6 10.6 0 0112 5c6.5 0 10 7 10 7a17 17 0 01-3.2 4.2M6.6 6.6A17.4 17.4 0 002 12s3.5 7 10 7a9.9 9.9 0 005.4-1.6M9.9 9.9a3 3 0 004.2 4.2',
  sun: 'M12 8a4 4 0 110 8 4 4 0 010-8zM12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4',
  moon: 'M21 12.8A9 9 0 1111.2 3a7 7 0 009.8 9.8z',
  menu: 'M4 6h16M4 12h16M4 18h16',
  close: 'M6 6l12 12M18 6L6 18',
  check: 'M5 12l5 5L20 7',
  chevronRight: 'M9 6l6 6-6 6',
  chevronLeft: 'M15 6l-6 6 6 6',
  trash: 'M3 6h18M8 6V4h8v2M6 6l1 14h10l1-14M10 11v5M14 11v5',
  search: 'M11 4a7 7 0 110 14 7 7 0 010-14zM21 21l-4.3-4.3',
  tag: 'M3 12V4a1 1 0 011-1h8l9 9-9 9zM7.5 7.5h.01',
  pencil: 'M4 20h4L19 9l-4-4L4 16zM14 6l4 4',
  download: 'M12 4v12M7 11l5 5 5-5M5 20h14',
  logout: 'M15 4h3a2 2 0 012 2v12a2 2 0 01-2 2h-3M10 17l5-5-5-5M15 12H4',
  user: 'M12 4a4 4 0 110 8 4 4 0 010-8zM4 20a8 8 0 0116 0',
  lock: 'M6 11h12v9H6zM8 11V8a4 4 0 018 0v3',
  plusMinus: 'M12 4v8M8 8h8M8 18h8',
} as const;

export type IconName = keyof typeof PATHS;

export function Icon({ name, size = 18, strokeWidth = 2.2, className }: { name: IconName; size?: number; strokeWidth?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false" className={className}>
      <path d={PATHS[name]} />
    </svg>
  );
}
