// components/onboarding/AiWizardPanel.js
// AI Onboarding Wizard V5 — Step Router
// Receives: { orgId, step, stepIndex, totalSteps, wizardState, setWizardState }

import VendorsUploadStep from "./VendorsUploadStep";
import VendorsMapStep from "./VendorsMapStep";

export default function AiWizardPanel({
  orgId,
  step,
  stepIndex,
  totalSteps,
  wizardState,
  setWizardState,
}) {
  if (!step) return null;

  switch (step.id) {
    /* ---------------------------------------------------------
       STEP 2 — CSV Upload
    --------------------------------------------------------- */
    case "vendors-upload":
      return (
        <VendorsUploadStep
          orgId={orgId}
          wizardState={wizardState}
          setWizardState={setWizardState}
        />
      );

    /* ---------------------------------------------------------
       STEP 3 — Column Mapping
    --------------------------------------------------------- */
    case "vendors-map":
      return (
        <VendorsMapStep
          wizardState={wizardState}
          setWizardState={setWizardState}
        />
      );

    /* ---------------------------------------------------------
       FUTURE STEPS (PLACEHOLDERS UNTIL WIRED)
    --------------------------------------------------------- */
    // case "vendors-analyze":
    // case "contracts-upload":
    // case "rules-generate":
    // case "fix-plans":
    // case "company-profile":
    // case "team-brokers":
    // case "review-launch":

    /* ---------------------------------------------------------
       DEFAULT — Placeholder until we wire the next step
    --------------------------------------------------------- */
    default:
      return (
        <div
          style={{
            padding: 18,
            borderRadius: 18,
            background: "rgba(15,23,42,0.94)",
            border: "1px solid rgba(51,65,85,0.9)",
            boxShadow: "0 10px 30px rgba(0,0,0,0.55)",
            fontSize: 13,
            color: "#9ca3af",
          }}
        >
          <h2
            style={{
              marginTop: 0,
              fontSize: 18,
              fontWeight: 600,
              color: "#e5e7eb",
            }}
          >
            {step.title || step.label}
          </h2>

          <p style={{ marginTop: 6 }}>
            This wizard step (<strong>{step.id}</strong>) hasn’t been wired yet.
            You can continue using the wizard while we connect the remaining
            steps.
          </p>
        </div>
      );
  }
}
