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
| Units 1-3 | 1:12 | Structured activities, less support needed |

**Minimum staffing:** 2 facilitators for up to 20 attendees

---

## Pre-Workshop Checklist

### 1 Week Before

- [ ] Send pre-workshop email with account signup instructions
- [ ] Verify Workato Developer Edition availability
- [ ] Test full setup flow on fresh accounts
- [ ] Prepare backup accounts (2-3 sets)
- [ ] Confirm room/venue setup

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

---

## Common Issues & Quick Resolutions

### Environment Setup Issues

| Issue | Symptoms | Resolution |
|-------|----------|------------|
| Python version | `python3 --version` < 3.11 | `pyenv local 3.11` |
| Node version | `node --version` < 20 | `nvm use 20` |
| Workato CLI fails | Ruby/gem errors | Check Python first, then retry |
| Permission denied | Can't execute bin/workato | `chmod +x bin/workato bin/sf` |

### Salesforce Issues

| Issue | Symptoms | Resolution |
|-------|----------|------------|
| Login timeout | Browser hangs | Re-run `bin/sf org login web` |
| Deploy fails | Permission errors | Verify Developer Edition org |
| No rooms visible | Empty Hotel Rooms tab | Refresh browser; check if Contacts exist |
| Metadata conflicts | Deploy errors | Use fresh org or clean metadata |

### Workato Issues

| Issue | Symptoms | Resolution |
|-------|----------|------------|
| API 401 | Unauthorized errors | Check WORKATO_API_TOKEN in .env |
| Recipes won't start | "Failed: 4" message | Manual activation (Unit 0 Step 4.6) |
| Connection errors | Salesforce not connected | Re-authenticate in Workspace-Connections |
| Jobs failing | Recipe execution errors | Check Tools > Logs for details |

### Application Issues

| Issue | Symptoms | Resolution |
|-------|----------|------------|
| Port in use | EADDRINUSE error | Kill process on port 3000 or use different port |
| Empty responses | No data returned | Verify Workato recipes running |
| Slow first request | 30+ second delay | Normal - cold start, subsequent faster |

---

## Timing Flexibility

### If Running Short on Time

| Unit | What to Cut | What to Keep |
|------|-------------|--------------|
| Unit 0 | Skip Stripe setup | SF + Workato connection |
| Unit 1 | Shorten recipe tour | Trace exercise + bonus activities |
| Unit 2 | Provide partial workflow outline | Room transfer orchestrator design |
| Unit 3 | Skip implementation, design only | Solution discussion |

### If Ahead of Schedule

| Opportunity | How to Fill |
|-------------|-------------|
| Unit 1 | Let attendees explore bonus activities (error triggering, LLM coaching) |
| Unit 2 | Allow time for bonus challenge (booking cancellation) |
| Unit 3 | Allow full implementation time for both options |
| Any | Open Q&A, deeper dive on specific topics |

---

## Facilitator Talking Points

### Unit 1: Architecture

**Explaining the Core Problem:**

> "Think about what happens when you expose raw APIs to an LLM. The model has to figure out: Which API do I call first? What ID do I need? What if this call fails? That's asking the LLM to do work it's bad at -- deterministic sequencing and state management. Meanwhile, your backend sits idle when it could handle all of that in milliseconds."

**"Why not just let the LLM figure it out?"**

> "It can -- and for simple cases, it works. But watch what happens as complexity grows: more round-trips, more chances for errors, more token spend, slower responses. The question isn't 'can the LLM do it' but 'should it?' We're not limiting the LLM -- we're letting each system do what it's best at."

**"What's the actual performance difference?"**

> "In our measurements, a simple guest service request completes in about 4 seconds. A checkout with payment takes about 7 seconds. Almost all of that time is the backend systems -- Salesforce, Stripe -- not the orchestration layer. The LLM makes one call and waits for one response instead of managing a multi-step conversation."

**Explaining Atomics vs Orchestrators:**

> "Think of atomics like LEGO bricks -- small, tested, predictable. An orchestrator is the instruction manual that says 'connect these bricks in this order.' The LLM picks which manual to use; the backend follows the steps."

---

### Unit 2: Building

**"Why not just build one big recipe?"**

> "You could. But then you can't reuse any of it. Next month when you need a slightly different workflow, you're starting from scratch. Atomics give you building blocks. The investment in testing one atomic pays off every time you reuse it."

**"When do I need a new atomic vs reusing existing?"**

> "If you find yourself wanting to add parameters to an atomic that only apply to one use case, that's a sign you need a new atomic or the logic belongs in the orchestrator. Atomics should stay single-purpose."

**Explaining Datapill Flow:**

> "Each step's output becomes available as datapills for later steps. The key is knowing what each atomic returns -- that's why we document the return fields. If you're not sure what a step returns, check the atomic's result schema or run a test."

---

### Unit 3: Challenge

**"What order should I check things?"**

> "Validate before you mutate. Check that the guest exists, that the room is available, that the dates make sense -- all before you create or update anything. If you create records first and then discover a problem, you've got orphaned data to clean up."

**"How do I handle partial failures?"**

> "Design for it upfront. Either make operations idempotent so retries are safe, or sequence them so failures happen before any state changes. For cross-system operations like payments, always confirm the payment before updating other systems."

**"Is the HTTP-per-request overhead a problem?"**

> "For this pattern -- enterprise integrations hitting Salesforce, Stripe, databases -- the backend systems dominate latency. Our 4-7 second operations spend 98%+ of time waiting on external APIs, not the orchestration layer. The cold start you see on the first request is real, but subsequent requests are faster. Where this pattern is less optimal: high-frequency, low-latency operations or streaming use cases. For those, you'd want persistent connections. But for business workflows like check-ins, service requests, payments? The HTTP overhead is noise."

---

### General

**When the Demo Breaks:**

> "Perfect teaching moment. Let's trace what went wrong. This is exactly why we build observability into orchestrators -- production systems fail, and you need to know where and why."

**"What if I don't have Workato?"**

> "The compositional patterns apply to any integration platform. You could implement the same architecture with n8n, Temporal, AWS Step Functions, or even custom code. The key principles -- atomic skills, orchestrators, separation of concerns -- are platform-agnostic."

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
