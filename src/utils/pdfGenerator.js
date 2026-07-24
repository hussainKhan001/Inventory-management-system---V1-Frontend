var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { safeStr } from "../utils";
const primaryColor = [26, 54, 93];
const grayBg = [245, 245, 245];
const generatePOPDF = /* @__PURE__ */ __name((po, supplier, settings = {}, returnBlob = false) => {
  const doc = new jsPDF({ orientation: "p", unit: "mm", format: "a4" });
  const formatPrettyDate = /* @__PURE__ */ __name((d) => {
    if (!d) return "NA";
    const date = new Date(d);
    return date.toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit"
    });
  }, "formatPrettyDate");
  const formatAccountNo = /* @__PURE__ */ __name((acc) => {
    return String(acc || "NA");
  }, "formatAccountNo");
  const fmtRs = /* @__PURE__ */ __name((n) => n.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 }), "fmtRs");
  let y = 8;
  const checkPage = /* @__PURE__ */ __name((h) => {
    if (y + h > 285) {
      doc.addPage();
      y = 8;
      return true;
    }
    return false;
  }, "checkPage");
  doc.setFillColor(primaryColor[0], primaryColor[1], primaryColor[2]);
  doc.rect(10, y, 190, 10, "F");
  doc.setTextColor(255);
  doc.setFontSize(13);
  doc.setFont("helvetica", "bold");
  doc.text("PURCHASE ORDER", 105, y + 7, { align: "center" });
  doc.setDrawColor(200);
  y += 10;
  const rowH = 7;
  const c1 = 10, c2 = 52, c3 = 110, c4 = 152;
  const drawRow = /* @__PURE__ */ __name((l1, v1, l2, v2) => {
    doc.setFontSize(8);
    const v1Lines = doc.splitTextToSize(safeStr(v1), 54).length;
    const v2Lines = doc.splitTextToSize(safeStr(v2), 44).length;
    const maxLines = Math.max(v1Lines, v2Lines, 1);
    const dynamicRowH = Math.max(rowH, maxLines * 4.2 + 1.5);
    checkPage(dynamicRowH);
    doc.setFillColor(248, 250, 252);
    doc.rect(c1, y, 42, dynamicRowH, "FD");
    doc.rect(c2, y, 58, dynamicRowH, "D");
    doc.rect(c3, y, 42, dynamicRowH, "FD");
    doc.rect(c4, y, 48, dynamicRowH, "D");
    doc.setTextColor(50);
    doc.setFont("helvetica", "bold");
    doc.text(l1.toUpperCase(), c1 + 2, y + 4.8);
    doc.setTextColor(0);
    doc.setFont("helvetica", "normal");
    doc.text(safeStr(v1), c2 + 2, y + 4.8, { maxWidth: 54 });
    doc.setTextColor(50);
    doc.setFont("helvetica", "bold");
    doc.text(l2.toUpperCase(), c3 + 2, y + 4.8);
    doc.setTextColor(0);
    doc.text(safeStr(v2), c4 + 2, y + 4.8, { maxWidth: 44 });
    y += dynamicRowH;
  }, "drawRow");
  const _normGST = (s) => (s || "").replace(/\s/g, "").toUpperCase();
  const _poGST = _normGST(po.gstNo);
  const _supGST = _normGST(supplier?.gstNumber);
  const _supGSTOK = !_poGST || _poGST === "NA" || !_supGST || _supGST === "NA" || _supGST === _poGST;
  const _vendorName = (supplier && _supGSTOK)
    ? (supplier.companyName || supplier.name)
    : (po.vendorBankDetails?.accountHolder || po.supplier || "NA");
  drawRow("Company Name", po.companyName || "HEAVEN HEIGHTS PRIVATE LIMITED", "Vendor Name", _vendorName);
  drawRow("Company GSTIN", po.companyGst || "23AABCH6973R1ZX", "Vendor Address", supplier?.address || po.vendorAddress || "NA");
  drawRow("Company Addr", po.companyAddress || "N.A., Gulmohar City, Near New Collectorate, New City Centre, Gwalior, MP, 474011", "Vendor Contact", String(po.vendorContact || supplier?.mobile || supplier?.phone || "NA"));
  drawRow("Internal MR No.", po.mrId || "NA", "Vendor Email ID", po.vendorEmail || supplier?.email || "NA");
  drawRow("Work Type", po.workType || "NA", "Requirement By", po.requirementBy || "NA");
  drawRow("MR Location", po.mrLocation || "NA", "Site/Location", po.project || po.location || "NA");
  drawRow("Priority", po.priority || "NORMAL", "Phase/Milestone", po.phase || po.milestone || "NA");
  drawRow("Date of Issue", formatPrettyDate(po.date), "Vendor PAN", po.panNo || supplier?.panNumber || "NA");
  if (po.justification) {
    checkPage(9);
    doc.setFillColor(248, 250, 252);
    doc.rect(c1, y, 42, 8, "FD");
    doc.rect(c2, y, 148, 8, "D");
    doc.setFontSize(8);
    doc.setFont("helvetica", "bold");
    doc.text("JUSTIFICATION", c1 + 2, y + 5);
    doc.setFont("helvetica", "normal");
    doc.text(po.justification, c2 + 2, y + 5, { maxWidth: 144 });
    y += 8;
  }
  if (po.remark) {
    checkPage(9);
    doc.setFillColor(248, 250, 252);
    doc.rect(c1, y, 42, 8, "FD");
    doc.rect(c2, y, 148, 8, "D");
    doc.setFontSize(8);
    doc.setFont("helvetica", "bold");
    doc.text("REMARKS", c1 + 2, y + 5);
    doc.setFont("helvetica", "normal");
    doc.text(po.remark, c2 + 2, y + 5, { maxWidth: 144 });
    y += 8;
  }
  const pNumH = 8;
  checkPage(pNumH);
  doc.setDrawColor(200);
  doc.setFillColor(248, 250, 252);
  doc.rect(c1, y, 42, pNumH, "FD");
  doc.rect(c2, y, 148, pNumH, "D");
  doc.setFontSize(8);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(50);
  doc.text("PO NUMBER", c1 + 2, y + 5);
  doc.setFontSize(10);
  doc.setTextColor(0);
  doc.text(po.id, c2 + 2, y + 5);
  y += pNumH;
  const calcChargeTotal = /* @__PURE__ */ __name((amount, gstPct, gstType2) => {
    if (!amount) return 0;
    return gstType2 === "Exclusive" ? amount * (1 + gstPct / 100) : amount;
  }, "calcChargeTotal");
  const subTotal = po.items.reduce((s, it) => s + it.qty * it.rate, 0);
  const gstType = po.items[0]?.gstType || (po.totalValue > subTotal + 0.5 ? "Exclusive" : "Inclusive");
  const gstTotal = po.items.reduce((s, it) => {
    const itemGstType = it.gstType || gstType;
    if (itemGstType !== "Exclusive") return s;
    const base = it.qty * it.rate;
    const pct = it.gstPct ?? (po.items[0]?.gstPct ?? 18);
    return s + base * pct / 100;
  }, 0);
  const freightTotal = calcChargeTotal(po.freightAmount || 0, po.freightGstPct || 0, po.freightGstType || "Exclusive");
  const loadingTotal = calcChargeTotal(po.loadingAmount || 0, po.loadingGstPct || 0, po.loadingGstType || "Exclusive");
  const unloadingTotal = calcChargeTotal(po.unloadingAmount || 0, po.unloadingGstPct || 0, po.unloadingGstType || "Exclusive");
  autoTable(doc, {
    startY: y + 2,
    margin: { left: 10, right: 10 },
    head: [["S.NO", "ITEM DESCRIPTION", "UQC", "QTY", "RATE (RS)", "AMOUNT (RS)"]],
    body: po.items.map((it, i) => [
      i + 1,
      (it.itemName || "").toUpperCase(),
      (it.unit || "NOS").toUpperCase(),
      it.qty,
      fmtRs(it.rate),
      fmtRs(it.qty * it.rate)
    ]),
    styles: { fontSize: 8.5, cellPadding: 1.8, lineColor: [220, 220, 220], lineWidth: 0.1 },
    headStyles: { fillColor: [primaryColor[0], primaryColor[1], primaryColor[2]], textColor: 255, fontStyle: "bold" },
    columnStyles: {
      4: { halign: "right" },
      5: { halign: "right", fontStyle: "bold" }
    }
  });
  y = doc.lastAutoTable.finalY + 2;
  checkPage(45);
  const itemsSubtotalInclGst = subTotal + gstTotal;
  const darkColor = [40, 40, 40];
  const rowBg = [248, 250, 252];
  const totalsBody = [
    [
      { content: "Items Base Amount (Excl. GST)", styles: { textColor: darkColor, fillColor: rowBg } },
      { content: `Rs. ${fmtRs(subTotal)}`, styles: { halign: "right", fontStyle: "bold", fillColor: rowBg, textColor: darkColor } }
    ],
    [
      { content: "GST Amount", styles: { textColor: [22, 163, 74] } },
      { content: `Rs. ${fmtRs(gstTotal)}`, styles: { halign: "right", fontStyle: "bold", textColor: [22, 163, 74] } }
    ],
    [
      { content: "Items Subtotal (Incl. GST)", styles: { textColor: darkColor, fillColor: [240, 244, 248] } },
      { content: `Rs. ${fmtRs(itemsSubtotalInclGst)}`, styles: { halign: "right", fontStyle: "bold", fillColor: [240, 244, 248], textColor: darkColor } }
    ],
    ...(freightTotal > 0 ? [[
      { content: `Freight Charges (${po.freightGstPct ?? 18}% GST \xB7 ${po.freightGstType || "Exclusive"})`, styles: { textColor: darkColor } },
      { content: `Rs. ${fmtRs(freightTotal)}`, styles: { halign: "right", textColor: darkColor } }
    ]] : []),
    ...(loadingTotal > 0 ? [[
      { content: `Loading Charges (${po.loadingGstPct ?? 18}% GST \xB7 ${po.loadingGstType || "Exclusive"})`, styles: { textColor: darkColor } },
      { content: `Rs. ${fmtRs(loadingTotal)}`, styles: { halign: "right", textColor: darkColor } }
    ]] : []),
    ...(unloadingTotal > 0 ? [[
      { content: `Unloading Charges (${po.unloadingGstPct ?? 18}% GST \xB7 ${po.unloadingGstType || "Exclusive"})`, styles: { textColor: darkColor } },
      { content: `Rs. ${fmtRs(unloadingTotal)}`, styles: { halign: "right", textColor: darkColor } }
    ]] : []),
    [
      { content: "TOTAL PAYABLE", styles: { fontStyle: "bold", fontSize: 10.5, fillColor: primaryColor, textColor: [255, 255, 255] } },
      { content: `Rs. ${fmtRs(po.totalValue)}`, styles: { halign: "right", fontStyle: "bold", fontSize: 10.5, fillColor: primaryColor, textColor: [255, 255, 255] } }
    ]
  ];
  autoTable(doc, {
    startY: y + 1,
    margin: { left: 100, right: 10 },
    // Right-half of the page
    theme: "grid",
    body: totalsBody,
    styles: {
      fontSize: 8.5,
      cellPadding: { top: 2.2, bottom: 2.2, left: 3, right: 3 },
      lineColor: [210, 215, 220],
      lineWidth: 0.25
    },
    columnStyles: {
      0: { cellWidth: 70 },
      1: { cellWidth: 30, halign: "right", fontStyle: "bold" }
    }
  });
  y = doc.lastAutoTable.finalY + 4;
  doc.setTextColor(0);
  if (po.paymentTimelines && po.paymentTimelines.length > 0) {
    checkPage(16);
    doc.setFillColor(primaryColor[0], primaryColor[1], primaryColor[2]);
    doc.rect(10, y, 190, 8, "F");
    doc.setTextColor(255);
    doc.setFontSize(9.5);
    doc.text("PAYMENT TIMELINES", 105, y + 5.5, { align: "center" });
    y += 8;
    const fmtPtDate = /* @__PURE__ */ __name((dateStr) => {
      if (!dateStr) return "";
      try {
        return new Intl.DateTimeFormat("en-IN", { day: "2-digit", month: "short", year: "numeric" }).format(new Date(dateStr));
      } catch {
        return dateStr;
      }
    }, "fmtPtDate");
    const timelineGrandTotal = po.totalValue || po.paymentTimelines.reduce((s, pt) => s + (parseFloat(pt.amount) || 0), 0);
    autoTable(doc, {
      startY: y,
      margin: { left: 10, right: 10 },
      head: [["DATE", "TYPE", "MODE", "AMOUNT", "IF PAYABLE"]],
      body: [
        ...po.paymentTimelines.map((pt) => {
          const amt = parseFloat(pt.amount) || 0;
          return [
            fmtPtDate(pt.date),
            (pt.type || "").toUpperCase(),
            (pt.mode || "").toUpperCase(),
            amt > 0 ? fmtRs(amt) : "0.00",
            amt > 0 ? fmtRs(amt) : "0.00"
          ];
        }),
        ["GRAND TOTAL", "", "", "", fmtRs(timelineGrandTotal)]
      ],
      styles: { fontSize: 8.5, cellPadding: 1.8, lineColor: [220, 220, 220], lineWidth: 0.1 },
      headStyles: { fillColor: [primaryColor[0], primaryColor[1], primaryColor[2]], textColor: 255, fontStyle: "bold" },
      bodyStyles: { textColor: 40 },
      didParseCell: /* @__PURE__ */ __name((data) => {
        if (data.row.index === po.paymentTimelines.length) {
          data.cell.styles.fontStyle = "bold";
          data.cell.styles.fillColor = [240, 244, 248];
          data.cell.styles.textColor = primaryColor;
        }
      }, "didParseCell"),
      columnStyles: {
        0: { cellWidth: 28 },
        1: { cellWidth: 55 },
        2: { cellWidth: 38 },
        3: { cellWidth: 32, halign: "right" },
        4: { cellWidth: 32, halign: "right", fontStyle: "bold" }
      }
    });
    y = doc.lastAutoTable.finalY + 2;
  }
  checkPage(16);
  doc.setFillColor(primaryColor[0], primaryColor[1], primaryColor[2]);
  doc.rect(10, y, 190, 8, "F");
  doc.setTextColor(255);
  doc.setFontSize(9.5);
  doc.text("BANK DETAILS (VENDOR) / DELIVERY INFO", 105, y + 5.5, { align: "center" });
  y += 8;
  autoTable(doc, {
    startY: y,
    margin: { left: 10, right: 10 },
    body: [
      ["A/C HOLDER", po.vendorBankDetails?.accountHolder || "NA", "DELIVERY LOCATION", po.deliveryDetails?.location || "NA"],
      ["BANK NAME", po.vendorBankDetails?.bankName || "NA", "EXPECTED DATE", formatPrettyDate(po.deliveryDetails?.deliveryDate)],
      ["A/C NO.", safeStr(po.vendorBankDetails?.accountNo || supplier?.accountNumber || "NA"), "RECEIVER NAME", po.deliveryDetails?.contactPerson || "NA"],
      ["BRANCH & IFSC", po.vendorBankDetails?.branchIFSC || "NA", "SITE CONTACT", po.deliveryDetails?.contactPhone || "-"]
    ],
    styles: { fontSize: 8.5, cellPadding: 1.5, lineColor: [220, 220, 220], lineWidth: 0.1 },
    columnStyles: {
      0: { cellWidth: 38, fontStyle: "bold", fillColor: [248, 250, 252], textColor: 70 },
      2: { cellWidth: 42, fontStyle: "bold", fillColor: [248, 250, 252], textColor: 70 }
    }
  });
  y = doc.lastAutoTable.finalY + 2;
  checkPage(16);
  doc.setFillColor(primaryColor[0], primaryColor[1], primaryColor[2]);
  doc.rect(10, y, 190, 8, "F");
  doc.setTextColor(255);
  doc.setFontSize(9.5);
  doc.text("APPROVALS & AUTHORIZATION", 105, y + 5.5, { align: "center" });
  y += 8;
  const TERMINAL_STATUSES = ["Approved", "Cancelled", "Blocked", "Rejected", "PO Closed", "GRN Pending", "Pending GRN", "GRN Fulfilled", "GRN Variance", "Ready for Payment", "Fulfilled"];
  const LEGACY_APPROVER_DEFAULTS = {
    purchaseCoord: "Vijay Kushwah", purchaseCoordTitle: "PURCHASE COORDINATOR",
    l1: "Akhilesh Singh", l1Title: "AGM",
    l2: "Jinesh Jain", l2Title: "PM",
    l3: "Rahul Gupta", l3Title: "DIRECTOR",
  };
  const _isCompleted = TERMINAL_STATUSES.includes(po.status);
  const approvers = !_isCompleted
    ? (settings.approvers || {})
    : (po.approverSnapshot || LEGACY_APPROVER_DEFAULTS);
  const isRejected = po.status === "Blocked" || po.status === "rejected";
  const rejectLevel = isRejected
    ? (po.approvalL1 !== "Approved" ? "L1" : po.approvalL2 !== "Approved" ? "L2" : "L3")
    : null;
  const sigCols = [
    {
      title: approvers.purchaseCoordTitle || "PURCHASE COORD",
      name: approvers.purchaseCoord || "Purchase Coordinator",
      date: formatPrettyDate(po.date),
      status: "INITIATED",
      color: [22, 163, 74],
    },
    {
      title: approvers.l1Title ? `${approvers.l1Title} (L1)` : "AGM (L1)",
      name: approvers.l1 || "L1 Approver",
      date: po.approvalL1At ? formatPrettyDate(po.approvalL1At) : "—",
      status: rejectLevel === "L1" ? "REJECTED" : (po.approvalL1 || "PENDING"),
      color: rejectLevel === "L1" ? [220, 38, 38] : po.approvalL1 === "Approved" ? [22, 163, 74] : [107, 114, 128],
    },
    {
      title: approvers.l2Title ? `${approvers.l2Title} (L2)` : "PM / HEAD (L2)",
      name: approvers.l2 || "L2 Approver",
      date: po.approvalL2At ? formatPrettyDate(po.approvalL2At) : "—",
      status: rejectLevel === "L2" ? "REJECTED" : (po.approvalL2 || "PENDING"),
      color: rejectLevel === "L2" ? [220, 38, 38] : po.approvalL2 === "Approved" ? [22, 163, 74] : [107, 114, 128],
    },
    {
      title: approvers.l3Title ? `${approvers.l3Title} (L3)` : "DIRECTOR (L3)",
      name: approvers.l3 || "L3 Approver",
      date: po.approvalL3At ? formatPrettyDate(po.approvalL3At) : "—",
      status: rejectLevel === "L3" ? "REJECTED" : (po.approvalL3 || "PENDING"),
      color: rejectLevel === "L3" ? [220, 38, 38] : po.approvalL3 === "Approved" ? [22, 163, 74] : [107, 114, 128],
    },
  ];
  checkPage(38);
  autoTable(doc, {
    startY: y,
    margin: { left: 10, right: 10 },
    head: [[
      { content: sigCols[0].title, styles: { halign: "center" } },
      { content: sigCols[1].title, styles: { halign: "center" } },
      { content: sigCols[2].title, styles: { halign: "center" } },
      { content: sigCols[3].title, styles: { halign: "center" } },
    ]],
    body: [
      // Name row
      sigCols.map((c) => ({ content: c.name, styles: { halign: "center", fontStyle: "bold", fontSize: 8.5, textColor: [20, 20, 20] } })),
      // Date row
      sigCols.map((c) => ({ content: `Date: ${c.date}`, styles: { halign: "center", fontSize: 7.5, textColor: [80, 80, 80] } })),
      // Status row — tint bg based on status
      sigCols.map((c) => {
        const s = c.status.toUpperCase();
        const bg = s === "APPROVED" ? [220, 252, 231]
          : s === "REJECTED" ? [254, 226, 226]
          : s === "INITIATED" ? [219, 234, 254]
          : [243, 244, 246];
        return {
          content: s,
          styles: { halign: "center", fontStyle: "bold", fontSize: 8, textColor: c.color, fillColor: bg },
        };
      }),
    ],
    styles: { fontSize: 8, cellPadding: { top: 3.5, bottom: 3.5, left: 3, right: 3 }, lineColor: [200, 210, 225], lineWidth: 0.2 },
    headStyles: { fillColor: primaryColor, textColor: 255, fontStyle: "bold", fontSize: 8, halign: "center" },
    columnStyles: {
      0: { cellWidth: 47.5 },
      1: { cellWidth: 47.5 },
      2: { cellWidth: 47.5 },
      3: { cellWidth: 47.5 },
    },
  });
  y = doc.lastAutoTable.finalY + 3;
  if (po.priceComparison && po.priceComparison.items.length > 0) {
    checkPage(14);
    doc.setFillColor(primaryColor[0], primaryColor[1], primaryColor[2]);
    doc.rect(10, y, 190, 8, "F");
    doc.setTextColor(255);
    doc.setFontSize(9.5);
    doc.text("PRICE COMPARISON REPORT", 105, y + 5.5, { align: "center" });
    y += 8;
    const vendorNames = po.priceComparison.vendors.map((v) => v.name.toUpperCase());
    autoTable(doc, {
      startY: y,
      margin: { left: 10, right: 10 },
      head: [["SR.", "ITEM DESCRIPTION", "UQC", ...vendorNames]],
      body: [
        ...po.priceComparison.items.map((it, i) => [
          i + 1,
          it.materialName.toUpperCase(),
          it.unit.toUpperCase(),
          ...it.rates.map((r) => r > 0 ? fmtRs(r) : "-")
        ]),
        ["", "GST TYPE / STATUS", "", ...po.priceComparison.vendors.map((v) => v.gstType || "EXCLUSIVE")]
      ],
      styles: { fontSize: 8, cellPadding: 1.5, lineColor: [220, 220, 220], lineWidth: 0.1 },
      headStyles: { fillColor: [240, 240, 240], textColor: 20, fontStyle: "bold" }
    });
    if (po.priceComparison.remarks) {
      y = doc.lastAutoTable.finalY + 2;
      doc.setFontSize(8);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(80);
      doc.text("REMARK:", 10, y);
      doc.setFont("helvetica", "normal");
      doc.text(po.priceComparison.remarks, 24, y, { maxWidth: 171 });
    }
  }
  if (returnBlob) return doc.output("blob");
  doc.save(`${po.id}_PO.pdf`);
}, "generatePOPDF");
const generatePOPDFBlob = /* @__PURE__ */ __name((po, supplier, settings = {}) =>
  generatePOPDF(po, supplier, settings, true),
"generatePOPDFBlob");

