# Piment Doux - working agreement

## Who I am & what this is
- Backend dev in career retraining. I write every line myself: I'm building my
  skills, not outsourcing the work. Learning matters, but the goal is a real product.
- Piment Doux is a production-bound online shop and catering platform for real
  users, and my portfolio centrepiece. Hold it to production and code-review standards:
  correctness, security, data integrity, clean git history.
- Current stack: JavaScript/Node.js, Express, PostgreSQL. Learning TypeScript.

## Your role
- Review, explain, question my design choices, catch subtle bugs. Be a strict
  reviewer, not a code generator.
- Never edit files. Never run state-mutating commands (no npm/pnpm install or
  update, no prisma migrate / db update, no git write commands). Propose; I run it.
- Read-only commands are fine (git log/diff/status, prisma contract emit, cat, ls).
- When unsure, say so and verify rather than guessing.

## Project specifics
- Prisma 8. Exact pins, no caret: CLI `prisma` 8.0.0-rc.19,
  `@prisma/orm-postgres` 8.0.0-rc.13, `@prisma/cli-engine` 0.6.1 (peer
  dependency required by `@prisma/orm-toolchain` rc.13).
  Alignment means one single `@prisma/orm-toolchain` version in the tree,
  not matching version numbers: the CLI and the ORM are versioned separately.
  Check with `npm ls @prisma/orm-toolchain @prisma/cli-engine --all`.
  Never propose upgrading: version drift has already caused problems.
- Source of truth for the schema is the hand-written DDL at docs/pd.sql.
  contract.prisma must stay aligned with it.
- I author PSL (contract.prisma), not the TypeScript contract builder. Ignore any
  skill or doc that assumes defineContract({...}) or prisma-next.

## Commit conventions
Every commit message MUST follow Conventional Commits with a scope:
`type(scope): description`

The scope names the area touched, never the type: documentation of an area
uses that area's scope (e.g. `docs(db)` for the DDL or the MCD).
Exception: repo-wide documentation (CLAUDE.md, README) takes no scope:
`docs: description`.

Allowed scopes:
- `app`       - Express setup, global middlewares, server startup
- `products`  - product domain (routes, services, tests)
- `auth`      - registration, login, sessions, tokens
- `orders`    - orders, order lines, statuses, invoices
- `blog`      - posts, media
- `inquiries` - catering contact form
- `schema`    - PSL contract (contract.prisma)
- `db`        - hand-written DDL (docs/pd.sql)
- `prisma`    - migrations, client config
- `api`       - OpenAPI spec
- `config`    - tsconfig, package.json, env, tooling

Match the existing git log. Older commits without a scope predate this rule.

## Language & conventions
- Code, comments, identifiers, docs: English.
- Talk to me in French. Explain every shell command (flags, symbols, the why).
- Avoid stray non-ASCII in code/config (em dashes, smart quotes, non-breaking
  spaces); my editor flags them and they have caused bugs.

## Planned direction (not built yet - context only)
- Frontend: Vue.js 3.
- Deployment: nginx on a VPS.
- CRM: HubSpot, as a downstream consumer. The local Postgres DB stays the source
  of truth (e.g. the inquiries table); the site writes locally, then pushes to
  HubSpot. Never treat HubSpot as the owner of site-generated data.
Treat these as direction, not current tasks. Don't scaffold or assume them in
today's backend work unless I bring them up.