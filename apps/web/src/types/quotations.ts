export type QuotationRequestDto = {
  id: string;
  title: string;
  description: string | null;
  status: string;
  kind: "private_market" | "public_procurement";
  category: string | null;
  desiredDate: string | null;
  requesterBusinessId: string | null;
  responsesCount: number;
  createdAt: string;
};
