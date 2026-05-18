"use client";

import React from 'react';

interface AppProvidersProps {
  children: React.ReactNode;
}

export function AppProviders({ children }: AppProvidersProps) {
  // Dejamos pasar los componentes directamente, ya que Zustand 
  // maneja el estado global de manera nativa sin envoltorios.
  return <>{children}</>;
}