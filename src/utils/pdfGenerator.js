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
  drawRow("Company Name", po.companyName || "HEAVEN HEIGHTS PRIVATE LIMITED", "Vendor Name", supplier?.companyName || supplier?.name || po.supplier || "NA");
  drawRow("Company GSTIN", po.companyGst || "23AABCH6973R1ZX", "Vendor Address", supplier?.address || po.vendorAddress || "NA");
  drawRow("Company Addr", po.companyAddress || "N.A., Gulmohar City, Near New Collectorate, New City Centre, Gwalior, MP, 474011", "Vendor Contact", String(po.vendorContact || supplier?.mobile || supplier?.phone || "NA"));
  drawRow("Internal MR No.", po.mrId || "NA", "Vendor Email ID", po.vendorEmail || supplier?.email || "NA");
  drawRow("Work Type", po.workType || "NA", "Requirement By", po.requirementBy || "NA");
  drawRow("Applied Area", po.applicatedArea || "NA", "Site/Location", po.project || po.location || "NA");
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
      5: { halign: "right" }
    }
  });
  y = doc.lastAutoTable.finalY + 2;
  checkPage(45);
  const subtotalLabel = `Items Subtotal (${gstType === "Inclusive" ? "Incl." : "Excl."} GST)`;
  const gstLabel = `GST on Items (${po.items[0]?.gstPct || 18}% \xB7 ${gstType})`;
  const freightLabel = `Freight Charges (${po.freightGstPct ?? 18}% GST \xB7 ${po.freightGstType || "Exclusive"})`;
  const loadingLabel = `Loading Charges (${po.loadingGstPct ?? 18}% GST \xB7 ${po.loadingGstType || "Exclusive"})`;
  const unloadingLabel = `Unloading Charges (${po.unloadingGstPct ?? 18}% GST \xB7 ${po.unloadingGstType || "Exclusive"})`;
  const darkColor = [40, 40, 40];
  const rowBg = [248, 250, 252];
  const totalsBody = [
    [
      { content: subtotalLabel, styles: { textColor: darkColor, fillColor: rowBg } },
      { content: `Rs. ${fmtRs(subTotal)}`, styles: { halign: "right", fontStyle: "bold", fillColor: rowBg, textColor: darkColor } }
    ],
    [
      { content: gstLabel, styles: { textColor: darkColor } },
      { content: `Rs. ${fmtRs(gstTotal)}`, styles: { halign: "right", textColor: darkColor } }
    ],
    [
      { content: freightLabel, styles: { textColor: darkColor } },
      { content: `Rs. ${fmtRs(freightTotal)}`, styles: { halign: "right", textColor: darkColor } }
    ],
    [
      { content: loadingLabel, styles: { textColor: darkColor } },
      { content: `Rs. ${fmtRs(loadingTotal)}`, styles: { halign: "right", textColor: darkColor } }
    ],
    [
      { content: unloadingLabel, styles: { textColor: darkColor } },
      { content: `Rs. ${fmtRs(unloadingTotal)}`, styles: { halign: "right", textColor: darkColor } }
    ],
    // Grand total row — dark-blue background
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
    const timelineGrandTotal = po.totalValue || po.paymentTimelines.reduce((s, pt) => s + (pt.ifPayable || 0), 0);
    autoTable(doc, {
      startY: y,
      margin: { left: 10, right: 10 },
      head: [["DATE", "TYPE", "MODE", "AMOUNT", "GST %", "IF PAYABLE"]],
      body: [
        ...po.paymentTimelines.map((pt) => [
          fmtPtDate(pt.date),
          (pt.type || "").toUpperCase(),
          (pt.mode || "").toUpperCase(),
          pt.amount ? fmtRs(pt.amount) : "0.00",
          (() => {
            const gstLabel = (pt.gstType || "Exclusive").toUpperCase();
            if (gstLabel === "INCLUSIVE") return "INCLUSIVE";
            const g = String(pt.gstPct || "").toLowerCase().trim();
            const amt = pt.amount || 0;
            const payable = pt.ifPayable || 0;
            if (amt > 0 && payable > amt + 0.5) {
              const pct = (payable / amt - 1) * 100;
              const pctStr = Number.isInteger(pct) ? pct : pct.toFixed(1);
              return `${pctStr}% EXCLUSIVE`;
            }
            if (!g || g === "-" || g === "exclusive") return "\u2014";
            const num = parseFloat(g.replace("%", ""));
            return !isNaN(num) && num > 0 ? `${num}% EXCLUSIVE` : "\u2014";
          })(),
          pt.ifPayable ? fmtRs(pt.ifPayable) : "0.00"
        ]),
        ["GRAND TOTAL", "", "", "", "", fmtRs(timelineGrandTotal)]
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
        1: { cellWidth: 48 },
        2: { cellWidth: 32 },
        3: { cellWidth: 25, halign: "right" },
        4: { cellWidth: 22, halign: "center" },
        5: { cellWidth: 30, halign: "right", fontStyle: "bold" }
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
  const approvers = settings.approvers || {};
  autoTable(doc, {
    startY: y,
    margin: { left: 10, right: 10 },
    head: [["PURCHASE COORD", "AGM (L1)", "PM / HEAD (L2)", "DIRECTOR (L3)"]],
    body: [
      [approvers.purchaseCoord || "Purchase Coord", approvers.l1 || "L1 Approver", approvers.l2 || "L2 Approver", approvers.l3 || "L3 Approver"],
      ["Date: " + formatPrettyDate(po.date), "Date: " + (po.approvalL1At ? formatPrettyDate(po.approvalL1At) : "Pending"), "Date: " + (po.approvalL2At ? formatPrettyDate(po.approvalL2At) : "Pending"), "Date: " + (po.approvalL3At ? formatPrettyDate(po.approvalL3At) : "Pending")],
      [
        "INVOKE: INITIATED",
        "L1: " + (po.status === "rejected" ? "REJECTED" : po.approvalL1 || "PENDING"),
        "L2: " + (po.status === "rejected" ? "REJECTED" : po.approvalL2 || "PENDING"),
        "L3: " + (po.status === "rejected" ? "REJECTED" : po.approvalL3 || "PENDING")
      ]
    ],
    styles: { fontSize: 8, cellPadding: 1.5, lineColor: [220, 220, 220], lineWidth: 0.1 },
    headStyles: { fillColor: [248, 250, 252], textColor: 50, fontStyle: "bold", halign: "center" }
  });
  y = doc.lastAutoTable.finalY + 2;
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
export {
  generatePOPDF,
  generatePOPDFBlob
};
