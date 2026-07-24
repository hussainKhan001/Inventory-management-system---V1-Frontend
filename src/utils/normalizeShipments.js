/**
 * Normalizes a GRN document into a flat array of payable shipment units.
 *
 * Shipment 1 (Initial) lives on the GRN root.
 * Shipments 2, 3, … live in grn.receipts[].
 *
 * Returns a uniform shape so AccountsPage can render one component
 * for all shipments regardless of where the data lives.
 */
export function normalizeShipments(grn) {
  if (!grn) return [];

  const shipments = [];

  // Shipment 1 — root GRN
  shipments.push({
    key:           `${grn.id}__root`,
    grnId:         grn.id,
    receiptIdx:    null,           // null = root shipment
    label:         "Shipment 1 (Initial)",
    date:          grn.date,
    challan:       grn.challan,
    mrNo:          grn.mrNo,
    docType:       grn.docType,
    personName:    grn.personName,
    challanPhotos: grn.challanPhotos || [],
    personPhotos:  grn.personPhotos  || [],
    items:         grn.items         || [],   // GRNItemSchema (has ordered/received/unit)
    paymentStatus: grn.paymentStatus || "unpaid",
    invoiceNo:     grn.invoiceNo,
    invoiceAmount: grn.invoiceAmount,
    verifiedBy:    grn.verifiedBy,
    verifiedAt:    grn.verifiedAt,
    verifyRemark:  grn.verifyRemark,
    approvedBy:    grn.approvedBy,
    approvedAt:    grn.approvedAt,
    payment:       grn.payment,
  });

  // Shipments 2+ — receipt batches
  (grn.receipts || []).forEach((r, i) => {
    shipments.push({
      key:           `${grn.id}__r${i}`,
      grnId:         grn.id,
      receiptIdx:    i,
      label:         `Shipment ${i + 2}`,
      date:          r.date,
      challan:       r.challan,
      mrNo:          r.mrNo,
      docType:       r.docType,
      personName:    r.personName,
      challanPhotos: r.challanPhotos || [],
      personPhotos:  r.personPhotos  || [],
      items:         r.items         || [],   // GRNReceiptItemSchema (has received only)
      paymentStatus: r.paymentStatus || "unpaid",
      invoiceNo:     r.invoiceNo,
      invoiceAmount: r.invoiceAmount,
      verifiedBy:    r.verifiedBy,
      verifiedAt:    r.verifiedAt,
      verifyRemark:  r.verifyRemark,
      approvedBy:    r.approvedBy,
      approvedAt:    r.approvedAt,
      payment:       r.payment,
      // root GRN items needed for unit lookup in receipt rows
      rootItems:     grn.items || [],
    });
  });

  return shipments;
}

/**
 * Returns the locked display amount for a normalized shipment.
 * Priority: invoiceAmount → payment.amount (if paid) → dynamic qty×rate
 */
export function shipmentDisplayAmt(shipment, po) {
  if (shipment.invoiceAmount) return shipment.invoiceAmount;
  if (shipment.paymentStatus === "paid" && shipment.payment?.amount) return shipment.payment.amount;

  // Dynamic fallback — compute from received qty × PO rate
  const items = shipment.receiptIdx === null ? shipment.items : shipment.items;
  return items.reduce((sum, gi) => {
    const rcv  = gi.received ?? gi.qty ?? 0;
    const rate = gi.rate
      || (po?.items || []).find(pi =>
          (pi.sku && gi.sku && pi.sku === gi.sku) ||
          (pi.materialName || "").toLowerCase() === (gi.itemName || "").toLowerCase()
        )?.rate
      || 0;
    return sum + rcv * rate;
  }, 0);
}

/**
 * Build payment history list from all normalized shipments across all GRNs.
 */
export function buildPaymentHistory(allGRNs) {
  const history = [];
  for (const grn of allGRNs) {
    const shipments = normalizeShipments(grn);
    for (const s of shipments) {
      if (s.paymentStatus === "paid" && s.payment?.amount) {
        history.push({
          grnId:    grn.id,
          label:    s.label,
          date:     s.payment.date,
          amount:   s.payment.amount,
          mode:     s.payment.mode,
          utr:      s.payment.utr,
          ref:      s.payment.ref,
          bank:     s.payment.bank,
          invoiceNo: s.invoiceNo,
        });
      }
    }
  }
  return history.sort((a, b) => new Date(a.date || 0) - new Date(b.date || 0));
}
