import { MessageCircle, Package } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

/**
 * @param {{ product: object, whatsappPhone: string }} props
 */
export default function ProductCard({ product, whatsappPhone }) {
  const waText = encodeURIComponent(`I'm interested in ${product.name}`);
  const waLink = whatsappPhone
    ? `https://wa.me/${whatsappPhone.replace(/\D/g, '')}?text=${waText}`
    : `https://wa.me/?text=${waText}`;

  return (
    <Card className="group overflow-hidden transition-shadow hover:shadow-md">
      <div className="aspect-square overflow-hidden bg-muted">
        {product.images?.[0] ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={product.images[0]}
            alt={product.name}
            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center">
            <Package className="h-16 w-16 text-muted-foreground/40" />
          </div>
        )}
      </div>
      <CardContent className="p-4 space-y-3">
        {product.category && (
          <span className="inline-block rounded-full border border-primary/30 bg-primary/10 px-2.5 py-0.5 text-xs font-medium text-primary">
            {product.category}
          </span>
        )}
        <div>
          <h3 className="font-semibold leading-tight">{product.name}</h3>
          <p className="mt-1 text-sm text-muted-foreground line-clamp-2">{product.description}</p>
        </div>
        <Button asChild size="sm" className="w-full gap-2 bg-[#25D366] hover:bg-[#1da851] text-white">
          <a href={waLink} target="_blank" rel="noopener noreferrer">
            <MessageCircle className="h-4 w-4" />
            Contact on WhatsApp
          </a>
        </Button>
      </CardContent>
    </Card>
  );
}
