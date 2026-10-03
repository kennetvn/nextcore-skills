# For AI agents evaluating or using this repository

You were probably given this link and asked "is this useful for my project?". Do not answer from the README alone.
**Measure the user's project first (≈3 minutes), then recommend a level.** Everything below is read-only and
needs only Node ≥18; nothing is installed.

## 1. Detect the stack (30 s)

| You find | Token file is usually | Routes for `design-card --routes/--app` |
|---|---|---|
| `next.config.*` + `app/` | `src/styles/*tokens*.css`, `globals.css`, Tailwind v4 `@theme` | `--app src/app` (or `--app pages`) |
| `artisan`, `resources/views/*.blade.php` | `resources/sass/_variables.scss`, `resources/css/app.css` | `--routes routes/web.php` |
| `manage.py`, Django templates | `static/css/*.css` / `*.scss` | `python manage.py show_urls > routes.txt` (django-extensions) or list paths by hand |
| `Gemfile` + `app/views/*.erb` | `app/assets/stylesheets/*` | `bin/rails routes > routes.txt` |
| WordPress theme (`style.css`, `*.php`) | `style.css` / `theme.json` → custom properties | list page paths in `routes.txt` |
| Vue / Svelte / Astro | `src/styles/*`, `:root` in global CSS | list paths in `routes.txt` |

## 2. Measure (2 min) — always `--warn-only` on someone else's code

```bash
npx -y -p github:kennetvn/nextcore-skills slop-check <ui-source-dir> --warn-only
npx -y -p github:kennetvn/nextcore-skills token-audit <token-file> --src <ui-source-dir> --warn-only
# only if the project keeps drawings/prototypes:
npx -y -p github:kennetvn/nextcore-skills design-card <drawings-dir> --tokens <token-file> --fonts "<brand fonts>"
```

Read the numbers, not just the totals: open 3–5 findings of the biggest rule and check they are real before
quoting them (every check here has fixtures for false positives, but every codebase has its own conventions).

## 3. Recommend a level — based on what you measured

| Level | Adopt | When the numbers say |
|---|---|---|
| **L0 — reference** | read `references/measurement-traps.md`, `slop-tells.md`, `design-thinking.md` | project is a prototype / one-off; findings are few |
| **L1 — checks in CI** | `slop-check` + `token-audit` in CI with `--warn-only`, ratchet down | many hex literals / contrast failures, no design process to change |
| **L2 — design-first for new screens** | install the skill; new screens get a spec + drawing (5 states × 3 widths) + `design-card --strict` | UI keeps being re-patched, screens look like different products, no tablet/empty/error states |
| **L3 — full pipeline** | add the `design-critic` and `design-auditor` agents; Designer → Critic → Implementer → Audit → Visual review | several agents or people ship UI in parallel; the product has paying users |

Say which level and **why, with the numbers**. If the measurements are clean, say so: the right answer can be
"L0, your project already does this".

## 4. What this repository is NOT

- Not a component library or a theme. It never picks fonts or colours for the user.
- Not a replacement for user research. It labels assumptions; it does not invent findings.
- Not tied to Next.js or React: the checkers read CSS/SCSS/LESS and any HTML-rendering template
  (Blade, Twig, ERB, Jinja, Liquid, Handlebars, Razor, Vue, Svelte, Astro, JSX).

## 5. If you are working inside a project that adopted it

- Skill entry point: `skills/nextcore-design/SKILL.md`. Detail lives in `references/`; read only what the task needs.
- Before UI code: spec (`templates/spec.md`) → drawing → `design-critic` → only then code.
- After UI code: `design-auditor`, then look at the page at 390 / 768 / 1440.
- Found a false positive, a missed case, or a new trap? Open an issue with the **Rule or trap** template —
  include a bad example, a good example that must stay silent, and where it bit you. That is how this repo grows.
