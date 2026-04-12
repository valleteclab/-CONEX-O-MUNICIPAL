export type ReceiptPaymentMethod =
  | "cash"
  | "credit_card"
  | "debit_card"
  | "pix"
  | "other"
  | null;

export type ReceiptOrderItem = {
  qty: string;
  unitPrice: string;
  product?: {
    name: string;
    sku?: string | null;
  } | null;
};

export type ReceiptOrder = {
  id: string;
  createdAt: string;
  totalAmount: string;
  paymentMethod: ReceiptPaymentMethod;
  party?: {
    name: string;
    document?: string | null;
  } | null;
  items?: ReceiptOrderItem[];
};

const currency = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});

export const RECEIPT_PAYMENT_OPTIONS: Array<{
  value: Exclude<ReceiptPaymentMethod, null>;
  label: string;
}> = [
  { value: "cash", label: "Dinheiro" },
  { value: "pix", label: "PIX" },
  { value: "credit_card", label: "Cartao de credito" },
  { value: "debit_card", label: "Cartao de debito" },
  { value: "other", label: "Outro" },
];

export function printSalesReceipt(order: ReceiptOrder): boolean {
  const receiptWindow = window.open("", "_blank", "width=420,height=720");
  if (!receiptWindow) {
    return false;
  }

  const linesHtml = (order.items ?? [])
    .map((line) => {
      const qty = Number(line.qty);
      const unitPrice = Number(line.unitPrice);
      const total = qty * unitPrice;
      return `
        <tr>
          <td style="padding:6px 0;border-bottom:1px dashed #d1d5db;">${line.product?.name ?? "Item"}</td>
          <td style="padding:6px 0;border-bottom:1px dashed #d1d5db;text-align:center;">${qty}</td>
          <td style="padding:6px 0;border-bottom:1px dashed #d1d5db;text-align:right;">${currency.format(unitPrice)}</td>
          <td style="padding:6px 0;border-bottom:1px dashed #d1d5db;text-align:right;">${currency.format(total)}</td>
        </tr>
      `;
    })
    .join("");

  const paymentLabel =
    RECEIPT_PAYMENT_OPTIONS.find((option) => option.value === order.paymentMethod)?.label ??
    "Nao informado";
  const customerLabel = order.party?.name?.trim() || "Consumidor final";
  const customerDocument = order.party?.document?.trim() || null;

  receiptWindow.document.write(`
    <html>
      <head>
        <title>Recibo nao fiscal ${order.id.slice(0, 8).toUpperCase()}</title>
        <meta charset="utf-8" />
      </head>
      <body style="font-family: Arial, sans-serif; padding: 24px; color: #111827;">
        <h2 style="margin:0 0 8px;">Comprovante de venda</h2>
        <p style="margin:0 0 4px;"><strong>Pedido:</strong> ${order.id.slice(0, 8).toUpperCase()}</p>
        <p style="margin:0 0 4px;"><strong>Emitido em:</strong> ${new Date(order.createdAt).toLocaleString("pt-BR")}</p>
        <p style="margin:0 0 4px;"><strong>Cliente:</strong> ${customerLabel}</p>
        ${customerDocument ? `<p style="margin:0 0 4px;"><strong>CPF/CNPJ:</strong> ${customerDocument}</p>` : ""}
        <p style="margin:0 0 12px;"><strong>Natureza:</strong> Recibo nao fiscal, sem validade tributaria.</p>
        <p style="margin:0 0 12px;"><strong>Pagamento:</strong> ${paymentLabel}</p>
        <table style="width:100%; border-collapse:collapse; font-size:12px;">
          <thead>
            <tr>
              <th style="text-align:left; padding-bottom:8px;">Item</th>
              <th style="text-align:center; padding-bottom:8px;">Qtd</th>
              <th style="text-align:right; padding-bottom:8px;">Unit.</th>
              <th style="text-align:right; padding-bottom:8px;">Total</th>
            </tr>
          </thead>
          <tbody>${linesHtml}</tbody>
        </table>
        <p style="margin-top:16px; font-size:16px; font-weight:700; text-align:right;">Total: ${currency.format(Number(order.totalAmount))}</p>
        <p style="margin-top:20px; font-size:11px; color:#6b7280;">Este comprovante serve apenas como registro comercial da venda e nao substitui NFC-e, NF-e ou NFS-e.</p>
      </body>
    </html>
  `);
  receiptWindow.document.close();
  receiptWindow.focus();
  receiptWindow.print();
  return true;
}
