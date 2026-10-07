const PATHS: Record<string, string> = {
  home: "M3 10.5 12 3l9 7.5M5 9.5V21h14V9.5",
  sprout:
    "M12 21v-8m0 0c0-4-3-7-8-7 0 5 3 7 8 7Zm0 0c0-4 3-7 8-7 0 5-3 7-8 7Z",
  store: "M4 9v11h16V9M2 9l2-6h16l2 6M2 9h20M9 20v-6h6v6",
  users:
    "M17 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M9.5 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8Zm12.5 10v-2a4 4 0 0 0-3-3.87M15.5 3.13a4 4 0 0 1 0 7.75",
  receipt: "M6 2h12v20l-3-2-3 2-3-2-3 2V2Zm3 6h6M9 12h6",
  cloudSun:
    "M12 2v2m6.4.6-1.4 1.4M20 10h2M2 10h2m2.4-5.4L5 3.2M8 22h9a4 4 0 0 0 .8-7.92A6 6 0 0 0 6.1 12.2 4.5 4.5 0 0 0 8 22Z",
  cloudOff:
    "M8 22h9a4 4 0 0 0 .8-7.92A6 6 0 0 0 6.1 12.2 4.5 4.5 0 0 0 8 22Zm14.5.5L4 4",
  warehouse:
    "M3 21V9l9-6 9 6v12M7 21v-8h10v8M7 17h10",
  map: "M9 4 3 6v14l6-2 6 2 6-2V4l-6 2-6-2Zm0 0v14m6-12v14",
  chat: "M21 12a8 8 0 0 1-8 8H4l2-3a8 8 0 1 1 15-5Z",
  bell: "M18 9a6 6 0 1 0-12 0c0 7-3 8-3 8h18s-3-1-3-8m-4.3 11a2 2 0 0 1-3.4 0",
  user: "M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8Z",
  settings:
    "M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6Zm7.4-3a7.4 7.4 0 0 0-.1-1.2l2-1.6-2-3.4-2.4 1a7.4 7.4 0 0 0-2-1.2L14.5 3h-5l-.4 2.6a7.4 7.4 0 0 0-2 1.2l-2.4-1-2 3.4 2 1.6a7.4 7.4 0 0 0 0 2.4l-2 1.6 2 3.4 2.4-1a7.4 7.4 0 0 0 2 1.2l.4 2.6h5l.4-2.6a7.4 7.4 0 0 0 2-1.2l2.4 1 2-3.4-2-1.6c.1-.4.1-.8.1-1.2Z",
  menu: "M4 6h16M4 12h16M4 18h16",
  globe: "M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18Zm-9-9h18M12 3a14 14 0 0 1 0 18 14 14 0 0 1 0-18Z",
  leaf: "M11 20A7 7 0 0 1 4 13c0-6 7-9 16-10 0 10-4 14-9 17Zm-5-3c3-4 6-6 10-8",
  arrowRight: "M5 12h14m-6-6 6 6-6 6",
  check: "m5 13 4 4L19 7",
  x: "M6 6l12 12M18 6 6 18",
  alert: "M12 9v4m0 4h.01M10.3 3.9 2.4 18a2 2 0 0 0 1.7 3h15.8a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0Z",
  truck:
    "M1 5h13v11H1zM14 9h4l4 4v3h-8M5.5 19a2 2 0 1 0 0-4 2 2 0 0 0 0 4Zm12 0a2 2 0 1 0 0-4 2 2 0 0 0 0 4Z",
  scale: "M12 3v18M8 21h8M12 6 5 6m14 0h-7M5 6 2 13a3.5 3.5 0 0 0 6 0L5 6Zm14 0-3 7a3.5 3.5 0 0 0 6 0l-3-7Z",
  trendUp: "m3 17 6-6 4 4 8-8m0 0h-6m6 0v6",
  trendDown: "m3 7 6 6 4-4 8 8m0 0h-6m6 0v-6",
  logout: "M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4m7 14 5-5-5-5m5 5H9",
  plus: "M12 5v14M5 12h14",
  search: "M11 19a8 8 0 1 0 0-16 8 8 0 0 0 0 16Zm10 2-4.35-4.35",
  landmark:
    "M3 21h18M4 18h16M6 18v-7m4 7v-7m4 7v-7m4 7v-7M3 8l9-5 9 5v2H3V8Z",
  handshake:
    "m11 17 2 2 3-3 3 2 2-2-5-5-3 1-4-4-4 4 3 3m-2-8-3 3 2 2",
  clipboard:
    "M9 4h6a1 1 0 0 1 1 1v1H8V5a1 1 0 0 1 1-1Zm-1 2H6a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-2M9 12h6m-6 4h4",
  grid: "M4 4h7v7H4zM13 4h7v7h-7zM4 13h7v7H4zm9 0h7v7h-7z",
  chevronR: "m9 6 6 6-6 6",
  shield: "M12 22s8-3 8-10V5l-8-3-8 3v7c0 7 8 10 8 10Zm-3-11 2.2 2.2L15.5 9",
  mic:
    "M12 15a3 3 0 0 0 3-3V6a3 3 0 1 0-6 0v6a3 3 0 0 0 3 3Zm-7-3a7 7 0 0 0 14 0M12 19v3",
  package:
    "m7.5 4.3 9 5.2M21 16V8a2 2 0 0 0-1-1.7l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.7l7 4a2 2 0 0 0 2 0l7-4a2 2 0 0 0 1-1.7ZM3.3 7 12 12l8.7-5M12 22V12",
  phone:
    "M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3 19.5 19.5 0 0 1-6-6 19.8 19.8 0 0 1-3-8.7A2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1 1 .4 2 .7 2.8a2 2 0 0 1-.4 2.1L8.1 9.9a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.4c.9.3 1.9.5 2.8.7a2 2 0 0 1 1.7 2Z",
  clock: "M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18Zm0-14v5l3 3",
  wallet:
    "M20 7H4a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2Zm-4 7h.01M2 7l12-4 2.5 4",
  doc: "M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Zm0 0v6h6M9 13h6m-6 4h6",
  star: "m12 2 3.1 6.3 6.9 1-5 4.9 1.2 6.8-6.2-3.2-6.2 3.2L7 14.2 2 9.3l6.9-1L12 2Z",
};

export type IconName = keyof typeof PATHS;

export function Icon({
  name,
  className = "w-5 h-5",
  strokeWidth = 2,
}: {
  name: IconName;
  className?: string;
  strokeWidth?: number;
}) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <path d={PATHS[name]} />
    </svg>
  );
}
