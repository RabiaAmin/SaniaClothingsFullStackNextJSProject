'use client';

import { useRouter } from 'next/navigation';
import { useCreateProduct } from '@/hooks/useProducts';
import { toast } from '@/hooks/useToast';

import PageHeader from '@/components/admin/PageHeader';
import ProductForm from '@/components/product/ProductForm';

export default function CreateProductPage() {
  const router = useRouter();
  const createMutation = useCreateProduct();

  async function handleSubmit(payload) {
    try {
      await createMutation.mutateAsync(payload);
      toast({ title: 'Product created' });
      router.push('/products');
    } catch (err) {
      toast({
        title: err?.response?.data?.message ?? err.message ?? 'Create failed',
        variant: 'destructive',
      });
      throw err;
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Add Product" description="Create a new product for your catalogue" />
      <ProductForm onSubmit={handleSubmit} submitLabel="Create Product" />
    </div>
  );
}
