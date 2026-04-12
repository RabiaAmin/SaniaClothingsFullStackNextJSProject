import Link from 'next/link';

export default function AuthLayout({ children }) {
  return (
    <div className="relative flex min-h-screen flex-col bg-muted/40">
      {/* Subtle grid background */}
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage:
            'linear-gradient(hsl(var(--border)) 1px, transparent 1px), linear-gradient(90deg, hsl(var(--border)) 1px, transparent 1px)',
          backgroundSize: '32px 32px',
        }}
      />

      {/* Top brand bar */}
      <header className="relative z-10 flex h-14 items-center px-6">
        <Link
          href="/"
          className="flex items-center gap-2 text-sm font-semibold text-foreground hover:text-primary transition-colors"
        >
          <span className="text-lg">⚡</span>
          Invoicer
        </Link>
      </header>

      {/* Centered form area */}
      <main className="relative z-10 flex flex-1 items-center justify-center px-4 pb-16">
        <div className="w-full max-w-md animate-fade-in">{children}</div>
      </main>

      {/* Footer */}
      <footer className="relative z-10 py-4 text-center text-xs text-muted-foreground">
        © {new Date().getFullYear()} Invoicer · All rights reserved
      </footer>
    </div>
  );
}
