"use client";

import { useEffect, useState } from "react";
import { BUSINESS_CHANGED_EVENT, getBusinessId } from "@/lib/auth-storage";

export function useSelectedBusinessId() {
  const [businessId, setBusinessId] = useState<string | null>(() => getBusinessId());

  useEffect(() => {
    const syncFromStorage = () => setBusinessId(getBusinessId());

    const onBusinessChanged = (event: Event) => {
      const custom = event as CustomEvent<{ businessId?: string | null }>;
      setBusinessId(custom.detail?.businessId ?? null);
    };

    window.addEventListener("storage", syncFromStorage);
    window.addEventListener(BUSINESS_CHANGED_EVENT, onBusinessChanged as EventListener);

    return () => {
      window.removeEventListener("storage", syncFromStorage);
      window.removeEventListener(BUSINESS_CHANGED_EVENT, onBusinessChanged as EventListener);
    };
  }, []);

  return businessId;
}
