# Competitor Teardown: Phone-First Agentic-AI Harness for Non-Coders

**Research date:** 2026-11-02. Where current, primary-source pages were inaccessible (HTTP 403/404, JS-rendered walls, rate-limited archives), I relied on Wikipedia (which carries sourced, dated citations through late 2026) and vendor pages that did load. Every unverifiable or inferred claim is flagged **[unverified]**.

Target product for comparison: a privacy-first, phone-first agent harness for non-coders — per-task model/key selection, risk-tiered human approvals, transparent reasoning/audit log, a "Secretary" module (documents/bills), "Finances," "Ideas" capture, always-encrypted data, 2FA.

---

## 1. Zapier (Agents)

**Target user:** SMB/mid-market teams and individual power users already in the Zapier ecosystem (9,000+ app integrations); "Agents" are marketed as AI teammates for business ops (support, research, content, sales), not consumer/personal use. (zapier.com/agents)

**Pricing model:** Core product is task-metered: Free (100 tasks/mo), Professional/Pro, Team (25 seats), Enterprise (custom). Pro task tiers range roughly $19.99–$1,599+/mo depending on volume (e.g., 750 tasks ≈ $19.99–29.99/mo; 100,000 tasks ≈ $489–733.50/mo). **Zapier Agents and Zapier Chatbots are separate add-on products with their own billing units, outside the task economy** — all plans get "basic access," premium usage is extra. (zapier.com/pricing)

**Approvals/safety model:** "Approval requests" for changes to Zaps exist only as a **Beta, Enterprise-only** feature ("Require approvals for changes to Zaps. Empower your team while safeguarding critical workflows"). There is no per-task, risk-tiered approval gate for what an Agent actually *does* at lower tiers — guardrails are mostly around who can edit automations, not runtime action confirmation. Enterprise also offers "Action restrictions" (granular control over what actions an app can perform) and "App access controls." (zapier.com/pricing)

**Transparency/audit log:** Audit log is **Team plan and up only** (Team: 6 months retention, Enterprise: 1 year), and even then it logs automation *activity*, not an agent's step-by-step reasoning trace. Enterprise adds an "Observability API" and "Analytics" (new) and "Log Streams" to Datadog/Splunk. Free and Pro customers get no audit log at all. (zapier.com/pricing)

**BYO model/keys:** "AI by Zapier" runs on Zapier's own key (no user key needed) from Pro up. True **"Bring Your Own Model"** — routing AI processing through the customer's own AWS Bedrock account/keys/contracts — is **Enterprise-only**. (zapier.com/pricing)

**Privacy/data handling:** 2FA is available on **all plans including Free**. Enterprise adds SAML SSO, SCIM provisioning, "Managed app connections" (block personal credentials), "Domain restrictions," "Custom data retention," and static IP for firewall allowlisting. Nothing on lower tiers addresses end-to-end/always-on encryption specifically; data governance is almost entirely gated behind Enterprise/Sales contact. (zapier.com/pricing)

**Mobile:** Zapier is web/desktop-first automation tooling; agent interaction is chat/dashboard-based, not described as a dedicated mobile-native experience. **[unverified — no mobile-specific product page found]**

**Strengths:** Largest integration surface (9,000+ apps), mature workflow/version-rollback tooling (Drafts, Autoreplay, Versions, Flood protection), established brand trust, "Copilot" natural-language Zap builder, Canvas for visual process mapping.

**Gaps we can exploit:** Safety/governance (audit log, approvals, BYO model, action restrictions) is **locked behind Enterprise and sales calls** — a solo non-coder or small household/user can't get an audit trail or approval gate at any accessible price point. No phone-first design; no concept of risk-tiered approvals per task; no encrypted "personal life" modules (Secretary/Finances/Ideas) — it's built for B2B app-to-app automation, not personal agentic assistance.

---

## 2. n8n

**Target user:** Developers and "citizen developers"/technical power users; explicitly positioned in press coverage as the **more technical, self-hostable alternative** to Zapier and Make. (en.wikipedia.org/wiki/N8n)

**Pricing model:** n8n Cloud: Starter, Pro, Enterprise (custom), plus a 14-day free trial with Pro features capped at 1,000 executions. Self-hosted is free under n8n's own "Sustainable Use License" (source-available "fair-code," not OSI-approved open source; commercial resale of a competing hosted service is barred). An "Assistant" AI copilot (in preview) ships with monthly credit allowances (1,600 Starter; 4,000–9,600 Pro); self-hosted gets Assistant in preview with **BYOK (bring your own key) and no credit limits**. (n8n.io/pricing, docs.n8n.io, en.wikipedia.org/wiki/N8n)

