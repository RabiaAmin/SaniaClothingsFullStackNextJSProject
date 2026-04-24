import Image from 'next/image';
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
        <section className="relative min-h-[92vh] overflow-hidden bg-sidebar">
          {/* Oversized decorative background text */}
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 flex items-center justify-center overflow-hidden select-none"
          >
            <span className="whitespace-nowrap text-[22vw] font-black uppercase leading-none tracking-widest text-white/[0.04]">
              SANIA
            </span>
          </div>

          {/* Three-column grid */}
          <div className="relative z-10 mx-auto grid min-h-[92vh] max-w-screen-xl grid-cols-1 px-6 md:grid-cols-[2fr_3fr_2fr] md:px-10">

            {/* ── Left column: text + CTA ── */}
            <div className="flex flex-col justify-end gap-6 pb-14 pt-8 md:py-20 order-2 md:order-1">
              <span className="w-fit rounded-full border border-primary/30 bg-primary/10 px-4 py-1.5 text-xs font-semibold uppercase tracking-widest text-primary">
                CMT Manufacturing
              </span>

              <div className="flex flex-col gap-2">
                <h1 className="text-4xl font-black leading-tight tracking-tight text-white sm:text-5xl">
                  Crafted<br />
                  <span className="text-primary">with Precision.</span>
                </h1>
                <p className="mt-2 max-w-[22ch] text-base leading-relaxed text-white/50">
                  Inspired by craftsmanship.<br />
                  Designed for modern brands.
                </p>
              </div>

              <div className="flex flex-wrap gap-3 pt-1">
                <Button asChild size="lg" className="rounded-full px-7">
                  <Link href="/contact">
                    Get in Touch <ArrowRight className="ml-2 h-4 w-4" />
                  </Link>
                </Button>
                <Button
                  asChild
                  size="lg"
                  variant="outline"
                  className="rounded-full border-white/20 bg-transparent px-7 text-white hover:bg-white/10 hover:text-white"
                >
                  <Link href="/services">Our Services</Link>
                </Button>
              </div>

              {/* Bottom-left tagline */}
              <div className="mt-auto border-t border-white/10 pt-6">
                <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-white/30">
                  Sania Crafts
                </p>
                <p className="text-sm font-bold uppercase tracking-widest text-white/50">
                  Define Your Quality.
                </p>
              </div>
            </div>

            {/* ── Center column: main hero image ── */}
            <div className="relative flex items-end justify-center order-1 md:order-2">
              {/* Soft radial glow behind the image */}
              <div
                aria-hidden="true"
                className="absolute bottom-0 left-1/2 h-[70%] w-[70%] -translate-x-1/2 rounded-full bg-primary/10 blur-[80px]"
              />
              <Image
                src="/images/jkt2.webp"
                alt="Featured garment"
                width={500}
                height={700}
                priority
                className="relative z-10 max-h-[80vh] w-auto object-cover object-top drop-shadow-2xl"
              />
              {/* "New" pill on the image */}
              <span className="absolute left-[58%] top-[38%] z-20 rounded-full bg-white px-3 py-1 text-xs font-bold text-slate-900 shadow-lg">
                New
              </span>
            </div>

            {/* ── Right column: floating card + collection stamp ── */}
            <div className="hidden flex-col items-end justify-between py-20 md:flex order-3">
              {/* Floating product card */}
              <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/5 p-3 shadow-2xl backdrop-blur-md">
                <Image
                  src="/images/jkt2.webp"
                  alt="Product preview"
                  width={56}
                  height={72}
                  className="h-[72px] w-[56px] rounded-xl object-cover"
                />
                <div className="flex flex-col gap-1.5 pr-1">
                  <span className="w-fit rounded-full bg-primary px-2 py-0.5 text-[10px] font-bold text-white">
                    New
                  </span>
                  <p className="text-xs leading-tight text-white/50">
                    Latest<br />Collection
                  </p>
                </div>
              </div>

              {/* Bottom-right collection stamp */}
              <div className="text-right">
                <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-white/30">
                  Collection
                </p>
                <p className="text-6xl font-black leading-none text-white/20">2026</p>
              </div>
            </div>
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
                className="border-primary-foreground/30 text-primary/60 hover:bg-primary-foreground/10"
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
