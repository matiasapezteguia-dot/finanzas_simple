"use client";

import React from 'react';
import { FinanzasProvider } from "../lib/store.tsx";

interface AppProvidersProps {
  children: React.ReactNode;
}

export function AppProviders({ children }: AppProvidersProps) {
  return (
    <FinanzasProvider>
      {children}
    </FinanzasProvider>
  );
}