**Approvals/safety model:** No evidence of a built-in, named "risk-tiered approval" primitive comparable to what we're building; n8n's safety model is really "self-host it and control the infrastructure yourself" plus Enterprise features like SSO, environments, external secrets, log streaming, and Git-based version control for workflow review. **[unverified beyond this — could not load a dedicated human-in-the-loop/approval doc page; 404s encountered]**

**Transparency/audit log:** Enterprise-only: log streaming, environments (dev/stage/prod separation), external secrets vaulting, Git version control for auditability of workflow changes. No consumer-facing "reasoning trace" UI was found. (docs.n8n.io/sitemap.md)

**BYO model/keys:** Strongest BYO story of the automation-tool group: self-hosted n8n explicitly supports **bring-your-own-key** for its AI Assistant, with no credit metering — i.e., the user's own API keys/model accounts drive everything, maximizing cost control and data locality. Cloud users instead consume "Gateway credits" to run AI models without needing their own provider accounts. (docs.n8n.io/deploy/use-n8n-cloud/gateway-credits.md)

**Privacy/data handling:** Self-hosting is the headline privacy feature — data never leaves the customer's own infrastructure if desired. Node.js/TypeScript codebase, source-available. Used by enterprises like Vodafone and embedded into SAP's Joule Studio (May 2026 SAP investment). (en.wikipedia.org/wiki/N8n)

**Mobile:** No mobile-native product; it's a visual node-based editor meant for desktop/browser workflow building. **[unverified — not found as a stated gap but no mobile UI evidence located]**

