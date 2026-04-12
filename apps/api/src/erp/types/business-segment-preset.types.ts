export type BusinessSegmentOperationType = 'service' | 'commerce' | 'mixed';

export type BusinessSegmentPresetKey =
  | 'beauty_salon'
  | 'bakery'
  | 'mini_market'
  | 'auto_repair'
  | 'bike_repair'
  | 'locksmith';

export type BusinessSegmentQuestionType =
  | 'boolean'
  | 'single_select'
  | 'number';

export type BusinessSegmentQuestionOption = {
  value: string;
  label: string;
};

export type BusinessSegmentQuestionDefinition = {
  key: string;
  label: string;
  type: BusinessSegmentQuestionType;
  helperText?: string;
  options?: BusinessSegmentQuestionOption[];
};

export type SegmentSeedProduct = {
  sku: string;
  name: string;
  kind: 'product' | 'service';
  unit?: string;
  price?: string;
  minStock?: string;
  description?: string;
};

export type SegmentDirectorySuggestion = {
  category: string;
  modo: 'perfil' | 'loja';
  publicHeadline: string;
  description: string;
  services: string[];
  offerings: Array<{
    title: string;
    kind: 'product' | 'service';
    price?: string | null;
    description?: string | null;
  }>;
  keywords: string[];
};

export type BusinessSegmentPresetDefinition = {
  key: BusinessSegmentPresetKey;
  version: number;
  name: string;
  operationType: BusinessSegmentOperationType;
  summary: string;
  onboardingQuestions: BusinessSegmentQuestionDefinition[];
  seedProducts: SegmentSeedProduct[];
  financeCategories: {
    income: string[];
    expense: string[];
  };
  erpFocus: string[];
  directorySuggestion: SegmentDirectorySuggestion;
};

export type BusinessSegmentOnboardingAnswers = Record<string, string | number | boolean>;
