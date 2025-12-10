// components/onboarding/AiWizardPanel.js
// AI Onboarding Wizard V5 — Master Step Router

import VendorsUploadStep from "./VendorsUploadStep";
import VendorsMapStep from "./VendorsMapStep";
import VendorsAnalyzeStep from "./VendorsAnalyzeStep";
import ContractsUploadStep from "./ContractsUploadStep";
import RulesGenerateStep from "./RulesGenerateStep";
import FixPlansStep from "./FixPlansStep";
import CompanyProfileStep from "./CompanyProfileStep";
import TeamBrokersStep from "./TeamBrokersStep";
import ReviewLaunchStep from "./ReviewLaunchStep";

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
       STEP 4 — AI Vendor Analysis
    --------------------------------------------------------- */
    case "vendors-analyze":
      return (
        <VendorsAnalyzeStep
          orgId={orgId}
          wizardState={wizardState}
          setWizardState={setWizardState}
        />
      );

    /* ---------------------------------------------------------
       STEP 5 — Contract Upload & AI Requirement Extraction
    --------------------------------------------------------- */
    case "contracts-upload":
      return (
        <ContractsUploadStep
          orgId={orgId}
          wizardState={wizardState}
          setWizardState={setWizardState}
        />
      );

    /* ---------------------------------------------------------
       STEP 6 — AI Rule Generation ( + Apply Rules to Engine V5)
    --------------------------------------------------------- */
    case "rules-generate":
      return (
        <RulesGenerateStep
          orgId={orgId}
          wizardState={wizardState}
          setWizardState={setWizardState}
        />
      );

    /* ---------------------------------------------------------
       STEP 7 — AI Fix Plans
    --------------------------------------------------------- */
    case "fix-plans":
      return (
        <FixPlansStep
          orgId={orgId}
          wizardState={wizardState}
          setWizardState={setWizardState}
        />
      );

    /* ---------------------------------------------------------
       STEP 8 — Company Profile (Branding + Contacts)
    --------------------------------------------------------- */
    case "company-profile":
      return (
        <CompanyProfileStep
          orgId={orgId}
          wizardState={wizardState}
          setWizardState={setWizardState}
        />
      );

    /* ---------------------------------------------------------
       STEP 9 — Team & Broker Invitations
    --------------------------------------------------------- */
    case "team-brokers":
      return (
        <TeamBrokersStep
          wizardState={wizardState}
          setWizardState={setWizardState}
        />
      );

    /* ---------------------------------------------------------
       STEP 10 — Final Review & Launch System
    --------------------------------------------------------- */
    case "review-launch":
      return (
        <ReviewLaunchStep
          orgId={orgId}
          wizardState={wizardState}
          setWizardState={setWizardState}
        />
      );

    /* ---------------------------------------------------------
       DEFAULT — Not yet wired
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
            This wizard step (<strong>{step.id}</strong>) has not been wired in
            yet. Please continue—you’re ahead of competitors even without it.
          </p>
        </div>
      );
  }
}
