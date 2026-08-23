'use client';

import { useMemo, useState } from 'react';
import { Banknote, Eye } from 'lucide-react';
import EmptyState from '@/components/admin/EmptyState';
import PageHeader from '@/components/admin/PageHeader';
import TableSkeleton from '@/components/admin/TableSkeleton';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useAuth } from '@/hooks/useAuth';
import { useMonthlyPayroll } from '@/hooks/usePayroll';
import { formatCurrency, formatDate } from '@/lib/utils/formatters';

function currentMonthValue() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

function SummaryCard({ label, value, description }) {
  return (
    <Card>
      <CardContent className="p-4">
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
        <p className="mt-1 text-2xl font-semibold tabular-nums">{value}</p>
        <p className="mt-1 text-xs text-muted-foreground">{description}</p>
      </CardContent>
    </Card>
  );
}

export default function PayrollPage() {
  const { hasPermission } = useAuth();
  const canReadAll = hasPermission('payroll.read_all');
  const [selectedMonth, setSelectedMonth] = useState(currentMonthValue);
  const [selectedWorker, setSelectedWorker] = useState('all');
  const [year, month] = selectedMonth.split('-').map(Number);
  const baseParams = { year, month };
  const allReport = useMonthlyPayroll(baseParams);
  const workerReport = useMonthlyPayroll(
    { ...baseParams, workerId: selectedWorker },
    { enabled: canReadAll && selectedWorker !== 'all' }
  );
  const activeQuery = selectedWorker === 'all' || !canReadAll ? allReport : workerReport;
  const report = activeQuery.data?.report;
  const summary = report?.summary ?? {};
  const workerOptions = allReport.data?.report?.workers ?? [];
  const auditEntries = useMemo(
    () =>
      (report?.workers ?? []).flatMap((workerReportItem) =>
        workerReportItem.entries.map((entry) => ({
          ...entry,
          worker: workerReportItem.worker,
        }))
      ),
    [report?.workers]
  );
  const periodLabel = new Intl.DateTimeFormat('en-US', {
    month: 'long',
    year: 'numeric',
  }).format(new Date(year, month - 1, 1));

  function changeMonth(value) {
    setSelectedMonth(value);
    setSelectedWorker('all');
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={canReadAll ? 'Monthly Payroll' : 'My Earnings'}
        description={
          canReadAll
            ? 'Calculated from approved worker production entries'
            : 'Your approved production and earnings by month'
        }
      />

      <Card>
        <CardContent className="grid gap-4 p-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="payrollMonth">Month</Label>
            <Input
              id="payrollMonth"
              type="month"
              value={selectedMonth}
              onChange={(event) => changeMonth(event.target.value)}
            />
          </div>
          {canReadAll && (
            <div className="space-y-2">
              <Label htmlFor="payrollWorker">Worker</Label>
              <Select value={selectedWorker} onValueChange={setSelectedWorker}>
                <SelectTrigger id="payrollWorker">
                  <SelectValue placeholder="All workers" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All workers</SelectItem>
                  {workerOptions.map((workerSummary) => (
                    <SelectItem key={workerSummary.worker._id} value={workerSummary.worker._id}>
                      {workerSummary.worker.username ?? workerSummary.worker.email}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="grid gap-4 sm:grid-cols-3">
        {canReadAll && selectedWorker === 'all' && (
          <SummaryCard
            label="Workers"
            value={summary.workerCount ?? 0}
            description={`With approved production in ${periodLabel}`}
          />
        )}
        <SummaryCard
          label="Approved pieces"
          value={summary.totalApprovedPieces ?? 0}
          description="Pending and rejected entries excluded"
        />
        <SummaryCard
          label="Total earnings"
          value={formatCurrency(summary.totalEarnings ?? 0)}
          description={`${summary.entryCount ?? 0} approved entries`}
        />
      </div>

      {canReadAll && selectedWorker === 'all' && workerOptions.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Worker Summary</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Worker</TableHead>
                  <TableHead className="text-right">Approved Pieces</TableHead>
                  <TableHead className="text-right">Entries</TableHead>
                  <TableHead className="text-right">Earnings</TableHead>
                  <TableHead className="text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {workerOptions.map((workerSummary) => (
                  <TableRow key={workerSummary.worker._id}>
                    <TableCell>
                      <p className="font-medium">{workerSummary.worker.username}</p>
                      <p className="text-xs text-muted-foreground">{workerSummary.worker.email}</p>
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {workerSummary.totalApprovedPieces}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {workerSummary.entryCount}
                    </TableCell>
                    <TableCell className="text-right font-medium tabular-nums">
                      {formatCurrency(workerSummary.totalEarnings)}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setSelectedWorker(workerSummary.worker._id)}
                      >
                        <Eye className="h-4 w-4" /> View Entries
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Approved Entry Audit</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {activeQuery.isLoading ? (
            <div className="p-6">
              <TableSkeleton rows={6} cols={7} />
            </div>
          ) : activeQuery.error ? (
            <p className="p-6 text-sm text-destructive">{activeQuery.error.message}</p>
          ) : auditEntries.length === 0 ? (
            <EmptyState
              icon={Banknote}
              title="No approved earnings for this month"
              description="Pending and rejected production entries are not included."
              className="m-6"
            />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  {canReadAll && <TableHead>Worker</TableHead>}
                  <TableHead>PO Number</TableHead>
                  <TableHead>Product / Description</TableHead>
                  <TableHead className="text-right">Quantity</TableHead>
                  <TableHead className="text-right">Rate</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {auditEntries.map((entry) => (
                  <TableRow key={entry.productionEntryId}>
                    <TableCell>{formatDate(entry.date)}</TableCell>
                    {canReadAll && (
                      <TableCell>{entry.worker.username ?? entry.worker.email}</TableCell>
                    )}
                    <TableCell className="font-mono font-semibold">{entry.poNumber}</TableCell>
                    <TableCell>
                      <p className="font-medium">{entry.product?.name ?? 'Custom production'}</p>
                      <p className="max-w-64 truncate text-xs text-muted-foreground">
                        {entry.productionDescription}
                      </p>
                    </TableCell>
                    <TableCell className="text-right tabular-nums">{entry.quantity}</TableCell>
                    <TableCell className="text-right tabular-nums">
                      {formatCurrency(entry.unitRate)}
                    </TableCell>
                    <TableCell className="text-right font-medium tabular-nums">
                      {formatCurrency(entry.amount)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
