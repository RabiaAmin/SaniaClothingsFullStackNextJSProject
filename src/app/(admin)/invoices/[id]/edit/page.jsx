'use client';

import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useInvoice, useUpdateInvoice } from '@/hooks/useInvoices';
import { useClients } from '@/hooks/useClients';
import { toast } from '@/hooks/useToast';

import PageHeader from '@/components/admin/PageHeader';
import InvoiceForm from '@/components/invoice/InvoiceForm';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { ArrowLeft, AlertCircle } from 'lucide-react';

export default function EditInvoicePage() {
  const { id } = useParams();
  const router = useRouter();

  const { data: invoiceData, isLoading: loadingInvoice, error } = useInvoice(id);
  const { data: clientsData, isLoading: loadingClients } = useClients();
  const updateMutation = useUpdateInvoice();

  const invoice = invoiceData?.invoice ?? null;
  const clients = clientsData?.clients ?? [];

  async function handleSubmit(payload) {
    try {
      await updateMutation.mutateAsync({ id, payload });
      toast({ title: 'Invoice updated successfully' });
      router.push(`/invoices/${id}`);
    } catch (err) {
      toast({
        title: err?.response?.data?.message ?? err.message ?? 'Failed to update invoice',
        variant: 'destructive',
      });
    }
  }

  const isLoading = loadingInvoice || loadingClients;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Edit Invoice"
        description={invoice?.invoiceNumber ? `Editing ${invoice.invoiceNumber}` : 'Edit invoice'}
        action={
          <Button asChild variant="outline" size="sm">
            <Link href={`/invoices/${id}`}>
              <ArrowLeft className="h-4 w-4" /> Back
            </Link>
          </Button>
        }
      />

      {error && (
        <div className="flex items-center gap-2 rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          <AlertCircle className="h-4 w-4 shrink-0" />
          {error?.message ?? 'Failed to load invoice'}
        </div>
      )}

      {isLoading ? (
        <div className="space-y-4">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-12 w-full" />
          ))}
        </div>
      ) : invoice ? (
        <InvoiceForm
          defaultValues={invoice}
          clients={clients}
          onSubmit={handleSubmit}
          submitting={updateMutation.isPending}
          submitLabel="Update Invoice"
          onCancel={() => router.push(`/invoices/${id}`)}
        />
      ) : null}
    </div>
  );
}
