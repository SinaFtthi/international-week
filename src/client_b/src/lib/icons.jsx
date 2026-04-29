const I = (d, s = 16) => (
  <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7">
    {d}
  </svg>
);

export const Icons = {
  dash:     (s) => I(<><rect x="3" y="3" width="8" height="10" rx="1.5"/><rect x="13" y="3" width="8" height="6" rx="1.5"/><rect x="13" y="11" width="8" height="10" rx="1.5"/><rect x="3" y="15" width="8" height="6" rx="1.5"/></>, s),
  account:  (s) => I(<><rect x="3" y="6" width="18" height="13" rx="2"/><path d="M3 10h18"/><path d="M7 15h4"/></>, s),
  arrow:    (s) => I(<><path d="M4 12h16"/><path d="M14 6l6 6-6 6"/></>, s),
  ack:      (s) => I(<path d="M4 12l5 5L20 6"/>, s),
  tx:       (s) => I(<><path d="M4 8h13M14 5l3 3-3 3"/><path d="M20 16H7M10 19l-3-3 3-3"/></>, s),
  log:      (s) => I(<><rect x="4" y="3" width="16" height="18" rx="2"/><path d="M8 8h8M8 12h8M8 16h5"/></>, s),
  plus:     (s) => I(<path d="M12 5v14M5 12h14"/>, s),
  play:     (s) => I(<path d="M7 5v14l12-7L7 5z"/>, s),
  search:   (s) => I(<><circle cx="11" cy="11" r="6.5"/><path d="M16 16l4 4"/></>, s),
  bell:     (s) => I(<><path d="M6 16V11a6 6 0 0112 0v5l1.5 2H4.5L6 16z"/><path d="M10 20a2 2 0 004 0"/></>, s),
  cog:      (s) => I(<><circle cx="12" cy="12" r="3"/><path d="M19 12a7 7 0 00-.1-1.2l2-1.5-2-3.5-2.4.7A7 7 0 0014.5 5l-.4-2.5h-4l-.4 2.5a7 7 0 00-2 1.5L5.2 5.8l-2 3.5 2 1.5A7 7 0 005 12c0 .4 0 .8.1 1.2l-2 1.5 2 3.5 2.4-.7a7 7 0 002 1.5l.4 2.5h4l.4-2.5a7 7 0 002-1.5l2.4.7 2-3.5-2-1.5c.1-.4.1-.8.1-1.2z"/></>, s),
  close:    (s) => I(<path d="M6 6l12 12M18 6L6 18"/>, s),
  refresh:  (s) => I(<><path d="M4 12a8 8 0 0114-5.3L20 9"/><path d="M20 5v4h-4"/><path d="M20 12a8 8 0 01-14 5.3L4 15"/><path d="M4 19v-4h4"/></>, s),
  download: (s) => I(<><path d="M12 4v12m-5-5l5 5 5-5"/><path d="M5 20h14"/></>, s),
  filter:   (s) => I(<path d="M4 5h16l-6 8v6l-4-2v-4L4 5z"/>, s),
};
