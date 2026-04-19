'use client';

import { useRouter } from 'next/navigation';
import { useClients } from '@/hooks/useClients';
import { useCreateInvoice } from '@/hooks/useInvoices';
import { toast } from '@/hooks/useToast';

import PageHeader from '@/components/admin/PageHeader';
import InvoiceForm from '@/components/invoice/InvoiceForm';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';

export default function CreateInvoicePage() {
  const router = useRouter();
  const { data: clientsData, isLoading: loadingClients } = useClients();
  const createMutation = useCreateInvoice();

  const clients = clientsData?.clients ?? [];

  async function handleSubmit(payload) {
    try {
      await createMutation.mutateAsync(payload);
      toast({ title: 'Invoice created successfully' });
      router.push('/invoices');
    } catch (err) {
      toast({
        title: err?.response?.data?.message ?? err.message ?? 'Failed to create invoice',
        variant: 'destructive',
      });
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Create Invoice"
        description="Fill in the details to generate a new invoice"
        action={
          <Button asChild variant="outline" size="sm">
            <Link href="/invoices">
              <ArrowLeft className="h-4 w-4" /> Back
            </Link>
          </Button>
        }
      />

      {loadingClients ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-12 animate-pulse rounded-lg bg-muted" />
          ))}
        </div>
      ) : (
        <InvoiceForm
          clients={clients}
          onSubmit={handleSubmit}
          submitting={createMutation.isPending}
          submitLabel="Create Invoice"
          onCancel={() => router.push('/invoices')}
        />
      )}
    </div>
  );
}
