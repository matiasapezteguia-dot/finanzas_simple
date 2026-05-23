"use client";

import React, { useEffect } from 'react';
import { createClientSupabaseClient } from '../utils/supabase/client';
import { useFinanzasStore } from '../lib/store';
import { Profile } from '../types/finanzas';

interface AppProvidersProps {
  children: React.ReactNode;
}

export function AppProviders({ children }: AppProvidersProps) {
  const setProfile = useFinanzasStore((state) => state.setProfile);

  useEffect(() => {
    const supabase = createClientSupabaseClient();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (session) {
          const { data: profileData } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', session.user.id)
            .single();
          setProfile(profileData as Profile);
        } else {
          setProfile(null);
        }
      }
    );

    return () => {
      subscription.unsubscribe();
    };
  }, [setProfile]);

  return <>{children}</>;
}
