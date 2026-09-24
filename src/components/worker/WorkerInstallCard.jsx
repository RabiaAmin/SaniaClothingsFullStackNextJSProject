'use client';

import { useState } from 'react';
import { Download, Share2, Smartphone } from 'lucide-react';
import { usePwaInstall } from '@/components/common/PwaRegistrar';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

export default function WorkerInstallCard() {
  const [instructionsOpen, setInstructionsOpen] = useState(false);
  const { canInstall, install, isInstalled, isIOSSafari, isPrompting, shouldShowManualInstall } =
    usePwaInstall();

  if (isInstalled || (!canInstall && !shouldShowManualInstall)) return null;

  return (
    <>
      <Card
        data-testid="worker-install-card"
        className="border-primary/20 bg-primary/5 shadow-none"
      >
        <CardContent className="flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex min-w-0 items-start gap-3">
            <span className="rounded-xl bg-primary/10 p-2.5 text-primary" aria-hidden="true">
              <Smartphone className="h-5 w-5" />
            </span>
            <div>
              <h2 className="font-semibold">Install Sania Clothing</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Install this app on your phone for easier access.
              </p>
            </div>
          </div>
          <Button
            type="button"
            className="h-12 w-full shrink-0 text-base sm:w-auto"
            disabled={isPrompting}
            onClick={() => {
              if (canInstall) install();
              else setInstructionsOpen(true);
            }}
          >
            <Download className="h-5 w-5" aria-hidden="true" />
            {isPrompting ? 'Opening...' : 'Install App'}
          </Button>
        </CardContent>
      </Card>

      <Dialog open={instructionsOpen} onOpenChange={setInstructionsOpen}>
        <DialogContent className="w-[calc(100%-2rem)] rounded-xl sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Install Sania Clothing</DialogTitle>
            <DialogDescription>
              {isIOSSafari
                ? 'Add the app to your Home Screen in two quick steps.'
                : 'Open this page in Safari first, then follow these steps.'}
            </DialogDescription>
          </DialogHeader>
          <ol className="space-y-4 py-2 text-sm">
            <li className="flex items-center gap-3">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10 font-semibold text-primary">
                1
              </span>
              <span className="flex items-center gap-2">
                Tap the Share button <Share2 className="h-5 w-5 text-primary" aria-hidden="true" />
              </span>
            </li>
            <li className="flex items-center gap-3">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10 font-semibold text-primary">
                2
              </span>
              <span>Choose Add to Home Screen.</span>
            </li>
          </ol>
          <Button
            type="button"
            className="h-12 text-base"
            onClick={() => setInstructionsOpen(false)}
          >
            Got it
          </Button>
        </DialogContent>
      </Dialog>
    </>
  );
}
