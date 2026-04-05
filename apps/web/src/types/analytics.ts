export type AnalyticsDashboardDto = {
  tenantId: string;
  generatedAt: string;
  kpis: {
    directoryListingsPublished: number;
    erpBusinessesActive: number;
    newMeiUsersThisMonth: number;
    quotationsOpen: number;
    academyEnrollmentsActive: number;
    transactionVolumeSelected: number | null;
    npsScore: number | null;
    chatbotResolutionRate: number | null;
  };
};
