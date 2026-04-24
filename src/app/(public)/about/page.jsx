import { CheckCircle2, Target, Eye, Users } from 'lucide-react';

export const metadata = {
  title: 'About — Sania Clothing',
  description:
    'Learn about Sania Clothing — our story, mission, and commitment to quality garment manufacturing.',
};

const values = [
  {
    icon: Target,
    title: 'Our Mission',
    description:
      'To deliver precision-crafted garments through honest partnerships, consistent quality, and on-time fulfilment — every single order.',
  },
  {
    icon: Eye,
    title: 'Our Vision',
    description:
      'To be the most trusted garment manufacturing partner in the region, known for reliability, craftsmanship, and long-term client relationships.',
  },
  {
    icon: Users,
    title: 'Our Team',
    description:
      'A dedicated team of experienced pattern makers, cutters, and quality inspectors who take pride in every stitch.',
  },
];

const timeline = [
  { year: '2010', event: 'Founded in Lahore, Pakistan' },
  { year: '2014', event: 'Expanded cutting facility with modern machinery' },
  { year: '2018', event: 'Launched full CMT service division' },
  { year: '2022', event: 'Reached 500+ completed projects' },
  { year: '2024', event: 'Serving 50+ active clients' },
];

const statsRow = [
  { label: 'Years in Business', value: '10+' },
  { label: 'Projects Completed', value: '500+' },
  { label: 'Active Clients', value: '50+' },
  { label: 'Quality Pass Rate', value: '100%' },
];

export default function AboutPage() {
  return (
    <div className="flex flex-col">
      {/* Page header */}
      <section className="relative overflow-hidden border-b bg-sidebar px-4 py-24 text-center">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 flex items-center justify-center overflow-hidden select-none"
        >
          <span className="whitespace-nowrap text-[18vw] font-black uppercase leading-none tracking-widest text-white/[0.04]">
            ABOUT
          </span>
        </div>
        <div className="relative container mx-auto max-w-2xl">
          <span className="mb-4 inline-block rounded-full border border-primary/30 bg-primary/10 px-4 py-1.5 text-sm font-medium text-primary">
            About Us
          </span>
          <h1 className="mb-4 text-4xl font-bold tracking-tight text-white">
            Built on Quality &amp; Trust
          </h1>
          <p className="text-lg text-white/50">
            Sania Clothing has been a reliable garment manufacturing partner for over a decade,
            serving brands and businesses with precision cutting, trimming, and custom CMT services.
          </p>
        </div>
      </section>

      {/* Who We Are */}
      <section className="px-4 py-20">
        <div className="container mx-auto grid gap-12 md:grid-cols-2 md:items-center">
          <div>
            <h2 className="mb-4 text-3xl font-bold tracking-tight">Who We Are</h2>
            <div className="flex flex-col gap-4 text-muted-foreground">
              <p>
                Sania Clothing is a garment manufacturing business specialising in cutting,
                trimming, and complete CMT (Cut, Make, Trim) production. We work with fashion
                brands, wholesale suppliers, and independent designers to bring their garment
                visions to reality.
              </p>
              <p>
                Founded over a decade ago, we have grown from a small cutting operation into a
                full-service manufacturing partner trusted by clients across the industry. Our
                facility is equipped with modern machinery and staffed by experienced professionals
                who understand the demands of garment production.
              </p>
              <p>
                We believe in building long-term relationships with our clients — understanding
                their needs, respecting their deadlines, and delivering work that consistently
                exceeds expectations.
              </p>
            </div>
          </div>
          <div className="flex flex-col gap-4">
            {statsRow.map(({ label, value }) => (
              <div
                key={label}
                className="flex items-center justify-between rounded-xl border bg-card px-6 py-4 shadow-sm"
              >
                <span className="text-sm text-muted-foreground">{label}</span>
                <span className="text-2xl font-bold text-primary">{value}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Mission, Vision, Team */}
      <section className="border-t bg-muted/40 px-4 py-20">
        <div className="container mx-auto">
          <div className="mb-10 text-center">
            <h2 className="text-3xl font-bold tracking-tight">What Drives Us</h2>
          </div>
          <div className="grid gap-6 sm:grid-cols-3">
            {values.map(({ icon: Icon, title, description }) => (
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
        </div>
      </section>

      {/* Timeline */}
      <section className="px-4 py-20">
        <div className="container mx-auto max-w-2xl">
          <div className="mb-10 text-center">
            <h2 className="text-3xl font-bold tracking-tight">Our Journey</h2>
            <p className="mt-2 text-muted-foreground">
              Key milestones in building Sania Clothing.
            </p>
          </div>
          <div className="flex flex-col">
            {timeline.map(({ year, event }, index) => (
              <div key={year} className="flex gap-4">
                <div className="flex flex-col items-center">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground">
                    <CheckCircle2 className="h-4 w-4" />
                  </div>
                  {index < timeline.length - 1 && <div className="w-px flex-1 bg-border" />}
                </div>
                <div className="pb-8 pt-1">
                  <p className="text-sm font-bold text-primary">{year}</p>
                  <p className="text-sm text-muted-foreground">{event}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
