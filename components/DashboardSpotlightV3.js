// components/DashboardSpotlightV3.js
// ============================================================
// DASHBOARD SPOTLIGHT ENGINE V3 — FULL FILE
// - 4 Mask Panels (perfect cutout highlight)
// - No blur over spotlight target
// - Async selector retry (fixes missing Step 3)
// - Auto-scroll centering
// - Smooth transitions
// ============================================================

import { useCallback, useEffect, useRef, useState } from "react";

const SPOTLIGHT_PADDING = 24;
const MAX_RETRIES = 12;
const RETRY_DELAY_MS = 120;

/* ============================================================
   HELPERS
============================================================ */
function getScrollOffsets() {
  const scrollY = window.scrollY || window.pageYOffset || 0;
  const scrollX = window.scrollX || window.pageXOffset || 0;
  return { scrollX, scrollY };
}

function buildRectFromElement(el) {
  if (!el) return null;

  const bounds = el.getBoundingClientRect();
  const { scrollX, scrollY } = getScrollOffsets();

  const width = bounds.width || 0;
  const height = bounds.height || 0;

  if (width === 0 || height === 0) return null;

  return {
    top: bounds.top + scrollY - SPOTLIGHT_PADDING,
    left: bounds.left + scrollX - SPOTLIGHT_PADDING,
    width: width + SPOTLIGHT_PADDING * 2,
    height: height + SPOTLIGHT_PADDING * 2,
  };
}

/* ============================================================
   HOOK: useDashboardSpotlightV3
============================================================ */
export function useDashboardSpotlightV3(stepConfig = []) {
  const [index, setIndex] = useState(-1);
  const [rect, setRect] = useState(null);

  const stepsRef = useRef(stepConfig || []);
  const retryTimerRef = useRef(null);

  useEffect(() => {
    stepsRef.current = stepConfig || [];
  }, [stepConfig]);

  const total = stepsRef.current.length;
  const isActive = index >= 0 && index < total;
  const currentStep = isActive ? stepsRef.current[index] : null;

  const clearRetryTimer = useCallback(() => {
    if (retryTimerRef.current) {
      clearTimeout(retryTimerRef.current);
      retryTimerRef.current = null;
    }
  }, []);

  const computeRectForCurrentStep = useCallback(
    (attempt = 0, opts = { scrollIntoView: true }) => {
      if (!currentStep?.selector) {
        setRect(null);
        return;
      }

      const el = document.querySelector(currentStep.selector);

      if (!el) {
        if (attempt < MAX_RETRIES) {
          retryTimerRef.current = setTimeout(() => {
            computeRectForCurrentStep(attempt + 1, opts);
          }, RETRY_DELAY_MS);
        }
        return;
      }

      if (opts.scrollIntoView) {
        try {
          el.scrollIntoView({
            behavior: "smooth",
            block: "center",
            inline: "center",
          });
        } catch {}
      }

      retryTimerRef.current = setTimeout(() => {
        const rectResult = buildRectFromElement(el);
        if (!rectResult && attempt < MAX_RETRIES) {
          computeRectForCurrentStep(attempt + 1, { scrollIntoView: false });
          return;
        }

        if (rectResult) setRect(rectResult);
      }, 80);
    },
    [currentStep]
  );

  useEffect(() => {
    clearRetryTimer();

    if (!isActive) {
      setRect(null);
      return;
    }

    computeRectForCurrentStep(0, { scrollIntoView: true });

    const handleResize = () => computeRectForCurrentStep(0, { scrollIntoView: false });
    const handleScroll = () => computeRectForCurrentStep(0, { scrollIntoView: false });

    window.addEventListener("resize", handleResize);
    window.addEventListener("scroll", handleScroll, true);

    return () => {
      clearRetryTimer();
      window.removeEventListener("resize", handleResize);
      window.removeEventListener("scroll", handleScroll, true);
    };
  }, [isActive, currentStep, computeRectForCurrentStep, clearRetryTimer]);

  const start = useCallback(
    (startIndex = 0) => {
      if (!stepsRef.current.length) return;
      const safeIndex = Math.min(Math.max(0, startIndex), stepsRef.current.length - 1);
      setIndex(safeIndex);
    },
    []
  );

  const next = useCallback(() => {
    setIndex((prev) => (prev + 1 < stepsRef.current.length ? prev + 1 : -1));
  }, []);

  const back = useCallback(() => {
    setIndex((prev) => (prev > 0 ? prev - 1 : prev));
  }, []);

  const stop = useCallback(() => {
    setIndex(-1);
    setRect(null);
    clearRetryTimer();
  }, [clearRetryTimer]);

  return {
    isActive,
    currentStep,
    rect,
    index,
    total,
    start,
    next,
    back,
    stop,
  };
}

