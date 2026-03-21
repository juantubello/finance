import { useState, useEffect, useCallback } from "react";

const REFRESH_INTERVAL = 60 * 60 * 1000; // 1 hora

export function useDolarBBVA() {
  const [dolarBBVA, setDolarBBVA] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchRate = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await fetch("https://criptoya.com/api/bancostodos");
      if (response.ok) {
        const data = await response.json();
        setDolarBBVA(data.bbva?.ask || null);
      }
    } catch (err) {
      console.error("Error fetching dólar BBVA:", err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchRate();
    const interval = setInterval(fetchRate, REFRESH_INTERVAL);
    return () => clearInterval(interval);
  }, [fetchRate]);

  return { dolarBBVA, isLoading };
}
