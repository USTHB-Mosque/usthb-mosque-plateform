import React from 'react'

const THEME_SCRIPT = `(function(){try{var c=document.documentElement.classList;c.remove('light','dark');var p=window.location.pathname;var portal=p==='/user'||p.indexOf('/user/')===0||p==='/member-portal'||p.indexOf('/member-portal/')===0;var admin=p==='/admin'||p.indexOf('/admin/')===0||p==='/admin-panel'||p.indexOf('/admin-panel/')===0;var t=localStorage.getItem('theme');var dark=(portal||admin)?(t==='dark'||(t!=='light'&&window.matchMedia('(prefers-color-scheme: dark)').matches)):false;c.add(dark?'dark':'light');document.documentElement.style.colorScheme=dark?'dark':'light';}catch(e){}})();`

/**
 * Applies the persisted theme to <html> before first paint, so there is no
 * flash of the wrong theme.
 *
 * The stored value is read defensively: `system` (what next-themes writes when
 * the user picks the `نظام` option, and its own default) is not a colour, so it
 * has to fall through to the OS preference. Anything else that is neither
 * `light` nor `dark` is treated the same way. Visitor paths still short-circuit
 * to light before any of that is evaluated, so they never even ask.
 *
 * Deliberately a Server Component with no 'use client'. It is rendered into
 * <head> by the root layout, and the inline script only runs if the browser
 * parses it out of the server-rendered HTML. Marking it as a client component
 * makes React treat the <script> as a client-rendered element, which it never
 * executes — the theme would then be applied late (or not at all), and React
 * logs "Encountered a script tag while rendering React component".
 */
const ThemeInitScript: React.FC = () => {
  return <script dangerouslySetInnerHTML={{ __html: THEME_SCRIPT }} suppressHydrationWarning />
}

export default ThemeInitScript
