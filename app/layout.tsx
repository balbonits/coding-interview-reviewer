import type { Metadata } from "next";
import Link from "next/link";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import "prismjs/themes/prism-tomorrow.css";
import { ThemeToggle } from "@/components/ThemeToggle";
import { FloatingChat } from "@/components/FloatingChat";
import { PageContextProvider } from "@/lib/pageContext";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Coding Interview Reviewer",
  description:
    "Personal front-end interview prep workspace: live coding exercises, review notes, and a local AI mock interviewer.",
};

const navLinks = [
  { href: "/courses", label: "Courses" },
  { href: "/notes", label: "Notes" },
  { href: "/exercises", label: "Exercises" },
  { href: "/quiz", label: "Quiz" },
  { href: "/review", label: "Review" },
  { href: "/interview", label: "Interview" },
  { href: "/news", label: "News" },
  { href: "/capture", label: "Capture" },
];

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <head>
        {/* Inline before hydration so the dark class is set before first paint */}
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var t=localStorage.getItem('theme');if(t==='dark'||(!t&&matchMedia('(prefers-color-scheme:dark)').matches)){document.documentElement.classList.add('dark')}}catch(e){}})();`,
          }}
        />
      </head>
      <body className="min-h-full flex flex-col bg-background text-foreground">
        <PageContextProvider>
        <header className="border-b border-border">
          <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
            <Link
              href="/"
              className="font-semibold tracking-tight hover:opacity-80"
            >
              Coding Interview Reviewer
            </Link>
            <nav className="flex items-center gap-6 text-sm">
              {navLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className="text-muted-foreground hover:text-foreground transition-colors"
                >
                  {link.label}
                </Link>
              ))}
              <ThemeToggle />
            </nav>
          </div>
        </header>
        <main className="mx-auto w-full max-w-5xl flex-1 px-6 py-10">
          {children}
        </main>
        <footer className="border-t border-border py-6 text-center text-xs text-muted-foreground">
          Local-only build · powered by Ollama · {new Date().getFullYear()}
        </footer>
        <FloatingChat />
        </PageContextProvider>
      </body>
    </html>
  );
}
