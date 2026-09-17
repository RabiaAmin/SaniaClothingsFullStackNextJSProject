'use client';

import { useParams } from 'next/navigation';
import Link from 'next/link';
import { AlertCircle, ArrowLeft, Download, ExternalLink, FileWarning } from 'lucide-react';
import EmptyState from '@/components/admin/EmptyState';
import PageHeader from '@/components/admin/PageHeader';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { useStatementHistoryItem } from '@/hooks/useInvoices';
import { formatDate } from '@/lib/utils/formatters';

export default function InvoiceStatementHistoryViewPage() {
  const { id } = useParams();
  const { data, isLoading, error } = useStatementHistoryItem(id);
  const statement = data?.statement ?? null;

  if (isLoading) return <Skeleton className="h-[75vh] w-full" />;

  if (error || !statement) {
    return (
      <div className="flex items-center gap-2 rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
        <AlertCircle className="h-4 w-4 shrink-0" />
        {error?.message ?? 'Statement not found'}
      </div>
    );
  }

  const pdfUrl = statement.pdf?.url;

  return (
    <div className="space-y-6">
      <PageHeader
        title={statement.statementNumber}
        description={`Generated ${formatDate(statement.generatedAt)} · ${statement.invoiceCount} invoice${statement.invoiceCount === 1 ? '' : 's'}`}
        action={
          <div className="flex flex-wrap gap-2">
            <Button asChild variant="outline" size="sm">
              <Link href="/invoices/statements/history">
                <ArrowLeft className="h-4 w-4" /> Back
              </Link>
            </Button>
            {pdfUrl && (
              <>
                <Button asChild variant="outline" size="sm">
                  <a href={pdfUrl} target="_blank" rel="noreferrer">
                    <ExternalLink className="h-4 w-4" /> Open / Print
                  </a>
                </Button>
                <Button asChild size="sm">
                  <a href={pdfUrl} download={`${statement.statementNumber}.pdf`}>
                    <Download className="h-4 w-4" /> Download PDF
                  </a>
                </Button>
              </>
            )}
          </div>
        }
      />

      <Card>
        <CardContent className="p-0">
          {pdfUrl ? (
            <iframe
              title={`Saved statement ${statement.statementNumber}`}
              src={pdfUrl}
              className="h-[75vh] min-h-[600px] w-full rounded-lg border-0"
            />
          ) : (
            <EmptyState
              icon={FileWarning}
              title="Saved PDF unavailable"
              description="The statement record exists, but its stored PDF is unavailable."
              className="m-6"
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
