'use client';

import { ReactNode } from 'react';
import PageTransition from './PageTransition';

interface DashboardContentProps {
  children: ReactNode;
}

export default function DashboardContent({ children }: DashboardContentProps) {
  return (
    <PageTransition>
      {children}
    </PageTransition>
  );
}
