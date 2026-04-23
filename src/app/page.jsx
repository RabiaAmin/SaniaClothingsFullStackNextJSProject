import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Scissors, Truck, Factory, ArrowRight, CheckCircle2 } from 'lucide-react';
import Navbar from '@/components/layout/Navbar';
import Footer from '@/components/layout/Footer';

export const metadata = {
  title: 'Sania Clothing — Garment Manufacturing & CMT Services',
  description:
    'Professional garment manufacturing, cutting, trimming, and custom CMT services for brands and businesses.',
};

const services = [
  {
    icon: Scissors,
    title: 'Cutting',
    description:
      'Precision fabric cutting with minimal waste and maximum consistency across bulk orders.',
  },
  {
    icon: Truck,
    title: 'Trimming',
    description:
      'Expert finishing and trimming services to ensure every garment meets quality standards.',
  },
  {
    icon: Factory,
    title: 'Custom Manufacturing',
    description:
      'End-to-end CMT manufacturing tailored to your specifications and brand requirements.',
  },
];

const reasons = [
  {
    title: 'Quality Craftsmanship',
    description:
      'Every garment is crafted with precision and care, meeting the highest industry standards.',
  },
  {
    title: 'On-Time Delivery',
    description:
      'We understand your deadlines. Our streamlined process ensures timely delivery every time.',
  },
  {
    title: 'Experienced Team',
    description:
      'Years of garment industry expertise — from pattern making to final quality checks.',
  },
];

const stats = [
  { value: '10+', label: 'Years Experience' },
  { value: '500+', label: 'Projects Completed' },
  { value: '100%', label: 'Quality Checked' },
  { value: '50+', label: 'Happy Clients' },
];

