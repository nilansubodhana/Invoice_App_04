import React, { createContext, useContext, useState, useEffect, useMemo, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { LOGO_BASE64 } from '@/lib/logo-base64';

const BRANDING_KEY = 'ns_branding_settings';

export interface BrandingSettings {
  businessName: string;
  businessSub: string;
  ownerName: string;
  contactPhone: string;
  contactEmail: string;
  bankAccount: string;
  bankHolder: string;
  bankName: string;
  bankBranch: string;
  logoUri: string;
}

export const DEFAULT_BRANDING: BrandingSettings = {
  businessName: 'NILAN SUBODHANA',
  businessSub: 'PHOTOGRAPHY',
  ownerName: 'Nilan Subodhana',
  contactPhone: '071 1007 604',
  contactEmail: 'nilansubodhana12@gmail.com',
  bankAccount: '90518364',
  bankHolder: 'M.P.G.N.S.R Premarathna',
  bankName: 'BOC',
  bankBranch: 'Dambulla',
  logoUri: LOGO_BASE64,
};

interface BrandingContextValue {
  branding: BrandingSettings;
  updateBranding: (updates: Partial<BrandingSettings>) => Promise<void>;
  resetBranding: () => Promise<void>;
}

const BrandingContext = createContext<BrandingContextValue | null>(null);

export function BrandingProvider({ children }: { children: ReactNode }) {
  const [branding, setBranding] = useState<BrandingSettings>(DEFAULT_BRANDING);

  useEffect(() => {
    (async () => {
      try {
        const saved = await AsyncStorage.getItem(BRANDING_KEY);
        if (saved) {
          const parsed = JSON.parse(saved);
          setBranding({ ...DEFAULT_BRANDING, ...parsed });
        }
      } catch {}
    })();
  }, []);

  const updateBranding = React.useCallback(async (updates: Partial<BrandingSettings>) => {
    setBranding(prev => {
      const updated = { ...prev, ...updates };
      AsyncStorage.setItem(BRANDING_KEY, JSON.stringify(updated));
      return updated;
    });
  }, []);

  const resetBranding = React.useCallback(async () => {
    setBranding(DEFAULT_BRANDING);
    await AsyncStorage.removeItem(BRANDING_KEY);
  }, []);

  const value = useMemo(() => ({
    branding,
    updateBranding,
    resetBranding,
  }), [branding, updateBranding, resetBranding]);

  return (
    <BrandingContext.Provider value={value}>
      {children}
    </BrandingContext.Provider>
  );
}

export function useBranding() {
  const context = useContext(BrandingContext);
  if (!context) throw new Error('useBranding must be used within BrandingProvider');
  return context;
}
