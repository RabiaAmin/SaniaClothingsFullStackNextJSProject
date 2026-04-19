'use client';

import { useFetch } from '@/hooks/useFetch';
import invoiceApi from '@/lib/api/invoice.api';
import clientApi from '@/lib/api/client.api';
import { formatCurrency } from '@/lib/utils/formatters';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import StatusBadge from '@/components/admin/StatusBadge';
import TableSkeleton from '@/components/admin/TableSkeleton';
import PageHeader from '@/components/admin/PageHeader';
import { Button } from '@/components/ui/button';
import { FileText, Users, DollarSign, TrendingUp, AlertCircle, Plus } from 'lucide-react';
import Link from 'next/link';

// ── Helpers ───────────────────────────────────────────────────────────────────
function normalizeList(data, key) {
  if (!data) return [];
  if (Array.isArray(data)) return data;
  if (key && Array.isArray(data[key])) return data[key];
  if (Array.isArray(data.data)) return data.data;
  return [];
}

function StatCard({ label, value, icon: Icon, sub, highlight }) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{label}</CardTitle>
        <div
          className={`flex h-9 w-9 items-center justify-center rounded-lg ${highlight ? 'bg-primary/10' : 'bg-muted'}`}
        >
          <Icon className={`h-4 w-4 ${highlight ? 'text-primary' : 'text-muted-foreground'}`} />
        </div>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        {sub && <p className="mt-1 text-xs text-muted-foreground">{sub}</p>}
      </CardContent>
    </Card>
  );
}

function StatusBar({ label, count, total, colorClass }) {
  const pct = total > 0 ? Math.round((count / total) * 100) : 0;
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between text-sm">
        <span className="text-muted-foreground">{label}</span>
        <span className="font-medium">
          {count} <span className="text-muted-foreground">({pct}%)</span>
        </span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-muted">
        <div
          className={`h-2 rounded-full transition-all ${colorClass}`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

// ── Page ─────────────────────────────────────────────────────────────────────
export default function DashboardPage() {
  const {
    data: invoicesRaw,
    isLoading: loadingInv,
    error: errInv,
  } = useFetch(() => invoiceApi.getAllInvoices());
  const { data: clientsRaw, isLoading: loadingCli } = useFetch(() => clientApi.getAllClients());

  const invoices = normalizeList(invoicesRaw, 'invoices');
  const clients = normalizeList(clientsRaw, 'clients');

  // Derive stats — API statuses are "Paid", "Sent", "Pending" (capitalised)
  const paid = invoices.filter((i) => i.status === 'Paid');
  const pending = invoices.filter((i) => i.status === 'Pending');
  const sent = invoices.filter((i) => i.status === 'Sent');

  const totalRevenue = paid.reduce((s, i) => s + (i.totalAmount ?? 0), 0);
  const pendingRevenue = pending.reduce((s, i) => s + (i.totalAmount ?? 0), 0);

  // Recent 5 invoices
  const recent = [...invoices]
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
    .slice(0, 5);

  const clientMap = Object.fromEntries(clients.map((c) => [c._id, c.name]));

  const isLoading = loadingInv || loadingCli;

  return (
    <div className="space-y-8">
      <PageHeader
        title="Dashboard"
        description="Your business overview"
        action={
          <Button asChild size="sm">
            <Link href="/invoices">
              <Plus className="h-4 w-4" /> New Invoice
            </Link>
          </Button>
        }
      />

      {/* Error */}
      {errInv && (
        <div className="flex items-center gap-2 rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          <AlertCircle className="h-4 w-4 shrink-0" />
          {errInv}
        </div>
      )}

      {/* KPI cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Total Invoices"
          value={isLoading ? '—' : invoices.length}
          icon={FileText}
          sub={`${sent.length} sent`}
        />
        <StatCard
          label="Total Revenue"
          value={isLoading ? '—' : formatCurrency(totalRevenue)}
          icon={DollarSign}
          highlight
          sub="From paid invoices"
        />
        <StatCard
          label="Paid Invoices"
          value={isLoading ? '—' : paid.length}
          icon={TrendingUp}
          sub={formatCurrency(totalRevenue)}
        />
        <StatCard
          label="Active Clients"
          value={isLoading ? '—' : clients.length}
          icon={Users}
          sub={`${pending.length} pending invoices`}
        />
      </div>

      {/* Two-column: breakdown + recent */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Status breakdown */}
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle className="text-base">Invoice Breakdown</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {isLoading ? (
              <div className="space-y-3">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="space-y-1.5">
                    <div className="h-4 w-1/2 animate-pulse rounded bg-muted" />
                    <div className="h-2 w-full animate-pulse rounded bg-muted" />
                  </div>
                ))}
              </div>
            ) : (
              <>
                <StatusBar
                  label="Paid"
                  count={paid.length}
                  total={invoices.length}
                  colorClass="bg-green-500"
                />
                <StatusBar
                  label="Sent"
                  count={sent.length}
                  total={invoices.length}
                  colorClass="bg-blue-500"
                />
                <StatusBar
                  label="Pending"
                  count={pending.length}
                  total={invoices.length}
                  colorClass="bg-amber-400"
                />
                <div className="border-t pt-3 text-sm">
                  <div className="flex justify-between text-muted-foreground">
                    <span>Pending revenue</span>
                    <span className="font-medium text-foreground">
                      {formatCurrency(pendingRevenue)}
                    </span>
                  </div>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* Recent Invoices */}
        <Card className="lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base">Recent Invoices</CardTitle>
            <Button asChild variant="ghost" size="sm">
              <Link href="/invoices">View all</Link>
            </Button>
          </CardHeader>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="px-6 pb-6">
                <TableSkeleton rows={5} cols={4} />
              </div>
            ) : recent.length === 0 ? (
              <p className="px-6 pb-6 text-sm text-muted-foreground">No invoices yet.</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Invoice</TableHead>
                    <TableHead>Client</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {recent.map((inv) => (
                    <TableRow key={inv._id}>
                      <TableCell className="font-mono text-xs font-semibold">
                        {inv.invoiceNumber ?? `#${inv._id?.slice(-6)}`}
                      </TableCell>
                      <TableCell className="text-sm">{clientMap[inv.toClient] ?? '—'}</TableCell>
                      <TableCell className="font-medium">
                        {formatCurrency(inv.totalAmount ?? 0)}
                      </TableCell>
                      <TableCell>
                        <StatusBadge status={inv.status} />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
