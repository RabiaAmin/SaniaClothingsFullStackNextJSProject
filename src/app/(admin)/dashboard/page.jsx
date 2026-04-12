import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { FileText, Users, DollarSign, TrendingUp } from 'lucide-react';

export const metadata = { title: 'Dashboard' };

const stats = [
  { label: 'Total Invoices', value: '—', icon: FileText, change: '+0%' },
  { label: 'Active Clients', value: '—', icon: Users, change: '+0%' },
  { label: 'Revenue (MTD)', value: '—', icon: DollarSign, change: '+0%' },
  { label: 'Paid Rate', value: '—', icon: TrendingUp, change: '+0%' },
];

export default function DashboardPage() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground">Your business at a glance</p>
      </div>

      {/* KPI cards — populate via invoice/client API calls */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map(({ label, value, icon: Icon, change }) => (
          <Card key={label}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">{label}</CardTitle>
              <Icon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{value}</div>
              <p className="mt-1 text-xs text-muted-foreground">{change} from last month</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Future: recent invoices table, revenue chart, etc. */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Invoices</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Connect to <code className="font-mono text-xs">invoiceApi.getInvoices()</code> to
            populate this table.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
