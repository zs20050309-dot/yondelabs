function base(props) {
  return { xmlns: 'http://www.w3.org/2000/svg', width: 18, height: 18, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 1.8, strokeLinecap: 'round', strokeLinejoin: 'round', 'aria-hidden': true, ...props }
}

export function IconApplications(props) {
  return <svg {...base(props)}><path d="M9 2h6l5 5v13a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2Z" /><path d="M9 12h6M9 16h6M9 8h2" /></svg>
}

export function IconStudents(props) {
  return <svg {...base(props)}><circle cx="12" cy="8" r="3.4" /><path d="M4.5 20c1-3.6 4-5.6 7.5-5.6s6.5 2 7.5 5.6" /></svg>
}

export function IconPayments(props) {
  return <svg {...base(props)}><rect x="2.5" y="6" width="19" height="13" rx="2.4" /><path d="M2.5 10.5h19" /><path d="M6 15h4" /></svg>
}

export function IconArchive(props) {
  return <svg {...base(props)}><rect x="3" y="4" width="18" height="4.5" rx="1.2" /><path d="M4.5 8.5V19a1.6 1.6 0 0 0 1.6 1.6h11.8A1.6 1.6 0 0 0 19.5 19V8.5" /><path d="M10 13h4" /></svg>
}

export function IconSun(props) {
  return <svg {...base(props)}><circle cx="12" cy="12" r="4.2" /><path d="M12 2.5v2.4M12 19.1v2.4M4.9 4.9l1.7 1.7M17.4 17.4l1.7 1.7M2.5 12h2.4M19.1 12h2.4M4.9 19.1l1.7-1.7M17.4 6.6l1.7-1.7" /></svg>
}

export function IconMoon(props) {
  return <svg {...base(props)}><path d="M20 14.2A8.4 8.4 0 1 1 9.8 4a6.8 6.8 0 0 0 10.2 10.2Z" /></svg>
}

export function IconLogout(props) {
  return <svg {...base(props)}><path d="M9 20H5.6A1.6 1.6 0 0 1 4 18.4V5.6A1.6 1.6 0 0 1 5.6 4H9" /><path d="M15.5 16.5 20 12l-4.5-4.5" /><path d="M20 12H9" /></svg>
}

export function IconCheck(props) {
  return <svg {...base(props)}><path d="M4 12.5 9 17.5 20 6.5" /></svg>
}

export function IconAlert(props) {
  return <svg {...base(props)}><path d="M12 3.5 21.5 20h-19L12 3.5Z" /><path d="M12 10v4.2M12 17.3v.1" /></svg>
}

export function IconMenu(props) {
  return <svg {...base(props)}><path d="M4 7h16M4 12h16M4 17h16" /></svg>
}

export function IconClose(props) {
  return <svg {...base(props)}><path d="M6 6l12 12M18 6 6 18" /></svg>
}
