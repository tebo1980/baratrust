# BaraTrust Reality Check — End-to-End Launch QA Protocol

This protocol defines the exact manual verification workflow for **Todd & Noelah** to validate the complete BaraTrust Reality Check workflow before onboarding real prospective small-business clients.

---

## Pre-Requisites
- Local dev or production environment up and running.
- Authenticated with an authorized operator Clerk account (`todd@baratrust.com`, or an account listed in `OPERATOR_EMAILS`).
- A second clean browser window (e.g. Incognito / Private mode) with **no active Clerk session** for testing client-facing routes.

---

## 26-Step Master Verification Checklist

### Step 1: Submit a Test Business at `/reality-check`
- Open `/reality-check` in a logged-out browser window.
- Enter realistic business details:
  - **Business Name**: e.g., `Valley Ridge Roofing & Gutters`
  - **Website URL**: e.g., `https://valleyridgeroofingky.com` (or an active local test site)
  - **City & State**: e.g., `Louisville, KY`
  - **Owner Name**: e.g., `Jim Miller`
  - **Email**: e.g., `jim@valleyridgeroofingky.com` (or your test email)
  - **Phone**: `(502) 555-0192`
  - **Business Type**: `Contractor / Roofing`
  - **Primary Headache**: `Missing evening customer calls and losing quotes to faster responders`
- Click **"Run Free Reality Check"**.
- [ ] *Verified submission loads progress state without errors.*

### Step 2: Confirm Database Record Creation
- Check that the `reality_checks` table contains the new row:
  - `status`: `'NEW'` or `'AUTO_SCAN_COMPLETE'`
  - `share_token`: Non-null unguessable string starting with `rc_st_` (length >= 32)
  - `email`, `owner_name`, `business_name` correctly stored.
- [ ] *Verified row exists in Postgres with unique share_token.*

### Step 3: Verify Scanner Output
- Observe the real-time scanning progress bar and category cards.
- Confirm all 5 categories execute:
  1. Digital Presence (Speed & Foundation)
  2. Customer Journey & Friction
  3. Trust & Public Reputation
  4. Local Discovery & AI Findability
  5. Opportunity Capture & Leaks
- Confirm `scan_findings` records are created in database.
- [ ] *Verified scanner creates structured findings without crashing.*

### Step 4: Inspect Score + Coverage + Confidence
- Check the diagnostic summary card:
  - If site was reachable: Overall Score (0-100), Coverage % (> 70%), Confidence (`HIGH` or `MEDIUM`).
  - If site was SPA / unobservable: Overall Score withheld (`Manual Review / Score Withheld`), Confidence (`INSUFFICIENT`).
- Verify no `UNKNOWN` checks are artificially converted to `PASS` or `FAIL`.
- [ ] *Verified score and coverage integrity matches observability.*

### Step 5: Complete Owner Questionnaire
- The page advances to `/reality-check/[id]/questionnaire`.
- Complete the 8 targeted questions (or skip):
  1. *Where new customers come from*: "Word of mouth and past referrals."
  2. *Biggest problem*: "Getting overwhelmed with calls while on roofs and not answering in time."
  3. *Missed inquiries*: "Yes, probably 4-6 calls a week go to voicemail."
  4. *Follow-up process*: "Sticky notes on the dashboard of my truck."
  5. *Marketing spend*: "Paying $800/mo to an agency for SEO, but don't know what they do."
  6. *Admin waste*: "Invoicing and writing quotes manually."
  7. *Growth opportunity*: "Commercial flat roof repair contracts."
  8. *Free employee role*: "Full-time inquiry intake and follow-up dispatcher."
- Submit questionnaire.
- Confirm `owner_responses` record created with `evidence_label = 'OWNER_PROVIDED'`.
- [ ] *Verified owner answers persisted in database.*

### Step 6: Verify Operator Queue Appearance
- Log into `/internal/reviews` in the operator browser.
- Verify the newly submitted business appears in the queue with:
  - Business name and location
  - Status (`NEEDS_HUMAN_REVIEW` or `AUTO_SCAN_COMPLETE`)
  - Owner name and submission timestamp
  - Direct "Open Review Studio" link
- [ ] *Verified business appears prominently in operator review list.*

### Step 7: Open Review Studio
- Click into `/internal/reviews/[realityCheckId]`.
- Verify left dossier displays:
  - Submitter facts (Name, Website, Phone, Email, Location)
  - Scanner findings with `[AUTO_DETECTED]` badge and state pills
  - Owner questionnaire answers with `[OWNER_PROVIDED]` badge
- [ ] *Verified dossier loads all evidence accurately.*

