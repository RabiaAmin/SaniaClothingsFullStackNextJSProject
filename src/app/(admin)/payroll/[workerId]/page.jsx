'use client';

import { Suspense, useCallback, useRef, useState } from 'react';
import Link from 'next/link';
import { useParams, useSearchParams } from 'next/navigation';
import { AlertCircle, ArrowLeft, Banknote, Download, Loader2, Printer } from 'lucide-react';
import EmptyState from '@/components/admin/EmptyState';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { usePayrollPdfData } from '@/hooks/usePayroll';
import { toast } from '@/hooks/useToast';
import { formatCurrency, formatDate } from '@/lib/utils/formatters';
import { createPdfFilename, exportElementToPdf, printElement } from '@/lib/utils/pdfExport';

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

    #payroll-print {
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

    #payroll-print * {
      visibility: visible !important;
    }

    .print\\:hidden {
      display: none !important;
    }
  }
`;

function validDateRange(startDate, endDate) {
  return /^\d{4}-\d{2}-\d{2}$/.test(startDate) && /^\d{4}-\d{2}-\d{2}$/.test(endDate)
    ? startDate <= endDate
    : false;
}

function formatPeriodDate(value) {
  const parts = new Intl.DateTimeFormat('en-US', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    timeZone: 'UTC',
  })
    .formatToParts(new Date(`${value}T00:00:00.000Z`))
    .reduce((result, part) => ({ ...result, [part.type]: part.value }), {});
  return `${parts.day} ${parts.month} ${parts.year}`;
}

function filenameDate(value) {
  const [year, month, day] = value.split('-');
  return `${day}-${month}-${year}`;
}

function workerName(worker) {
  return worker?.username ?? worker?.email ?? 'Unknown worker';
}

function PayrollView() {
  const { workerId } = useParams();
  const searchParams = useSearchParams();
  const printRef = useRef(null);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const startDate = searchParams.get('startDate') ?? '';
  const endDate = searchParams.get('endDate') ?? '';
  const hasValidFilters = Boolean(workerId) && validDateRange(startDate, endDate);
  const query = usePayrollPdfData({ workerId, startDate, endDate }, { enabled: hasValidFilters });

  const handlePrint = useCallback(async () => {
    await printElement(printRef.current);
  }, []);

  const handleDownloadPdf = useCallback(async () => {
    const selectedWorker = query.data?.selectedWorker ?? query.data?.report?.workers?.[0]?.worker;
    if (!printRef.current || !selectedWorker) return;

    setIsGeneratingPdf(true);
    try {
      await exportElementToPdf(
        printRef.current,
        createPdfFilename(
          'payroll',
          `${workerName(selectedWorker).toLowerCase()}-${filenameDate(startDate)}-to-${filenameDate(
            endDate
          )}`
        )
      );
    } catch (error) {
      toast({
        title: error?.message ?? 'Payroll PDF download failed',
        variant: 'destructive',
      });
    } finally {
      setIsGeneratingPdf(false);
    }
  }, [endDate, query.data, startDate]);

  if (!hasValidFilters) {
    return (
      <div className="flex items-center gap-2 rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
        <AlertCircle className="h-4 w-4 shrink-0" />
        Select a valid worker and payroll date range before opening this report.
      </div>
    );
  }

  if (query.isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-48" />
        <Skeleton className="h-72" />
      </div>
    );
  }

  if (query.error || !query.data?.report || !query.data?.selectedWorker) {
    return (
      <div className="flex items-center gap-2 rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
        <AlertCircle className="h-4 w-4 shrink-0" />
        {query.error?.response?.data?.message ?? query.error?.message ?? 'Worker payroll not found'}
      </div>
    );
  }

  const { business, report, selectedWorker } = query.data;
  const summary = report.summary;
  const entries = report.workers.flatMap((workerReport) => workerReport.entries);
  const rates = [...new Set(entries.map((entry) => Number(entry.unitRate) || 0))];
  const rateLabel = rates.length === 0 ? '—' : rates.map((rate) => formatCurrency(rate)).join(', ');
  const periodLabel = `${formatPeriodDate(startDate)} — ${formatPeriodDate(endDate)}`;

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: PRINT_STYLES }} />

      <div className="mb-6 flex flex-wrap items-center gap-2 print:hidden">
        <Button asChild variant="outline" size="sm">
          <Link href="/payroll">
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
      </div>

      <div
        id="payroll-print"
        ref={printRef}
        data-testid="payroll-view-document"
        className="mx-auto max-w-4xl border border-gray-300 bg-white p-10 font-sans text-[13px] text-gray-900 shadow-sm"
      >
        <div className="mb-6 flex items-start justify-between border-b-2 border-gray-900 pb-5">
          <div>
            <h1 className="text-4xl font-extrabold tracking-tight">PAYROLL REPORT</h1>
            <p className="mt-2 text-lg font-semibold">{business?.name ?? 'Business'}</p>
            {business?.address && <p className="mt-1 text-gray-600">{business.address}</p>}
            {(business?.email || business?.phone || business?.telPhone) && (
              <p className="text-gray-600">
                {[business.email, business.phone, business.telPhone].filter(Boolean).join(' · ')}
              </p>
            )}
          </div>
          <div className="min-w-64 border border-gray-300">
            <div className="flex border-b border-gray-300">
              <span className="w-24 border-r border-gray-300 px-3 py-2 font-bold">Worker:</span>
              <span className="px-3 py-2">{workerName(selectedWorker)}</span>
            </div>
            <div className="flex">
              <span className="w-24 border-r border-gray-300 px-3 py-2 font-bold">Period:</span>
              <span className="px-3 py-2">{periodLabel}</span>
            </div>
          </div>
        </div>


        <h2 className="mb-2 text-lg font-bold">Approved Entry Audit</h2>
        {entries.length === 0 ? (
          <EmptyState
            icon={Banknote}
            title="No approved earnings for this period"
            description="Pending and rejected production entries are not included."
            className="border border-gray-300 py-12"
          />
        ) : (
          <table className="w-full border-collapse border border-gray-300">
            <thead>
              <tr className="bg-gray-100">
                <th className="border border-gray-300 px-3 py-2 text-left">Date</th>
                <th className="border border-gray-300 px-3 py-2 text-left">PO Number</th>
                <th className="border border-gray-300 px-3 py-2 text-right">Pieces</th>
                <th className="border border-gray-300 px-3 py-2 text-right">Rate</th>
                <th className="border border-gray-300 px-3 py-2 text-right">Amount</th>
              </tr>
            </thead>
            <tbody>
              {entries.map((entry) => (
                <tr key={entry.productionEntryId}>
                  <td className="border border-gray-300 px-3 py-2">{formatDate(entry.date)}</td>
                  <td className="border border-gray-300 px-3 py-2 font-mono font-semibold">
                    {entry.poNumber}
                  </td>
               
                  <td className="border border-gray-300 px-3 py-2 text-right tabular-nums">
                    {entry.quantity}
                  </td>
                  <td className="border border-gray-300 px-3 py-2 text-right tabular-nums">
                    {formatCurrency(entry.unitRate)}
                  </td>
                  <td className="border border-gray-300 px-3 py-2 text-right font-medium tabular-nums">
                    {formatCurrency(entry.amount)}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="bg-gray-50 font-bold">
                <td className="border border-gray-300 px-3 py-3 text-right" colSpan={5}>
                  Total Earnings
                </td>
                <td className="border border-gray-300 px-3 py-3 text-right tabular-nums">
                  {formatCurrency(summary.totalEarnings)}
                </td>
              </tr>
            </tfoot>
          </table>
        )}
      </div>
    </>
  );
}

export default function PayrollViewPage() {
  return (
    <Suspense
      fallback={
        <div className="space-y-6">
          <Skeleton className="h-10 w-64" />
          <Skeleton className="h-48" />
          <Skeleton className="h-72" />
        </div>
      }
    >
      <PayrollView />
    </Suspense>
  );
}
