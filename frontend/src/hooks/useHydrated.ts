'use client';

import { useEffect, useState } from 'react';

/**
 * True only after the component has mounted in the browser.
 * Use to avoid SSR/client mismatches when reading cookies, localStorage, or window.
 */
export function useHydrated(): boolean {
  const [hydrated, setHydrated] = useState(false);
  useEffect(() => {
    setHydrated(true);
  }, []);
  return hydrated;
}
