'use client';

import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { AlertCircle, ArrowLeft } from 'lucide-react';
import PageHeader from '@/components/admin/PageHeader';
import ProductionOrderForm from '@/components/production/ProductionOrderForm';
import { Button } from '@/components/ui/button';
import { useClients } from '@/hooks/useClients';
import { useProducts } from '@/hooks/useProducts';
import { useProductionOrder, useUpdateProductionOrder } from '@/hooks/useProductionOrders';
import { toast } from '@/hooks/useToast';

export default function EditProductionOrderPage() {
  const { id } = useParams();
  const router = useRouter();
  const { data, isLoading: orderLoading, error } = useProductionOrder(id);
  const { data: clientData, isLoading: clientsLoading } = useClients();
  const { data: productData, isLoading: productsLoading } = useProducts({});
  const updateOrder = useUpdateProductionOrder();
  const productionOrder = data?.productionOrder;

  async function handleSubmit(payload) {
    try {
      await updateOrder.mutateAsync({ id, payload });
      toast({ title: 'Production order updated' });
      router.push(`/production-orders/${id}`);
    } catch (requestError) {
      toast({
        title: requestError.message ?? 'Could not update production order',
        variant: 'destructive',
      });
    }
  }

  const loading = orderLoading || clientsLoading || productsLoading;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Edit Production Order"
        description={productionOrder ? `Editing ${productionOrder.poNumber}` : 'Update PO details'}
        action={
          <Button asChild variant="outline" size="sm">
            <Link href={`/production-orders/${id}`}>
              <ArrowLeft className="h-4 w-4" /> Back
            </Link>
          </Button>
        }
      />
      {error ? (
        <div className="flex items-center gap-2 rounded-lg border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">
          <AlertCircle className="h-4 w-4" /> {error.message}
        </div>
      ) : loading ? (
        <div className="space-y-4">
          {[1, 2, 3, 4].map((item) => (
            <div key={item} className="h-14 animate-pulse rounded-lg bg-muted" />
          ))}
        </div>
      ) : productionOrder ? (
        <ProductionOrderForm
          productionOrder={productionOrder}
          clients={clientData?.clients ?? []}
          products={productData?.products ?? []}
          onSubmit={handleSubmit}
          onCancel={() => router.push(`/production-orders/${id}`)}
          submitting={updateOrder.isPending}
          submitLabel="Save Changes"
        />
      ) : null}
    </div>
  );
}
