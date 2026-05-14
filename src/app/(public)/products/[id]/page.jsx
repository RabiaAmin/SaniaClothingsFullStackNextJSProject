'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { ChevronLeft } from 'lucide-react';
import { useProduct } from '@/hooks/useProducts';
import { useBusiness } from '@/hooks/useBusiness';
import { Skeleton } from '@/components/ui/skeleton';
import ProductGallery from '@/components/product/ProductGallery';
import ProductDetails from '@/components/product/ProductDetails';

export default function ProductDetailPage() {
  const { id } = useParams();
  const { data: raw, isLoading, error } = useProduct(id);
  const { business } = useBusiness();

  const product = raw?.product;

  if (isLoading) {
    return (
      <div className="container mx-auto max-w-5xl px-4 py-12">
        <Skeleton className="mb-8 h-5 w-32" />
        <div className="grid gap-10 md:grid-cols-2">
          <Skeleton className="aspect-square w-full rounded-xl" />
          <div className="space-y-4">
            <Skeleton className="h-6 w-24 rounded-full" />
            <Skeleton className="h-9 w-3/4" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-2/3" />
            <Skeleton className="mt-4 h-12 w-48 rounded-md" />
          </div>
        </div>
      </div>
    );
  }

  if (error || !product) {
    return (
      <div className="container mx-auto max-w-5xl px-4 py-24 text-center">
        <p className="text-sm text-destructive">Product not found.</p>
        <Link
          href="/products"
          className="mt-4 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ChevronLeft className="h-4 w-4" />
          Back to Products
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <div className="container mx-auto max-w-5xl px-4 py-8">
        <Link
          href="/products"
          className="mb-8 inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          <ChevronLeft className="h-4 w-4" />
          Back to Products
        </Link>

        <div className="grid gap-10 md:grid-cols-2">
          <ProductGallery images={product.images} />
          <ProductDetails product={product} whatsappPhone={business?.phone} />
        </div>
      </div>
    </div>
  );
}
