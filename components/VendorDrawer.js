import { useEffect } from "react";
import {
  X as CloseIcon,
  FileText as FileIcon,
  Users as VendorIcon,
  AlertTriangle,
  ShieldCheck,
} from "@phosphor-icons/react";

export default function VendorDrawer({ vendor, policies, onClose }) {
  // Close drawer on ESC key
  useEffect(() => {
    const handleEsc = (e) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", handleEsc);
    return () => window.removeEventListener("keydown", handleEsc);
  }, [onClose]);

  if (!vendor) return null;

  return (
    <div className="fixed inset-0 z-[100] flex">
      {/* Click-outside overlay */}
      <div
        className="flex-1 bg-black/30 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Drawer Panel */}
      <div className="w-full max-w-md bg-white h-full shadow-2xl border-l border-slate-200 animate-slideIn">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-slate-200">
          <div>
            <p className="text-xs uppercase tracking-[0.15em] text-slate-500">
              Vendor
            </p>
            <h2 className="text-xl font-semibold text-slate-900">
              {vendor.name}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 transition"
          >
            <CloseIcon size={22} weight="bold" />
          </button>
        </div>

        {/* Vendor Meta */}
        <div className="p-5 space-y-4">
          <div className="bg-slate-50 rounded-xl border border-slate-200 p-4">
            <div className="flex items-center gap-3 mb-3">
              <VendorIcon size={22} weight="bold" className="text-slate-700" />
              <div>
                <p className="text-xs text-slate-600 leading-none">
                  Contact
                </p>
              </div>
            </div>

            <div className="space-y-1 text-sm text-slate-700">
              <p>Email: {vendor.email || "—"}</p>
              <p>Phone: {vendor.phone || "—"}</p>
              <p>Address: {vendor.address || "—"}</p>
            </div>
          </div>

          {/* Policies */}
          <div>
            <h3 className="text-sm font-semibold text-slate-800 mb-2">
              Policies
            </h3>

            <div className="space-y-2 max-h-[300px] overflow-y-auto pr-2">
              {policies.length === 0 ? (
                <p className="text-xs text-slate-500">
                  No policies found for this vendor.
                </p>
              ) : (
                policies.map((p) => (
                  <div
                    key={p.id}
                    className="p-3 border border-slate-200 rounded-xl bg-slate-50 hover:bg-slate-100 transition"
                  >
                    <p className="text-xs uppercase tracking-[0.15em] text-slate-500">
                      {p.coverage_type || "Coverage"}
                    </p>
                    <p className="text-sm font-medium">
                      {p.policy_number || "—"}
                    </p>
                    <p className="text-xs text-slate-500">
                      {p.carrier || "—"}  
                      <span className="mx-1">•</span>
                      Expires {p.expiration_date || "—"}
                    </p>
                  </div>
                ))
              )}
            </div>
          </div>

          <a
            href={`/vendor/${vendor.id}`}
            className="mt-4 block text-center bg-slate-900 text-white py-2 rounded-xl text-sm font-medium hover:bg-slate-700 transition"
          >
            View Full Profile →
          </a>
        </div>
      </div>

      {/* Animations */}
      <style jsx>{`
        @keyframes slideIn {
          from {
            transform: translateX(100%);
            opacity: 0;
          }
          to {
            transform: translateX(0);
            opacity: 1;
          }
        }
        .animate-slideIn {
          animation: slideIn 0.25s ease-out forwards;
        }
      `}</style>
    </div>
  );
}
