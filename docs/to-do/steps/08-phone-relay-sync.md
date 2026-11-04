# Step 08: Phone app, relay and sync

**Status:** not started

## Prompt for Kilo Code (copy this whole block)
```text
You are working on NomadNetOps. Do step 08 (Phone app, relay and sync) and nothing else.
1. Read docs/AI-WORKFLOW.md first and follow it exactly. Then read docs/STATUS.md, PLAN.md, docs/TECHNICAL-DESIGN.md, docs/adr/, docs/to-do/steps/08-phone-relay-sync.md and the latest docs/changelog/ entries.
2. Check the Dependencies section of the step file; every dependency must be "done" in docs/STATUS.md. If not, stop and tell me.
3. Ask me any open design choice (one question at a time, with a recommendation) before building. If I do not answer, use the recommendation and log it.
4. Build the tasks in order. Respect the hard rules in docs/AI-WORKFLOW.md (privacy, tier 3 approvals, space_id, untrusted documents). The relay must never see plaintext user data.
5. Make pnpm lint, typecheck, test and build pass. Do not commit.
6. Before finishing, update: this step file (Status line, mark tasks "(done)", notes), docs/STATUS.md, PLAN.md (only if affected), docs/to-do/extensive-plan.md, and add a new docs/changelog/YYYY-MM-DD-step-08-<title>.md from docs/changelog/_TEMPLATE.md.
7. Report what you did, what is left, and what you recommend next.
```

**Goal:** control Nomad from the phone. Most screen time is on the phone, so this is a flagship feature, not an add-on.

## Scope
Pairing, end-to-end encrypted relay, sync, push, capture (email-to-self first, then app, share-sheet, voice, photo), approvals, pause and kill, agenda, chat, budgets.

## Tasks
1. Relay service: stores and forwards ciphertext only; device registry; push gateway. Open-source so it can be self-hosted.
2. Pairing by QR with X25519; wrap the Data Key for the new device (step 02).
3. Sync protocol: append-only events merge by sequence; editable records last-writer-wins with history.
4. Email-to-self capture (first), parsed into Ideas or Secretary by sender rule.
5. PWA release: capture, approvals, agenda, Master AI chat.
6. React Native app: biometrics as convenience, push, share-sheet, voice notes, camera for bills and letters, offline capture.
7. Push payloads carry no sensitive content; details appear after unlock.
8. Phone home screen: "needs you" first (approvals), then agenda, ideas, budget.
9. Remote kill switch and "lock all devices".
10. Battery, data and low-bandwidth testing.

## Remaining design choices
| Choice | Options | Recommend |
|---|---|---|
| Phone tech | PWA, React Native, Tauri mobile | PWA first, then React Native |
| Relay hosting | Ours, self-hosted, both | Ours by default; open-source for self-host |
| Always-on Core for phone | Desktop only, cloud Core | Offer cloud Core (step 15); desktop-only users get "approve when desktop is on" |
| Voice capture | On-device transcription, server transcription | On-device first for privacy |
| Push provider | APNs and FCM direct, third party | Direct, no third party in the content path |

## Dependencies
Steps 02, 07.

## Acceptance
- Approve a task from a locked phone's notification after unlock in two taps. Capture works offline. The relay holds no readable data (verified by test).
