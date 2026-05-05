'use client';

import { useProducts } from '@/hooks/useProducts';
import { useBusiness } from '@/hooks/useBusiness';
import ProductCard from '@/components/product/ProductCard';
import { Package, Loader2 } from 'lucide-react';

export default function CataloguePage() {
  const { data: raw, isLoading, error } = useProducts({ active: true });
  const { business } = useBusiness();

  const products = raw?.products ?? [];

  return (
    <div className="flex flex-col">
      {/* Page header */}
      <section className="relative overflow-hidden border-b bg-sidebar px-4 py-24 text-center">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 flex items-center justify-center overflow-hidden select-none"
        >
          <span className="whitespace-nowrap text-[14vw] font-black uppercase leading-none tracking-widest text-white/[0.04]">
            CATALOGUE
          </span>
        </div>
        <div className="relative container mx-auto max-w-2xl">
          <span className="mb-4 inline-block rounded-full border border-primary/30 bg-primary/10 px-4 py-1.5 text-sm font-medium text-primary">
            Our Products
          </span>
          <h1 className="mb-4 text-4xl font-bold tracking-tight text-white">Product Catalogue</h1>
          <p className="text-lg text-white/50">
            Browse our range of garments. Contact us via WhatsApp for inquiries and orders.
          </p>
        </div>
      </section>

      {/* Product grid */}
      <section className="px-4 py-16">
        <div className="container mx-auto">
          {isLoading ? (
            <div className="flex items-center justify-center py-24">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : error ? (
            <p className="py-16 text-center text-sm text-destructive">
              Failed to load products. Please try again later.
            </p>
          ) : products.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-xl border border-dashed py-24 text-center">
              <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-muted">
                <Package className="h-7 w-7 text-muted-foreground" />
              </div>
              <h3 className="font-semibold">No products available</h3>
              <p className="mt-1 max-w-xs text-sm text-muted-foreground">
                Check back soon — new products are being added.
              </p>
            </div>
          ) : (
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {products.map((product) => (
                <ProductCard
                  key={product._id}
                  product={product}
                  whatsappPhone={business?.phone}
                />
              ))}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
