'use client';

import Link from 'next/link';
import { Scissors } from 'lucide-react';
import { useBusiness } from '@/hooks/useBusiness';

export default function Footer() {
  const { business } = useBusiness();

  return (
    <footer className="border-t bg-muted/40">
      <div className="container mx-auto px-4 py-10">
        <div className="grid gap-8 sm:grid-cols-3">
          {/* Brand */}
          <div className="flex flex-col gap-3">
            <Link href="/" className="flex items-center gap-2 font-bold text-foreground">
              <Scissors className="h-4 w-4 text-primary" />
              {business?.name ?? 'Sania Clothing'}
            </Link>
            <p className="text-sm text-muted-foreground">
              Garment manufacturing & CMT services. Quality craftsmanship, on-time delivery.
            </p>
          </div>

          {/* Navigation */}
          <div>
            <p className="mb-3 text-sm font-semibold">Company</p>
            <nav className="flex flex-col gap-2 text-sm text-muted-foreground">
              {[
                { href: '/', label: 'Home' },
                { href: '/about', label: 'About' },
                { href: '/services', label: 'Services' },
                { href: '/contact', label: 'Contact' },
              ].map(({ href, label }) => (
                <Link key={href} href={href} className="transition-colors hover:text-foreground">
                  {label}
                </Link>
              ))}
            </nav>
          </div>

          {/* Contact */}
          <div>
            <p className="mb-3 text-sm font-semibold">Contact</p>
            <div className="flex flex-col gap-2 text-sm text-muted-foreground">
              {business?.email && (
                <a href={`mailto:${business.email}`} className="hover:text-foreground transition-colors">
                  {business.email}
                </a>
              )}
              {business?.phone && (
                <a href={`tel:${business.phone}`} className="hover:text-foreground transition-colors">
                  {business.phone}
                </a>
              )}
              {business?.address && <span>{business.address}</span>}
            </div>
          </div>
        </div>

        <div className="mt-8 border-t pt-6 text-center text-sm text-muted-foreground">
          © {new Date().getFullYear()} {business?.name ?? 'Sania Clothing'}. All rights reserved.
        </div>
      </div>
    </footer>
  );
}
