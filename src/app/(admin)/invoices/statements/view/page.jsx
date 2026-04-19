'use client';

import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useWeeklyStatements, useMarkAsPaid } from '@/hooks/useInvoices';
import { useClients } from '@/hooks/useClients';
import { useFetch } from '@/hooks/useFetch';
import businessApi from '@/lib/api/business.api';
import { toast } from '@/hooks/useToast';
import { formatCurrency, formatDate } from '@/lib/utils/formatters';

import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { ArrowLeft, Printer, CheckCheck, Loader2, AlertCircle } from 'lucide-react';

const PRINT_STYLES = `
  @media print {
    body * { visibility: hidden !important; }
    #statement-print, #statement-print * { visibility: visible !important; }
    #statement-print {
      position: fixed !important;
      inset: 0 !important;
      width: 100% !important;
      max-width: none !important;
      margin: 0 !important;
      padding: 32px !important;
      background: white !important;
      border: none !important;
    }
  }
`;

function StatementView() {
  const searchParams = useSearchParams();
  const clientName = searchParams.get('client') ?? '';
  const startDate = searchParams.get('startDate') ?? '';
  const endDate = searchParams.get('endDate') ?? '';

  const { data: statementsData, isLoading: stLoading, error: stError } = useWeeklyStatements(
    startDate && endDate ? { startDate, endDate } : { startDate: '1970-01-01', endDate: '1970-01-01' }
  );
  const { data: bizRaw, isLoading: bizLoading } = useFetch(() => businessApi.getBusiness());
  const { data: clientsData } = useClients();
  const markAsPaid = useMarkAsPaid();

  const statements = statementsData?.statements ?? [];
  const statement = statements.find((s) => s._id === clientName);
  const business = bizRaw?.business ?? null;
  const clients = clientsData?.clients ?? [];
  const clientInfo = clients.find((c) => c.name === clientName) ?? null;
  const invoices = statement?.invoices ?? [];
  const totalAmount = statement?.totalAmount ?? 0;

  async function handleMarkAllPaid() {
    const ids = invoices.map((inv) => inv._id).filter(Boolean);
    if (!ids.length) return;
    try {
      await markAsPaid.mutateAsync(ids);
      toast({ title: `${ids.length} invoice(s) marked as Paid` });
    } catch (err) {
      toast({
        title: err?.response?.data?.message ?? err.message ?? 'Failed to mark as paid',
        variant: 'destructive',
      });
    }
  }

  if (stLoading || bizLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-40" />
        <Skeleton className="h-64" />
      </div>
    );
  }

  if (stError || !statement) {
    return (
      <div className="flex items-center gap-2 rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
        <AlertCircle className="h-4 w-4 shrink-0" />
        {stError?.message ?? `No statement found for "${clientName}"`}
      </div>
    );
  }

  const backHref = `/invoices/statements`;

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: PRINT_STYLES }} />

      {/* Screen-only toolbar */}
      <div className="mb-6 flex items-center gap-2 print:hidden">
        <Button asChild variant="outline" size="sm">
          <Link href={backHref}>
            <ArrowLeft className="h-4 w-4" /> Back
          </Link>
        </Button>
        <Button variant="outline" size="sm" onClick={() => window.print()}>
          <Printer className="h-4 w-4" /> Print
        </Button>
        <Button
          size="sm"
          onClick={handleMarkAllPaid}
          disabled={markAsPaid.isPending || invoices.length === 0}
        >
          {markAsPaid.isPending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <CheckCheck className="h-4 w-4" />
          )}
          Mark All as Paid
        </Button>
      </div>

      {/* ── Statement Document ───────────────────────────────────────────── */}
      <div
        id="statement-print"
        className="mx-auto max-w-4xl border border-gray-300 bg-white p-10 font-sans text-[13px] text-gray-900 shadow-sm"
      >
        {/* Title */}
        <h1 className="mb-6 text-4xl font-extrabold tracking-tight text-gray-900">STATEMENT</h1>

        {/* From / To */}
        <div className="mb-4 grid grid-cols-2 border border-gray-300">
          {/* From */}
          <div className="border-r border-gray-300 p-4 leading-6">
            <p className="mb-1 font-bold">From:</p>
            <p className="font-semibold">{business?.name ?? '—'}</p>
            {business?.vatNumber && <p>VAT No: {business.vatNumber}</p>}
            {business?.ckNumber && <p>CK Number: {business.ckNumber}</p>}
            {business?.address && <p>{business.address}</p>}
            {business?.phone && <p>cell: {business.phone}</p>}
            {business?.telPhone && <p>Tel: {business.telPhone}</p>}
          </div>

          {/* To */}
          <div className="p-4 leading-6">
            <p className="mb-1 font-bold">To:</p>
            <p className="font-semibold">{clientName}</p>
            {clientInfo?.vatNumber && <p>VAT No: {clientInfo.vatNumber}</p>}
            {clientInfo?.registrationNumber && <p>Reg No: {clientInfo.registrationNumber}</p>}
            {clientInfo?.address && <p>{clientInfo.address}</p>}
            {(clientInfo?.telphone || clientInfo?.phone) && (
              <p>tel: {clientInfo.telphone ?? clientInfo.phone}</p>
            )}
            {clientInfo?.fax && <p>Fax: {clientInfo.fax}</p>}
          </div>
        </div>

        {/* Date row */}
        <div className="mb-4 border border-gray-300 px-4 py-2.5 text-[13px]">
          <span className="font-bold">Date:</span>{' '}
          {endDate ? formatDate(endDate) : '—'}
        </div>

        {/* Invoices table */}
        <table className="w-full border-collapse border border-gray-300">
          <thead>
            <tr className="bg-gray-100">
              <th className="border border-gray-300 px-4 py-2.5 text-center font-semibold">
                Invoice Number
              </th>
              <th className="border border-gray-300 px-4 py-2.5 text-center font-semibold">
                PO Number
              </th>
              <th className="border border-gray-300 px-4 py-2.5 text-center font-semibold">
                Code
              </th>
              <th className="border border-gray-300 px-4 py-2.5 text-center font-semibold">
                Amount
              </th>
            </tr>
          </thead>
          <tbody>
            {invoices.map((inv, i) => (
              <tr key={inv._id ?? i} className="border-b border-gray-200">
                <td className="border border-gray-300 px-4 py-3 text-center tabular-nums">
                  {inv.invoiceNumber ?? '—'}
                </td>
                <td className="border border-gray-300 px-4 py-3 text-center">
                  {inv.poNumber ?? '—'}
                </td>
                <td className="border border-gray-300 px-4 py-3 text-center">
                  {inv.items?.[0]?.description ?? inv.category ?? '—'}
                </td>
                <td className="border border-gray-300 px-4 py-3 text-center tabular-nums">
                  {inv.totalAmount ?? 0}
                </td>
              </tr>
            ))}

            {/* Total row */}
            <tr className="bg-gray-50 font-bold">
              <td
                colSpan={3}
                className="border border-gray-300 px-4 py-3 text-right"
              >
                Total Amount
              </td>
              <td className="border border-gray-300 px-4 py-3 text-center tabular-nums">
                {formatCurrency(totalAmount)}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </>
  );
}

export default function StatementViewPage() {
  return (
    <Suspense fallback={<Skeleton className="h-96 w-full" />}>
      <StatementView />
    </Suspense>
  );
}
