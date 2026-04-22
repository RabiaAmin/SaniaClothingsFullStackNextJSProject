import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { ArrowRight, FileText, Users, Building2 } from 'lucide-react';

export const metadata = {
  title: 'Invoicer — Professional Invoicing',
};

const features = [
  {
    icon: FileText,
    title: 'Smart Invoicing',
    description: 'Create, send, and track professional invoices in seconds.',
  },
  {
    icon: Users,
    title: 'Client Management',
    description: 'Manage all your clients and their billing history in one place.',
  },
  {
    icon: Building2,
    title: 'Business Profiles',
    description: 'Configure multiple business profiles with custom branding.',
  },
];

export default function HomePage() {
  return (
    <main className="flex min-h-screen flex-col">
      {/* Hero */}
      <section className="flex flex-1 flex-col items-center justify-center gap-6 px-4 py-24 text-center">
        <span className="rounded-full border border-primary/20 bg-primary/10 px-4 py-1 text-sm font-medium text-primary">
          Now in early access
        </span>
        <h1 className="max-w-3xl text-4xl font-bold tracking-tight sm:text-6xl">
          Invoicing that works as hard as you do
        </h1>
        <p className="max-w-xl text-lg text-muted-foreground">
          Generate invoices, manage clients, and get paid faster — all from one clean dashboard.
        </p>
        <div className="flex flex-wrap items-center justify-center gap-3">
          <Button asChild size="lg">
            <Link href="/register">
              Go to Dashboard <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
          <Button asChild size="lg" variant="outline">
            <Link href="/login">Sign in</Link>
          </Button>
        </div>
      </section>

      {/* Features */}
      <section className="border-t bg-muted/40 px-4 py-20">
        <div className="container mx-auto grid gap-8 sm:grid-cols-3">
          {features.map(({ icon: Icon, title, description }) => (
            <div
              key={title}
              className="flex flex-col gap-3 rounded-xl border bg-card p-6 shadow-sm"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                <Icon className="h-5 w-5 text-primary" />
              </div>
              <h3 className="font-semibold">{title}</h3>
              <p className="text-sm text-muted-foreground">{description}</p>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}
