import React, { useState } from "react";
import { Download, Eye, Pencil } from "lucide-react";
import { Modal, Btn } from "./ui";
import { POViewModal } from "../pages/po/POViewModal";
import { useAppStore } from "../store";
import { formatDateTime } from "../utils";
import { cn } from "../lib/utils";
import toast from "react-hot-toast";
import { generateGRNPDF } from "../utils/pdfGenerator";

export function GRNDetailModal({ grn, grns, onClose, onEditReceipt }) {
  const { suppliers, pos, hasPermission } = useAppStore();
  const [previewImage, setPreviewImage] = useState(null);
  const [previewPO, setPreviewPO] = useState(null);
  const [activeIdx, setActiveIdx] = useState(0);

  const list = (grns && grns.length ? grns : (grn ? [grn] : []));
  const active = list[Math.min(activeIdx, list.length - 1)];
  if (!active) return null;
  const grnDoc = active;

  const supplierId = grnDoc.vendor || grnDoc.supplier;
  const supplier = suppliers?.find((s) => s.id === supplierId);

  return (
    <>
      <Modal
        title={`GRN Details: ${grnDoc.id}`}
        extraWide
        onClose={onClose}
        footer={
          <div className="flex justify-end gap-3 w-full">
            <Btn
              label="Download PDF"
              icon={Download}
              className="rounded-xl h-10 text-[13px] bg-[#F97316] text-white border-none shadow-lg shadow-orange-500/20"
              onClick={() => generateGRNPDF(grnDoc, supplier)}
            />
            <Btn
              label="Close"
              outline
              className="rounded-xl h-10 w-28 text-[13px]"
              onClick={onClose}
            />
          </div>
        }
      >
        <div className="space-y-8 pb-4">
          {/* GRN batch picker — shown when this PO has more than one GRN document */}
          {list.length > 1 && (
            <div className="flex items-center gap-2 flex-wrap">
              {list.map((g, idx) => (
                <button
                  key={g.id}
                  onClick={() => setActiveIdx(idx)}
                  className={cn(
                    "px-3 py-1.5 rounded-full text-[11px] font-bold border transition-colors",
                    idx === activeIdx
                      ? "bg-orange-500 text-white border-orange-500"
                      : "bg-gray-50 dark:bg-gray-800 text-gray-500 dark:text-gray-400 border-gray-200 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-700"
                  )}
                >
                  {g.id} <span className="opacity-70 font-medium">· {formatDateTime(g.date)}</span>
                </button>
              ))}
            </div>
          )}
          {/* Header info grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-0 border border-gray-100 dark:border-gray-800 rounded-2xl overflow-hidden shadow-sm">
            {/* Left: Receipt info */}
            <div className="divide-y divide-gray-100 dark:divide-gray-800 bg-white dark:bg-gray-900">
              <div className="bg-gray-50/50 dark:bg-gray-800/30 p-2.5 font-black text-[10px] text-gray-500 flex items-center gap-2">
                <div className="w-1.5 h-3.5 bg-orange-500 rounded-full" />
                Receipt information
              </div>
              <div className="grid grid-cols-12 items-center">
                <div className="col-span-4 p-3 text-[11px] font-bold text-gray-400 border-r border-gray-100 dark:border-gray-800">Grn no.</div>
                <div className="col-span-8 px-4 py-2.5 text-[14px] font-black text-gray-900 dark:text-white tracking-tight">{grnDoc.id}</div>
              </div>
              <div className="grid grid-cols-12 items-center">
                <div className="col-span-4 p-3 text-[11px] font-bold text-gray-400 border-r border-gray-100 dark:border-gray-800">Po reference</div>
                <div className="col-span-8 px-4 py-2 flex items-center gap-2">
                  <span className="text-[13px] font-bold text-orange-600 dark:text-orange-400">{grnDoc.poId}</span>
                  {(() => {
                    const po = pos?.find((p) => p.id === grnDoc.poId);
                    return po ? (
                      <button
                        onClick={() => setPreviewPO(po)}
                        className="flex items-center gap-1 text-[9px] font-black text-blue-600 bg-blue-50 dark:bg-blue-500/10 px-2 py-0.5 rounded border border-blue-100 dark:border-blue-500/20 hover:bg-blue-100 transition-colors"
                      >
                        <Eye className="w-3 h-3" /> View PO
                      </button>
                    ) : null;
                  })()}
                </div>
              </div>
              <div className="grid grid-cols-12 items-center">
                <div className="col-span-4 p-3 text-[11px] font-bold text-gray-400 border-r border-gray-100 dark:border-gray-800">Mr reference</div>
                <div className="col-span-8 px-4 py-2 text-[13px] font-medium text-gray-700 dark:text-gray-300">
                  <span className="bg-gray-100 dark:bg-gray-800 px-2 py-0.5 rounded text-[11px] font-bold text-gray-600 dark:text-gray-400">
                    {grnDoc.mrNo || "N/a"}
                  </span>
                </div>
              </div>
              <div className="grid grid-cols-12 items-center">
                <div className="col-span-4 p-3 text-[11px] font-bold text-gray-400 border-r border-gray-100 dark:border-gray-800">Project/site</div>
                <div className="col-span-8 px-4 py-2.5 text-[13px] font-bold text-gray-900 dark:text-white">{grnDoc.project}</div>
              </div>
              {grnDoc.store && (
                <div className="grid grid-cols-12 items-center">
                  <div className="col-span-4 p-3 text-[11px] font-bold text-gray-400 border-r border-gray-100 dark:border-gray-800">Store / Godown</div>
                  <div className="col-span-8 px-4 py-2.5 text-[13px] font-bold text-orange-600 dark:text-orange-400">{grnDoc.store}</div>
                </div>
              )}
            </div>

            {/* Right: Supplier & delivery */}
            <div className="divide-y divide-gray-100 dark:divide-gray-800 border-l border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900">
              <div className="bg-gray-50/50 dark:bg-gray-800/30 p-2.5 font-black text-[10px] text-gray-500 flex items-center gap-2">
                <div className="w-1.5 h-3.5 bg-orange-500 rounded-full" />
                Supplier &amp; source
              </div>
              <div className="grid grid-cols-12 items-center">
                <div className="col-span-4 p-3 text-[11px] font-bold text-gray-400 border-r border-gray-100 dark:border-gray-800">Vendor name</div>
                <div className="col-span-8 px-4 py-2.5 flex flex-col">
                  <span className="text-[14px] font-black text-gray-900 dark:text-white tracking-tight">
                    {supplier ? supplier.companyName || supplier.name : supplierId}
                  </span>
                  {supplier && (supplier.gstNumber || supplier.gst) && (
                    <span className="text-[11px] text-gray-400 font-medium italic">
                      GST: {supplier.gstNumber || supplier.gst}
                    </span>
                  )}
                </div>
              </div>
              <div className="grid grid-cols-12 items-center">
                <div className="col-span-4 p-3 text-[11px] font-bold text-gray-400 border-r border-gray-100 dark:border-gray-800">Receipt date</div>
                <div className="col-span-8 px-4 py-2.5 text-[13px] font-bold text-gray-700 dark:text-gray-300">
                  {formatDateTime(grnDoc.date)}
                </div>
              </div>
              <div className="grid grid-cols-12 items-center">
                <div className="col-span-4 p-3 text-[11px] font-bold text-gray-400 border-r border-gray-100 dark:border-gray-800">Challan/inv</div>
                <div className="col-span-8 px-4 py-2.5 text-[13px] font-black text-blue-500 dark:text-blue-400">
                  {grnDoc.challan}
                </div>
              </div>
              <div className="grid grid-cols-12 items-center">
                <div className="col-span-4 p-3 text-[11px] font-bold text-gray-400 border-r border-gray-100 dark:border-gray-800">Received by</div>
                <div className="col-span-8 px-4 py-2.5 text-[13px] font-bold text-gray-900 dark:text-white">
                  {grnDoc.personName || "System auto"}
                </div>
              </div>
            </div>
          </div>

          {/* Items Table */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <div className="h-0.5 w-4 bg-[#F97316]" />
              <h3 className="text-[12px] font-bold text-gray-900 dark:text-white">Received materials</h3>
            </div>
            <div className="overflow-hidden rounded-xl border border-gray-100 dark:border-gray-800">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-gray-50/90 dark:bg-gray-800/90 backdrop-blur-md border-b border-[#E8ECF0] dark:border-gray-800">
                      <th className="px-5 py-3 text-[11px] font-bold text-[#6B7280] dark:text-gray-400 tracking-wider">Material description</th>
                      <th className="px-5 py-3 text-[11px] font-bold text-[#6B7280] dark:text-gray-400 tracking-wider text-center">Ordered</th>
                      <th className="px-5 py-3 text-[11px] font-bold text-[#6B7280] dark:text-gray-400 tracking-wider text-center">Received</th>
                      <th className="px-5 py-3 text-[11px] font-bold text-[#6B7280] dark:text-gray-400 tracking-wider text-center">Variance</th>
                      <th className="px-5 py-3 text-[11px] font-bold text-[#6B7280] dark:text-gray-400 tracking-wider text-center">Unit</th>
                      <th className="px-5 py-3 text-[11px] font-bold text-[#6B7280] dark:text-gray-400 tracking-wider">Photos</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50 dark:divide-gray-800">
                    {(grnDoc.items || []).map((item, idx) => {
                      const ordered = item.ordered || 0;
                      const received = item.received || 0;
                      const variance = received - ordered;
                      return (
                        <tr key={idx} className="hover:bg-gray-50/30 dark:hover:bg-gray-800/10 transition-colors">
                          <td className="px-5 py-4">
                            <div className="flex flex-col">
                              <span className="text-[13px] font-semibold text-gray-900 dark:text-white">
                                {item.itemName || item.name || item.material || "Unknown Item"}
                              </span>
                              <span className="text-[11px] text-gray-500">{item.sku}</span>
                            </div>
                          </td>
                          <td className="px-5 py-4 text-center text-[13px] text-gray-500">{ordered}</td>
                          <td className="px-5 py-4 text-center">
                            <span className="text-[14px] font-bold text-gray-900 dark:text-white">{received}</span>
                          </td>
                          <td className="px-5 py-4 text-center">
                            <span className={cn("text-[12px] font-bold", variance === 0 ? "text-gray-400" : variance > 0 ? "text-emerald-600 dark:text-emerald-400" : "text-red-500 dark:text-red-400")}>
                              {variance > 0 ? `+${variance}` : variance}
                            </span>
                          </td>
                          <td className="px-5 py-4 text-center">
                            <span className="text-[11px] font-medium text-gray-500 bg-gray-100 dark:bg-gray-800 px-2 py-0.5 rounded">{item.unit}</span>
                          </td>
                          <td className="px-5 py-4">
                            <div className="flex -space-x-2 overflow-hidden">
                              {(item.images || []).map((img, i) => (
                                <img key={i} src={img} className="w-8 h-8 rounded-lg border-2 border-white dark:border-gray-900 shadow-sm object-cover cursor-pointer hover:z-10 hover:scale-110 transition-transform" onClick={() => setPreviewImage(img)} referrerPolicy="no-referrer" />
                              ))}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* Delivery History */}
          {(grnDoc.receipts?.length > 0) && (
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <div className="h-0.5 w-4 bg-[#F97316]" />
                <h3 className="text-[12px] font-bold text-gray-900 dark:text-white">
                  Delivery history ({(grnDoc.receipts?.length || 0) + 1} shipments)
                </h3>
              </div>
              <div className="relative pl-1">
                <div className="absolute left-3.5 top-5 bottom-5 w-0.5 bg-gray-200 dark:bg-gray-700" />
                <div className="space-y-3">

                  {/* Shipment 1 — Initial */}
                  {(() => {
                    const initPhotos = [
                      ...(grnDoc.challanPhotos || []),
                      ...(grnDoc.personPhotos || []),
                      ...(grnDoc.items || []).flatMap(gi => gi.images || []),
                    ];
                    return (
                      <div className="flex gap-3 items-start">
                        <div className="w-7 h-7 rounded-full bg-orange-500 border-2 border-white dark:border-gray-900 flex items-center justify-center shrink-0 shadow-sm z-10">
                          <span className="text-[9px] font-bold text-white">1</span>
                        </div>
                        <div className="flex-1 bg-gray-50 dark:bg-gray-800/50 rounded-xl p-3 border border-gray-100 dark:border-gray-800">
                          {/* Header */}
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-[12px] font-bold text-gray-900 dark:text-white">Shipment 1 (Initial)</span>
                            <div className="flex items-center gap-2 flex-wrap justify-end">
                              {grnDoc.docType && <span className="text-[9px] font-bold text-purple-600 bg-purple-50 dark:bg-purple-500/10 px-2 py-0.5 rounded border border-purple-100 dark:border-purple-500/20">{grnDoc.docType}</span>}
                              {grnDoc.challan && <span className="text-[10px] font-medium text-blue-500 bg-blue-50 dark:bg-blue-900/20 px-2 py-0.5 rounded">{grnDoc.challan}</span>}
                              {grnDoc.mrNo && <span className="text-[9px] font-bold text-gray-500 bg-gray-100 dark:bg-gray-700 px-2 py-0.5 rounded">{grnDoc.mrNo}</span>}
                              <span className="text-[10px] text-gray-400">{formatDateTime(grnDoc.date)}</span>
                            </div>
                          </div>

                          {/* Items */}
                          <div className="space-y-1.5 mb-2">
                            {(grnDoc.items || []).map((item, i) => {
                              const laterReceipts = (grnDoc.receipts || []).reduce((sum, r) => {
                                const ri = (r.items || []).find((ri) => ri.sku === item.sku);
                                return sum + (ri?.received || 0);
                              }, 0);
                              const initialReceived = (item.received || 0) - laterReceipts;
                              if (initialReceived <= 0) return null;
                              const itemPhotos = item.images || [];
                              return (
                                <div key={i} className="flex items-center justify-between text-[12px]">
                                  <span className="text-gray-600 dark:text-gray-400">{item.itemName}</span>
                                  <div className="flex items-center gap-2">
                                    {itemPhotos.map((img, pi) => (
                                      <img key={pi} src={img} onClick={() => setPreviewImage(img)} referrerPolicy="no-referrer"
                                        className="w-6 h-6 rounded object-cover cursor-pointer border border-gray-200 dark:border-gray-700 hover:scale-110 transition-transform" />
                                    ))}
                                    <span className="font-bold text-gray-900 dark:text-white">+{initialReceived} <span className="text-gray-400 font-normal">{item.unit}</span></span>
                                  </div>
                                </div>
                              );
                            })}
                          </div>

                          {/* By */}
                          {grnDoc.personName && (
                            <p className="text-[10px] text-gray-400 mb-2">By: <span className="font-medium text-gray-600 dark:text-gray-300">{grnDoc.personName}</span></p>
                          )}

                          {/* Photos strip */}
                          {initPhotos.length > 0 && (
                            <div className="flex gap-2 flex-wrap mt-2 pt-2 border-t border-gray-100 dark:border-gray-700">
                              {initPhotos.map((img, pi) => (
                                <div key={pi} onClick={() => setPreviewImage(img)}
                                  className="w-14 h-14 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden cursor-pointer hover:scale-105 transition-transform shadow-sm bg-white dark:bg-gray-900">
                                  <img src={img} referrerPolicy="no-referrer" className="w-full h-full object-cover" />
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })()}

                  {/* Shipments 2, 3, … — Additional receipts */}
                  {(grnDoc.receipts || []).map((receipt, idx) => {
                    const rcptPhotos = [
                      ...(receipt.challanPhotos || []),
                      ...(receipt.personPhotos || []),
                      ...(receipt.items || []).flatMap(ri => ri.images || []),
                    ];
                    return (
                      <div key={idx} className="flex gap-3 items-start">
                        <div className="w-7 h-7 rounded-full bg-emerald-500 border-2 border-white dark:border-gray-900 flex items-center justify-center shrink-0 shadow-sm z-10">
                          <span className="text-[9px] font-bold text-white">{idx + 2}</span>
                        </div>
                        <div className="flex-1 bg-gray-50 dark:bg-gray-800/50 rounded-xl p-3 border border-gray-100 dark:border-gray-800">
                          {/* Header */}
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-[12px] font-bold text-gray-900 dark:text-white">Shipment {idx + 2}</span>
                            <div className="flex items-center gap-2 flex-wrap justify-end">
                              {receipt.docType && <span className="text-[9px] font-bold text-purple-600 bg-purple-50 dark:bg-purple-500/10 px-2 py-0.5 rounded border border-purple-100 dark:border-purple-500/20">{receipt.docType}</span>}
                              {receipt.challan && <span className="text-[10px] font-medium text-blue-500 bg-blue-50 dark:bg-blue-900/20 px-2 py-0.5 rounded">{receipt.challan}</span>}
                              {receipt.mrNo && <span className="text-[9px] font-bold text-gray-500 bg-gray-100 dark:bg-gray-700 px-2 py-0.5 rounded">{receipt.mrNo}</span>}
                              <span className="text-[10px] text-gray-400">{formatDateTime(receipt.date)}</span>
                              {onEditReceipt && hasPermission("EDIT_GRN_RECEIPT") && (
                                <button onClick={() => onEditReceipt(idx, receipt)} className="p-1 rounded text-orange-500 hover:bg-orange-50 dark:hover:bg-orange-900/20 transition-colors" title="Edit shipment">
                                  <Pencil className="w-3 h-3" />
                                </button>
                              )}
                            </div>
                          </div>

                          {/* Items */}
                          <div className="space-y-1.5 mb-2">
                            {(receipt.items || []).map((item, i) => {
                              const itemPhotos = item.images || [];
                              const unit = grnDoc.items?.find(gi => gi.sku === item.sku)?.unit || "";
                              return (
                                <div key={i} className="flex items-center justify-between text-[12px]">
                                  <span className="text-gray-600 dark:text-gray-400">{item.itemName}</span>
                                  <div className="flex items-center gap-2">
                                    {itemPhotos.map((img, pi) => (
                                      <img key={pi} src={img} onClick={() => setPreviewImage(img)} referrerPolicy="no-referrer"
                                        className="w-6 h-6 rounded object-cover cursor-pointer border border-gray-200 dark:border-gray-700 hover:scale-110 transition-transform" />
                                    ))}
                                    <span className="font-bold text-gray-900 dark:text-white">+{item.received} <span className="text-gray-400 font-normal">{unit}</span></span>
                                  </div>
                                </div>
                              );
                            })}
                          </div>

                          {/* By */}
                          {receipt.personName && (
                            <p className="text-[10px] text-gray-400 mb-2">By: <span className="font-medium text-gray-600 dark:text-gray-300">{receipt.personName}</span></p>
                          )}

                          {/* Photos strip */}
                          {rcptPhotos.length > 0 && (
                            <div className="flex gap-2 flex-wrap mt-2 pt-2 border-t border-gray-100 dark:border-gray-700">
                              {rcptPhotos.map((img, pi) => (
                                <div key={pi} onClick={() => setPreviewImage(img)}
                                  className="w-14 h-14 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden cursor-pointer hover:scale-105 transition-transform shadow-sm bg-white dark:bg-gray-900">
                                  <img src={img} referrerPolicy="no-referrer" className="w-full h-full object-cover" />
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
        </div>
      </Modal>

      {/* Image lightbox */}
      {previewImage && (
        <div className="fixed inset-0 z-[9999] bg-black/80 flex items-center justify-center p-4" onClick={() => setPreviewImage(null)}>
          <img src={previewImage} className="max-w-full max-h-full rounded-xl shadow-2xl" referrerPolicy="no-referrer" />
        </div>
      )}

      {/* PO preview */}
      {previewPO && <POViewModal po={previewPO} onClose={() => setPreviewPO(null)} />}
    </>
  );
}