### Step 8: Complete Human Research Fields
- In the **1. Human Investigation** tab, record Todd & Noelah's observations:
  - **Findability Test**: Note local Google Maps ranking and whether Apple Maps / Voice search finds them.
  - **Reputation Summary**: Note Google rating, review count, and whether owner replies.
  - **Social Presence**: Note last posted date on Facebook / Instagram.
  - **Competitor Comparison**: Name 1-2 rivals and identify client's natural advantages.
  - **Inquiry Friction**: Document friction points (e.g. non-clickable phone numbers, missing mobile quote forms).
- [ ] *Verified all 5 research fields accept operator notes.*

### Step 9: Add at Least One `OPPORTUNITY_FOUND`
- Under "Growth Levers & Opportunities Found", click **"Add Growth Lever"**.
- Enter:
  - **Title**: e.g., `Emergency Storm Tarping & Repair Priority Queue`
  - **Type**: `High-Margin Service`
  - **Potential Impact**: `High`
  - **Description**: Add dedicated landing page and SMS intake for urgent storm damage.
  - **Next Step**: Set up Twilio keyword autoresponder.
- [ ] *Verified opportunity is logged with `[OPPORTUNITY_FOUND]` label.*

### Step 10: Complete Exactly Three Prioritized Fixes
- Under "Top 3 Things We Would Fix First", complete all 3 items:
  - **Priority #1**: *Tap-to-call mobile header button* — Why it matters + recommended action.
  - **Priority #2**: *Instant SMS auto-reply for missed calls* — Why it matters + recommended action.
  - **Priority #3**: *LocalBusiness Schema & Google Profile audit* — Why it matters + recommended action.
- [ ] *Verified all 3 items have titles, why-it-matters, and actions.*

### Step 11: Complete "What We Would NOT Spend Money On"
- In the dedicated budget protection box, enter candid advice:
  - e.g., *"Do NOT spend $2,000/mo on Google Search Ads right now. With no after-hours call intake, paid clicks will just ring into voicemail and burn budget."*
- [ ] *Verified candid advice field is populated.*

### Step 12: Save and Leave
- Click **"Save Human Review"**.
- Confirm green badge shows `"Review draft saved at [time]"`.
- Close the browser tab or navigate back to `/internal/reviews`.
- [ ] *Verified review saved successfully.*

### Step 13: Reopen and Verify Persistence
- Reopen `/internal/reviews/[realityCheckId]`.
- Verify every field previously typed is intact:
  - Research fields
  - Opportunities
  - Top 3 Fixes
  - What NOT to Spend Money On
- [ ] *Verified 100% persistence of operator data.*

### Step 14: Generate Gemini Draft
- Click **"Generate Draft Report with Gemini"**.
- Verify:
  - Loading spinner displays while synthesizing.
  - Switches automatically to **2. Client Report Draft** tab.
  - Top bar shows: `"Draft synthesized using [modelName]"`.
  - All 12 report sections are populated with synthesized copy.
- [ ] *Verified Gemini synthesis succeeds and populates report draft.*

### Step 15: Inspect Every Generated Section Against Source Evidence
- Check draft text against the evidence dossier:
  - Does Executive Summary mention the correct business and location?
  - Are What's Working items based on real findings?
  - Are Top 3 Fixes matching Todd's input?
  - Did the model NOT hallucinate numbers, revenue, or ratings?
- [ ] *Verified report draft faithfully reflects evidence dossier.*

### Step 16: Edit at Least One Section Manually
- In the Report Draft tab, edit the `executiveSummary` or `closingNote`.
- Change words to add Todd/Noelah personal touch.
- [ ] *Verified manual text edits take effect in inputs.*

### Step 17: Save/Reopen and Verify Edits Persist
- Click **"Save Report Draft"**.
- Reload the page.
- Navigate to the **2. Client Report Draft** tab.
- Confirm manual edits are preserved.
- [ ] *Verified report draft edits persist across reloads.*

### Step 18: Preview Unpublished Report
- Click **"Preview Client Report"** in top bar.
- Opens `/report/[shareToken]?preview=true` in new tab.
- Confirm yellow operator banner appears: *"Operator Preview Mode — This report is not yet published to the client."*
- [ ] *Verified preview renders report draft accurately for operator.*

### Step 19: Verify Ordinary Public Access Cannot See Unpublished Content
- In your **logged-out / incognito window**, open `/report/[shareToken]` (without `?preview=true`).
- Verify the page displays the polite placeholder:
  - Badge: **"Review In Progress"**
  - Text: *"Todd and Noelah are currently completing the hands-on human review..."*
  - No draft text or private notes leaked!
