import React, { Suspense } from 'react';

import AppLayout from '@/components/AppLayout';
import ScanResultsContent from './components/ScanResultsContent';
import ScanResultsSkeleton from './components/ScanResultsSkeleton';

export default function ScanResultsPage() {
  return (
    <AppLayout>
      <Suspense fallback={<ScanResultsSkeleton />}>
        <ScanResultsContent />
      </Suspense>
    </AppLayout>
  );
}