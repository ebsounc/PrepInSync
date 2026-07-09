import type { Metadata } from "next";
import { Sora, Geist_Mono } from "next/font/google";
import { getCookieLang } from "@/lib/i18n/server";
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
  const lang = await getCookieLang();
  return (
    <html
      lang={lang}
      className={`${sora.variable} ${geistMono.variable}`}
      suppressHydrationWarning
    >
      <body className="antialiased">
        {/* Apply saved theme / accent before paint to avoid a flash. */}
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var r=document.documentElement;var t=localStorage.getItem('theme');var d=t==='dark'||((!t||t==='system')&&window.matchMedia('(prefers-color-scheme: dark)').matches);r.classList.toggle('dark',d);var a=localStorage.getItem('pis-accent');if(a){r.style.setProperty('--primary',a);r.style.setProperty('--ring',a);r.style.setProperty('--sidebar-primary',a);}}catch(e){}})();`,
          }}
        />
        {children}
      </body>
    </html>
  );
}
