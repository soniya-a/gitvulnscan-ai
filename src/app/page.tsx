import React from 'react';
import AppLayout from '@/components/AppLayout';
import ScanHero from './components/ScanHero';
import ScanHistorySection from './components/ScanHistorySection';

export default function HomePage() {
  return (
    <AppLayout>
      <div className="flex flex-col gap-12">
        <ScanHero />
        <ScanHistorySection />
      </div>
    </AppLayout>
  );
}