# Architecture Decision Records

One file per significant technical decision: what we chose, what else we considered, and why. ADRs are never rewritten after acceptance. A later decision gets a new ADR that marks the old one `Superseded by ADR-NNNN`.

| ADR | Title | Status |
|---|---|---|
| [0001](0001-map-data-loading.md) | Map data loading — cached shared snapshot | Accepted (ops 0013) |
| [0002](0002-photo-pipeline.md) | Photo pipeline — server-validated uploads, private bucket, signed URLs | Accepted |
| [0003](0003-playground-status-and-admin-review-queue.md) | Playground publication status and admin review queue | Accepted (ops 0020) |

## Writing a new ADR

1. Copy the structure of the latest ADR into `NNNN-short-title.md` (next number, kebab-case).
2. Sections: **Context** (the forces at play) → **Decision** → **Options Considered** (each with a Complexity / Cost / Scalability / Familiarity table) → **Trade-off Analysis** → **Consequences** (easier / harder / when to revisit) → **Action Items**.
3. Status starts as `Proposed`; change it to `Accepted` once the owner signs off.
4. Add a row to the table above, and add the action items to [../backlog.md](../backlog.md).
