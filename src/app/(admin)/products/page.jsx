'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useProducts, useDeleteProduct, useUpdateProduct } from '@/hooks/useProducts';
import { toast } from '@/hooks/useToast';

import PageHeader from '@/components/admin/PageHeader';
import ConfirmDialog from '@/components/admin/ConfirmDialog';
import EmptyState from '@/components/admin/EmptyState';
import TableSkeleton from '@/components/admin/TableSkeleton';
import ProductTable from '@/components/product/ProductTable';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Plus, Package, Search } from 'lucide-react';

export default function ProductsPage() {
  const router = useRouter();
  const [search, setSearch] = useState('');
  const [deleteTarget, setDeleteTarget] = useState(null);

  const { data: raw, isLoading, error } = useProducts();
  const deleteMutation = useDeleteProduct();
  const updateMutation = useUpdateProduct();

  const products = raw?.products ?? [];
  const displayed = search.trim()
    ? products.filter(
        (p) =>
          p.name?.toLowerCase().includes(search.toLowerCase()) ||
          p.category?.toLowerCase().includes(search.toLowerCase())
      )
    : products;

  async function handleDelete() {
    try {
      await deleteMutation.mutateAsync(deleteTarget);
      toast({ title: 'Product deleted' });
    } catch (err) {
      toast({
        title: err?.response?.data?.message ?? err.message ?? 'Delete failed',
        variant: 'destructive',
      });
    } finally {
      setDeleteTarget(null);
    }
  }

  async function handleToggleActive(product) {
    try {
      await updateMutation.mutateAsync({
        id: product._id,
        payload: { isActive: !product.isActive },
      });
      toast({ title: product.isActive ? 'Product set to inactive' : 'Product set to active' });
    } catch (err) {
      toast({
        title: err?.response?.data?.message ?? err.message ?? 'Update failed',
        variant: 'destructive',
      });
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Product Manager"
        description="Manage your product catalogue"
        action={
          <Button onClick={() => router.push('/products/create')}>
            <Plus className="h-4 w-4" /> Add Product
          </Button>
        }
      />

      <Card>
        <CardContent className="p-4">
          <div className="relative max-w-sm">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              className="pl-9"
              placeholder="Search by name or category…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-6">
              <TableSkeleton rows={5} cols={6} />
            </div>
          ) : error ? (
            <p className="p-6 text-sm text-destructive">{error?.message ?? 'Failed to load'}</p>
          ) : displayed.length === 0 ? (
            <EmptyState
              icon={Package}
              title="No products yet"
              description="Add your first product to start your catalogue."
              action={
                <Button onClick={() => router.push('/products/create')}>
                  <Plus className="h-4 w-4" /> Add Product
                </Button>
              }
              className="m-6"
            />
          ) : (
            <ProductTable
              products={displayed}
              onEdit={(p) => router.push(`/products/${p._id}/edit`)}
              onDelete={(id) => setDeleteTarget(id)}
              onToggleActive={handleToggleActive}
            />
          )}
        </CardContent>
      </Card>

      <ConfirmDialog
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        loading={deleteMutation.isPending}
        title="Delete product?"
        description="This product will be permanently removed from the catalogue."
      />
    </div>
  );
}
