# Wanna Space — Documentation

The source of truth for how this product is shaped, built, and designed. Docs change in the
same PR as the code they describe.

| Area         | Doc                                                      | What it answers                           |
| ------------ | -------------------------------------------------------- | ----------------------------------------- |
| Product      | [product/vision.md](product/vision.md)                   | What we're building, for whom, and why    |
| Product      | [product/roadmap.md](product/roadmap.md)                 | Phases, scope, and current status         |
| Architecture | [architecture/overview.md](architecture/overview.md)     | Stack, folder layout, layers, conventions |
| Architecture | [architecture/data-model.md](architecture/data-model.md) | Live tables and drafted room entities     |
| Architecture | [architecture/decisions/](architecture/decisions/)       | ADRs — why each major decision was made   |
| Design       | [design/design-system.md](design/design-system.md)       | Tokens, type, color, motion, components   |

A live visual reference of the design system runs at `/design`.

## Writing an ADR

Copy the newest file in `architecture/decisions/`, bump the number, and fill in Context,
Decision, Consequences. ADRs are never edited after acceptance — supersede them with a new one.
