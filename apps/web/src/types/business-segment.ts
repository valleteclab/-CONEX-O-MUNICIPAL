export type BusinessSegmentPresetKey =
  | "beauty_salon"
  | "bakery"
  | "mini_market"
  | "auto_repair"
  | "bike_repair"
  | "locksmith";

export type BusinessSegmentQuestion = {
  key: string;
  label: string;
  type: "boolean" | "single_select" | "number";
  helperText?: string;
  options?: Array<{
    value: string;
    label: string;
  }>;
};

export type BusinessSegmentPreset = {
  key: BusinessSegmentPresetKey;
  version: number;
  name: string;
  operationType: "service" | "commerce" | "mixed";
  summary: string;
  onboardingQuestions: BusinessSegmentQuestion[];
  financeCategories: {
    income: string[];
    expense: string[];
  };
  erpFocus: string[];
  directorySuggestion: {
    category: string;
    modo: "perfil" | "loja";
    publicHeadline: string;
    description: string;
    services: string[];
    offerings: Array<{
      title: string;
      kind: "product" | "service";
      price?: string | null;
      description?: string | null;
    }>;
    keywords: string[];
  };
};

export type PresetApplicationSummary = {
  segmentPresetKey: BusinessSegmentPresetKey;
  segmentPresetVersion: number;
  createdProducts: Array<{
    id: string;
    sku: string;
    name: string;
    kind: "product" | "service";
  }>;
  directoryListing: {
    id: string;
    slug: string;
    category: string | null;
    modo: "perfil" | "loja";
  };
  financeCategories: {
    income: string[];
    expense: string[];
  };
  erpFocus: string[];
  pendingReview: string[];
};
