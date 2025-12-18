// pages/admin/vendors.js
// ============================================================
// ADMIN → VENDORS (ROUTE WRAPPER)
// Purpose:
// - Fix /admin/vendors 404
// - Reuse existing /vendors page
// - Client-only, zero server imports
// ============================================================

import VendorsPage from "../vendors";

export default function AdminVendorsWrapper() {
  return <VendorsPage />;
}
