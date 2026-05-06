'use client';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { MoreHorizontal, Pencil, Trash2, ToggleLeft, ToggleRight, Package } from 'lucide-react';

/**
 * @param {{
 *   products: object[],
 *   onEdit: (product: object) => void,
 *   onDelete: (id: string) => void,
 *   onToggleActive: (product: object) => void,
 * }} props
 */
export default function ProductTable({ products, onEdit, onDelete, onToggleActive }) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Image</TableHead>
          <TableHead>Name</TableHead>
          <TableHead>Category</TableHead>
          <TableHead>Stock</TableHead>
          <TableHead>Status</TableHead>
          <TableHead className="text-right">Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {products.map((p) => (
          <TableRow key={p._id}>
            <TableCell>
              {p.images?.[0]?.url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={p.images[0].url}
                  alt={p.name}
                  className="h-10 w-10 rounded-md object-cover border"
                  onError={(e) => {
                    e.currentTarget.replaceWith(
                      Object.assign(document.createElement('div'), {
                        className:
                          'h-10 w-10 rounded-md border bg-muted flex items-center justify-center',
                        innerHTML: `<svg class="h-4 w-4 text-muted-foreground" ...></svg>`,
                      })
                    );
                  }}
                />
              ) : (
                <div className="flex h-10 w-10 items-center justify-center rounded-md border bg-muted">
                  <Package className="h-4 w-4 text-muted-foreground" />
                </div>
              )}
            </TableCell>
            <TableCell className="font-medium">{p.name}</TableCell>
            <TableCell className="text-muted-foreground">{p.category || '—'}</TableCell>
            <TableCell>{p.stock ?? 0}</TableCell>
            <TableCell>
              {p.isActive ? (
                <Badge variant="secondary" className="text-xs bg-green-100 text-green-700">
                  Active
                </Badge>
              ) : (
                <Badge variant="outline" className="text-xs text-muted-foreground">
                  Inactive
                </Badge>
              )}
            </TableCell>
            <TableCell className="text-right">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-8 w-8">
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => onEdit(p)}>
                    <Pencil className="h-4 w-4" /> Edit
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => onToggleActive(p)}>
                    {p.isActive ? (
                      <>
                        <ToggleLeft className="h-4 w-4" /> Set Inactive
                      </>
                    ) : (
                      <>
                        <ToggleRight className="h-4 w-4" /> Set Active
                      </>
                    )}
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    className="text-destructive focus:text-destructive"
                    onClick={() => onDelete(p._id)}
                  >
                    <Trash2 className="h-4 w-4" /> Delete
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
