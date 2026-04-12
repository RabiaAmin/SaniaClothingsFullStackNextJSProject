import Link from 'next/link';

export default function Footer() {
  return (
    <footer className="border-t bg-muted/40 py-8">
      <div className="container mx-auto flex flex-col items-center justify-between gap-4 px-4 text-sm text-muted-foreground sm:flex-row">
        <p>© {new Date().getFullYear()} Invoicer. All rights reserved.</p>
        <nav className="flex gap-4">
          <Link href="/privacy" className="hover:text-foreground transition-colors">
            Privacy
          </Link>
          <Link href="/terms" className="hover:text-foreground transition-colors">
            Terms
          </Link>
        </nav>
      </div>
    </footer>
  );
}