**Strengths:** Source-available/self-hostable (unique privacy posture among the six), strong developer/enterprise trust (SAP, Vodafone, NVIDIA's NVentures as an investor), fastest-growing GitHub-stars project in 2025 (#1 in JS Rising Stars, 112,000+ stars added, up from 17,000/5th place in 2024), true BYOK AI usage. (en.wikipedia.org/wiki/N8n)

**Gaps we can exploit:** Explicitly **not** for non-coders — it's a node-graph builder requiring workflow literacy; no phone-first UX; no named approval/risk-tier system for AI agent actions; no personal "Secretary/Finances/Ideas" framing — it's infrastructure, not a personal assistant.

---

## 3. Make (formerly Integromat)

**Target user:** No-code/low-code business users and ops teams; marketed as a "visually intuitive no-code development platform" for workflow automation and "AI agents," owned by **Celonis** since an October 2020 acquisition (>$100M) of the Czech company Integromat, later rebranded Make. (en.wikipedia.org/wiki/Celonis; bing snippet of make.com)

**Pricing model:** **[unverified in detail]** — make.com/en/pricing and make.com/en/security both returned HTTP 403 to automated fetch and I could not retrieve current operations-based tier pricing or feature-gating directly. Public secondary sources (G2/Capterra-style reviews) were not fetched in this pass. Known historically (and still broadly the case per industry commentary) is an **operations-metered** model (Free/Core/Pro/Teams/Enterprise, billed by monthly "operations" consumed) — treat this as **[unverified]** pending a successful direct fetch.

**Approvals/safety, transparency/audit log, BYO model/keys, privacy:** **[unverified — could not access make.com/security or make.com/en/pricing in this pass]**. Recommend a follow-up fetch via a different network path/user agent, or pulling Make's G2/Capterra listing and its status/security subdomain (trust.make.com equivalent) if one exists.

**Mobile:** **[unverified]**

**Strengths (from what is known):** Visual "scenario" builder seen as more approachable than n8n for non-developers while still iPaaS-grade; backed by Celonis's enterprise process-mining distribution and balance sheet; wide integration catalog.

**Gaps we can exploit:** Treat all specific claims here as a research gap for this report — **Make needs a dedicated follow-up pass** (try make.com via a different fetch route, or third-party trust/security review sites) before using any numbers competitively. Directionally, Make — like Zapier/n8n — is a B2B workflow-automation tool, not a personal/phone-first assistant, so the same "no Secretary/Finances/Ideas, no risk-tiered personal approvals" gap almost certainly applies, but this is inferred, not confirmed from source.

---

## 4. Lindy

**Target user:** Teams and individuals wanting an "AI employee" that lives in Slack and does real work across tools — positioned closer to a personal/team AI assistant than a pure workflow-automation tool. Headquartered San Francisco. (lindy.ai/pricing JSON-LD; trust.lindy.ai)

**Pricing model (verified via on-page structured data):**
- **Plus:** $29.99/user/mo — 3,000 credits/seat
- **Pro:** $99.99/user/mo — 15,000 credits/seat
- **Max:** $199.99/user/mo — 35,000 credits/seat
- Seats pool credits into one shared workspace balance; credits don't roll over; running out pauses credit-using actions (no surprise bills) until the next cycle.
- New teammates joining via Slack get a one-time 7-day free trial; direct signups are billed immediately. No mid-cycle proration on cancellation.
(www.lindy.ai/pricing — structured FAQ/Offer data)

**Approvals/safety model — closest match to our "risk-tiered approvals" concept found in this research:** Lindy's own FAQ states explicitly: *"Will Lindy do anything without my approval? No. Anything with outside impact waits for approval, such as sending an email, updating a ticket, posting to another channel, or publishing a doc. Read-only lookups from approved sources do not require approval."* This is a **binary** approval gate (impactful action = always ask; read-only = never ask) — not the multi-tier risk model (e.g., low/medium/high risk, auto-approve vs. require explicit confirmation) we're proposing. (www.lindy.ai/pricing)

**Transparency/audit log:** Audit logs exist only on **Enterprise** tier, alongside SSO and HIPAA (with signed BAA). No mention of a user-facing "reasoning trace" for lower tiers. (www.lindy.ai/pricing)

**BYO model/keys:** Not evidenced in the pricing/FAQ data pulled; Lindy's credit system implies it meters usage of its own backend model access rather than exposing user-supplied API keys. **[unverified — no BYOK/BYO-model statement found; plausible gap]**

**Privacy/data handling:** Strong stated compliance posture: *"Your data is encrypted, never sold, and never used to train models. Lindy is SOC 2 and GDPR compliant, and Enterprise adds SSO, audit logs, and HIPAA with a signed BAA."* Also claims PIPEDA compliance in the feature list. (www.lindy.ai/pricing structured data: `"SOC 2 Type II, GDPR, HIPAA, and PIPEDA compliance"`)

**Mobile:** Lindy is Slack-native and has a web chat app (chat.lindy.ai); no evidence found of a dedicated native mobile app in this pass. **[unverified]**

**Strengths:** Clearest "agent that works for you, asks before anything externally impactful" positioning among all six competitors — directly adjacent to our approval-gating pitch. Transparent, generous compliance claims (SOC2/GDPR/HIPAA/PIPEDA) stated plainly on the pricing page rather than buried in enterprise-only docs. Simple, understandable credit-based pricing with no surprise overage billing.

**Gaps we can exploit:** Approval model is **binary, not risk-tiered** — no granularity between "send a $5 reimbursement email" and "wire $5,000" or "delete a folder." Audit log is Enterprise-gated, so a solo/non-coder user gets *no* visibility into what the agent actually did/reasoned, only the before-the-fact approval prompt — no after-the-fact transparent audit trail at consumer tiers. It's Slack-centric/team-centric (an "AI employee" for workspaces), not a phone-first personal-life app with a Secretary/Finances/Ideas structure. No stated BYO-model/key option, so privacy-conscious users can't swap in their own model or isolate their key.

---

## 5. ChatGPT (Operator / ChatGPT agent / Tasks / "ChatGPT Work")

**Target user:** Mass-market consumer and knowledge-worker base (ChatGPT has hundreds of millions of users); agentic features (Operator, ChatGPT agent, Tasks, ChatGPT Work) are rolled into the flagship consumer/business product rather than sold as a separate agent platform. (en.wikipedia.org/wiki/ChatGPT)

**Pricing model:** Freemium ChatGPT tiers (Free, Plus, Pro, Business/Enterprise) gate access to agentic features; e.g., Operator and later agent/Work capabilities were rolled out first to paid tiers. **[exact current price points unverified — openai.com/chatgpt/pricing and help.openai.com both returned 403]**. Notably, OpenAI began testing **ads in the free tier for logged-in US adults** starting Jan 2026, reaching ~$1B in ad revenue by August 2026 — i.e., the free tier is monetized via advertising, not pure subscription. (en.wikipedia.org/wiki/ChatGPT)

**Approvals/safety model:** Documented evolution:
- **Operator** (Jan 2025): controls a sandboxed virtual machine with limited internet connectivity and "safety restrictions"; struggled with complex UIs.
- **ChatGPT agent** (Jul 2025): performs multi-step tasks by controlling a virtual computer; inherits Deep Research's web-gathering; **the user can interrupt tasks or provide additional instructions as needed** — i.e., steerable/interruptible but not described as a structured risk-tiered pre-approval system.
- **Agentic Commerce Protocol** (Sep 2025, with Stripe): enables in-chat purchases, initially just Etsy, US-only, tied to a linked payment method; OpenAI takes an undisclosed merchant cut — a real-money action surface with only account-level payment linkage as a guardrail, not a documented per-purchase approval/risk gate.
(en.wikipedia.org/wiki/ChatGPT)

**Transparency/audit log:** No consumer-facing "reasoning/audit log" feature was found in available sources; Deep Research/agent show step summaries during execution but this is UX scaffolding, not a persistent, user-owned audit trail comparable to enterprise log streaming. **[gap, but could reflect research limits rather than confirmed absence]**

**BYO model/keys:** Not applicable in the way this would work for our product — ChatGPT is a single-vendor model experience; there is no "bring your own model/key" option for consumers inside the ChatGPT app itself (that capability lives in the separate OpenAI API/Platform, not ChatGPT consumer product). **[reasonably confident, but could not verify via primary docs due to 403s]**

**Privacy/data handling:** Documented regulatory friction: FTC civil investigative demand (Jul 2023) into ChatGPT's data security/privacy practices and potential consumer harm under FTC Act Sec. 5; multiple copyright suits (Silverman et al., Authors Guild, NYT) over training data. Health-related "ChatGPT Health" feature (Jan 7, 2026) explicitly **excluded from UK, Switzerland, and the EEA**, suggesting regulatory caution there; uses third-party health data infrastructure partner b.well. (en.wikipedia.org/wiki/OpenAI; en.wikipedia.org/wiki/ChatGPT)

**Mobile:** ChatGPT has long-standing, widely used iOS/Android apps — by far the strongest existing mobile presence of any competitor reviewed; agentic features (Tasks/agent) are accessible from mobile though browser/VM-based "agent" tasks are heavier and may be more desktop-oriented. **[exact mobile parity for agent mode unverified in this pass]**

**Strengths:** Enormous existing mobile-native user base and brand trust; fastest-moving agent feature set (Operator → agent → Work → Health in ~18 months); backed by continuous model upgrades; Stripe partnership shows real commerce-agent ambition.

**Gaps we can exploit:** No evidence of a **risk-tiered, user-configurable approval system** — safety is coarse (sandboxed VM, "interrupt," payment-method linkage) not a granular per-task policy. Regulatory/privacy track record (FTC inquiry, copyright suits, geo-exclusion of ChatGPT Health in UK/CH/EEA) signals consumers in privacy-sensitive segments may actively distrust a single mega-vendor holding Secretary/Finances-type personal data. No BYO-model/key option for privacy-conscious users who want to swap providers. General-purpose chatbot framing (not purpose-built modules like Secretary/Finances/Ideas) means users must improvise structure rather than getting it by default.

---

## 6. Claude (Projects / Claude Code / Claude for Chrome / Claude Cowork)

**Target user:** Spans individual Pro users, Claude Code's developer/vibe-coder audience, and — most relevant to us — **Claude Cowork's explicitly "non-technical users"** target, aimed at people who want an agent that organizes files, drafts documents, and automates desktop tasks without coding. (en.wikipedia.org/wiki/Claude_(language_model))

**Pricing model:** Tiers: **Free, Pro, Max, Ultra, Team (Standard/Premium seats), Enterprise**, plus metered API pricing. Usage is pooled across web/desktop/mobile/Claude Code against a rolling 5-hour session window, with paid tiers adding weekly caps; Pro ≈ "at least 5× more usage per 5-hour session than Free"; Max = 5× Pro per-5-hours *and* per-week; Ultra = 10× Pro's weekly usage with no 5-hour cap for verified accounts; paid users can buy supplemental "usage credits" at standard API rates once limits are hit. (claude.com/pricing)

**Approvals/safety model:** This is where Claude's agent products show the most direct relevance and the most direct *risk*:
- **Claude for Chrome** (Aug 2025 pilot, 1,000 Max subscribers; GA Aug 2026): browses/clicks/fills forms for the user. Anthropic **self-reported an 11.2% success rate for prompt-injection attacks even after mitigations** — a candid but alarming transparency data point about agentic browsing risk. (en.wikipedia.org/wiki/Claude_(language_model))
- **Claude Cowork** (research preview Jan 2026 → wider enterprise release Feb 2026 → Dispatch mobile-trigger feature Mar 2026 → Chrome sidebar Aug 2026): gives Claude a sandboxed shell plus access to **user-selected folders** on the local filesystem — read/write/execute/multi-step chaining in one conversation. **A documented real-world failure:** an early user asked Cowork to organize files on a family computer's desktop, and it **deleted all the family photos**, requiring restoration from an iCloud backup. A Wall Street Journal reporter who tested it separately flagged user discomfort with granting an AI agent broad local file-system access. (en.wikipedia.org/wiki/Claude_(language_model))
- **"Dreaming"/autoDream** (May 2026, research preview on the Managed Agents API): persistent memory consolidation across agent sessions (merges duplicates, removes stale entries) — relevant to our "transparent reasoning" ambitions as a contrast case (memory consolidation ≠ user-visible audit log). (en.wikipedia.org/wiki/Claude_(language_model))
- Misuse evidence: Anthropic reported Claude Code was used by a cybercriminal group ("GTG-2002") in a data-extortion campaign against 17+ organizations (Aug 2025), and by a China-based group to automate 80–90% of a cyber-espionage campaign against 30 organizations (reported Nov 2025) — underscoring that powerful, under-governed agentic tool access is a live abuse vector, not theoretical. (en.wikipedia.org/wiki/Claude_(language_model))

**Transparency/audit log:** No consumer-facing structured "reasoning/audit log" feature was identified for Projects/Cowork in available sources; Claude Code Security (Feb 2026) reviews codebases for vulnerabilities but that's a security-scanning feature, not a user-facing decision/action log. **[gap, though could reflect this research's limits]**

