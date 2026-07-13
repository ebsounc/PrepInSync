import type { Metadata } from "next";
import type { CSSProperties } from "react";
import { Sora, Geist_Mono } from "next/font/google";
import { getCookieLang } from "@/lib/i18n/server";
import { getThemeCookie, getAccentCookie } from "@/lib/appearance-cookies";
import { ACCENT_VARS } from "@/lib/appearance";
import { cn } from "@/lib/utils";
import "./globals.css";

// Sora is the app font (see globals.css --font-sans); Geist Mono for the rare mono bits.
const sora = Sora({ variable: "--font-sora", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

export const metadata: Metadata = {
  title: "PrepInSync",
  description: "Bilingual kitchen prep tool",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const [lang, theme, accent] = await Promise.all([
    getCookieLang(),
    getThemeCookie(),
    getAccentCookie(), // already validated (returns undefined if the cookie is tampered)
  ]);

  // Explicit dark renders server-side (no flash, no script needed). `system` and the
  // logged-out case are resolved by the inline script below via matchMedia/localStorage.
  const className = cn(sora.variable, geistMono.variable, theme === "dark" && "dark");
  // Accent is inlined server-side for a logged-in user with a non-default accent.
  // `accent` passed getAccentCookie's validation, so it is safe in a style attribute.
  const style = accent
    ? (Object.fromEntries(ACCENT_VARS.map((v) => [v, accent])) as CSSProperties)
    : undefined;

  // The theme cookie is present iff the user is logged in (set on login / appearance
  // save). So: cookie present → it is authoritative (localStorage is ignored, which
  // avoids a stale device-local value overriding the profile). Cookie absent →
  // logged-out fallback to localStorage, the legacy behavior.
  const noFlash = `(function(){try{var r=document.documentElement;var ct=${JSON.stringify(
    theme ?? null
  )};var ca=${JSON.stringify(accent ?? null)};if(ct){var d=ct==='dark'||(ct==='system'&&window.matchMedia('(prefers-color-scheme: dark)').matches);r.classList.toggle('dark',d);if(ca){r.style.setProperty('--primary',ca);r.style.setProperty('--ring',ca);r.style.setProperty('--sidebar-primary',ca);}}else{var t=localStorage.getItem('theme');var d=t==='dark'||((!t||t==='system')&&window.matchMedia('(prefers-color-scheme: dark)').matches);r.classList.toggle('dark',d);var a=localStorage.getItem('pis-accent');if(a){r.style.setProperty('--primary',a);r.style.setProperty('--ring',a);r.style.setProperty('--sidebar-primary',a);}}}catch(e){}})();`;

  return (
    <html lang={lang} className={className} style={style} suppressHydrationWarning>
      <body className="antialiased">
        {/* Resolve `system` theme (and the logged-out localStorage fallback) before paint. */}
        <script dangerouslySetInnerHTML={{ __html: noFlash }} />
        {children}
      </body>
    </html>
  );
}
