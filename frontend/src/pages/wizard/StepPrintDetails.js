import React, { useRef, useState } from 'react';
import { PrintShootDetailsFull, PrintReelsFull, PrintPhotosFull, PrintStoryboardPage } from './PrintDetailsSections';
import { PrintBrandHeader } from './PrintableSections';
import { printWithBranding } from '../../utils/printUtils';
import { shootPlanService } from '../../api/services';

/**
 * Complete, print-ready snapshot of Shoot Details / Reels / Photos -- reads
 * the exact same `plan` data those three steps write to (via
 * PrintDetailsSections.js), so any edit made there shows up here immediately
 * without a separate data source. Reuses Review & Approval's `rr-review-*`
 * styling and window.print() flow.
 */
export default function StepPrintDetails({ plan, onChanged }) {
  const contentRef = useRef(null);
  const [preparing, setPreparing] = useState(false);

  const handlePrint = async () => {
    setPreparing(true);
    try {
      const title = plan?.title ? `${plan.title} — Print Details — Rush Republic` : 'Print Details — Rush Republic';
      await printWithBranding(title, contentRef.current);
      // First preview marks this step done in the sidebar -- shared across
      // every viewer of the plan, same as every other step's checkmark, not
      // just remembered in this one browser.
      if (plan?.id && !plan.print_previewed_at) {
        await shootPlanService.patch(plan.id, { print_previewed_at: new Date().toISOString() });
        onChanged?.();
      }
    } finally {
      setPreparing(false);
    }
  };

  return (
    <>
      <div className="rr-wiz-step-title">Print Details</div>
      <div className="rr-print-hide" style={{ fontSize: 13, color: 'rgba(0,0,0,.55)', marginBottom: 20 }}>
        A complete, print-ready snapshot of Shoot Details, Reels, and Photos — always reflects the current
        saved data for this plan, including every uploaded image, moodboard, storyboard, and color palette.
      </div>

      <div ref={contentRef}>
        <PrintBrandHeader />
        <PrintShootDetailsFull plan={plan} />
        <PrintReelsFull plan={plan} />
        <PrintPhotosFull plan={plan} />
        <PrintStoryboardPage plan={plan} />
      </div>

      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }} className="rr-print-hide">
        <button type="button" className="rr-toggle-btn" disabled={preparing} onClick={handlePrint}>
          {preparing ? 'Preparing…' : 'Preview Printable Version'}
        </button>
      </div>
    </>
  );
}