/* ============================================================
   OVERLAY: 4-PANEL MASK CUTOUT
============================================================ */
export function DashboardSpotlightOverlayV3({
  isActive,
  rect,
  step,
  index,
  total,
  onNext,
  onBack,
  onClose,
}) {
  if (!isActive || !rect || !step) return null;

  const { top, left, width, height } = rect;
  const isLast = index + 1 === total;

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 99999, pointerEvents: "none" }}>
      {/* TOP MASK */}
      <div
        onClick={onClose}
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          width: "100%",
          height: top,
          background: "rgba(0,0,0,0.55)",
          pointerEvents: "auto",
          transition: "all 160ms ease-out",
        }}
      />

      {/* LEFT MASK */}
      <div
        onClick={onClose}
        style={{
          position: "absolute",
          top,
          left: 0,
          width: left,
          height,
          background: "rgba(0,0,0,0.55)",
          pointerEvents: "auto",
          transition: "all 160ms ease-out",
        }}
      />

      {/* RIGHT MASK */}
      <div
        onClick={onClose}
        style={{
          position: "absolute",
          top,
          left: left + width,
          right: 0,
          height,
          background: "rgba(0,0,0,0.55)",
          pointerEvents: "auto",
          transition: "all 160ms ease-out",
        }}
      />

      {/* BOTTOM MASK */}
      <div
        onClick={onClose}
        style={{
          position: "absolute",
          top: top + height,
          left: 0,
          width: "100%",
          bottom: 0,
          background: "rgba(0,0,0,0.55)",
          pointerEvents: "auto",
          transition: "all 160ms ease-out",
        }}
      />

      {/* HIGHLIGHT BOX */}
      <div
        style={{
          position: "absolute",
          top,
          left,
          width,
          height,
          borderRadius: 22,
          boxShadow: "0 0 0 3px rgba(255,255,255,0.9), 0 0 50px rgba(0,200,255,0.7)",
          pointerEvents: "none",
          transition: "all 160ms ease-out",
        }}
      />

      {/* INFO PANEL */}
      <div
        style={{
          position: "absolute",
          top: top + height + 20,
          left,
          width: Math.min(width, 420),
          maxWidth: 420,
          background: "rgba(12,15,22,0.95)",
          border: "1px solid rgba(255,255,255,0.12)",
          borderRadius: 22,
          padding: "18px 22px",
          color: "#EAF0FF",
          boxShadow: "0 20px 60px rgba(0,0,0,0.6)",
          pointerEvents: "auto",
          transition: "all 160ms ease-out",
        }}
      >
        <div
          style={{
            fontSize: 11,
            textTransform: "uppercase",
            opacity: 0.6,
            marginBottom: 4,
            letterSpacing: 0.8,
          }}
        >
          Step {index + 1}/{total}
        </div>

        <div style={{ fontSize: 18, fontWeight: 600, marginBottom: 8 }}>{step.title}</div>

        {step.description && (
          <div style={{ fontSize: 14, lineHeight: 1.45, opacity: 0.9 }}>{step.description}</div>
        )}

        <div style={{ display: "flex", justifyContent: "space-between", marginTop: 16 }}>
          <button
            onClick={onClose}
            style={{
              fontSize: 12,
              padding: "6px 14px",
              borderRadius: 999,
              border: "1px solid rgba(255,255,255,0.3)",
              background: "transparent",
              color: "#fff",
              cursor: "pointer",
            }}
          >
            Skip
          </button>

          <div style={{ display: "flex", gap: 10 }}>
            <button
              onClick={onBack}
              disabled={index === 0}
              style={{
                fontSize: 12,
                padding: "6px 16px",
                borderRadius: 999,
                border: "1px solid rgba(255,255,255,0.3)",
                background:
                  index === 0 ? "rgba(255,255,255,0.1)" : "rgba(255,255,255,0.15)",
                color: index === 0 ? "rgba(255,255,255,0.3)" : "#fff",
                cursor: index === 0 ? "default" : "pointer",
              }}
            >
              Back
            </button>

            <button
              onClick={onNext}
              style={{
                fontSize: 12,
                padding: "6px 18px",
                borderRadius: 999,
                border: "none",
                background: isLast
                  ? "linear-gradient(135deg, #00FF9D, #00C27A)"
                  : "linear-gradient(135deg, #2DD4FF, #2BBFE8)",
                color: "#00131F",
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              {isLast ? "Finish" : "Next →"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ============================================================
   PUBLIC COMPONENT WRAPPER
============================================================ */
export function DashboardSpotlightV3({ spotlight }) {
  if (!spotlight?.isActive) return null;

  return (
    <DashboardSpotlightOverlayV3
      isActive={spotlight.isActive}
      rect={spotlight.rect}
      step={spotlight.currentStep}
      index={spotlight.index}
      total={spotlight.total}
      onNext={spotlight.next}
      onBack={spotlight.back}
      onClose={spotlight.stop}
    />
  );
}
