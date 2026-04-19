'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useWeeklyStatements } from '@/hooks/useInvoices';
import { formatCurrency, formatDate } from '@/lib/utils/formatters';

import PageHeader from '@/components/admin/PageHeader';
import TableSkeleton from '@/components/admin/TableSkeleton';
import EmptyState from '@/components/admin/EmptyState';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { ArrowLeft, FileBarChart, Search, ChevronDown, ChevronRight, Eye } from 'lucide-react';

function firstDayOfMonth() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`;
}

function today() {
  return new Date().toISOString().split('T')[0];
}

function ClientStatementRow({ statement, startDate, endDate }) {
  const [expanded, setExpanded] = useState(false);

  const viewHref = `/invoices/statements/view?client=${encodeURIComponent(statement._id)}&startDate=${startDate}&endDate=${endDate}`;

  return (
    <>
      <TableRow className="cursor-pointer hover:bg-muted/50" onClick={() => setExpanded((v) => !v)}>
        <TableCell className="w-8">
          {expanded ? (
            <ChevronDown className="h-4 w-4 text-muted-foreground" />
          ) : (
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
          )}
        </TableCell>
        <TableCell className="font-semibold">{statement._id}</TableCell>
        <TableCell className="text-center tabular-nums">{statement.totalInvoices}</TableCell>
        <TableCell className="text-right font-semibold tabular-nums">
          {formatCurrency(statement.totalAmount ?? 0)}
        </TableCell>
        <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
          <Button asChild variant="outline" size="sm">
            <Link href={viewHref}>
              <Eye className="h-3.5 w-3.5" /> View
            </Link>
          </Button>
        </TableCell>
      </TableRow>

      {expanded &&
        (statement.invoices ?? []).map((inv) => (
          <TableRow key={inv._id} className="bg-muted/20">
            <TableCell />
            <TableCell className="pl-6 font-mono text-xs text-muted-foreground">
              {inv.invoiceNumber ?? `#${inv._id?.slice(-6)}`}
            </TableCell>
            <TableCell className="text-center text-sm text-muted-foreground">
              {inv.date ? formatDate(inv.date) : '—'}
            </TableCell>
            <TableCell className="text-right tabular-nums">
              {formatCurrency(inv.totalAmount ?? 0)}
            </TableCell>
            <TableCell />
          </TableRow>
        ))}
    </>
  );
}

export default function StatementsPage() {
  const [startDate, setStartDate] = useState(firstDayOfMonth());
  const [endDate, setEndDate] = useState(today());
  const [applied, setApplied] = useState({ startDate: firstDayOfMonth(), endDate: today() });

  const { data, isLoading, error } = useWeeklyStatements(applied);
  const statements = data?.statements ?? [];

  const grandTotal = statements.reduce((s, st) => s + (st.totalAmount ?? 0), 0);

  function apply() {
    if (!startDate || !endDate) return;
    setApplied({ startDate, endDate });
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Invoice Statements"
        description="Grouped by client — shows Sent invoices only"
        action={
          <Button asChild variant="outline" size="sm">
            <Link href="/invoices">
              <ArrowLeft className="h-4 w-4" /> Back
            </Link>
          </Button>
        }
      />

      {/* Date range picker */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-wrap items-end gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Start Date *</Label>
              <Input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="h-8 text-sm"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">End Date *</Label>
              <Input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="h-8 text-sm"
              />
            </div>
            <Button size="sm" onClick={apply} disabled={!startDate || !endDate}>
              <Search className="h-3.5 w-3.5" /> Generate
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        {isLoading ? (
          <CardContent className="p-6">
            <TableSkeleton rows={4} cols={5} />
          </CardContent>
        ) : error ? (
          <CardContent className="p-6 text-sm text-destructive">
            {error?.message ?? 'Failed to load statements'}
          </CardContent>
        ) : statements.length === 0 ? (
          <CardContent className="p-0">
            <EmptyState
              icon={FileBarChart}
              title="No statements found"
              description="Select a date range and click Generate to load statements."
              className="m-6"
            />
          </CardContent>
        ) : (
          <>
            <CardHeader>
              <CardTitle className="text-base">
                Statements — {formatDate(applied.startDate)} to {formatDate(applied.endDate)}
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-8" />
                    <TableHead>Client</TableHead>
                    <TableHead className="text-center">Invoices</TableHead>
                    <TableHead className="text-right">Total Amount</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {statements.map((st) => (
                    <ClientStatementRow
                      key={st._id}
                      statement={st}
                      startDate={applied.startDate}
                      endDate={applied.endDate}
                    />
                  ))}
                </TableBody>
              </Table>
              <div className="flex justify-end border-t px-6 py-4">
                <div className="text-sm font-bold">Grand Total: {formatCurrency(grandTotal)}</div>
              </div>
            </CardContent>
          </>
        )}
      </Card>
    </div>
  );
}
