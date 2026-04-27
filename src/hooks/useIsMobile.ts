import { useState, useEffect } from 'react';

export function useIsMobile(breakpoint = 768) {
  const [isMobile, setIsMobile] = useState<boolean>(false);

  useEffect(() => {
    // Only run on client
    if (typeof window === 'undefined') return;

    const mediaQuery = window.matchMedia(`(max-width: ${breakpoint - 1}px)`);
    
    // Set initial value
    setIsMobile(mediaQuery.matches);

    // Event listener for changes
    const handler = (event: MediaQueryListEvent) => {
      setIsMobile(event.matches);
    };

    // Use addEventListener for modern browsers, fallback to addListener for older ones if needed
    if (mediaQuery.addEventListener) {
      mediaQuery.addEventListener('change', handler);
      return () => mediaQuery.removeEventListener('change', handler);
    } else {
      // Fallback
      mediaQuery.addListener(handler);
      return () => mediaQuery.removeListener(handler);
    }
  }, [breakpoint]);

  return isMobile;
}
