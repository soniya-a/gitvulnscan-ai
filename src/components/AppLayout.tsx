import React from 'react';
import Topbar from './Topbar';

interface AppLayoutProps {
  children: React.ReactNode;
}

export default function AppLayout({ children }: AppLayoutProps) {
  return (
    <div className="min-h-screen bg-background grid-bg flex flex-col">
      <Topbar />
      <main className="flex-1 w-full max-w-screen-2xl mx-auto px-6 lg:px-8 xl:px-10 2xl:px-16 pt-16 pb-8">
        {children}
      </main>
      <footer className="border-t border-border py-4 px-6">
        <div className="max-w-screen-2xl mx-auto flex items-center justify-between text-xs text-muted-foreground">
          <span>VulnScanAI — Built by Soniya J</span>
          <span>Powered by FastAPI + AI</span>
        </div>
      </footer>
    </div>
  );
}