const generateTransactionDetailPDF = /* @__PURE__ */ __name((po, grn, supplierName, vBank, cBank) => {
  const doc = new jsPDF({ orientation: "p", unit: "mm", format: "a4" });
  // Palette
  const navy   = [26, 54, 93];
  const orange = [220, 80, 20];
  const green  = [20, 140, 65];
  const bdCol  = [210, 218, 230]; // border
  const lblCol = [120, 135, 155]; // label grey

  const fmtD = (d) => {
    if (!d) return "—";
    try { return new Intl.DateTimeFormat("en-IN", { day: "2-digit", month: "long", year: "numeric" }).format(new Date(d)); }
    catch { return String(d); }
  };
  const fmtA = (n) => n != null ? "Rs. " + Number(n).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : "—";

  let y = 10;
  const checkPage = (h) => { if (y + h > 277) { doc.addPage(); y = 10; } };

  // ══════════════════════════════════════════════════
  // HEADER
  // ══════════════════════════════════════════════════
  doc.setFillColor(navy[0], navy[1], navy[2]);
  doc.rect(10, y, 190, 22, "F");

  // Left — company name (dynamic from PO)
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(15);
  doc.text((po.companyName || "OUR COMPANY").toUpperCase(), 16, y + 10, { maxWidth: 110 });
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.5);
  doc.setTextColor(175, 205, 235);
  if (po.companyGst) doc.text(`GSTIN: ${po.companyGst}`, 16, y + 16);
  if (po.companyAddress) {
    const addrLine = doc.splitTextToSize(po.companyAddress, 110)[0];
    doc.text(addrLine, 16, po.companyGst ? y + 20 : y + 17);
  }

  // Right — document title
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.text("TRANSACTION DETAIL", 200, y + 10, { align: "right" });
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(175, 205, 235);
  doc.text(`Ref: ${po.id}  |  ${fmtD(new Date())}`, 200, y + 17, { align: "right" });

  // Orange accent bar
  doc.setFillColor(orange[0], orange[1], orange[2]);
  doc.rect(10, y + 22, 190, 1.8, "F");
  y += 27;

  // ══════════════════════════════════════════════════
  // Helpers
  // ══════════════════════════════════════════════════
  const sectionHeader = (title) => {
    checkPage(10);
    doc.setFillColor(237, 242, 248);
    doc.setDrawColor(bdCol[0], bdCol[1], bdCol[2]);
    doc.rect(10, y, 190, 7.5, "FD");
    // left accent stripe
    doc.setFillColor(navy[0], navy[1], navy[2]);
    doc.rect(10, y, 3.5, 7.5, "F");
    doc.setTextColor(navy[0], navy[1], navy[2]);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    doc.text(title, 18, y + 5.2);
    y += 7.5;
  };

  // drawGrid — each cell: { label, value, color? ('navy'|'orange'|'green'|null), big? }
  const drawGrid = (cells, numCols) => {
    numCols = numCols || 3;
    const gap = 1.5;
    const totalW = 190;
    const colW = (totalW - gap * (numCols - 1)) / numCols;
    const colX = Array.from({ length: numCols }, (_, i) => 10 + i * (colW + gap));
    const rH = 14;

    for (let i = 0; i < cells.length; i += numCols) {
      checkPage(rH);
      const row = cells.slice(i, i + numCols);
      row.forEach((cell, j) => {
        const x = colX[j];
        // cell background + border
        doc.setFillColor(252, 253, 255);
        doc.setDrawColor(bdCol[0], bdCol[1], bdCol[2]);
        doc.rect(x, y, colW, rH, "FD");
        if (!cell) return;

        // label
        doc.setFont("helvetica", "bold");
        doc.setFontSize(6.5);
        doc.setTextColor(lblCol[0], lblCol[1], lblCol[2]);
        doc.text((cell.label || "").toUpperCase(), x + 3.5, y + 5);

        // value color
        const vc = cell.color === "orange" ? orange
                 : cell.color === "green"  ? green
                 : cell.color === "navy"   ? navy
                 : [20, 30, 48];
        doc.setFont("helvetica", "bold");
        doc.setFontSize(cell.big ? 11 : 9.5);
        doc.setTextColor(vc[0], vc[1], vc[2]);
        doc.text(safeStr(cell.value || "—"), x + 3.5, y + 11.5, { maxWidth: colW - 6 });
      });
      y += rH;
    }
    y += 1;
  };

  // ══════════════════════════════════════════════════
  // OUR COMPANY DETAILS
  // ══════════════════════════════════════════════════
  if (po.companyName || po.companyGst || po.companyAddress) {
    sectionHeader("OUR COMPANY DETAILS");
    drawGrid([
      { label: "Company Name", value: po.companyName  || "—" },
      { label: "GSTIN",        value: po.companyGst   || "—" },
      { label: "Address",      value: po.companyAddress|| "—" },
    ]);
    y += 2;
  }

  // ══════════════════════════════════════════════════
  // PO DETAILS
  // ══════════════════════════════════════════════════
  sectionHeader("PURCHASE ORDER DETAILS");
  drawGrid([
    { label: "PO Number",    value: po.id,                          color: "navy" },
    { label: "Vendor",       value: supplierName },
    { label: "PO Amount",    value: fmtA(po.totalValue || 0),       color: "navy", big: true },
    { label: "PO Date",      value: fmtD(po.date) },
    { label: "Project / Site", value: po.project || po.location || "—" },
    { label: "",             value: "" },
  ]);
  y += 2;

  // ══════════════════════════════════════════════════
  // GRN & DELIVERY
  // ══════════════════════════════════════════════════
  sectionHeader("GRN & DELIVERY");
  const invoiceNo = grn?.invoiceNo || grn?.challan || po.payment?.ref || po.invoice?.number || "—";
  drawGrid([
    { label: "GRN No.",          value: grn?.id || "—",              color: "navy" },
    { label: "Receipt Date",     value: fmtD(grn?.date || po.date) },
    { label: "Received By",      value: grn?.personName || "—" },
    { label: "GRN Status",       value: po.status || "—" },
    { label: "Invoice / Challan",value: invoiceNo },
    { label: "",                 value: "" },
  ]);
  y += 2;

  // ══════════════════════════════════════════════════
  // RECEIVED MATERIALS
  // ══════════════════════════════════════════════════
  let grnValue = 0;
  const matBody = (grn?.items || []).map((gi) => {
    const rcv = gi.received ?? gi.qty ?? 0;
    const poItem = (po.items || []).find(pi =>
      (pi.sku && gi.sku && pi.sku === gi.sku) ||
      (pi.materialName || "").toLowerCase() === (gi.itemName || "").toLowerCase()
    );
    const rate = gi.rate || poItem?.rate || 0;
    const gstPct = poItem?.gstPct || 0;
    const incl = (poItem?.gstType || "Exclusive") === "Inclusive";
    const amt = incl ? rcv * rate : rcv * rate * (1 + gstPct / 100);
    grnValue += amt;
    return [gi.itemName || gi.name || "—", safeStr(poItem?.qty || "—"), String(rcv), fmtA(rate), fmtA(amt)];
  });

  if (matBody.length > 0) {
    checkPage(20);
    sectionHeader("RECEIVED MATERIALS");
    autoTable(doc, {
      startY: y,
      margin: { left: 10, right: 10 },
      head: [["MATERIAL", "ORDERED", "RECEIVED", "RATE", "AMOUNT"]],
      body: matBody,
      foot: [["", "", "", "TOTAL VALUE", fmtA(grnValue)]],
      styles: {
        fontSize: 8.5,
        cellPadding: { top: 3.5, bottom: 3.5, left: 4, right: 4 },
        lineColor: bdCol, lineWidth: 0.2,
        textColor: [25, 38, 55],
      },
      headStyles: { fillColor: navy, textColor: 255, fontStyle: "bold", fontSize: 8 },
      footStyles: { fillColor: navy, textColor: 255, fontStyle: "bold", fontSize: 9 },
      alternateRowStyles: { fillColor: [245, 248, 252] },
      columnStyles: {
        0: { cellWidth: 78 },
        1: { halign: "center", cellWidth: 22 },
        2: { halign: "center", cellWidth: 22, fontStyle: "bold" },
        3: { halign: "right",  cellWidth: 32 },
        4: { halign: "right",  cellWidth: 32, fontStyle: "bold", textColor: navy },
      },
    });
    y = doc.lastAutoTable.finalY + 5;
  }

  // ══════════════════════════════════════════════════
  // PAYMENT SUMMARY
  // ══════════════════════════════════════════════════
  const totalPaid = po.totalPaid || po.payment?.partialAmount || po.payment?.amountPaid || 0;
  const payable   = Math.max(0, grnValue - totalPaid);
  sectionHeader("PAYMENT SUMMARY");
  const payCells = totalPaid > 0 ? [
    { label: "PO Grand Total",            value: fmtA(po.totalValue || 0), color: "navy",   big: true },
    { label: "Received Value (Incl. GST)", value: fmtA(grnValue),           color: "navy",   big: true },
    { label: "Already Paid",              value: fmtA(totalPaid),           color: "green",  big: true },
    { label: "Remaining Payable",         value: fmtA(payable),             color: "orange", big: true },
    { label: "", value: "" }, { label: "", value: "" },
  ] : [
    { label: "PO Grand Total",            value: fmtA(po.totalValue || 0), color: "navy",   big: true },
    { label: "Received Value (Incl. GST)", value: fmtA(grnValue),           color: "navy",   big: true },
    { label: "Payable Amount",            value: fmtA(payable),             color: "orange", big: true },
  ];
  drawGrid(payCells);
  y += 4;

  // ══════════════════════════════════════════════════
  // BANK DETAILS (side-by-side)
  // ══════════════════════════════════════════════════
  if (vBank || cBank) {
    checkPage(40);
    const both = !!(vBank && cBank);
    const bW   = both ? 93 : 190;
    const bankStartY = y;

    const drawBankTable = (bankData, isVendor, startX, tableWidth) => {
      doc.setFillColor(navy[0], navy[1], navy[2]);
      doc.rect(startX, bankStartY, tableWidth, 7.5, "F");
      doc.setTextColor(255);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(8);
      doc.text(
        isVendor ? "VENDOR BANK DETAILS" : "OUR BANK DETAILS",
        startX + tableWidth / 2, bankStartY + 5, { align: "center" }
      );
      autoTable(doc, {
        startY: bankStartY + 7.5,
        margin: {
          left: startX,
          right: both ? (isVendor ? 107 : 10) : 10,
        },
        body: isVendor ? [
          ["A/C HOLDER", bankData.holder || "—"],
          ["BANK NAME",  bankData.bank   || "—"],
          ["ACCOUNT NO.", bankData.account || "—"],
          ["IFSC / BRANCH", [bankData.ifsc, bankData.branch].filter(Boolean).join(" · ") || "—"],
        ] : [
          ["A/C HOLDER",  bankData.accountHolderName || "—"],
          ["BANK NAME",   bankData.bankName          || "—"],
          ["ACCOUNT NO.", bankData.accountNumber     || "—"],
          ["IFSC / BRANCH", [bankData.ifscCode, bankData.branch].filter(Boolean).join(" · ") || "—"],
        ],
        styles: {
          fontSize: 8.5,
          cellPadding: { top: 3, bottom: 3, left: 4, right: 4 },
          lineColor: bdCol, lineWidth: 0.2,
        },
        columnStyles: {
          0: { cellWidth: 38, fontStyle: "bold", fillColor: [237, 242, 248], textColor: [60, 75, 100] },
          1: { fontStyle: "bold", textColor: [20, 30, 48] },
        },
      });
    };

    if (vBank) drawBankTable(vBank, true,  10, both ? bW : 190);
    if (cBank) drawBankTable(cBank, false, both ? 107 : 10, bW);

    y = doc.lastAutoTable.finalY + 6;
  }

  // ══════════════════════════════════════════════════
  // SIGNATURE ROW
  // ══════════════════════════════════════════════════
  checkPage(46);
  const sigDefs = [
    { title: "PREPARED BY",  name: "",              date: "" },
    { title: "VERIFIED BY",  name: po.verifiedBy    || "", date: po.verifiedAt      ? fmtD(po.verifiedAt)      : "" },
    { title: "APPROVED BY",  name: po.billApprovedBy|| "", date: po.billApprovedDate? fmtD(po.billApprovedDate): "" },
  ];
  const sigW = 62;
  const sigH = 40;
  sigDefs.forEach((col, i) => {
    const x = 10 + i * (sigW + 2);
    doc.setDrawColor(bdCol[0], bdCol[1], bdCol[2]);
    doc.setFillColor(248, 251, 255);
    doc.rect(x, y, sigW, sigH, "FD");
    // title bar
    doc.setFillColor(navy[0], navy[1], navy[2]);
    doc.rect(x, y, sigW, 8, "F");
    doc.setTextColor(255);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(7.5);
    doc.text(col.title, x + sigW / 2, y + 5.2, { align: "center" });
    // name
    if (col.name) {
      doc.setTextColor(navy[0], navy[1], navy[2]);
      doc.setFontSize(9);
      doc.text(col.name, x + sigW / 2, y + 17, { align: "center", maxWidth: sigW - 6 });
    }
    // signature line
    doc.setDrawColor(170);
    doc.setLineWidth(0.35);
    doc.line(x + 7, y + 28, x + sigW - 7, y + 28);
    doc.setTextColor(160);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(6.5);
    doc.text("Signature & Date", x + sigW / 2, y + 32, { align: "center" });
    // date below signature line
    if (col.date) {
      doc.setTextColor(80);
      doc.setFontSize(7);
      doc.text(col.date, x + sigW / 2, y + 37.5, { align: "center" });
    }
  });
  y += sigH + 6;

  // ══════════════════════════════════════════════════
  // FOOTER
  // ══════════════════════════════════════════════════
  checkPage(10);
  doc.setFillColor(navy[0], navy[1], navy[2]);
  doc.rect(10, y, 190, 1.2, "F");
  y += 5;
  doc.setTextColor(lblCol[0], lblCol[1], lblCol[2]);
  doc.setFont("helvetica", "italic");
  doc.setFontSize(7.5);
  doc.text("This is a system-generated Transaction Detail from the IMS Portal.", 105, y, { align: "center" });

  doc.save(`Transaction-${po.id}.pdf`);
}, "generateTransactionDetailPDF");

