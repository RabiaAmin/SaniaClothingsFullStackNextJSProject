import Link from 'next/link';
import { Scissors, Truck, Factory, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

export const metadata = {
  title: 'Services — Sania Clothing',
  description:
    'Professional garment manufacturing services including cutting, trimming, and custom CMT production.',
};

const services = [
  {
    id: 'cutting',
    icon: Scissors,
    title: 'Cutting',
    tagline: 'Precision fabric cutting for consistent, high-quality output',
    description:
      'Our cutting service delivers precision and consistency across bulk orders. Using modern cutting machinery and skilled operators, we minimise waste while maintaining the exact specifications of your patterns.',
    points: [
      'Single-ply and multi-ply fabric cutting',
      'Straight knife, band knife, and die cutting available',
      'Marker planning for maximum fabric utilisation',
      'Quality checks at every cut stage',
      'Handles all fabric types including woven, knit, and stretch',
      'Bulk order capability with fast turnaround',
    ],
  },
  {
    id: 'trimming',
    icon: Truck,
    title: 'Trimming',
    tagline: 'Finishing and trimming that gives every garment a polished look',
    description:
      'The finishing stage makes or breaks a garment. Our trimming service ensures every piece is completed to the highest standard — clean threads, proper labelling, and a presentation-ready finish.',
    points: [
      'Thread trimming and loose end removal',
      'Label and tag attachment',
      'Button and snap fastener application',
      'Iron pressing and steam finishing',
      'Final quality inspection per garment',
      'Fold, hang, and bag packaging options',
    ],
  },
  {
    id: 'cmt',
    icon: Factory,
    title: 'Custom Manufacturing (CMT)',
    tagline: 'End-to-end Cut, Make, Trim production for your brand',
    description:
      'Our CMT service covers the complete production cycle — from receiving your fabric and patterns to delivering finished, packaged garments ready for retail or wholesale distribution.',
    points: [
      'Full CMT production from fabric to finished product',
      'Pattern grading and size set development',
      'Sample development and approval process',
      'Bulk production planning and scheduling',
      'In-line and end-of-line quality control',
      'Delivery to your specification and timeline',
    ],
  },
];

export default function ServicesPage() {
  return (
    <div className="flex flex-col">
      {/* Page header */}
      <section className="relative overflow-hidden border-b bg-muted/40 px-4 py-20 text-center">
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

        <div className="relative container mx-auto max-w-2xl">
          <span className="mb-4 inline-block rounded-full border border-primary/20 bg-primary/10 px-4 py-1.5 text-sm font-medium text-primary">
            Our Services
          </span>
          <h1 className="mb-4 text-4xl font-bold tracking-tight">
            Garment Manufacturing Services
          </h1>
          <p className="text-lg text-muted-foreground">
            From precision cutting to complete CMT production, we offer a full range of services to
            support garment brands and manufacturers.
          </p>
        </div>
      </section>

      {/* Service sections */}
      <div className="divide-y">
        {services.map(({ id, icon: Icon, title, tagline, description, points }, index) => (
          <section
            key={id}
            id={id}
            className={`px-4 py-20 ${index % 2 === 1 ? 'bg-muted/40' : ''}`}
          >
            <div className="container mx-auto grid gap-12 md:grid-cols-2 md:items-start">
              <div className={index % 2 === 1 ? 'md:order-2' : ''}>
                <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10">
                  <Icon className="h-6 w-6 text-primary" />
                </div>
                <h2 className="mb-2 text-3xl font-bold tracking-tight">{title}</h2>
                <p className="mb-4 text-base font-medium text-primary">{tagline}</p>
                <p className="text-muted-foreground">{description}</p>
              </div>
              <div
                className={`rounded-xl border bg-card p-6 shadow-sm ${index % 2 === 1 ? 'md:order-1' : ''}`}
              >
                <p className="mb-4 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  What&apos;s Included
                </p>
                <ul className="flex flex-col gap-3">
                  {points.map((point) => (
                    <li key={point} className="flex items-start gap-3 text-sm">
                      <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                      <span>{point}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </section>
        ))}
      </div>

      {/* CTA */}
      <section className="border-t bg-primary px-4 py-16 text-primary-foreground">
        <div className="container mx-auto flex flex-col items-center gap-4 text-center">
          <h2 className="text-3xl font-bold tracking-tight">Have a Project in Mind?</h2>
          <p className="max-w-lg text-primary-foreground/80">
            Tell us about your manufacturing requirements and we&apos;ll get back to you with a
            tailored solution.
          </p>
          <Button asChild size="lg" variant="secondary" className="mt-2">
            <Link href="/contact">Contact Us</Link>
          </Button>
        </div>
      </section>
    </div>
  );
}