export default function HomePage() {
  return (
    <div className="flex min-h-screen flex-col">
      <Navbar variant="public" />

      <main className="flex-1">
        {/* Hero */}
        <section className="relative flex flex-col items-center justify-center gap-6 overflow-hidden px-4 py-28 text-center md:py-36">
          {/* Thread flow — green silk waves, bold at edges, faded at center */}
          <div
            className="pointer-events-none absolute inset-0 overflow-hidden"
            style={{
              maskImage:'linear-gradient(90deg,black 0%,black 15%,rgba(0,0,0,.08) 38%,rgba(0,0,0,.03) 50%,rgba(0,0,0,.08) 62%,black 85%,black 100%)',
              WebkitMaskImage:'linear-gradient(90deg,black 0%,black 15%,rgba(0,0,0,.08) 38%,rgba(0,0,0,.03) 50%,rgba(0,0,0,.08) 62%,black 85%,black 100%)',
            }}
          >
            <style>{`
              @keyframes tf-flow1 { from{stroke-dashoffset:1800}  to{stroke-dashoffset:-1800}  }
              @keyframes tf-flow2 { from{stroke-dashoffset:2000}  to{stroke-dashoffset:-2000}  }
              @keyframes tf-flow4 { from{stroke-dashoffset:2200}  to{stroke-dashoffset:-2200}  }
            `}</style>
            <svg
              style={{position:'absolute',inset:0,width:'100%',height:'100%'}}
              preserveAspectRatio="xMidYMid slice"
              viewBox="0 0 1200 280"
              fill="none"
            >
              <path d="M-200 25  C80  -30 320 140 560 25  S860  -30 1100 25  S1380 140 1500 25"  stroke="hsl(142 71% 45%)" strokeWidth="1.2" strokeDasharray="2000" style={{animation:'tf-flow2 11s linear infinite 0s',   opacity:.65}} />
              <path d="M-200 85  C100  20 360 200 600 85  S900   20 1150 85  S1420 200 1500 85"  stroke="hsl(142 71% 45%)" strokeWidth="2"   strokeDasharray="1800" style={{animation:'tf-flow1  9s linear infinite .6s',  opacity:.75}} />
              <path d="M-200 145 C120  65 400 230 650 145 S950   65 1200 145"                    stroke="hsl(142 71% 45%)" strokeWidth="1.8" strokeDasharray="1800" style={{animation:'tf-flow1 10s linear infinite 2s',   opacity:.65}} />
              <path d="M-200 200 C160 125 440 275 690 195 S980  120 1220 200"                    stroke="hsl(142 71% 45%)" strokeWidth="1.4" strokeDasharray="2200" style={{animation:'tf-flow4 13s linear infinite 1.2s', opacity:.6}}  />
              <path d="M-200 248 C190 170 460 305 720 228 S1000 158 1240 248"                    stroke="hsl(142 71% 45%)" strokeWidth="1"   strokeDasharray="2000" style={{animation:'tf-flow2 12s linear infinite 3.5s', opacity:.5}}  />
              <path d="M-200 -15 C210  70 430 -30 670  55 S940  135 1210  20 S1430 -25 1500 -15" stroke="hsl(142 71% 45%)" strokeWidth="0.9" strokeDasharray="2400" style={{animation:'tf-flow4 14s linear infinite 2.5s', opacity:.4}}  />
            </svg>
          </div>
          <span className="rounded-full border border-primary/20 bg-primary/10 px-4 py-1.5 text-sm font-medium text-primary">
            Garment Manufacturing &amp; CMT Services
          </span>
          <h1 className="max-w-3xl text-4xl font-bold tracking-tight sm:text-5xl md:text-6xl">
            Sania Clothing
          </h1>
          <p className="max-w-xl text-lg text-muted-foreground">
            Delivering quality garment manufacturing, cutting, trimming, and custom CMT services to
            brands and businesses across the industry.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-3">
            <Button asChild size="lg">
              <Link href="/contact">
                Contact Us <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
            <Button asChild size="lg" variant="outline">
              <Link href="/services">Our Services</Link>
            </Button>
          </div>
        </section>

        {/* Services Preview */}
        <section className="border-t bg-muted/40 px-4 py-20">
          <div className="container mx-auto">
            <div className="mb-10 text-center">
              <h2 className="text-3xl font-bold tracking-tight">What We Do</h2>
              <p className="mt-2 text-muted-foreground">
                Core services designed for garment manufacturers and brands.
              </p>
            </div>
            <div className="grid gap-6 sm:grid-cols-3">
              {services.map(({ icon: Icon, title, description }) => (
                <div
                  key={title}
                  className="flex flex-col gap-3 rounded-xl border bg-card p-6 shadow-sm transition-shadow hover:shadow-md"
                >
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                    <Icon className="h-5 w-5 text-primary" />
                  </div>
                  <h3 className="font-semibold">{title}</h3>
                  <p className="text-sm text-muted-foreground">{description}</p>
                  <Link
                    href="/services"
                    className="mt-auto text-sm font-medium text-primary hover:underline"
                  >
                    Learn more →
                  </Link>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Why Choose Us */}
        <section className="px-4 py-20">
          <div className="container mx-auto grid gap-12 md:grid-cols-2 md:items-center">
            <div>
              <h2 className="mb-4 text-3xl font-bold tracking-tight">
                Why Choose Sania Clothing?
              </h2>
              <p className="mb-8 text-muted-foreground">
                We combine years of industry experience with a commitment to quality, making us the
                trusted manufacturing partner for garment businesses.
              </p>
              <div className="flex flex-col gap-5">
                {reasons.map(({ title, description }) => (
                  <div key={title} className="flex gap-3">
                    <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
                    <div>
                      <p className="font-semibold">{title}</p>
                      <p className="text-sm text-muted-foreground">{description}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              {stats.map(({ value, label }) => (
                <div
                  key={label}
                  className="rounded-xl border bg-card p-6 text-center shadow-sm"
                >
                  <p className="text-3xl font-bold text-primary">{value}</p>
                  <p className="mt-1 text-sm text-muted-foreground">{label}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="border-t bg-primary px-4 py-20 text-primary-foreground">
          <div className="container mx-auto flex flex-col items-center gap-4 text-center">
            <h2 className="text-3xl font-bold tracking-tight">Ready to Work Together?</h2>
            <p className="max-w-lg text-primary-foreground/80">
              Get in touch with us today to discuss your manufacturing requirements. We&apos;re here
              to help bring your garment designs to life.
            </p>
            <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
              <Button asChild size="lg" variant="secondary">
                <Link href="/contact">Get in Touch</Link>
              </Button>
              <Button
                asChild
                size="lg"
                variant="outline"
                className="border-primary-foreground/30 text-primary-foreground hover:bg-primary-foreground/10"
              >
                <Link href="/services">View Services</Link>
              </Button>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
