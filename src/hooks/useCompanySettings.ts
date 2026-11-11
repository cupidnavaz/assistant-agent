import { useCallback, useEffect, useState } from 'react';
import { fetchCompanySettings, type CompanySettings } from '@/lib/company';

export function useCompanySettings() {
  const [company, setCompany] = useState<CompanySettings | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setCompany(await fetchCompanySettings());
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'The company details could not be loaded.');
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  return { company, error, setCompany };
}