- [ ] *Verified public access to unpublished report is safely blocked.*

### Step 20: Publish
- Return to operator tab in Review Studio.
- In the Report tab, open the **Pre-Publication Quality Checklist** and review all 10 items.
- Click **"Publish Reality Check"** (or "Publish & Send Email").
- Confirm browser confirmation dialog.
- [ ] *Verified publish action triggers without errors.*

### Step 21: Verify Frozen Published Snapshot
- In Postgres `human_reviews` table, verify:
  - `status`: `'published'`
  - `published_report`: Contains the frozen report JSON, including `frozenTopFixes` and `frozenOpportunities`.
  - `published_at`: Non-null timestamp.
- In `reality_checks` table, verify `status`: `'PUBLISHED'`.
- [ ] *Verified published snapshot is frozen in database.*

### Step 22: Verify Delivery-Email Behavior
- Check the publish response alert in Review Studio:
  - If Resend / Webhook configured: `"✓ Report published! Delivery email dispatched to [recipient]"` and `email_delivered_at` is set.
  - If no provider configured: `"✓ Report published! Note: No transactional email provider is configured, so delivery email was NOT sent. Share the link manually: /report/[shareToken]"` and `email_delivered_at` remains `null`.
- Confirm audit trail records `deliveryEmailStatus`: `'ACCEPTED_BY_PROVIDER'` or `'NOT_ATTEMPTED'`.
- [ ] *Verified delivery email status is transparent and accurate.*

### Step 23: Open Report Through Share URL While Logged Out
- In the **logged-out / incognito window**, reload `/report/[shareToken]`.
- Verify the published report is immediately viewable **without any login, Clerk modal, or paywall**.
- [ ] *Verified published report is publicly accessible via unguessable token.*

### Step 24: Inspect Desktop Presentation
- Confirm clean dark-mode presentation (`#050810` background, crisp typography, amber accents).
- Verify all sections render in logical order:
  1. Header & Verified Report badge
  2. Bottom Line / Executive Summary Card
  3. What's Working & What's Getting in the Way
  4. Top 3 Fixes Card (prominent amber border)
  5. What We Would NOT Spend Money On (rose border)
  6. Field Observations (5 investigation areas)
  7. Growth Levers (if logged)
  8. Collapsible Technical Diagnostics (28 checks)
  9. Low-pressure call to action ("Talk with Todd Directly")
- [ ] *Verified desktop presentation meets quality standards.*

### Step 25: Inspect Mobile Presentation
- Open browser DevTools in responsive/mobile view (375px width — iPhone SE / 390px iPhone 14).
- Confirm:
  - No horizontal scrolling or overflow.
  - Text is readable without pinch-zooming.
  - Cards stack cleanly.
  - Buttons are full-width and touch-friendly.
- [ ] *Verified mobile presentation is flawless.*

### Step 26: Test Browser Print / PDF Presentation
- Press `Ctrl+P` (or `Cmd+P` on Mac).
- Verify print preview:
  - Dark background switches to clean white (`#FFFFFF`) with dark text (`#000000`).
  - Screen-only buttons, nav controls, and collapsible diagnostic lists are hidden.
  - Content wraps naturally across printed pages without clipping.
- [ ] *Verified print/PDF layout is professional and client-ready.*

---

## Pre-Publication Human QA Quality Checklist

Before clicking **Publish**, Todd and Noelah must review the 10 quality questions:

| # | Question | Pass? | Notes |
|---|----------|:-----:|-------|
| 1 | Are all factual statements supported by the evidence dossier? | [ ] | |
| 2 | Did Gemini turn any UNKNOWN into a fact? | [ ] | |
| 3 | Did Gemini invent a competitor, review, lead, metric, or dollar value? | [ ] | |
| 4 | Are the Top 3 Fixes genuinely the three highest priorities? | [ ] | |
| 5 | Does “What We Would NOT Spend Money On” contain useful candid advice? | [ ] | |
| 6 | Are opportunities specific rather than generic? | [ ] | |
| 7 | Does the report repeat itself unnecessarily? | [ ] | |
| 8 | Does it sound like a knowledgeable person rather than AI marketing copy? | [ ] | |
| 9 | Can a small-business owner understand it without knowing SEO/technology? | [ ] | |
| 10 | Is there anything embarrassing or misleading that we would not say face-to-face? | [ ] | |

> **Operator Responsibility Note**: Completion of the checklist is an operator quality guide. The system does not automatically publish upon completion — final publishing authority rests strictly with the operator.
