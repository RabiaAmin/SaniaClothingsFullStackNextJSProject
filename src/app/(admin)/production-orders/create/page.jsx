'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import PageHeader from '@/components/admin/PageHeader';
import ProductionOrderForm from '@/components/production/ProductionOrderForm';
import { Button } from '@/components/ui/button';
import { useClients } from '@/hooks/useClients';
import { useProducts } from '@/hooks/useProducts';
import { useAuth } from '@/hooks/useAuth';
import { useAssignableWorkers, useCreateProductionOrder } from '@/hooks/useProductionOrders';
import { toast } from '@/hooks/useToast';

export default function CreateProductionOrderPage() {
  const router = useRouter();
  const { hasPermission } = useAuth();
  const canAssignWorkers = hasPermission('production_order.assign');
  const { data: clientData, isLoading: clientsLoading } = useClients();
  const { data: productData, isLoading: productsLoading } = useProducts({});
  const { data: workerData, isLoading: workersLoading } = useAssignableWorkers({
    enabled: canAssignWorkers,
  });
  const createOrder = useCreateProductionOrder();

  async function handleSubmit(payload) {
    try {
      const result = await createOrder.mutateAsync(payload);
      toast({ title: 'Production order created' });
      router.push(`/production-orders/${result.productionOrder._id}`);
    } catch (error) {
      toast({
        title: error.message ?? 'Could not create production order',
        variant: 'destructive',
      });
    }
  }

  const loading = clientsLoading || productsLoading || (canAssignWorkers && workersLoading);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Create Production Order"
        description="Record a customer or supplier PO for manufacturing"
        action={
          <Button asChild variant="outline" size="sm">
            <Link href="/production-orders">
              <ArrowLeft className="h-4 w-4" /> Back
            </Link>
          </Button>
        }
      />
      {loading ? (
        <div className="space-y-4">
          {[1, 2, 3, 4].map((item) => (
            <div key={item} className="h-14 animate-pulse rounded-lg bg-muted" />
          ))}
        </div>
      ) : (
        <ProductionOrderForm
          clients={clientData?.clients ?? []}
          products={productData?.products ?? []}
          workers={workerData?.workers ?? []}
          canAssignWorkers={canAssignWorkers}
          onSubmit={handleSubmit}
          onCancel={() => router.push('/production-orders')}
          submitting={createOrder.isPending}
          submitLabel="Create Production Order"
        />
      )}
    </div>
  );
}
