/** Order status labels (`OrderingOrderStateStatus`), in the customer's words. */
const STATUS_LABELS: Record<string, string> = {
  UNKNOWN: "Criado",
  CREATED: "Criado",
  PAYMENT_PENDING: "Pagamento pendente",
  PAYMENT_APPROVED: "Pagamento aprovado",
  HANDLING: "Em separação",
  CANCELLING: "Cancelamento em andamento",
  CANCELLED: "Cancelado",
  INVOICED: "Faturado",
  IN_TRANSIT: "Em transporte",
  WAITING_PICKUP: "Aguardando retirada",
  DELIVERED: "Entregue",
  INTERFERED: "Faturado",
};

/** Null for an unknown status: better to omit it than to show the raw code. */
export const orderStatusLabel = (status?: string | null) =>
  status ? (STATUS_LABELS[status] ?? null) : null;
