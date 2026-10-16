<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

## Production operations

Production database migrations and deploys go through tickets in `ops/handoff/` — see `ops/README.md`. Agents with Supabase/Vercel MCP access execute `ready` tickets ("process ops"); other agents prepare tickets and verify them on the local stack. Never apply schema changes to production outside a ticket.
