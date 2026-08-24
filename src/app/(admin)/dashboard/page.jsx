'use client';

import Link from 'next/link';
import {
  Banknote,
  Bell,
  CheckCircle2,
  ClipboardCheck,
  ClipboardList,
  Clock3,
  DollarSign,
  FileText,
  PackageCheck,
  Plus,
  Shirt,
  TrendingUp,
  Users,
  XCircle,
} from 'lucide-react';
import PageHeader from '@/components/admin/PageHeader';
import TableSkeleton from '@/components/admin/TableSkeleton';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useAuth } from '@/hooks/useAuth';
import { useClients } from '@/hooks/useClients';
import { useInvoices } from '@/hooks/useInvoices';
import { useNotifications } from '@/hooks/useNotifications';
import { useMonthlyPayroll } from '@/hooks/usePayroll';
import { useProductionEntries } from '@/hooks/useProductionEntries';
import { useProductionOrders } from '@/hooks/useProductionOrders';
import { notificationTarget, notificationTypeLabel } from '@/lib/notifications';
import { productionEntryStatusLabel, productionEntryStatusVariant } from '@/lib/productionEntries';
import { productionOrderStatusLabel, productionOrderStatusVariant } from '@/lib/productionOrders';
import { formatCurrency, formatDate, formatRelativeTime } from '@/lib/utils/formatters';

function monthParams() {
  const now = new Date();
  return {
    year: now.getFullYear(),
    month: now.getMonth() + 1,
    dateFrom: new Date(now.getFullYear(), now.getMonth(), 1).toISOString(),
    dateTo: new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999).toISOString(),
  };
}

function Stat({ label, value, description, icon: Icon, highlight }) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{label}</CardTitle>
        <span className={`rounded-lg p-2 ${highlight ? 'bg-primary/10' : 'bg-muted'}`}>
          <Icon className={`h-4 w-4 ${highlight ? 'text-primary' : 'text-muted-foreground'}`} />
        </span>
      </CardHeader>
      <CardContent>
        <p className="text-2xl font-bold tabular-nums">{value}</p>
        <p className="mt-1 text-xs text-muted-foreground">{description}</p>
      </CardContent>
    </Card>
  );
}

function SectionHeader({ title, description, href, label = 'View all' }) {
  return (
    <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <h2 className="text-lg font-semibold">{title}</h2>
        <p className="text-sm text-muted-foreground">{description}</p>
      </div>
      {href && (
        <Button asChild variant="ghost" size="sm" className="self-start sm:self-auto">
          <Link href={href}>{label}</Link>
        </Button>
      )}
    </div>
  );
}

function ErrorMessage({ queries }) {
  const error = queries.find((query) => query.error)?.error;
  return error ? (
    <p className="rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
      {error.message}
    </p>
  ) : null;
}

function OrderProgress({ order }) {
  const produced = order.approvedQuantity ?? order.producedQuantity ?? 0;
  const percent = order.orderedQuantity
    ? Math.min(100, Math.round((produced / order.orderedQuantity) * 100))
    : 0;
  return (
    <div className="min-w-36 space-y-1.5">
      <div className="h-2 overflow-hidden rounded-full bg-muted">
        <div className="h-full rounded-full bg-primary" style={{ width: `${percent}%` }} />
      </div>
      <p className="text-xs text-muted-foreground">
        {produced} / {order.orderedQuantity} pieces
      </p>
    </div>
  );
}