const generateGRNReportPDF = /* @__PURE__ */ __name((rows, meta = {}) => {
  const doc = new jsPDF({ orientation: "l", unit: "mm", format: "a4" });
  const pc = [26, 54, 93];
  const fmtDate = (d) => {
    if (!d) return "N/A";
    try { return new Intl.DateTimeFormat("en-IN", { day: "2-digit", month: "short", year: "numeric" }).format(new Date(d)); }
    catch { return String(d); }
  };

  doc.setFontSize(16);
  doc.setTextColor(0, 0, 0);
  doc.setFont("helvetica", "bold");
  doc.text("GOODS RECEIPT NOTE (GRN) — REPORT", 14, 16);

  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(100);
  doc.text(`Generated: ${new Intl.DateTimeFormat("en-IN", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }).format(new Date(meta.generatedAt || Date.now()))}`, 14, 22);

  const filterParts = [
    meta.search && `Search: "${meta.search}"`,
    (meta.startDate || meta.endDate) && `Period: ${meta.startDate || "any"} → ${meta.endDate || "any"}`,
    meta.project && `Project: ${meta.project}`,
    meta.supplier && `Supplier: ${meta.supplier}`,
    meta.status && `Status: ${meta.status}`,
  ].filter(Boolean);
  let y = 22;
  if (filterParts.length) {
    y += 6;
    doc.text(`Filters: ${filterParts.join(" | ")}`, 14, y);
  }
  y += 6;
  doc.setTextColor(0, 0, 0);
  doc.setFont("helvetica", "bold");
  doc.text(`Total GRNs: ${rows.length}`, 14, y);

  autoTable(doc, {
    startY: y + 5,
    margin: { left: 14, right: 14 },
    head: [["GRN No.", "PO No.", "Date", "Project", "Store", "Supplier", "Challan / Inv", "MR No.", "Status"]],
    body: rows.map((r) => [
      safeStr(r.id),
      safeStr(r.poId),
      fmtDate(r.date),
      safeStr(r.project),
      safeStr(r.store),
      safeStr(r.supplier),
      safeStr(r.challan),
      safeStr(r.mrNo),
      safeStr(r.status),
    ]),
    styles: { fontSize: 8.5, cellPadding: 1.8, lineColor: [220, 220, 220], lineWidth: 0.1 },
    headStyles: { fillColor: [pc[0], pc[1], pc[2]], textColor: 255, fontStyle: "bold" },
  });

  const suffix = meta.project ? `_${String(meta.project).replace(/\s+/g, "_")}` : "";
  doc.save(`GRN_Report${suffix}_${fmtDate(meta.generatedAt || Date.now()).replace(/\s+/g, "_")}.pdf`);
}, "generateGRNReportPDF");

