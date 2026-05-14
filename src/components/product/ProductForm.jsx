'use client';

import { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent } from '@/components/ui/card';
import { Loader2, Upload, X, Package } from 'lucide-react';

const EMPTY_FORM = () => ({
  name: '',
  description: '',
  category: '',
  stock: 0,
  isActive: true,
});

export default function ProductForm({ initialData, onSubmit, submitLabel = 'Save Product' }) {
  const router = useRouter();
  const fileInputRef = useRef(null);

  const [form, setForm] = useState(() =>
    initialData
      ? {
          name: initialData.name ?? '',
          description: initialData.description ?? '',
          category: initialData.category ?? '',
          stock: initialData.stock ?? 0,
          isActive: initialData.isActive ?? true,
        }
      : EMPTY_FORM()
  );

  const [existingImages, setExistingImages] = useState(
    () => initialData?.images?.filter((img) => img?.url) ?? []
  );
  const [newFiles, setNewFiles] = useState([]);
  const [saving, setSaving] = useState(false);

  function set(k, v) {
    setForm((p) => ({ ...p, [k]: v }));
  }

  function handleFileChange(e) {
    const files = Array.from(e.target.files);
    setNewFiles((prev) => [...prev, ...files]);
    e.target.value = '';
  }

  function removeNewFile(index) {
    setNewFiles((prev) => prev.filter((_, i) => i !== index));
  }

  function removeExistingImage(index) {
    setExistingImages((prev) => prev.filter((_, i) => i !== index));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setSaving(true);
    try {
      const formData = new FormData();
      formData.append('name', form.name);
      formData.append('description', form.description);
      formData.append('category', form.category);
      formData.append('stock', String(Number(form.stock)));
      formData.append('isActive', String(form.isActive));
      formData.append('existingImages', JSON.stringify(existingImages));
      newFiles.forEach((file) => formData.append('images', file));
      await onSubmit(formData);
    } finally {
      setSaving(false);
    }
  }

  const totalImages = existingImages.length + newFiles.length;

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
              <p className="text-xs text-muted-foreground">
                {totalImages} image{totalImages !== 1 ? 's' : ''}
              </p>
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => fileInputRef.current?.click()}
            >
              <Upload className="h-4 w-4" />
              Upload Images
            </Button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              onChange={handleFileChange}
            />
          </div>

          {existingImages.length > 0 && (
            <div>
              <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Current Images
              </p>
              <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-5">
                {existingImages.map((img, i) => (
                  <div key={img.public_id ?? i} className="group relative aspect-square">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={img.url}
                      alt=""
                      className="h-full w-full rounded-md border object-cover"
                    />
                    <button
                      type="button"
                      onClick={() => removeExistingImage(i)}
                      className="absolute right-1 top-1 flex h-5 w-5 items-center justify-center rounded-full bg-destructive text-white opacity-0 transition-opacity group-hover:opacity-100"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {newFiles.length > 0 && (
            <div>
              <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                New Images
              </p>
              <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-5">
                {newFiles.map((file, i) => (
                  <div key={i} className="group relative aspect-square">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={URL.createObjectURL(file)}
                      alt=""
                      className="h-full w-full rounded-md border object-cover"
                    />
                    <button
                      type="button"
                      onClick={() => removeNewFile(i)}
                      className="absolute right-1 top-1 flex h-5 w-5 items-center justify-center rounded-full bg-destructive text-white opacity-0 transition-opacity group-hover:opacity-100"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {totalImages === 0 && (
            <div className="flex flex-col items-center justify-center rounded-lg border border-dashed py-10 text-center">
              <Package className="mb-2 h-8 w-8 text-muted-foreground/40" />
              <p className="text-sm text-muted-foreground">No images added yet</p>
              <p className="text-xs text-muted-foreground">
                Click &quot;Upload Images&quot; to add photos
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="flex justify-end gap-3">
        <Button type="button" variant="outline" onClick={() => router.push('/admin/products')}>
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
