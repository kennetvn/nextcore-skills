# The lesson loop: private memory → public rule

Agents write lessons into private memory every week. Most are project-specific. Some are general:
"run a positive control before trusting a zero" applies to every codebase. This loop moves the
general ones to a public repository, where they become rules with tests.

```
agent learns ─▶ memory file          ─▶ scanner script     ─▶ public issue        ─▶ maintainer
               community: true          (scheduled / CI)      (one per lesson)       rule + 2-way fixture
               ## Community (EN)                                                      ─▶ release
```

## Step 1 — the agent flags it

When a lesson is general (it would hold in a different product, stack, or team), the agent adds to
the memory file's frontmatter:

```yaml
community: true
```

and appends a section written for strangers:

```markdown
## Community (EN)

**What happened:** <numbers, no names>
**Why:** <mechanism>
**Rule:** <one or two sentences, testable>
**Fixture idea:** <a violating case the rule must catch, and a passing case it must not>
```

Anonymization is the agent's job at write time, not the scanner's:
- no product, domain, IP, account, person, or issue numbers;
- no internal paths or internal script names;
- keep the numbers — they are the evidence. "8 / 8 refused" survives anonymization.

Test for "general": would a team on a different stack hit the same trap? If the lesson only makes
sense with your schema or your vendor, keep it private.

## Step 2 — a script scans and opens issues

A small script, run on a schedule or in CI:

1. Find memory files with `community: true`.
2. Extract only the `## Community (EN)` section. **Never** send the private body.
3. Run a leak check on the extracted text: a deny-list regex (product names, domains, IP ranges,
   internal path prefixes, `#<digits>`), plus a check for any string that also appears in your
   secrets store. Any hit → skip and report locally.
4. Hash the section. Skip if an issue with that hash already exists (idempotent).
5. Open one issue on the public repo: title from the rule line, body = the section, label
   `lesson-candidate`, the hash in a hidden comment.
6. Write back `community_issue: <url>` into the memory frontmatter.

Test the scanner in both directions: a planted file with a deny-listed word must be skipped; a clean
file must produce exactly one issue, and a second run must produce zero.

## Step 3 — a maintainer turns it into a rule

A lesson is not a rule until it has a fixture that works both ways.

1. Decide the tier:
   - checkable by a machine → write a gate (hook, lint rule, validator);
   - not checkable → add it to the reasoned-rules reference with the numbers.
2. For a gate, add two fixtures:
   - **red:** the violating case from the lesson → gate must fail and name it;
   - **green:** a near-miss that is fine → gate must pass.
3. Merge, release, close the issue with a link to the rule.
4. Reject candidates that are project-specific, unmeasured ("felt slow"), or duplicate an existing
   rule — close with the reason, so the agent side learns what qualifies.

## Step 4 — pull it back

Projects that use the public skill update it like any dependency. Your own agents then get the
generalized rule, and the private memory can link to it instead of repeating it.

## Why this shape

- **Agents already write lessons.** The loop costs one frontmatter key and one short section.
- **Anonymize at the source.** The agent knows which details are private; a scanner can only guess.
- **Issues, not pull requests.** A human decides what becomes a rule. Agents propose; maintainers
  dispose.
- **Two-way fixtures** stop the public rule set from filling with gates that are green forever.

## Minimal adoption

1. Agree on the frontmatter key and section heading.
2. Write the scanner (~100 lines) with the leak check and the hash.
3. Add a weekly schedule.
4. Label `lesson-candidate` in the public repo; review weekly.
