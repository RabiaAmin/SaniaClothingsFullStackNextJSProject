'use client';

import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useInvoice, useDeleteInvoice } from '@/hooks/useInvoices';
import { toast } from '@/hooks/useToast';
import { formatCurrency, formatDate } from '@/lib/utils/formatters';
import { createPdfFilename, exportElementToPdf, printElement } from '@/lib/utils/pdfExport';

import ConfirmDialog from '@/components/admin/ConfirmDialog';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { ArrowLeft, Pencil, Trash2, Printer, AlertCircle, Download, Loader2 } from 'lucide-react';
import { useCallback, useRef, useState } from 'react';

const PRINT_STYLES = `
  @media print {
    @page { margin: 12mm; }

    html,
    body {
      height: auto !important;
      overflow: visible !important;
      background: white !important;
    }

    body * {
      visibility: hidden !important;
    }

    body > div,
    main,
    main > div {
      display: block !important;
      height: auto !important;
      overflow: visible !important;
    }

    #invoice-print {
      visibility: visible !important;
      position: absolute !important;
      top: 0 !important;
      left: 0 !important;
      width: 100% !important;
      max-width: none !important;
      margin: 0 !important;
      padding: 0 !important;
      background: white !important;
      border: none !important;
      box-shadow: none !important;
    }

    #invoice-print * {
      visibility: visible !important;
    }

    .print\\:hidden {
      display: none !important;
    }
  }
`;

const MIN_ROWS = 12;

