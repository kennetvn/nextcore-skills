# Migrating drawings from an old tool

Teams switch design tools (Penpot → something else, loose `.dc.html` artboards and claude.ai artifacts → one canvas,
Figma → a self-hosted tool). The migration is where drawings quietly lose fonts, corner shapes and dark mode while
every check says "pass". This is the procedure that held up, and the traps that made it lie.

## Procedure

1. **Inventory first, read-only.** List team → project → file → boards, how many are already in the new tool and how
   many would be imported. Nothing is written in this step. Large teams: filter by name before reading every file.
2. **Dry run by default.** The import command prints what it *would* import; writing needs an explicit flag.
3. **The source is never written or deleted.** After the migration the old tool becomes a read-only archive — remove
   agents' write access to it, or someone will keep drawing there.
4. **Idempotent and resumable.** A second run imports 0 boards and creates no duplicates. A dropped connection or an
   expired token resumes from the file it stopped in; files already read are kept.
5. **Compare every board side by side** — original render next to the new tool's render, plus a pixel diff — and
   score similarity (SSIM ≥ 0.95 per board was our bar). Score through the **same viewer users open**, see the traps.
6. **Final report**: imported · skipped · failed, each failure with its reason. Every migrated screen keeps a link to
   its origin.
7. **Duplicates from two import routes** (a design-file import and an SVG export of the same board): keep the one from
   the design file, move the other to the trash.
8. Then make the migrated screens the **baseline** for future work (`baseline-and-delta.md`): check each against the
   live app before the first clone.

## Traps we measured

- **The meter rendered through a nicer path than the app.** Our similarity runner embedded the brand fonts and
  downsampled each 1920 px board to ~480 px before scoring: "96% pass". The real viewer renders boards in a sandboxed
  iframe whose content-security policy blocks every web font, so text fell back to system fonts — on the first run,
  59 of 59 boards had substituted fonts, median similarity 0.95. The owner spotted it by eye a day later. Score through
  the app's own viewer (same sandbox, same CSP, same token file) and never below 1 sample per CSS pixel.
- **"0 structural differences" while similarity stays under 0.98.** The comparer only compared *declared*
  properties, not what got painted. Three blind families on 515 boards:
  1. the export forced `-webkit-font-smoothing: antialiased` while the source rendered with `auto` — thinner, lighter
     text on macOS;
  2. a global `corner-shape: squircle` in the token file turned a 36 px avatar with radius 18 into a squircle; reading
     the computed value as the string `round` (it is `superellipse(1)`) produced 886 false reports;
  3. the source tool draws a stroke that has no explicit style *centred*, ignoring its alignment setting (pixel count at
     2×: 79/13 vs 87/2 with a style). A missing field is not the UI default.
  Fixing the three moved a 46-board sample from 18 to 41 boards at SSIM ≥ 0.98. When the diff has no name, measure what
  was painted (computed style, pixels at the edge), don't add another declared-property comparison.
- **Colours mapped to tokens by value.** The importer matched each colour to the first token with the same light value.
  Two tokens that share a light value and differ in dark mode got swapped: the light render was right, the dark one
  flipped (a primary button's text at 1.9:1). Export and look at the dark render of every imported board.
- **Writes that report success and change nothing.** An edit call with the wrong argument shape returned OK, no
  warning, and left the node untouched — four "fixes" in a row did nothing. Read the node back after every write.
- **Large source files that do not save.** Our old tool crashed or silently dropped work on files with more than ~15
  boards (one with 25 boards would not load again). Check the file's revision number after writing, keep files small,
  and export through the tool's own exporter rather than a live tab when a file is heavy.

## Done when

- Inventory and final report attached to the migration issue (counts per file).
- Second run: 0 to import, 0 duplicates.
- Every board ≥ the similarity bar through the app's own viewer, light **and** dark render looked at.
- The old tool is read-only for agents; the docs and skills point to the new one.
