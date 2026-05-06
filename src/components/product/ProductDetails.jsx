import { MessageCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function ProductDetails({ product, whatsappPhone }) {
  const waText = encodeURIComponent(`I'm interested in ${product.name}`);
  const waLink = whatsappPhone
    ? `https://wa.me/${whatsappPhone.replace(/\D/g, '')}?text=${waText}`
    : `https://wa.me/?text=${waText}`;

  return (
    <div className="flex flex-col gap-5">
      {product.category && (
        <span className="inline-block w-fit rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-sm font-medium text-primary">
          {product.category}
        </span>
      )}

      <h1 className="text-3xl font-bold tracking-tight">{product.name}</h1>

      <p className="leading-relaxed text-muted-foreground">{product.description}</p>

      <div className="pt-2">
        <Button
          asChild
          size="lg"
          className="w-full gap-2 bg-[#25D366] hover:bg-[#1da851] text-white sm:w-auto"
        >
          <a href={waLink} target="_blank" rel="noopener noreferrer">
            <MessageCircle className="h-5 w-5" />
            Enquire on WhatsApp
          </a>
        </Button>
      </div>
    </div>
  );
}
