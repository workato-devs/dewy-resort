---
layout: default
title: Facilitator Checklist
nav_order: 2
parent: Guides
---

# Facilitator Checklist

Pre-workshop preparation, day-of procedures, and emergency handling.

{: .note }
This entire page is facilitator-focused content. Toggle to Facilitator Mode to see additional inline notes throughout the workshop units.

---

## Recommended Support Ratios

| Unit | Ratio | Reason |
|------|-------|--------|
| Unit 0 (Setup) | 1:8 | High troubleshooting potential |
| Unit 1 (App Launch) | 1:8 | Cognito/env var issues |
| Units 2-3 | 1:12 | Structured activities, less support needed |

**Minimum staffing:** 2 facilitators for up to 20 attendees

---

## Pre-Workshop Checklist

### 1 Week Before

- [ ] Send pre-workshop email with account signup instructions
- [ ] Verify Workato Developer Edition availability
- [ ] Test full setup flow on fresh accounts
- [ ] Prepare backup accounts (2-3 sets)
- [ ] Confirm room/venue setup
- [ ] Prepare Cognito/Bedrock credentials for distribution

### Day Before

- [ ] Test demo scenarios in facilitator accounts
- [ ] Load slides and verify diagrams render
- [ ] Test screen sharing and zoom levels
- [ ] Prepare printed troubleshooting cards
- [ ] Charge devices, prepare power adapters

### Day Of (1 hour before)

- [ ] Arrive early, test wifi/AV
- [ ] Set up screen sharing
- [ ] Open all required tabs (Workato, Salesforce, VS Code)
- [ ] Verify demo environment works
- [ ] Post wifi credentials
- [ ] Have Cognito/Bedrock credentials ready to hand out (Unit 1)

---

## Common Issues & Quick Resolutions

### Environment Setup Issues

| Issue | Symptoms | Resolution |
|-------|----------|------------|
| `wk` not found | `wk version` fails | `brew install workato-devs/tap/wk` or `scoop install wk` |
| Node version | `node --version` < 20 | `nvm use 20` or re-run bootstrap |
| `wk` auth fails | `make workato-login` errors | Check token in root `.env`, re-run `make workato-login` |
| SF CLI missing | `bin/sf` not found | `make setup tool=salesforce` |

### Salesforce Issues

| Issue | Symptoms | Resolution |
|-------|----------|------------|
| Login timeout | Browser hangs | Re-run `sf org login web --alias myDevOrg` |
| Deploy fails | Permission errors | Verify Developer Edition org |
| No rooms visible | Empty Hotel Rooms tab | Refresh browser; check if Contacts exist |
| Metadata conflicts | Deploy errors | Use fresh org or clean metadata |

### Workato Issues

| Issue | Symptoms | Resolution |
|-------|----------|------------|
| API 401 | Unauthorized errors | Check WORKATO_API_TOKEN in root `.env` |
| Recipes won't start | Some recipes fail | May need manual connection linking (Unit 0, Step 3.5) |
| Connection errors | Salesforce not connected | Re-authenticate in Workspace Connections |
| Jobs failing | Recipe execution errors | Check Tools → Logs for details |

### Application Issues

| Issue | Symptoms | Resolution |
|-------|----------|------------|
| Port in use | EADDRINUSE error | Kill process on port 3000 or use different port |
| Login page shows mock mode | After env changes | Restart app: `app/scripts/dev-tools/server.sh restart` |
| No agent greeting | Chat loads but no message | Check Cognito/Bedrock env vars in `app/.env` |
| Debug panel missing | Not visible in chat | Set `NEXT_PUBLIC_ENABLE_CHAT_DEBUG=true`, restart app |
| Empty responses | No data returned | Verify Workato recipes running |
| Slow first request | 30+ second delay | Normal — cold start, subsequent requests faster |

---

## Timing Flexibility

### If Running Short on Time

| Unit | What to Cut | What to Keep |
|------|-------------|--------------|
| Unit 0 | Skip Stripe setup | SF + Workato connection |
| Unit 1 | Shorten Part 3 to one or two prompts | App launch + Manager dashboard |
| Unit 2 | Shorten Part 2 (fewer scenarios) | Architecture walkthrough + at least one Workato trace |
| Unit 3 | Skip implementation, design only | Solution discussion |

### If Ahead of Schedule

| Opportunity | How to Fill |
|-------------|-------------|
| Unit 1 | Let attendees explore guest vs manager tool differences |
| Unit 2 | Optional Salesforce verification step, deeper log exploration |
| Unit 3 | Allow full implementation time, encourage coding agent path |
| Any | Open Q&A, deeper dive on specific topics |

---

## Facilitator Talking Points

