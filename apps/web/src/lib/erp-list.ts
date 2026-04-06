/**
 * Formato paginado das listagens REST do ERP (`/api/v1/erp/*`).
 * Alinhar com Nest (services que devolvem `{ items, total }`).
 */
export type ErpListResponse<T> = { items: T[]; total: number };
