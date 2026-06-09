var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });
import { ChevronLeft, ChevronRight } from "lucide-react";
const Pagination = /* @__PURE__ */ __name(({ currentPage, totalPages, onPageChange }) => {
  if (totalPages <= 1) return null;
  const pages = Array.from({ length: totalPages }, (_, i) => i + 1);
  const visiblePages = pages.filter(
    (p) => p === 1 || p === totalPages || p >= currentPage - 1 && p <= currentPage + 1
  );
  const renderPages = /* @__PURE__ */ __name(() => {
    const elements = [];
    let lastPage = 0;
    for (const p of visiblePages) {
      if (lastPage && p - lastPage > 1) {
        elements.push(<span key={`dots-${p}`} className="px-2 text-gray-400 dark:text-gray-500">...</span>);
      }
      elements.push(
        <button
          key={p}
          onClick={() => onPageChange(p)}
          className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${currentPage === p ? "bg-blue-600 text-white dark:bg-blue-500" : "text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800"}`}
        >
          {p}
        </button>
      );
      lastPage = p;
    }
    return elements;
  }, "renderPages");
  return <div className="flex items-center justify-center space-x-2 py-4">
      <button
    onClick={() => onPageChange(Math.max(1, currentPage - 1))}
    disabled={currentPage === 1}
    className="p-1 rounded-md text-gray-400 dark:text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
  >
        <ChevronLeft className="w-5 h-5" />
      </button>
      
      <div className="flex items-center space-x-1">
        {renderPages()}
      </div>

      <button
    onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}
    disabled={currentPage === totalPages}
    className="p-1 rounded-md text-gray-400 dark:text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
  >
        <ChevronRight className="w-5 h-5" />
      </button>
    </div>;
}, "Pagination");
export {
  Pagination
};
