"use client";

import { useCallback, useEffect, useState } from "react";
import { apiAuthFetch } from "@/lib/api-browser";
import { getBusinessId, setBusinessId, clearBusinessId } from "@/lib/auth-storage";

export type ErpBusiness = {
  id: string;
  tradeName: string;
  legalName: string | null;
  document: string | null;
  moderationStatus: "pending" | "approved" | "rejected";
  isActive: boolean;
};

type UseErpBusinessReturn = {
  businesses: ErpBusiness[];
  selectedId: string | null;
  selected: ErpBusiness | null;
  isLoading: boolean;
  error: string | null;
  hasApproved: boolean;
  selectBusiness: (id: string) => void;
  clearSelection: () => void;
  reload: () => void;
};

export function useErpBusiness(): UseErpBusinessReturn {
  const [businesses, setBusinesses] = useState<ErpBusiness[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    const res = await apiAuthFetch<ErpBusiness[]>("/api/v1/erp/businesses");
    if (res.ok && res.data) {
      setBusinesses(res.data);
      const storedId = getBusinessId();
      const approved = res.data.filter((b) => b.moderationStatus === "approved" && b.isActive);
      if (storedId && approved.find((b) => b.id === storedId)) {
        setSelectedId(storedId);
      } else if (approved.length === 1) {
        setSelectedId(approved[0].id);
        setBusinessId(approved[0].id);
      } else {
        setSelectedId(null);
      }
    } else {
      setError(res.error ?? "Erro ao carregar negócios.");
    }
    setIsLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const selectBusiness = useCallback((id: string) => {
    setBusinessId(id);
    setSelectedId(id);
  }, []);

  const clearSelection = useCallback(() => {
    clearBusinessId();
    setSelectedId(null);
  }, []);

  const approved = businesses.filter((b) => b.moderationStatus === "approved" && b.isActive);
  const selected = businesses.find((b) => b.id === selectedId) ?? null;

  return {
    businesses,
    selectedId,
    selected,
    isLoading,
    error,
    hasApproved: approved.length > 0,
    selectBusiness,
    clearSelection,
    reload: load,
  };
}
