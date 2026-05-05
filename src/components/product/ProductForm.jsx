'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent } from '@/components/ui/card';
import { Plus, Trash2, Loader2, Image as ImageIcon } from 'lucide-react';

const EMPTY_FORM = () => ({
  name: '',
  description: '',
  category: '',
  images: [''],
  stock: 0,
  isActive: true,
});

/**
 * @param {{
 *   initialData?: object,
 *   onSubmit: (data: object) => Promise<void>,
 *   submitLabel?: string,
 * }} props
 */
export default function ProductForm({ initialData, onSubmit, submitLabel = 'Save Product' }) {
  const router = useRouter();
  const [form, setForm] = useState(() =>
    initialData
      ? {
          name: initialData.name ?? '',
          description: initialData.description ?? '',
          category: initialData.category ?? '',
          images: initialData.images?.length ? initialData.images : [''],
          stock: initialData.stock ?? 0,
          isActive: initialData.isActive ?? true,
        }
      : EMPTY_FORM()
  );
  const [saving, setSaving] = useState(false);

  function set(k, v) {
    setForm((p) => ({ ...p, [k]: v }));
  }

  function setImage(index, value) {
    setForm((p) => {
      const images = [...p.images];
      images[index] = value;
      return { ...p, images };
    });
  }

  function addImage() {
    setForm((p) => ({ ...p, images: [...p.images, ''] }));
  }

  function removeImage(index) {
    setForm((p) => ({
      ...p,
      images: p.images.filter((_, i) => i !== index),
    }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = {
        ...form,
        images: form.images.map((u) => u.trim()).filter(Boolean),
        stock: Number(form.stock),
      };
      await onSubmit(payload);
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <Card>
        <CardContent className="p-6 space-y-5">
          <div className="space-y-1.5">
            <Label>Product Name *</Label>
            <Input
              value={form.name}
              onChange={(e) => set('name', e.target.value)}
              placeholder="e.g. Winter Jacket"
              required
            />
          </div>

          <div className="space-y-1.5">
            <Label>Description *</Label>
            <Textarea
              value={form.description}
              onChange={(e) => set('description', e.target.value)}
              placeholder="Describe the product…"
              rows={4}
              required
            />
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label>Category</Label>
              <Input
                value={form.category}
                onChange={(e) => set('category', e.target.value)}
                placeholder="e.g. Jackets"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Stock</Label>
              <Input
                type="number"
                min="0"
                value={form.stock}
                onChange={(e) => set('stock', e.target.value)}
              />
            </div>
          </div>

          <div className="rounded-lg border p-3">
            <label className="flex cursor-pointer items-center gap-2 text-sm font-medium">
              <input
                type="checkbox"
                checked={form.isActive}
                onChange={(e) => set('isActive', e.target.checked)}
                className="h-4 w-4 rounded border-input accent-primary"
              />
              Active (visible on public website)
            </label>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">Product Images</p>
              <p className="text-xs text-muted-foreground">Enter image URLs</p>
            </div>
            <Button type="button" variant="outline" size="sm" onClick={addImage}>
              <Plus className="h-4 w-4" /> Add URL
            </Button>
          </div>

          {form.images.map((url, i) => (
            <div key={i} className="flex items-start gap-2">
              <div className="flex-1 space-y-2">
                <div className="flex gap-2">
                  <Input
                    value={url}
                    onChange={(e) => setImage(i, e.target.value)}
                    placeholder="https://example.com/image.jpg"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => removeImage(i)}
                    disabled={form.images.length === 1}
                    className="shrink-0 text-destructive hover:text-destructive"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
                {url && (
                  <div className="flex items-center gap-2 rounded-md border bg-muted/40 p-2">
                    <ImageIcon className="h-4 w-4 shrink-0 text-muted-foreground" />
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={url}
                      alt="preview"
                      className="h-16 w-16 rounded object-cover border"
                      onError={(e) => {
                        e.currentTarget.style.display = 'none';
                      }}
                    />
                  </div>
                )}
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      <div className="flex justify-end gap-3">
        <Button type="button" variant="outline" onClick={() => router.push('/products')}>
          Cancel
        </Button>
        <Button type="submit" disabled={saving}>
          {saving && <Loader2 className="h-4 w-4 animate-spin" />}
          {submitLabel}
        </Button>
      </div>
    </form>
  );
}
