---
layout: default
title: Wrap-Up & Resources
nav_order: 8
parent: Workshop Units
---

# Wrap-Up & Resources

**Closing Session (5 minutes)**

---

## Key Takeaways

### 1. MCP's Scope is Intentionally Narrow

> The protocol handles tool discovery and invocation. Authentication, authorization, retries, business rules, and governance are **your responsibility**.

This isn't a limitation -- it's a feature that keeps the protocol focused.

---

### 2. APIs as Tools is an Anti-Pattern

> Exposing 47 API endpoints overwhelms agents with low-entropy operations they shouldn't be doing.

**API Wrapper Approach:** Multiple LLM round-trips, higher latency, complexity lives in the prompt

**Compositional Approach:** 1-2 tool calls, 4-7 seconds latency, complexity lives in the backend

---

### 3. Separation of Concerns is the Key Insight

| LLMs Excel At (High-Entropy) | Backends Excel At (Low-Entropy) |
|------------------------------|--------------------------------|
| Understanding intent | ID resolution |
| Selecting tools | State validation |
| Handling ambiguity | State transitions |
| Asking clarifying questions | Authorization |
| Formatting responses | Retry logic |

> "Stop making each system do the other's job."

---

### 4. Compositional Architecture = Atomic Skills + Orchestrators

| Component | Purpose | Example |
|-----------|---------|---------|
| **Atomic Skills** | Single operations, building blocks for orchestrators | `search_contact_by_email` |
| **Orchestrators** | Chain multiple atomic skills into complete workflows | `check_in_guest` |

Atomics are thoroughly tested building blocks. Orchestrators compose them with flow control, error handling, and business logic.

---

### 5. Your Sandbox is Yours to Keep

> Everything you set up today -- Workato recipes, Salesforce data model, local application -- continues working after this workshop.

Experiment. Break things. Learn.

---

## Discussion Prompt

**Share with your neighbor or the room:**

> "What is one thing you will take back to your team or apply to your next project?"

---

## Resources

### Workshop Materials

| Resource | Link |
|----------|------|
| **GitHub Repo** | [github.com/workato-devs/dewy-resort](https://github.com/workato-devs/dewy-resort) |
| **Workshop Slides** | [link to slides] |
| **This Guide** | [link to GitHub Pages] |

### Documentation

| Resource | Link |
|----------|------|
| **MCP Specification** | [modelcontextprotocol.io](https://modelcontextprotocol.io) |
| **Workato Docs** | [docs.workato.com](https://docs.workato.com) |

---

## Contribute

The Dewy Resort sample app is open source. If you build something useful during or after this workshop, consider contributing back:

| Contribution | How |
|--------------|-----|
| **New orchestrator** | Submit a PR with your workflow |
| **Bug fix** | Found an issue? Open a PR |
| **Documentation** | Improve the README or add examples |
| **New atomic skill** | Extend the building blocks |

GitHub: [github.com/workato-devs/dewy-resort](https://github.com/workato-devs/dewy-resort)

---

## Feedback

**Please complete the workshop survey!**

[QR Code or Link]

Your feedback helps us improve future workshops.

---

## Thank You!

> "The protocol gives us interoperability. The architecture we build on top determines whether we deliver underwhelming API wrappers or genuinely useful AI experiences. The choice is ours to make."

**Questions?** Find facilitators after the session or reach out via:
- Email: [facilitator email]
- LinkedIn: [facilitator LinkedIn]

---

<div class="facilitator-only" markdown="1">

## Facilitator Closing Script

> "Thank you all for your time and energy today. You've gone from understanding MCP basics to building production-ready compositional skills.
>
> Remember: the gap between prototype and production isn't algorithmic -- it's architectural. The patterns you learned today are how you bridge that gap.
>
> Your sandboxes are yours to keep. Experiment, break things, and build something useful.
>
> If you found this valuable, please fill out the feedback survey -- it helps us make future workshops even better.
>
> Thank you, and happy building!"

</div>
