import React, { useState, useEffect, useCallback, useRef } from "react";
import { X, ChevronLeft, ChevronRight, ZoomIn, ZoomOut, RotateCcw, Download } from "lucide-react";

export function ImageViewer({ images = [], index = 0, title, onClose }) {
  const [current, setCurrent] = useState(Math.min(index, images.length - 1));
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [dragging, setDragging] = useState(false);
  const [animKey, setAnimKey] = useState(0);
  const [slideDir, setSlideDir] = useState("none"); // "left" | "right" | "none"
  const dragStart = useRef(null);
  const thumbRef = useRef(null);

  const total = images.length;
  const src = images[current];

  const resetZoom = () => { setZoom(1); setPan({ x: 0, y: 0 }); };

  const navigate = useCallback((dir) => {
    setSlideDir(dir);
    setAnimKey(k => k + 1);
    setCurrent(c => dir === "left" ? (c + 1) % total : (c - 1 + total) % total);
    resetZoom();
  }, [total]);

  const prev = useCallback(() => navigate("right"), [navigate]);
  const next = useCallback(() => navigate("left"), [navigate]);

  const goTo = (i) => {
    if (i === current) return;
    setSlideDir(i > current ? "left" : "right");
    setAnimKey(k => k + 1);
    setCurrent(i);
    resetZoom();
  };

  const zoomIn  = () => setZoom(z => Math.min(z + 0.5, 5));
  const zoomOut = () => setZoom(z => { const nz = Math.max(z - 0.5, 1); if (nz === 1) setPan({ x: 0, y: 0 }); return nz; });

  // Scroll active thumbnail into view
  useEffect(() => {
    if (!thumbRef.current) return;
    const el = thumbRef.current.children[current];
    if (el) el.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "center" });
  }, [current]);

  useEffect(() => {
    const handle = (e) => {
      if (e.key === "Escape")       onClose();
      else if (e.key === "ArrowLeft"  && total > 1) prev();
      else if (e.key === "ArrowRight" && total > 1) next();
      else if (e.key === "+" || e.key === "=") zoomIn();
      else if (e.key === "-")       zoomOut();
      else if (e.key === "0")       resetZoom();
    };
    window.addEventListener("keydown", handle);
    return () => window.removeEventListener("keydown", handle);
  }, [prev, next, onClose, total]);

  const onWheel = (e) => {
    e.preventDefault();
    if (e.deltaY < 0) zoomIn();
    else zoomOut();
  };

  const onMouseDown = (e) => {
    if (zoom <= 1) return;
    setDragging(true);
    dragStart.current = { x: e.clientX - pan.x, y: e.clientY - pan.y };
  };
  const onMouseMove = (e) => {
    if (!dragging || !dragStart.current) return;
    setPan({ x: e.clientX - dragStart.current.x, y: e.clientY - dragStart.current.y });
  };
  const onMouseUp = () => { setDragging(false); dragStart.current = null; };

  const slideAnim = slideDir === "left"
    ? "imgSlideLeft 0.28s cubic-bezier(0.4,0,0.2,1) forwards"
    : slideDir === "right"
    ? "imgSlideRight 0.28s cubic-bezier(0.4,0,0.2,1) forwards"
    : "imgFadeIn 0.3s ease forwards";

  return (
    <div
      className="fixed inset-0 z-[9999] flex flex-col"
      style={{ background: "rgba(0,0,0,0.97)", animation: "overlayIn 0.2s ease forwards" }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <style>{`
        @keyframes overlayIn {
          from { opacity: 0; }
          to   { opacity: 1; }
        }
        @keyframes imgFadeIn {
          from { opacity: 0; transform: scale(0.97); }
          to   { opacity: 1; transform: scale(1); }
        }
        @keyframes imgSlideLeft {
          from { opacity: 0; transform: translateX(48px) scale(0.97); }
          to   { opacity: 1; transform: translateX(0) scale(1); }
        }
        @keyframes imgSlideRight {
          from { opacity: 0; transform: translateX(-48px) scale(0.97); }
          to   { opacity: 1; transform: translateX(0) scale(1); }
        }
        @keyframes arrowPop {
          0%   { transform: translateY(-50%) scale(0.8); opacity: 0; }
          100% { transform: translateY(-50%) scale(1);   opacity: 1; }
        }
        @keyframes thumbsIn {
          from { opacity: 0; transform: translateY(12px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>

      {/* Header */}
      <div
        className="flex items-center justify-between px-4 py-3 shrink-0"
        style={{ background: "linear-gradient(to bottom, rgba(0,0,0,0.7), transparent)" }}
      >
        <div className="flex items-center gap-3">
          {title && <span className="text-[13px] font-bold text-white/90 tracking-wide">{title}</span>}
          {total > 1 && (
            <span className="text-[11px] font-black text-white/50 bg-white/10 px-2.5 py-1 rounded-full tabular-nums">
              {current + 1} / {total}
            </span>
          )}
        </div>
        <div className="flex items-center gap-1">
          <button onClick={zoomOut} disabled={zoom <= 1}
            className="p-2 rounded-lg text-white/60 hover:text-white hover:bg-white/10 disabled:opacity-25 transition-all duration-150"
            title="Zoom out (-)"><ZoomOut className="w-4 h-4" />
          </button>
          <span className="text-[11px] font-mono text-white/40 w-10 text-center tabular-nums">{Math.round(zoom * 100)}%</span>
          <button onClick={zoomIn} disabled={zoom >= 5}
            className="p-2 rounded-lg text-white/60 hover:text-white hover:bg-white/10 disabled:opacity-25 transition-all duration-150"
            title="Zoom in (+)"><ZoomIn className="w-4 h-4" />
          </button>
          <button onClick={resetZoom} disabled={zoom === 1}
            className="p-2 rounded-lg text-white/60 hover:text-white hover:bg-white/10 disabled:opacity-25 transition-all duration-150"
            title="Reset (0)"><RotateCcw className="w-3.5 h-3.5" />
          </button>
          <a href={src} target="_blank" rel="noopener noreferrer" download
            className="p-2 rounded-lg text-white/60 hover:text-white hover:bg-white/10 transition-all duration-150"
            title="Download"><Download className="w-4 h-4" />
          </a>
          <button onClick={onClose}
            className="p-2 rounded-lg text-white/60 hover:text-white hover:bg-white/10 transition-all duration-150 ml-1"
            title="Close (Esc)"><X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Image area */}
      <div
        className="flex-1 relative overflow-hidden flex items-center justify-center select-none"
        onWheel={onWheel}
        onMouseDown={onMouseDown}
        onMouseMove={onMouseMove}
        onMouseUp={onMouseUp}
        onMouseLeave={onMouseUp}
        style={{ cursor: zoom > 1 ? (dragging ? "grabbing" : "grab") : "zoom-in" }}
        onClick={() => { if (zoom === 1) zoomIn(); }}
      >
        {/* Animated image wrapper */}
        <div
          key={animKey}
          style={{ animation: slideAnim, display: "flex", alignItems: "center", justifyContent: "center", maxWidth: "100%", maxHeight: "100%" }}
        >
          <img
            src={src}
            alt={title || `Image ${current + 1}`}
            referrerPolicy="no-referrer"
            draggable={false}
            style={{
              transform: `scale(${zoom}) translate(${pan.x / zoom}px, ${pan.y / zoom}px)`,
              transition: dragging ? "none" : "transform 0.22s cubic-bezier(0.4,0,0.2,1)",
              maxWidth: "100%",
              maxHeight: "100%",
              objectFit: "contain",
              borderRadius: zoom > 1 ? 4 : 12,
              boxShadow: "0 32px 80px rgba(0,0,0,0.7)",
            }}
          />
        </div>
      </div>

      {/* Navigation arrows */}
      {total > 1 && (
        <>
          <button
            onClick={(e) => { e.stopPropagation(); prev(); }}
            onMouseDown={e => e.stopPropagation()}
            className="absolute left-3 top-1/2 -translate-y-1/2 w-11 h-11 rounded-full text-white flex items-center justify-center backdrop-blur-sm border border-white/10 hover:border-white/30 transition-all duration-200 hover:scale-110 active:scale-95"
            style={{ background: "rgba(0,0,0,0.55)", animation: "arrowPop 0.25s cubic-bezier(0.34,1.56,0.64,1) forwards" }}
            title="Previous (←)"
            aria-label="Previous image"
          >
            <ChevronLeft className="w-6 h-6" />
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); next(); }}
            onMouseDown={e => e.stopPropagation()}
            className="absolute right-3 top-1/2 -translate-y-1/2 w-11 h-11 rounded-full text-white flex items-center justify-center backdrop-blur-sm border border-white/10 hover:border-white/30 transition-all duration-200 hover:scale-110 active:scale-95"
            style={{ background: "rgba(0,0,0,0.55)", animation: "arrowPop 0.25s cubic-bezier(0.34,1.56,0.64,1) forwards" }}
            title="Next (→)"
            aria-label="Next image"
          >
            <ChevronRight className="w-6 h-6" />
          </button>
        </>
      )}

      {/* Bottom bar: dots + thumbnails */}
      <div
        className="shrink-0 flex flex-col items-center gap-3 pb-4 pt-2"
        style={{ background: "linear-gradient(to top, rgba(0,0,0,0.7), transparent)", animation: "thumbsIn 0.3s 0.1s ease both" }}
      >
        {/* Dot indicators */}
        {total > 1 && (
          <div className="flex justify-center gap-1.5">
            {images.map((_, i) => (
              <button
                key={i}
                onClick={() => goTo(i)}
                style={{
                  width: i === current ? 20 : 8,
                  height: 8,
                  borderRadius: 99,
                  background: i === current ? "#f97316" : "rgba(255,255,255,0.25)",
                  transition: "all 0.25s cubic-bezier(0.4,0,0.2,1)",
                  border: "none",
                  cursor: "pointer",
                  padding: 0,
                }}
                aria-label={`Go to image ${i + 1}`}
              />
            ))}
          </div>
        )}

        {/* Thumbnail strip (3+ images) */}
        {total >= 3 && (
          <div
            ref={thumbRef}
            className="flex gap-2 px-4 overflow-x-auto"
            style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
          >
            {images.map((img, i) => (
              <button
                key={i}
                onClick={() => goTo(i)}
                style={{
                  flexShrink: 0,
                  width: 52,
                  height: 52,
                  borderRadius: 10,
                  overflow: "hidden",
                  border: i === current ? "2.5px solid #f97316" : "2px solid rgba(255,255,255,0.15)",
                  opacity: i === current ? 1 : 0.45,
                  transform: i === current ? "scale(1.08)" : "scale(1)",
                  transition: "all 0.22s cubic-bezier(0.4,0,0.2,1)",
                  padding: 0,
                  cursor: "pointer",
                }}
              >
                <img src={img} alt="" referrerPolicy="no-referrer" style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