**BYO model/keys:** Not found as a Claude.ai consumer feature; model choice is Anthropic's own model family (Opus/Sonnet) at different tiers, not third-party/user-supplied models. **[reasonably confident absence, not exhaustively verified]**

**Privacy/data handling:** Mixed/negative signal: *Anthropic stated it would not use Projects data/chats to train models without explicit consent* (2024, anthropic.com/news/projects) — a positive, explicit commitment. **But** in Sept 2025 and again July 2026, **hundreds of shared Claude chats/Artifacts were found indexed in Google Search** — in July 2026 the BBC counted 200+, "some containing health records and corporate documents," traced to a **robots.txt rule that blocked crawlers from reading the `noindex` directive meant to keep shared-chat pages out of search** (a technical misconfiguration, not an intentional policy, but a real, repeated privacy leak). Anthropic said the listings were removed. (en.wikipedia.org/wiki/Claude_(language_model))

**Mobile:** Claude has standard mobile apps counted in the shared usage pool; **Cowork's "Dispatch" feature (Mar 2026) is explicitly phone-first in spirit** — it lets a user send a Cowork task **from a phone to their computer**, and Claude then operates desktop programs (browsers, spreadsheets) to execute it. This is the closest any competitor gets to our "phone-first harness controlling real-world/desktop tasks" concept. (en.wikipedia.org/wiki/Claude_(language_model))

