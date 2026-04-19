'use client';

import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Search, X } from 'lucide-react';

export default function InvoiceFilters({ filters, onChange, clients = [] }) {
  function set(k, v) {
    onChange({ ...filters, [k]: v });
  }

  function clear() {
    onChange({ startDate: '', endDate: '', toClient: '', poNumber: '' });
  }

  const hasActiveFilters =
    filters.startDate || filters.endDate || filters.toClient || filters.poNumber;

  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex flex-wrap items-end gap-3">
          <div className="space-y-1.5 min-w-[140px]">
            <Label className="text-xs">Start Date</Label>
            <Input
              type="date"
              value={filters.startDate ?? ''}
              onChange={(e) => set('startDate', e.target.value)}
              className="h-8 text-sm"
            />
          </div>

          <div className="space-y-1.5 min-w-[140px]">
            <Label className="text-xs">End Date</Label>
            <Input
              type="date"
              value={filters.endDate ?? ''}
              onChange={(e) => set('endDate', e.target.value)}
              className="h-8 text-sm"
            />
          </div>

          {clients.length > 0 && (
            <div className="space-y-1.5 min-w-[180px]">
              <Label className="text-xs">Client</Label>
              <Select
                value={filters.toClient ?? ''}
                onValueChange={(v) => set('toClient', v === '__all__' ? '' : v)}
              >
                <SelectTrigger className="h-8 text-sm">
                  <SelectValue placeholder="All clients" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__all__">All clients</SelectItem>
                  {clients.map((c) => (
                    <SelectItem key={c._id} value={c._id}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="space-y-1.5 min-w-[160px]">
            <Label className="text-xs">PO Number</Label>
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={filters.poNumber ?? ''}
                onChange={(e) => set('poNumber', e.target.value)}
                placeholder="Search PO…"
                className="h-8 pl-8 text-sm"
              />
            </div>
          </div>

          {hasActiveFilters && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={clear}
              className="h-8 gap-1 text-muted-foreground"
            >
              <X className="h-3.5 w-3.5" /> Clear
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
