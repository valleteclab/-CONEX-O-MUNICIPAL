/** Resposta GET /api/v1/businesses — entidade directory_listings (camelCase). */
export type DirectoryListingDto = {
  id: string;
  slug: string;
  tradeName: string;
  publicHeadline: string | null;
  description: string | null;
  category: string | null;
  modo: "perfil" | "loja";
  contactInfo: {
    whatsapp?: string;
    phone?: string;
    email?: string;
    website?: string;
    instagram?: string;
  };
  services: string[];
  offerings: Array<{
    title: string;
    kind: "product" | "service";
    price?: string | null;
    description?: string | null;
  }>;
  isPublished: boolean;
};