**Strengths:** Cowork is architecturally the nearest analogue to our product vision (non-technical users, local file/task access, phone-to-desktop dispatch, expanding connector ecosystem — Google Drive, Gmail, Docusign, FactSet). Anthropic is relatively transparent about failure modes (publishes prompt-injection success rates, documents real misuse incidents) — a credibility asset if replicated responsibly. Enterprise-grade file connectors (Docusign, FactSet) suggest a roadmap into "Secretary/Finances"-like use cases.

**Gaps we can exploit — the most actionable in this entire report:**
1. **Repeated, documented privacy leakage** (shared chats indexed by Google in 2025 *and again* in 2026, exposing health records and corporate documents) is a direct trust wound in exactly our "always-encrypted, privacy-first" positioning.
2. **A real, publicized catastrophic-action incident** (deleting a family's photos during an unsupervised "organize my files" task) is the precise failure mode a risk-tiered approval system (e.g., "bulk delete = high-risk, requires explicit confirmation") is designed to prevent — and Cowork evidently did not have that gate.
3. **No apparent per-task model/key selection** or granular, user-visible audit trail of what the agent reasoned/did — Cowork's "transparency" is limited to real-time narration, not a persistent, reviewable log.
4. Cowork requires broad folder-level file-system trust once granted; there's no evidence of our proposed risk-tiered, task-scoped consent model.

---

## Comparison Table

| | Zapier Agents | n8n | Make | Lindy | ChatGPT (agent/Tasks/Work) | Claude (Cowork/Projects) |
|---|---|---|---|---|---|---|
| **Target user** | SMB/business ops teams | Developers/technical/self-hosters | No-code business/ops (Celonis-owned) | Teams wanting an "AI employee" (Slack-native) | Mass-market consumer + business | Non-technical users (Cowork) + developers (Code) |
| **Pricing model** | Task-metered plan + separate Agent/Chatbot add-on billing; Free→$1,500+/mo | Cloud: Starter/Pro/Enterprise + AI credit allowance; self-host free (BYOK) | **[unverified]** likely operations-metered | Credit-based per-seat: $29.99 / $99.99 / $199.99 per user/mo, pooled credits | Freemium consumer tiers; free tier now ad-supported (2026) | Free/Pro/Max/Ultra/Team/Enterprise; rolling 5-hr + weekly usage caps |
| **Approvals/safety** | "Approval requests" — **Beta, Enterprise-only**, gates workflow edits not runtime actions | No named consumer approval system found; relies on self-hosted control + Enterprise SSO/secrets | **[unverified]** | **Binary**: any "outside-impact" action always needs approval; read-only never does | Agent is interruptible/steerable mid-task; no documented risk-tiers; payment agent (Etsy) gated only by linked payment method | Real-time narration during tasks; **no documented pre-action risk tiering** — led to a file-deletion incident |
| **Transparency/audit log** | Audit log **Team+ only** (6mo/1yr retention); Observability API/Analytics Enterprise-only | Log streaming, Git-based workflow history — **Enterprise only** | **[unverified]** | Audit logs **Enterprise-only** | No user-facing structured audit log found | No user-facing structured audit log found; Code Security scans code, not user actions |
| **BYO model/keys** | "Bring Your Own Model" (AWS Bedrock) — **Enterprise-only** | **Yes**, self-hosted Assistant is BYOK with no credit caps | **[unverified]** | Not evidenced; own-backend metered credits | Not available in consumer ChatGPT app | Not available in Claude.ai consumer app |
| **Privacy/data handling** | 2FA all plans; SSO/SCIM/data retention/Bedrock routing Enterprise-only | Self-hosting = data stays on customer infra; source-available | **[unverified]** | Encrypted, "never sold/never trains models," SOC2/GDPR/HIPAA/PIPEDA stated on pricing page | FTC data-practices inquiry (2023); copyright suits; Health feature geo-excluded from UK/CH/EEA | Explicit no-train-without-consent (2024) **but** repeated 2025 & 2026 incidents of shared chats indexed by Google, exposing sensitive docs |
| **Mobile** | Not mobile-native | Not mobile-native | **[unverified]** | Slack + web chat; no confirmed native app | Strong, long-standing native iOS/Android apps | Standard mobile apps; **Dispatch** (Mar 2026) sends Cowork tasks phone→desktop |
| **Key strength** | Huge integration catalog, mature workflow tooling | Self-hosted privacy + true BYOK, fastest-growing dev community | Celonis-backed enterprise distribution, visual builder | Clear, plain-language "always asks before impactful action" promise; honest credit billing | Massive existing mobile user base, fast feature velocity | Closest architectural analogue to our product (phone-to-desktop agent for non-coders) |
| **Biggest exploitable gap** | Safety/governance entirely Enterprise/sales-gated — nothing for solo/non-coder users | Not usable by true non-coders; no phone-first UX | Need follow-up research | Approval is binary, not risk-tiered; no BYO model; no audit log below Enterprise | No granular approval system; real regulatory/privacy scrutiny history | Real, publicized file-deletion incident from lack of risk-tiered approval; repeated privacy leaks via shared-chat indexing |

---

## 5 Concrete Opportunities / Risks for Us

1. **Opportunity — "risk-tiered approvals, not binary ones," backed by a real incident to point to.** Lindy's binary "ask before anything impactful" is good messaging but crude; Claude Cowork's publicized deletion of a family's photos (en.wikipedia.org/wiki/Claude_(language_model)) is a concrete, citable cautionary tale showing *why* graduated risk tiers (read-only → reversible → irreversible/high-value, each with different confirmation friction) matter specifically for non-coders who can't sanity-check an agent's plan. This is a strong, evidence-backed differentiator to lead marketing with.

2. **Opportunity — audit log/transparency as a default, not an Enterprise upsell.** Every workflow-automation competitor (Zapier, n8n, Lindy — Make unverified) gates audit logging behind Team/Enterprise tiers, and neither ChatGPT nor Claude expose a persistent, user-owned reasoning/action log at all. A free-or-low-tier, always-on transparent audit trail is a feature **no competitor offers to individual/non-business users today** — directly serviceable by our target non-coder/household user who has no "Enterprise contract" to buy into.

3. **Opportunity — true BYO model/key as a trust signal, positioned for consumers not enterprises.** BYO model exists only as an Enterprise-gated feature at Zapier (AWS Bedrock) and as a self-hosting-only feature at n8n; Lindy, ChatGPT, and Claude offer no consumer BYOK path at all. A consumer-grade, per-task model/key selector (privacy-conscious users route sensitive tasks — e.g., Finances, Secretary/documents — to a model/key of their own choosing) is unaddressed market space and reinforces a "privacy-first" narrative competitors can't easily match without rearchitecting their business model (most monetize via their own model markup/credits).

4. **Risk — repeated, real privacy-leak incidents in the incumbents we'll be compared against, which could taint user trust in *any* "agent with access to your documents/finances" category.** Claude's shared-chat/Artifact indexing leaks happened **twice** (2025 and again 2026, per BBC and Forbes reporting cited on Wikipedia), exposing health records and corporate documents due to a crawler/`noindex` misconfiguration, and OpenAI faces an open FTC data-practices inquiry plus multiple copyright suits. If our product is perceived as "yet another agent that touches your documents/bills," we inherit category-level skepticism; we must proactively and specifically differentiate (e.g., no public sharing links by design, no server-side plaintext storage, explicit architecture diagrams) rather than relying on generic "we're private" claims, since competitors have made similar claims and still leaked data.

5. **Risk — "phone-first" is not yet a proven wedge; Claude is closing that gap fastest.** Among all six, only Claude (via Cowork's March 2026 "Dispatch" feature — send a task from phone, have Claude operate desktop programs) has shipped anything resembling phone-initiated agentic action on a computer; it did so within roughly 14 months of Cowork's initial Jan 2026 research-preview launch, and Anthropic is moving quickly (Cowork → enterprise connectors → Dispatch → Chrome sidebar in just 7 months). Our phone-first positioning has a real, fast-moving incumbent threat — we should assume Anthropic (and likely OpenAI, given its ChatGPT Work / superapp consolidation moves) will contest this exact niche within our own build timeline, so technical and trust differentiation (risk-tiered approvals + always-on audit log + BYO keys — none of which Cowork currently has) needs to ship early, not as a "phase 2."

---

### Research gaps / follow-ups recommended
- **Make.com**: pricing, security, and approvals pages returned HTTP 403 to automated fetch in every attempt (direct URL, raw HTML, archive.org — which also rate-limited at 429). Needs a manual browser visit or a different fetch path to confirm operations-based pricing tiers and any audit/BYO-model features.
- **OpenAI help center / pricing** (help.openai.com, openai.com/chatgpt/pricing, openai.com/index/introducing-chatgpt-agent): consistently 403'd; current ChatGPT tier pricing and the exact Tasks/agent approval UX should be verified directly against a live ChatGPT account or OpenAI's help center via browser rather than automated fetch.
- **Lindy mobile app** and **BYO-model/key support**: not found in the pages retrieved; worth checking Lindy's app-store listings and any developer/API docs directly.
- **Zapier mobile experience** for Agents specifically: not confirmed either way.
- Several claims rely on Wikipedia's secondary synthesis of press coverage (e.g., n8n's ARR and growth figures, Claude's misuse-campaign statistics); treat financial/usage figures as directionally reliable but not primary-source-verified.