function InvoicePanel({ query, clients, canCreate }) {
  const invoices = query.data?.invoices ?? [];
  const stats = query.data?.stats ?? {};
  const clientMap = Object.fromEntries((clients ?? []).map((client) => [client._id, client.name]));
  const paid = stats.totalPaid ?? invoices.filter((item) => item.status === 'Paid').length;
  const pending = stats.totalPending ?? invoices.filter((item) => item.status === 'Pending').length;

  return (
    <section className="space-y-4" data-testid="invoice-dashboard">
      <SectionHeader
        title="Invoice overview"
        description="Current-month billing, payments, clients, and recent invoices"
        href="/invoices"
      />
      <ErrorMessage queries={[query]} />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat
          label="Total invoices"
          value={query.isLoading ? '—' : (stats.totalInvoices ?? query.data?.totalRecords ?? 0)}
          description={`${stats.totalSent ?? 0} sent`}
          icon={FileText}
        />
        <Stat
          label="Invoice value"
          value={query.isLoading ? '—' : formatCurrency(stats.totalRevenue ?? 0)}
          description="Current month"
          icon={DollarSign}
          highlight
        />
        <Stat
          label="Paid invoices"
          value={query.isLoading ? '—' : paid}
          description={`${pending} pending`}
          icon={TrendingUp}
        />
        <Stat
          label="Active clients"
          value={clients?.length ?? 0}
          description="Available to invoice"
          icon={Users}
        />
      </div>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base">Recent invoices</CardTitle>
          {canCreate && (
            <Button asChild size="sm">
              <Link href="/invoices/create">
                <Plus className="h-4 w-4" /> Create invoice
              </Link>
            </Button>
          )}
        </CardHeader>
        <CardContent className="p-0">
          {query.isLoading ? (
            <div className="px-6 pb-6">
              <TableSkeleton rows={5} cols={4} />
            </div>
          ) : invoices.length === 0 ? (
            <p className="px-6 pb-6 text-sm text-muted-foreground">No invoices this month.</p>
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
                {invoices.slice(0, 5).map((invoice) => (
                  <TableRow key={invoice._id}>
                    <TableCell>
                      <Link
                        href={`/invoices/${invoice._id}`}
                        className="font-mono font-semibold hover:text-primary"
                      >
                        {invoice.invoiceNumber}
                      </Link>
                    </TableCell>
                    <TableCell>
                      {invoice.toClient?.name ??
                        clientMap[invoice.toClient] ??
                        'Client unavailable'}
                    </TableCell>
                    <TableCell className="font-medium">
                      {formatCurrency(invoice.totalAmount ?? 0)}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          invoice.status === 'Paid'
                            ? 'success'
                            : invoice.status === 'Pending'
                              ? 'warning'
                              : 'default'
                        }
                      >
                        {invoice.status}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </section>
  );
}

function ProductionPanel({ ordersQuery, pendingQuery, payrollQuery, canReview }) {
  const orders = ordersQuery.data?.productionOrders ?? [];
  const active = orders.filter((order) => !['COMPLETED', 'CANCELLED'].includes(order.status));
  const produced = orders.reduce((sum, order) => sum + (order.approvedQuantity ?? 0), 0);
  const remaining = active.reduce(
    (sum, order) => sum + Math.max(0, order.orderedQuantity - (order.approvedQuantity ?? 0)),
    0
  );
  const pending = pendingQuery.data?.productionEntries ?? [];
  const payroll = payrollQuery.data?.report?.summary;

  return (
    <section className="space-y-4" data-testid="production-dashboard">
      <SectionHeader
        title="Production overview"
        description="Production progress, worker submissions, approvals, and monthly summaries"
        href="/production-orders"
      />
      <ErrorMessage queries={[ordersQuery, pendingQuery, payrollQuery]} />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat
          label="Active orders"
          value={ordersQuery.isLoading ? '—' : active.length}
          description={`${orders.filter((order) => order.status === 'COMPLETED').length} completed`}
          icon={ClipboardList}
        />
        <Stat
          label="Produced pieces"
          value={ordersQuery.isLoading ? '—' : produced}
          description="Approved production"
          icon={PackageCheck}
          highlight
        />
        <Stat
          label="Remaining pieces"
          value={ordersQuery.isLoading ? '—' : remaining}
          description="Across active orders"
          icon={Shirt}
        />
        <Stat
          label="Pending approvals"
          value={pendingQuery.isLoading ? '—' : (pendingQuery.data?.totalRecords ?? 0)}
          description="Worker entries awaiting review"
          icon={Clock3}
        />
      </div>
      {payroll && (
        <div className="grid gap-4 sm:grid-cols-2">
          <Stat
            label="Approved this month"
            value={payroll.totalApprovedPieces ?? 0}
            description={`${payroll.entryCount ?? 0} approved entries`}
            icon={CheckCircle2}
          />
          <Stat
            label="Monthly production earnings"
            value={formatCurrency(payroll.totalEarnings ?? 0)}
            description="Approved entries only"
            icon={Banknote}
          />
        </div>
      )}
      <div className="grid gap-6 xl:grid-cols-5">
        <Card className="xl:col-span-3">
          <CardHeader>
            <CardTitle className="text-base">Production progress</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {ordersQuery.isLoading ? (
              <div className="px-6 pb-6">
                <TableSkeleton rows={5} cols={4} />
              </div>
            ) : active.length === 0 ? (
              <p className="px-6 pb-6 text-sm text-muted-foreground">
                No active production orders.
              </p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>PO</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead>Progress</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {active.slice(0, 5).map((order) => (
                    <TableRow key={order._id}>
                      <TableCell>
                        <Link
                          href={`/production-orders/${order._id}`}
                          className="font-mono font-semibold hover:text-primary"
                        >
                          {order.poNumber}
                        </Link>
                      </TableCell>
                      <TableCell className="max-w-48 truncate">
                        {order.productionDescription}
                      </TableCell>
                      <TableCell>
                        <OrderProgress order={order} />
                      </TableCell>
                      <TableCell>
                        <Badge variant={productionOrderStatusVariant(order.status)}>
                          {productionOrderStatusLabel(order.status)}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
        <Card className="xl:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base">Pending production entries</CardTitle>
            {canReview && (
              <Button asChild variant="ghost" size="sm">
                <Link href="/production-entries">Review</Link>
              </Button>
            )}
          </CardHeader>
          <CardContent className="space-y-3">
            {pendingQuery.isLoading ? (
              <div className="h-32 animate-pulse rounded-lg bg-muted" />
            ) : pending.length === 0 ? (
              <p className="text-sm text-muted-foreground">No entries are waiting for review.</p>
            ) : (
              pending.slice(0, 5).map((entry) => (
                <div
                  key={entry._id}
                  className="flex items-start justify-between gap-3 rounded-lg border p-3"
                >
                  <div>
                    <p className="text-sm font-medium">
                      {entry.worker?.username ?? entry.worker?.email ?? 'Worker'}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {entry.productionOrder?.poNumber} · {formatDate(entry.date)}
                    </p>
                  </div>
                  <Badge variant="warning">{entry.quantity} pieces</Badge>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>
    </section>
  );
}

function WorkerPanel({ entriesQuery, ordersQuery, payrollQuery, notificationsQuery }) {
  const entries = entriesQuery.data?.productionEntries ?? [];
  const stats = entriesQuery.data?.stats ?? {};
  const orders = (ordersQuery.data?.productionOrders ?? []).filter((order) =>
    ['PENDING', 'IN_PROGRESS'].includes(order.status)
  );
  const notifications = notificationsQuery.data?.notifications ?? [];
  const estimated = entries
    .filter((entry) => entry.status === 'PENDING')
    .reduce((sum, entry) => sum + (entry.totalAmount ?? 0), 0);
  const approvedEarnings =
    payrollQuery.data?.report?.summary?.totalEarnings ?? stats.approvedAmount ?? 0;

  return (
    <section className="space-y-4" data-testid="worker-dashboard">
      <SectionHeader
        title="My production"
        description="Your current-month pieces, entry status, earnings, and available work"
        href="/production-entries"
        label="View my entries"
      />
      <ErrorMessage queries={[entriesQuery, ordersQuery, payrollQuery, notificationsQuery]} />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <Stat
          label="Monthly pieces"
          value={entriesQuery.isLoading ? '—' : (stats.submittedQuantity ?? 0)}
          description="All submitted pieces"
          icon={Shirt}
          highlight
        />
        <Stat
          label="Approved pieces"
          value={entriesQuery.isLoading ? '—' : (stats.approvedQuantity ?? 0)}
          description={`${stats.approvedEntries ?? 0} approved entries`}
          icon={CheckCircle2}
        />
        <Stat
          label="Pending entries"
          value={entriesQuery.isLoading ? '—' : (stats.pendingEntries ?? 0)}
          description="Waiting for review"
          icon={Clock3}
        />
        <Stat
          label="Rejected entries"
          value={entriesQuery.isLoading ? '—' : (stats.rejectedEntries ?? 0)}
          description="Not counted"
          icon={XCircle}
        />
        <Stat
          label="Estimated earnings"
          value={entriesQuery.isLoading ? '—' : formatCurrency(estimated)}
          description="Pending; not yet approved"
          icon={DollarSign}
        />
        <Stat
          label="Approved earnings"
          value={payrollQuery.isLoading ? '—' : formatCurrency(approvedEarnings)}
          description="Approved entries only"
          icon={Banknote}
        />
      </div>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base">Recent submitted entries</CardTitle>
          <Button asChild size="sm">
            <Link href="/production-entries">
              <Plus className="h-4 w-4" /> Record production
            </Link>
          </Button>
        </CardHeader>
        <CardContent className="p-0">
          {entriesQuery.isLoading ? (
            <div className="px-6 pb-6">
              <TableSkeleton rows={5} cols={5} />
            </div>
          ) : entries.length === 0 ? (
            <p className="px-6 pb-6 text-sm text-muted-foreground">
              You have not submitted production this month.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>PO</TableHead>
                  <TableHead>Quantity</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {entries.slice(0, 5).map((entry) => (
                  <TableRow key={entry._id}>
                    <TableCell>{formatDate(entry.date)}</TableCell>
                    <TableCell className="font-mono font-semibold">
                      {entry.productionOrder?.poNumber}
                    </TableCell>
                    <TableCell>{entry.quantity}</TableCell>
                    <TableCell>{formatCurrency(entry.totalAmount ?? 0)}</TableCell>
                    <TableCell>
                      <Badge variant={productionEntryStatusVariant(entry.status)}>
                        {productionEntryStatusLabel(entry.status)}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base">Available production orders</CardTitle>
            <Button asChild variant="ghost" size="sm">
              <Link href="/production-orders">View all</Link>
            </Button>
          </CardHeader>
          <CardContent className="space-y-3">
            {ordersQuery.isLoading ? (
              <div className="h-32 animate-pulse rounded-lg bg-muted" />
            ) : orders.length === 0 ? (
              <p className="text-sm text-muted-foreground">No production orders are available.</p>
            ) : (
              orders.slice(0, 4).map((order) => (
                <Link
                  key={order._id}
                  href={`/production-orders/${order._id}`}
                  className="block rounded-lg border p-3 hover:bg-muted/50"
                >
                  <div className="flex justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-mono text-sm font-semibold">{order.poNumber}</p>
                      <p className="truncate text-xs text-muted-foreground">
                        {order.productionDescription}
                      </p>
                    </div>
                    <Badge variant={productionOrderStatusVariant(order.status)}>
                      {productionOrderStatusLabel(order.status)}
                    </Badge>
                  </div>
                  <div className="mt-3">
                    <OrderProgress order={order} />
                  </div>
                </Link>
              ))
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-base">
              <Bell className="h-4 w-4" /> Notifications
            </CardTitle>
            <Button asChild variant="ghost" size="sm">
              <Link href="/notifications">View all</Link>
            </Button>
          </CardHeader>
          <CardContent className="space-y-3">
            {notificationsQuery.isLoading ? (
              <div className="h-32 animate-pulse rounded-lg bg-muted" />
            ) : notifications.length === 0 ? (
              <p className="text-sm text-muted-foreground">No production notifications yet.</p>
            ) : (
              notifications.slice(0, 4).map((notification) => (
                <Link
                  key={notification._id}
                  href={notificationTarget(notification)}
                  className="flex gap-3 rounded-lg border p-3 hover:bg-muted/50"
                >
                  <span
                    className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${notification.isRead ? 'bg-muted-foreground/30' : 'bg-primary'}`}
                  />
                  <span>
                    <span className="block text-xs font-medium text-muted-foreground">
                      {notificationTypeLabel(notification.type)} ·{' '}
                      {formatRelativeTime(notification.createdAt)}
                    </span>
                    <span className="mt-0.5 block text-sm">{notification.message}</span>
                  </span>
                </Link>
              ))
            )}
          </CardContent>
        </Card>
      </div>
    </section>
  );
}

export default function DashboardPage() {
  const { user, hasPermission } = useAuth();
  const period = monthParams();
  const invoiceRead = hasPermission('invoice.read');
  const invoiceCreate = hasPermission('invoice.create');
  const clientRead = hasPermission('client.read');
  const orderRead = hasPermission('production_order.read');
  const orderCreate = hasPermission('production_order.create');
  const entryReadAll = hasPermission('production_entry.read_all');
  const entryReadOwn = hasPermission('production_entry.read_own');
  const entryCreate = hasPermission('production_entry.create');
  const entryRead = entryReadAll || entryReadOwn;
  const review =
    entryReadAll &&
    (hasPermission('production_entry.approve') || hasPermission('production_entry.reject'));
  const payrollRead = hasPermission('payroll.read_all') || hasPermission('payroll.read_own');
  const workerView = entryCreate && !entryReadAll;
  const productionView = orderRead && !workerView;

  const invoices = useInvoices({ limit: 5 }, { enabled: invoiceRead });
  const clients = useClients({ enabled: invoiceRead && clientRead });
  const orders = useProductionOrders({ limit: 100 }, { enabled: orderRead });
  const entries = useProductionEntries(
    { page: 1, limit: 100, dateFrom: period.dateFrom, dateTo: period.dateTo },
    { enabled: entryRead }
  );
  const pending = useProductionEntries(
    { page: 1, limit: 5, status: 'PENDING' },
    { enabled: review }
  );
  const payroll = useMonthlyPayroll(
    { year: period.year, month: period.month },
    { enabled: payrollRead }
  );
  const notifications = useNotifications(
    { page: 1, limit: 4 },
    { enabled: workerView, refetchInterval: 60_000 }
  );

  const description = workerView
    ? 'Your production, earnings, and updates'
    : productionView && !invoiceRead
      ? 'Production operations and review overview'
      : invoiceRead && !productionView
        ? 'Invoice workflow and business billing overview'
        : 'Your authorized business overview';
  const actions = [
    invoiceCreate && { href: '/invoices/create', label: 'New Invoice', icon: FileText },
    orderCreate && {
      href: '/production-orders/create',
      label: 'New Production Order',
      icon: ClipboardList,
    },
    entryCreate && {
      href: '/production-entries',
      label: 'Record Production',
      icon: ClipboardCheck,
    },
  ].filter(Boolean);

  return (
    <div className="space-y-8">
      <PageHeader
        title="Dashboard"
        description={description}
        action={
          actions.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {actions.map(({ href, label, icon: Icon }, index) => (
                <Button key={href} asChild size="sm" variant={index === 0 ? 'default' : 'outline'}>
                  <Link href={href}>
                    <Icon className="h-4 w-4" /> {label}
                  </Link>
                </Button>
              ))}
            </div>
          )
        }
      />
      <div className="flex flex-wrap items-center gap-2 text-sm">
        <span className="text-muted-foreground">Signed in as</span>
        <span className="font-medium">{user?.username ?? user?.email}</span>
        {user?.role?.name && <Badge variant="secondary">{user.role.name}</Badge>}
      </div>
      {invoiceRead && (
        <InvoicePanel query={invoices} clients={clients.data?.clients} canCreate={invoiceCreate} />
      )}
      {productionView && (
        <ProductionPanel
          ordersQuery={orders}
          pendingQuery={pending}
          payrollQuery={payroll}
          canReview={review}
        />
      )}
      {workerView && (
        <WorkerPanel
          entriesQuery={entries}
          ordersQuery={orders}
          payrollQuery={payroll}
          notificationsQuery={notifications}
        />
      )}
      {!invoiceRead && !productionView && !workerView && (
        <Card>
          <CardContent className="py-10 text-center">
            <h2 className="text-lg font-semibold">Welcome, {user?.username ?? 'User'}</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Your role is active. Available tools are shown in the sidebar.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
