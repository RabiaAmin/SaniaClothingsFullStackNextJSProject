'use client';

import { useParams, useRouter } from 'next/navigation';
import { useProduct, useUpdateProduct } from '@/hooks/useProducts';
import { toast } from '@/hooks/useToast';

import PageHeader from '@/components/admin/PageHeader';
import ProductForm from '@/components/product/ProductForm';
import TableSkeleton from '@/components/admin/TableSkeleton';

export default function EditProductPage() {
  const { id } = useParams();
  const router = useRouter();
  const { data: raw, isLoading, error } = useProduct(id);
  const updateMutation = useUpdateProduct();

  const product = raw?.product ?? null;

  async function handleSubmit(payload) {
    try {
      await updateMutation.mutateAsync({ id, payload });
      toast({ title: 'Product updated' });
      router.push('/admin/products');
    } catch (err) {
      toast({
        title: err?.response?.data?.message ?? err.message ?? 'Update failed',
        variant: 'destructive',
      });
      throw err;
    }
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        <PageHeader title="Edit Product" />
        <div className="rounded-xl border p-6">
          <TableSkeleton rows={4} cols={2} />
        </div>
      </div>
    );
  }

  if (error || !product) {
    return (
      <div className="space-y-6">
        <PageHeader title="Edit Product" />
        <p className="text-sm text-destructive">{error?.message ?? 'Product not found.'}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Edit Product" description={product.name} />
      <ProductForm initialData={product} onSubmit={handleSubmit} submitLabel="Update Product" />
    </div>
  );
}