### Unit 1: Running the Hotel App

**"Why two separate MCP servers?"**

> "Each persona gets access to only the tools appropriate for their role. A guest shouldn't be able to file maintenance requests or process refunds. By splitting into Guest and Manager servers, we enforce authorization at the platform level — the LLM can't call tools it doesn't have."

**"What's the debug panel actually showing?"**

> "It's the client-side view of the MCP conversation. Every time the LLM decides to call a tool, you see the tool name, the parameters it chose, the response it got back, and how long it took. It's the same data you'd see in the Workato logs, but from the LLM's perspective."

---

### Unit 2: Observability & Monitoring

**Explaining the Core Architecture:**

> "Think about what happens when you expose raw APIs to an LLM. The model has to figure out: Which API do I call first? What ID do I need? What if this call fails? That's asking the LLM to do work it's bad at — deterministic sequencing and state management. Meanwhile, your backend sits idle when it could handle all of that in milliseconds."

**"Why not just let the LLM figure it out?"**

> "It can — and for simple cases, it works. But watch what happens as complexity grows: more round-trips, more chances for errors, more token spend, slower responses. The question isn't 'can the LLM do it' but 'should it?' We're not limiting the LLM — we're letting each system do what it's best at."

**Explaining Atomics vs Orchestrators:**

> "Think of atomics like LEGO bricks — small, tested, predictable. An orchestrator is the instruction manual that says 'connect these bricks in this order.' The LLM picks which manual to use; the backend follows the steps."

**"What's the actual performance difference?"**

> "In our measurements, a simple guest service request completes in about 4 seconds. A checkout with payment takes about 7 seconds. Almost all of that time is the backend systems — Salesforce, Stripe — not the orchestration layer. The LLM makes one call and waits for one response instead of managing a multi-step conversation."

---

### Unit 3: Build Challenge

**"What order should I check things?"**

> "Validate before you mutate. Check that the guest exists, that the room is available, that the dates make sense — all before you create or update anything. If you create records first and then discover a problem, you've got orphaned data to clean up."

**"How do I handle partial failures?"**

> "Design for it upfront. Either make operations idempotent so retries are safe, or sequence them so failures happen before any state changes. For cross-system operations like payments, always confirm the payment before updating other systems."

---

### General

**When the Demo Breaks:**

> "Perfect teaching moment. Let's trace what went wrong. This is exactly why we build observability into orchestrators — production systems fail, and you need to know where and why."

**"What if I don't have Workato?"**

> "The compositional patterns apply to any integration platform. You could implement the same architecture with n8n, Temporal, AWS Step Functions, or even custom code. The key principles — atomic skills, orchestrators, separation of concerns — are platform-agnostic."

**"Can I use this at my company?"**

> "Absolutely. Your sandbox accounts are yours to keep. The patterns are designed for production use. Start with one workflow, prove the value, then expand."

---

## Emergency Procedures

### Complete Setup Failure (Attendee)

1. Pair with working neighbor for remainder of workshop
2. Take their contact info for post-workshop help
3. Offer 1:1 session after workshop if needed

### Demo Environment Down

1. Switch to slides/static diagrams
2. Walk through code in editor
3. Show pre-recorded video if available

### Significant Time Overrun

1. Skip Unit 3 challenge implementation
2. Convert to facilitator-led solution walkthrough
3. Extend wrap-up Q&A

### Technical Difficulty (Facilitator)

1. Have backup facilitator take over
2. Use mobile hotspot if wifi fails
3. Switch to whiteboard if slides fail

---

## Post-Workshop Tasks

### Immediately After

- [ ] Collect feedback surveys
- [ ] Note any issues for future workshops
- [ ] Thank attendees, share resources

### Within 24 Hours

- [ ] Send follow-up email with resources
- [ ] Address any unanswered questions
- [ ] Share recording (if applicable)

### Within 1 Week

- [ ] Review feedback survey results
- [ ] Document improvements for next session
- [ ] Follow up with attendees who had issues

---

## Feedback Collection

### Survey Questions (Suggested)

1. How would you rate the overall workshop? (1-5)
2. Was the pace appropriate? (Too slow / Just right / Too fast)
3. Which unit was most valuable?
4. What are you most excited to try next?
5. What will you share with your team?
6. Would you recommend this workshop? (NPS)
7. Any other feedback?

### Exit Interview Questions (Optional)

- "What's one thing you'll do differently after today?"
- "What surprised you?"
- "What are you most excited to try next?"
- "What will you share with your team?"

---

## Contact & Escalation

For workshop issues, technical problems, or content feedback:

**GitHub:** [github.com/workato-devs/dewy-resort/issues](https://github.com/workato-devs/dewy-resort/issues)
