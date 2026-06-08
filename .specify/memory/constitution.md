<!--
SYNC IMPACT REPORT
==================
Version change: [CONSTITUTION_VERSION] → 1.0.0 (initial constitution authored from template)
Modified principles: N/A — first authored version
Added sections:
  - I. Simplicity First
  - II. User Experience
  - III. Speed & Performance
  - IV. Clean Layouts
  - Development Standards
  - Quality Gates
  - Governance
Removed sections: N/A
Templates reviewed:
  - .specify/templates/plan-template.md   ✅ No update needed — Constitution Check derives gates at plan time
  - .specify/templates/spec-template.md   ✅ No update needed — no constitution-specific mandatory sections affected
  - .specify/templates/tasks-template.md  ✅ No update needed — task categories unchanged by these principles
Deferred items: None
-->

# AI Bootcamp Demo Constitution

## Core Principles

### I. Simplicity First

Build the simplest solution that satisfies the requirement. Every design decision MUST
default to the least complex option. Premature abstractions, over-engineered patterns, and
unnecessary dependencies are violations.

- Features MUST solve real, demonstrated needs — not hypothetical future requirements.
- Three explicit lines are preferable to a premature helper function.
- Dependencies MUST be justified; each addition increases surface area and maintenance cost.
- When complexity is unavoidable, it MUST be isolated, documented with a rationale comment,
  and flagged in the plan's Complexity Tracking table.

### II. User Experience

Every interaction MUST be intuitive, accessible, and frictionless. The user's journey takes
priority over implementation convenience.

- User flows MUST be validated against real usage before a feature is considered complete.
- Error messages MUST explain what went wrong and what the user can do next — no raw stack
  traces or generic "Something went wrong" copy.
- Accessibility (WCAG 2.1 AA minimum) is non-negotiable for any UI surface.
- Onboarding paths MUST be tested with a first-time perspective; assumed knowledge is a bug.

### III. Speed & Performance

Applications MUST feel fast. Perceived and measured performance are product requirements,
not engineering afterthoughts.

- Initial page/screen load MUST target ≤ 2 seconds on a standard broadband connection.
- Interactive response (tap, click, keypress) MUST produce visible feedback within 100 ms.
- Any operation exceeding 300 ms MUST display a loading indicator.
- Performance regressions introduced by a PR MUST be justified or remediated before merge.
- Lazy loading, code splitting, and asset optimization are default practices, not optional.

### IV. Clean Layouts

Visual design MUST be organized, consistent, and uncluttered. Whitespace, typographic
hierarchy, and spatial rhythm communicate clarity before content is read.

- Every screen MUST have a clear primary action; competing focal points are a violation.
- Spacing, color, and type scales MUST come from a defined design token set — ad-hoc values
  are not permitted.
- Components MUST be visually consistent across contexts; layout drift between pages is a bug.
- Decorative elements MUST earn their place; anything that does not aid comprehension MUST
  be removed.

## Development Standards

These rules apply to all code contributed to this project.

- **YAGNI**: Do not implement functionality until it is required by a specified user story.
- **Single responsibility**: Each module, component, or function addresses one concern.
- **No silent failures**: All error paths MUST be handled explicitly and surfaced
  appropriately to the user or operator.
- **Reviewability**: PRs MUST be scoped to a single concern; reviewers MUST be able to
  understand the change without oral explanation.
- **Documentation discipline**: Inline comments explain *why*, not *what*. Multi-paragraph
  docstrings are prohibited; one-line summaries are preferred.

## Quality Gates

A feature MUST pass all gates before it is considered shippable.

1. **Constitution compliance**: The plan's Constitution Check section MUST be signed off
   with no unresolved violations.
2. **UX acceptance**: All P1 user story acceptance scenarios pass against the running app.
3. **Performance baseline**: Load and interaction benchmarks meet the thresholds in
   Principle III. Deviations MUST be documented with a remediation timeline.
4. **Layout review**: At least one team member confirms layout consistency against the
   design token set and that no competing focal points exist.
5. **Accessibility check**: Automated accessibility scan (e.g., axe-core) returns zero
   critical or serious violations.

## Governance

This constitution supersedes all other development practices. Any practice that conflicts
with these principles MUST be escalated and resolved via the amendment process — it MUST NOT
be silently ignored.

**Amendment procedure**:

1. Raise a proposal describing the principle change and motivation.
2. Document the migration plan for code/design currently non-compliant with the new wording.
3. Obtain acknowledgement from at least one other contributor.
4. Increment the version following semantic versioning rules, update `LAST_AMENDED_DATE`,
   and commit the updated constitution.

**Versioning policy**:

- MAJOR: Backward-incompatible governance changes or removal/redefinition of a principle.
- MINOR: New principle or section added; material expansion of guidance.
- PATCH: Clarifications, wording improvements, typo fixes.

**Compliance review**: Every PR description MUST include a one-line Constitution Check
confirming no principles are violated, or naming the violation and its justification.

**Version**: 1.0.0 | **Ratified**: 2026-06-08 | **Last Amended**: 2026-06-08
