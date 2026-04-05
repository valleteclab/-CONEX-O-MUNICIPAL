/** Resposta GET /api/v1/businesses — entidade directory_listings (camelCase). */
export type DirectoryListingDto = {
  id: string;
  slug: string;
  tradeName: string;
  description: string | null;
  category: string | null;
  modo: "perfil" | "loja";
  isPublished: boolean;
};
