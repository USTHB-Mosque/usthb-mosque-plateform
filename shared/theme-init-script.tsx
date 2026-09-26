'use client'

import React from 'react'

const THEME_SCRIPT = `(function(){try{var c=document.documentElement.classList;c.remove('light','dark');var p=window.location.pathname;var portal=p==='/user'||p.indexOf('/user/')===0||p==='/member-portal'||p.indexOf('/member-portal/')===0;var admin=p==='/admin'||p.indexOf('/admin/')===0||p==='/admin-panel'||p.indexOf('/admin-panel/')===0;var t=localStorage.getItem('theme');var dark=(portal||admin)?(t?t==='dark':window.matchMedia('(prefers-color-scheme: dark)').matches):false;c.add(dark?'dark':'light');document.documentElement.style.colorScheme=dark?'dark':'light';}catch(e){}})();`

const ThemeInitScript: React.FC = () => {
  return <script dangerouslySetInnerHTML={{ __html: THEME_SCRIPT }} suppressHydrationWarning />
}

export default ThemeInitScript