export default function ViewInvoicePage() {
  const { id } = useParams();
  const router = useRouter();
  const [showDelete, setShowDelete] = useState(false);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const printRef = useRef(null);

  const { data, isLoading, error } = useInvoice(id);
  const deleteMutation = useDeleteInvoice();

  const invoice = data?.invoice ?? null;
  const bankAccount = data?.bankAccount ?? null;

  async function handleDelete() {
    try {
      await deleteMutation.mutateAsync(id);
      toast({ title: 'Invoice deleted' });
      router.push('/invoices');
    } catch (err) {
      toast({
        title: err?.response?.data?.message ?? err.message ?? 'Delete failed',
        variant: 'destructive',
      });
    } finally {
      setShowDelete(false);
    }
  }

  const handlePrint = useCallback(async () => {
    await printElement(printRef.current);
  }, []);

  const handleDownloadPdf = useCallback(async () => {
    if (!printRef.current || !invoice) return;

    setIsGeneratingPdf(true);
    try {
      await exportElementToPdf(
        printRef.current,
        createPdfFilename('invoice', invoice.invoiceNumber ?? id)
      );
    } catch (err) {
      toast({
        title: err?.message ?? 'PDF download failed',
        variant: 'destructive',
      });
    } finally {
      setIsGeneratingPdf(false);
    }
  }, [id, invoice]);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-40" />
        <Skeleton className="h-64" />
      </div>
    );
  }

  if (error || !invoice) {
    return (
      <div className="flex items-center gap-2 rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
        <AlertCircle className="h-4 w-4 shrink-0" />
        {error?.message ?? 'Invoice not found'}
      </div>
    );
  }

  const biz = invoice.fromBusiness ?? {};
  const client = invoice.toClient ?? {};
  const items = invoice.items ?? [];
  const emptyRows = Math.max(0, MIN_ROWS - items.length);

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: PRINT_STYLES }} />

      {/* Screen-only toolbar */}
      <div className="mb-6 flex items-center gap-2 print:hidden">
        <Button asChild variant="outline" size="sm">
          <Link href="/invoices">
            <ArrowLeft className="h-4 w-4" /> Back
          </Link>
        </Button>
        <Button type="button" variant="outline" size="sm" onClick={handlePrint}>
          <Printer className="h-4 w-4" /> Print
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={handleDownloadPdf}
          disabled={isGeneratingPdf}
        >
          {isGeneratingPdf ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Download className="h-4 w-4" />
          )}
          Download PDF
        </Button>
        <Button asChild size="sm" variant="outline">
          <Link href={`/invoices/${id}/edit`}>
            <Pencil className="h-4 w-4" /> Edit
          </Link>
        </Button>
        <Button size="sm" variant="destructive" onClick={() => setShowDelete(true)}>
          <Trash2 className="h-4 w-4" /> Delete
        </Button>
      </div>

      {/* ── Invoice Document ─────────────────────────────────────────────── */}
      <div
        id="invoice-print"
        ref={printRef}
        className="mx-auto max-w-4xl border border-gray-300 bg-white p-10 font-sans text-[13px] text-gray-900 shadow-sm"
      >
        {/* Header row */}
        <div className="mb-6 flex items-start justify-between">
          <h1 className="text-4xl font-extrabold tracking-tight text-gray-900">TAX INVOICE</h1>

          {/* Invoice meta box */}
          <div className="border border-gray-300 text-[13px]">
            <div className="flex border-b border-gray-300">
              <span className="w-32 border-r border-gray-300 px-3 py-2 font-bold">Invoice No:</span>
              <span className="px-3 py-2">{invoice.invoiceNumber ?? '—'}</span>
            </div>
            <div className="flex border-b border-gray-300">
              <span className="w-32 border-r border-gray-300 px-3 py-2 font-bold">Date:</span>
              <span className="px-3 py-2">{invoice.date ? formatDate(invoice.date) : '—'}</span>
            </div>
            <div className="flex">
              <span className="w-32 border-r border-gray-300 px-3 py-2 font-bold">PO Number:</span>
              <span className="px-3 py-2">{invoice.poNumber ?? '—'}</span>
            </div>
          </div>
        </div>

        {/* From / To */}
        <div className="grid grid-cols-2 border border-gray-300">
          {/* From */}
          <div className="border-r border-gray-300 p-4 leading-6">
            <p className="mb-1 font-bold">From:</p>
            <p className="font-semibold">{biz.name ?? '—'}</p>
            {biz.vatNumber && <p>VAT No: {biz.vatNumber}</p>}
            {biz.address && <p>{biz.address}</p>}
            {biz.phone && <p>Tel: {biz.phone}</p>}
            {biz.email && <p>{biz.email}</p>}
          </div>

          {/* To */}
          <div className="p-4 leading-6">
            <p className="mb-1 font-bold">To:</p>
            <p className="font-semibold">{client.name ?? '—'}</p>
            {client.vatNumber && <p>VAT No: {client.vatNumber}</p>}
            {client.registrationNumber && <p>Reg No: {client.registrationNumber}</p>}
            {client.address && <p>{client.address}</p>}
            {(client.telphone || client.phone) && <p>tel: {client.telphone ?? client.phone}</p>}
            {client.phone && client.telphone && <p>phone: {client.phone}</p>}
            {client.fax && <p>Fax: {client.fax}</p>}
          </div>
        </div>

        {/* Line items table */}
        <table className="w-full border-collapse border border-t-0 border-gray-300">
          <thead>
            <tr className="border-b border-gray-300 bg-gray-50">
              <th className="w-20 border-r border-gray-300 px-3 py-2.5 text-center font-semibold">
                Qty
              </th>
              <th className="border-r border-gray-300 px-3 py-2.5 text-left font-semibold">
                Description
              </th>
              <th className="w-36 border-r border-gray-300 px-3 py-2.5 text-right font-semibold">
                Unit Price
              </th>
              <th className="w-36 px-3 py-2.5 text-right font-semibold">Amount</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item, i) => (
              <tr key={i} className="border-b border-gray-200">
                <td className="border-r border-gray-300 px-3 py-2 text-center">{item.quantity}</td>
                <td className="border-r border-gray-300 px-3 py-2">{item.description}</td>
                <td className="border-r border-gray-300 px-3 py-2 text-right tabular-nums">
                  {formatCurrency(item.unitPrice ?? 0)}
                </td>
                <td className="px-3 py-2 text-right tabular-nums">
                  {formatCurrency(item.amount ?? (item.quantity ?? 0) * (item.unitPrice ?? 0))}
                </td>
              </tr>
            ))}

            {/* Padding rows to match document height */}
            {Array.from({ length: emptyRows }).map((_, i) => (
              <tr key={`pad-${i}`} className="border-b border-gray-200">
                <td className="border-r border-gray-300 px-3 py-2">&nbsp;</td>
                <td className="border-r border-gray-300 px-3 py-2">&nbsp;</td>
                <td className="border-r border-gray-300 px-3 py-2">&nbsp;</td>
                <td className="px-3 py-2">&nbsp;</td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Bank Details + Totals */}
        <div className="grid grid-cols-2 border border-t-0 border-gray-300">
          {/* Bank details */}
          <div className="border-r border-gray-300 p-4 leading-6">
            <p className="mb-1 font-bold">Bank Details:</p>
            {bankAccount ? (
              <>
                <p>
                  <span className="font-semibold">Bank:</span> {bankAccount.bankName}
                </p>
                <p>
                  <span className="font-semibold">Account Name:</span>{' '}
                  {bankAccount.accountHolderName}
                </p>
                <p>
                  <span className="font-semibold">Account Number:</span> {bankAccount.accountNumber}
                </p>
                {bankAccount.branchCode && (
                  <p>
                    <span className="font-semibold">Branch Code:</span> {bankAccount.branchCode}
                  </p>
                )}
              </>
            ) : (
              <p className="text-gray-400 italic">No bank account linked</p>
            )}
          </div>

          {/* Totals */}
          <div className="divide-y divide-gray-300 text-[13px]">
            <div className="flex justify-between px-4 py-2.5">
              <span className="font-semibold text-gray-600">Subtotal</span>
              <span className="tabular-nums">{formatCurrency(invoice.subTotal ?? 0)}</span>
            </div>
            <div className="flex justify-between px-4 py-2.5">
              <span className="font-semibold text-gray-600">Tax</span>
              <span className="tabular-nums">
                {invoice.tax > 0 ? formatCurrency(invoice.tax) : '—'}
              </span>
            </div>
            <div className="flex justify-between bg-gray-50 px-4 py-2.5">
              <span className="font-bold">Total Amount</span>
              <span className="font-bold tabular-nums">
                {formatCurrency(invoice.totalAmount ?? 0)}
              </span>
            </div>
          </div>
        </div>

        {/* Signature footer */}
        <div className="flex gap-20 border border-t-0 border-gray-300 px-4 py-4 text-[13px] text-gray-700">
          <span>
            Signed: <span className="inline-block w-40 border-b border-gray-500" />
          </span>
          <span>
            Date: <span className="inline-block w-36 border-b border-gray-500" />
          </span>
        </div>
      </div>

      <ConfirmDialog
        open={showDelete}
        onClose={() => setShowDelete(false)}
        onConfirm={handleDelete}
        loading={deleteMutation.isPending}
        title="Delete invoice?"
        description="This invoice will be permanently removed. This cannot be undone."
      />
    </>
  );
}
