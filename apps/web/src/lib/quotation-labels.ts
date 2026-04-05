const STATUS_PT: Record<string, string> = {
  open: "Aberta",
  in_progress: "Em andamento",
  closed: "Encerrada",
  cancelled: "Cancelada",
};

export function quotationStatusLabel(status: string): string {
  return STATUS_PT[status] ?? status;
}
