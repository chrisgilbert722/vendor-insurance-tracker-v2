// after your existing save to /api/onboarding/company...
try {
  const aiRes = await fetch("/api/onboarding/ai/org-intel", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      orgId: activeOrgId,        // get from context or props
      companyName,
      industry,
      hqLocation,
      vendorCount,
    }),
  });

  const aiJson = await aiRes.json();
  if (aiJson.ok) {
    // Optionally store aiJson.ai in local state, context, or even localStorage
    // so you can pre-fill Insurance & Rules steps.
    console.log("AI org intel:", aiJson.ai);
  }
} catch (e) {
  console.error("AI org-intel error:", e);
}