const generateGRNPDF = /* @__PURE__ */ __name((grn, supplier) => {
  const doc = new jsPDF({ orientation: "p", unit: "mm", format: "a4" });
  const pc = [26, 54, 93];
  const fmtDate = (d) => {
    if (!d) return "N/A";
    try { return new Intl.DateTimeFormat("en-IN", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }).format(new Date(d)); }
    catch { return String(d); }
  };

  let y = 8;
  const checkPage = (h) => { if (y + h > 285) { doc.addPage(); y = 8; } };

  // ── Header ──
  doc.setFillColor(pc[0], pc[1], pc[2]);
  doc.rect(10, y, 190, 10, "F");
  doc.setTextColor(255);
  doc.setFontSize(13);
  doc.setFont("helvetica", "bold");
  doc.text("GOODS RECEIPT NOTE", 105, y + 7, { align: "center" });
  y += 10;

  // ── Info rows ──
  const rowH = 7;
  const c1 = 10, c2 = 52, c3 = 110, c4 = 152;
  const drawRow = (l1, v1, l2, v2) => {
    checkPage(rowH);
    doc.setFontSize(8);
    doc.setFillColor(248, 250, 252);
    doc.rect(c1, y, 42, rowH, "FD");
    doc.rect(c2, y, 58, rowH, "D");
    doc.rect(c3, y, 42, rowH, "FD");
    doc.rect(c4, y, 48, rowH, "D");
    doc.setTextColor(80); doc.setFont("helvetica", "bold");
    doc.text(String(l1).toUpperCase(), c1 + 2, y + 4.8);
    doc.setTextColor(0); doc.setFont("helvetica", "normal");
    doc.text(safeStr(v1), c2 + 2, y + 4.8, { maxWidth: 54 });
    doc.setTextColor(80); doc.setFont("helvetica", "bold");
    doc.text(String(l2).toUpperCase(), c3 + 2, y + 4.8);
    doc.setTextColor(0);
    doc.text(safeStr(v2), c4 + 2, y + 4.8, { maxWidth: 44 });
    y += rowH;
  };

  const vendorName = supplier ? (supplier.companyName || supplier.name || supplierId) : (grn.vendor || grn.supplier || "N/A");
  const supplierId = grn.vendor || grn.supplier || "";
  const vendorGST  = supplier ? (supplier.gstNumber || supplier.gst || "N/A") : "N/A";

  drawRow("GRN No.",     grn.id,              "Vendor Name",  vendorName);
  drawRow("PO Ref.",     grn.poId || "N/A",   "Vendor GST",   vendorGST);
  drawRow("MR Ref.",     grn.mrNo || "N/A",   "Receipt Date", fmtDate(grn.date));
  drawRow("Project/Site",grn.project || "N/A","Challan / Inv", grn.challan || "N/A");
  drawRow("Store",       grn.store || "N/A",  "Received By",  grn.personName || "N/A");

  y += 3;

  // ── Items table ──
  checkPage(16);
  doc.setFillColor(pc[0], pc[1], pc[2]);
  doc.rect(10, y, 190, 8, "F");
  doc.setTextColor(255); doc.setFontSize(9.5);
  doc.text("RECEIVED MATERIALS", 105, y + 5.5, { align: "center" });
  y += 8;

  autoTable(doc, {
    startY: y,
    margin: { left: 10, right: 10 },
    head: [["#", "MATERIAL DESCRIPTION", "SKU", "ORDERED", "RECEIVED", "VARIANCE", "UNIT"]],
    body: (grn.items || []).map((item, i) => {
      const ordered  = item.ordered  || 0;
      const received = item.received || 0;
      const variance = received - ordered;
      return [
        i + 1,
        item.itemName || item.name || item.material || "—",
        item.sku || "—",
        ordered,
        received,
        variance === 0 ? "0" : (variance > 0 ? `+${variance}` : String(variance)),
        item.unit || "—",
      ];
    }),
    styles: { fontSize: 8.5, cellPadding: 1.8, lineColor: [220, 220, 220], lineWidth: 0.1 },
    headStyles: { fillColor: [pc[0], pc[1], pc[2]], textColor: 255, fontStyle: "bold" },
    columnStyles: {
      0: { cellWidth: 8,  halign: "center" },
      3: { cellWidth: 20, halign: "center" },
      4: { cellWidth: 22, halign: "center", fontStyle: "bold" },
      5: { cellWidth: 22, halign: "center" },
      6: { cellWidth: 18, halign: "center" },
    },
  });
  y = doc.lastAutoTable.finalY + 4;

  // ── Delivery history (multi-shipment) ──
  if (grn.receipts && grn.receipts.length > 0) {
    checkPage(16);
    doc.setFillColor(pc[0], pc[1], pc[2]);
    doc.rect(10, y, 190, 8, "F");
    doc.setTextColor(255); doc.setFontSize(9.5);
    doc.text(`DELIVERY HISTORY (${grn.receipts.length + 1} SHIPMENTS)`, 105, y + 5.5, { align: "center" });
    y += 8;

    const shipments = [
      { label: "Shipment 1 (Initial)", date: grn.date, challan: grn.challan, person: grn.personName,
        items: (grn.items || []).map((item) => {
          const later = (grn.receipts || []).reduce((s, r) => {
            const ri = (r.items || []).find((ri) => ri.sku === item.sku);
            return s + (ri?.received || 0);
          }, 0);
          return { name: item.itemName || item.name || "—", received: (item.received || 0) - later, unit: item.unit || "" };
        }).filter((i) => i.received > 0),
      },
      ...(grn.receipts || []).map((r, idx) => ({
        label: `Shipment ${idx + 2}`,
        date: r.date, challan: r.challan, person: r.personName,
        items: (r.items || []).map((ri) => {
          const base = (grn.items || []).find((gi) => gi.sku === ri.sku);
          return { name: ri.itemName || base?.itemName || "—", received: ri.received || 0, unit: base?.unit || "" };
        }),
      })),
    ];

    autoTable(doc, {
      startY: y,
      margin: { left: 10, right: 10 },
      head: [["SHIPMENT", "DATE", "CHALLAN", "MATERIAL", "QTY", "BY"]],
      body: shipments.flatMap((s) =>
        s.items.map((item) => [s.label, fmtDate(s.date), s.challan || "—", item.name, `+${item.received} ${item.unit}`, s.person || "—"])
      ),
      styles: { fontSize: 8, cellPadding: 1.5, lineColor: [220, 220, 220], lineWidth: 0.1 },
      headStyles: { fillColor: [pc[0], pc[1], pc[2]], textColor: 255, fontStyle: "bold" },
    });
    y = doc.lastAutoTable.finalY + 4;
  }

  doc.save(`${grn.id}_GRN.pdf`);
}, "generateGRNPDF");

export {
  generatePOPDF,
  generatePOPDFBlob,
  generateGRNPDF,
  generateGRNReportPDF,
  generateTransactionDetailPDF,
};
