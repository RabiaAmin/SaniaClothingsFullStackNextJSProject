'use client';

import { useState } from 'react';
import { Phone, Mail, MapPin, Send, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

const contactInfo = [
  { icon: Phone, label: 'Phone', value: '+92 300 000 0000' },
  { icon: Mail, label: 'Email', value: 'info@saniaclothing.com' },
  { icon: MapPin, label: 'Address', value: 'Lahore, Punjab, Pakistan' },
];

export default function ContactPage() {
  const [form, setForm] = useState({ name: '', email: '', message: '' });
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);

  function handleChange(e) {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);
    await new Promise((r) => setTimeout(r, 800));
    setLoading(false);
    setSubmitted(true);
  }

  return (
    <div className="flex flex-col">
      {/* Page header */}
      <section className="relative overflow-hidden border-b bg-sidebar px-4 py-24 text-center">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 flex items-center justify-center overflow-hidden select-none"
        >
          <span className="whitespace-nowrap text-[15vw] font-black uppercase leading-none tracking-widest text-white/[0.04]">
            CONTACT
          </span>
        </div>
        <div className="relative container mx-auto max-w-2xl">
          <span className="mb-4 inline-block rounded-full border border-primary/30 bg-primary/10 px-4 py-1.5 text-sm font-medium text-primary">
            Contact
          </span>
          <h1 className="mb-4 text-4xl font-bold tracking-tight text-white">Get in Touch</h1>
          <p className="text-lg text-white/50">
            Have a manufacturing enquiry or want to discuss a project? Send us a message and
            we&apos;ll get back to you shortly.
          </p>
        </div>
      </section>

      {/* Contact body */}
      <section className="px-4 py-20">
        <div className="container mx-auto grid max-w-5xl gap-12 md:grid-cols-2">
          {/* Form */}
          <div>
            <h2 className="mb-6 text-2xl font-bold">Send a Message</h2>

            {submitted ? (
              <div className="flex flex-col items-start gap-3 rounded-xl border border-primary/20 bg-primary/5 p-6">
                <CheckCircle2 className="h-6 w-6 text-primary" />
                <p className="font-semibold">Message sent!</p>
                <p className="text-sm text-muted-foreground">
                  Thank you for reaching out. We&apos;ll be in touch with you shortly.
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  className="mt-2"
                  onClick={() => {
                    setForm({ name: '', email: '', message: '' });
                    setSubmitted(false);
                  }}
                >
                  Send another message
                </Button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="flex flex-col gap-5">
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="name">Full Name</Label>
                  <Input
                    id="name"
                    name="name"
                    placeholder="Your name"
                    value={form.name}
                    onChange={handleChange}
                    required
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="email">Email Address</Label>
                  <Input
                    id="email"
                    name="email"
                    type="email"
                    placeholder="you@example.com"
                    value={form.email}
                    onChange={handleChange}
                    required
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="message">Message</Label>
                  <Textarea
                    id="message"
                    name="message"
                    placeholder="Tell us about your project or enquiry…"
                    rows={5}
                    value={form.message}
                    onChange={handleChange}
                    required
                  />
                </div>
                <Button type="submit" disabled={loading} className="w-full sm:w-auto">
                  {loading ? (
                    <span className="flex items-center gap-2">
                      <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                      Sending…
                    </span>
                  ) : (
                    <span className="flex items-center gap-2">
                      <Send className="h-4 w-4" />
                      Send Message
                    </span>
                  )}
                </Button>
              </form>
            )}
          </div>

          {/* Business info */}
          <div className="flex flex-col gap-8">
            <div>
              <h2 className="mb-6 text-2xl font-bold">Business Information</h2>
              <div className="flex flex-col gap-4">
                {contactInfo.map(({ icon: Icon, label, value }) => (
                  <div
                    key={label}
                    className="flex items-start gap-4 rounded-xl border bg-card p-4 shadow-sm"
                  >
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                      <Icon className="h-4 w-4 text-primary" />
                    </div>
                    <div>
                      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                        {label}
                      </p>
                      <p className="mt-0.5 text-sm font-medium">{value}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Map placeholder */}
            <div className="overflow-hidden rounded-xl border bg-muted shadow-sm">
              <div className="flex h-48 flex-col items-center justify-center gap-2 text-muted-foreground">
                <MapPin className="h-8 w-8" />
                <p className="text-sm font-medium">Lahore, Pakistan</p>
                <p className="text-xs">Map integration coming soon</p>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
