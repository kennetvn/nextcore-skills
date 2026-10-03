# nextcore-skills

**Skill rút từ một sản phẩm thật, không phải bản demo.** Ba plugin cho agent viết code bằng AI (Claude Code, Cursor, Codex,
Windsurf, Gemini CLI, Copilot) cùng năm công cụ không phụ thuộc thư viện, chắt lọc từ một nền tảng đặt phòng đang chạy
production do các agent AI viết và vẫn vận hành hằng ngày: có khách trả tiền, ~230 trang, ~740 API route, 10 tiện ích
trình duyệt, nhiều agent chạy song song, hai tài khoản AI thay phiên. Mỗi quy tắc ở đây có mặt vì điều ngược lại đã xảy
ra và đã được đo.

[![License: MIT](https://img.shields.io/badge/license-MIT-0293DA.svg)](LICENSE)
[![test](https://github.com/kennetvn/nextcore-skills/actions/workflows/test.yml/badge.svg)](https://github.com/kennetvn/nextcore-skills/actions/workflows/test.yml)
[![Node ≥18](https://img.shields.io/badge/node-%E2%89%A518-16181D.svg)](package.json)
[![Zero dependencies](https://img.shields.io/badge/dependencies-0-0293DA.svg)](package.json)
[English](README.md)

![Ba plugin khớp với nhau thế nào: yêu cầu → nextcore-design (đặc tả + bản vẽ) → nextcore-dev (hợp đồng API) → phát hành, đo bằng các công cụ không phụ thuộc thư viện, tất cả nằm trong nextcore-workflow](docs/overview.svg)

## Thử trên dự án của bạn trong một phút

Không cần cài, chỉ đọc, Node ≥18:

```bash
npx -y -p github:kennetvn/nextcore-skills slop-check src --warn-only
npx -y -p github:kennetvn/nextcore-skills token-audit src/styles/tokens.css --src src --warn-only
```

Kết quả in ra trên chính ứng dụng production mà repo này rút ra:

```text
$ slop-check src
ERROR  src/app/dashboard/auto-post/auto-post.css:30  [color-literal] hex outside tokens — use var(--…)
        border: 1px solid #fde68a;
warn   src/app/blogs/page.tsx:33  [emoji-icon] use an icon set, not emoji
slop-check: 4932 finding(s), 1447 error(s) — color-literal 1443 · pixel-patch 698 · emoji-icon 372 · grid-1fr 825 · …

$ token-audit src/design-system-v2/tokens.css --src src
warn   [contrast] light: --ds-alert-fg on --ds-alert
        3.95:1 (X-fg on X) — needs 4.5:1 for body text, 3:1 only for large text
warn   [dark-missing] --ds-bg-muted
        #F2F5F8 has no dark-theme value — near-white colours vanish or glare in dark mode
token-audit: 228 tokens (56 with a dark value), 22 text/background pairs × 2 theme(s) — 6 finding(s), 0 error(s)
```

2,226 tệp UI trong khoảng 2 giây. Trên một trang quản trị PHP thuần, cùng bộ quét chạy hết 0.5 s và tìm ra 23 gradient
tím kiểu "mặc định của AI", 20 trong số đó viết bằng hex.

## Vì sao có repo này

Agent viết code nhanh, nhưng kém nhất quán và kém trung thực về chính code đó. Trên một sản phẩm thật, điều này lộ ra như sau:

| Mảng | Đo được trước khi có các quy tắc này | Plugin |
|---|---|---|
| UI | 56 bản vẽ: 51 bản **không có bố cục tablet**, 29 bản dùng < 85% màu thương hiệu, 20 bản dùng font sản phẩm không có; màn hình bị vá đi vá lại và trông như năm sản phẩm khác nhau | nextcore-design |
| Design ↔ code | trường vẽ ra mà không có nguồn dữ liệu; lỗi trả về HTTP 200; "không có quyền" trả về danh sách rỗng nên UI hiện "không có dữ liệu" | nextcore-dev |
| Bảo mật | một cổng xác thực in "OK" trong khi bỏ qua **53%** tệp route; trên một dịch vụ PHP, **0 trên 27** endpoint API kiểm tra người gọi và hai endpoint "tạm" cho bất kỳ ai ghi đè code PHP | nextcore-dev |
| Vận hành | trình giám sát giết ứng dụng **647** lần vì trần bộ nhớ bằng đúng heap; một job báo SUCCESS suốt **23 ngày** trong khi kết nối của nó đã chết | nextcore-dev |
| Agent | 90 ngày: **473** bản phát hành extension, **2** commit ghi "nguyên nhân gốc"; một tính năng mất **11** bản vá triệu chứng | nextcore-workflow |
| Tài liệu | quy tắc dạy những con số không còn đúng ("76 route thiếu xác thực", số thật là 0); một chỉ mục bộ nhớ 68 KB lặng lẽ mất 143 trên 305 dòng | nextcore-workflow |

## Ba plugin

### nextcore-design: vẽ trước, code sau, đo cả hai

Cho ai làm giao diện. Agent viết đặc tả (mục tiêu, thứ bậc thông tin, field map, FACT và ASSUMPTION), vẽ màn hình ở
**5 trạng thái × 3 khổ** chỉ bằng token và font của sản phẩm, để **một agent phản biện tách riêng** soát lại, dựng đúng
1:1, rồi đo. Nó không bao giờ chọn màu hay font thay bạn: nó khoá design system bạn đang có.

- Hai agent: `design-critic` (phản biện trước khi viết dòng code nào, mỗi ý đều trích artboard + phần tử) và
  `design-auditor` (chạy công cụ sau khi code, chỉ báo con số).
- Một **phiếu bản vẽ** trên mỗi bản vẽ: tính năng, route đang chạy, lý do, đã dựng chưa, cùng các thiết bị đã đo, trạng thái,
  DNA màu và DNA chữ. Phiếu cam ⇒ chưa sẵn sàng để duyệt.
- Phép thử nheo mắt: nhìn xa (50% / 25%), đen trắng, và gỡ hết mọi shadow và gradient. Ngay lần chạy thật đầu tiên, nó
  chỉ ra một nút chính biến thành khối xám ngang hàng với các chip lọc khi mất màu.
- [README plugin](plugins/nextcore-design/README.vi.md) · [SKILL.md](plugins/nextcore-design/skills/nextcore-design/SKILL.md) · [tư duy thiết kế](plugins/nextcore-design/skills/nextcore-design/references/design-thinking.md) · [dây chuyền agent](plugins/nextcore-design/skills/nextcore-design/references/agent-pipeline.md)

### nextcore-dev: hợp đồng để design và code gặp nhau

Cho việc backend và full-stack. Mọi giá trị trên bản vẽ truy được về một nguồn, mọi nguồn về một hình dạng API, mọi
trạng thái UI về đúng một tín hiệu backend:

| Trạng thái UI | Tín hiệu backend | Thấy ở production thay vào đó |
|---|---|---|
| Rỗng | `success: true`, `data: []` | `success: false` cho "không có dòng nào" |
| Lỗi | `success: false` + `error.code` | HTTP 200 kèm một chuỗi lỗi |
| Không có quyền | 403 + `FORBIDDEN` | 200 với dữ liệu rỗng, trông như trạng thái Rỗng |
| Không tìm thấy | 404 + `NOT_FOUND` | 200 + một trang "không tìm thấy" (soft-404) |

- Xác thực trên mọi route, chứng minh bằng một cổng **in ra những gì nó đã kiểm** ("728/739 routes, 11 exempt, 0 violations").
- Tiền dùng Decimal, một bộ sinh mã đơn duy nhất, `onDelete` tường minh, migration viết tay có sổ cái, sửa dữ liệu
  production theo thứ tự backup → script → áp → kiểm → commit.
- Một hệ thống job duy nhất có khoá và nhật ký chạy; trạng thái của job phải phản ánh khi nó thất bại.
- 14 bẫy backend kèm số đo, và ghi chú cho **Next.js, Laravel, Django, Rails, Express/Nest, PHP thuần và WordPress**.
- [SKILL.md](plugins/nextcore-dev/skills/nextcore-dev/SKILL.md) · [hợp đồng API](plugins/nextcore-dev/skills/nextcore-dev/references/api-contract.md) · [bảo mật](plugins/nextcore-dev/skills/nextcore-dev/references/security.md) · [các stack](plugins/nextcore-dev/skills/nextcore-dev/references/stacks.md) · [bàn giao design ↔ dev](plugins/nextcore-dev/skills/nextcore-dev/references/handoff.md)

### nextcore-workflow: chạy agent trên sản phẩm thật mà không bị chúng nói dối

Cho người vận hành agent.

- **Cổng cho những gì máy kiểm được, suy luận cho phần còn lại**, và mọi cổng mới đều được thử hai chiều (cài một vi
  phạm, xem nó báo đỏ) trước khi tin màu xanh của nó.
- **Chẩn đoán trước lần vá thứ ba:** lần sửa thứ ba vào cùng một chỗ trong 72 giờ bị chặn cho tới khi có ghi chú chẩn
  đoán (triệu chứng đo được · giả thuyết + cách bác bỏ · quan sát tại chỗ).
- **Bằng chứng trước khi báo "xong":** đối chứng dương và đối chứng âm; con số quá đẹp thì nghi công cụ đo trước.
- **Nhiều agent song song và nhiều tài khoản AI:** nhận việc theo task và vùng tệp, commit theo pathspec, một trunk,
  deploy chỉ qua CI; thứ gì gắn với một tài khoản AI (canvas, artifact) đều có bản gốc trong repo.
- **Quyết định nằm trên issue;** tài liệu mang mốc ngày để `doc-drift` đo lại; bài học chảy ngược về đây.
- Giữ máy sạch cho phiên agent chạy lâu (tiến trình Node mồ côi, browser MCP tự hồi phục, bộ nhớ CLI).
- [SKILL.md](plugins/nextcore-workflow/skills/nextcore-workflow/SKILL.md) · [chẩn đoán trước khi vá](plugins/nextcore-workflow/skills/nextcore-workflow/references/diagnose-before-patch.md) · [kỷ luật đo](plugins/nextcore-workflow/skills/nextcore-workflow/references/measurement-discipline.md) · [agent song song](plugins/nextcore-workflow/skills/nextcore-workflow/references/parallel-agents.md) · [vòng bài học](plugins/nextcore-workflow/skills/nextcore-workflow/references/lesson-loop.md)

## Các công cụ

Đều là script Node ≥18 thuần, không phụ thuộc thư viện, mã thoát dùng được ngay trong CI, mỗi công cụ được thử hai chiều
(phải báo trên fixture xấu, phải im lặng trên fixture tốt).

| Công cụ | Trả lời câu hỏi | Chạy |
|---|---|---|
| `slop-check` | code UI có dấu hiệu "UI kiểu AI" hay vá pixel không? 11 luật, mọi stack HTML | `npx -y -p github:kennetvn/nextcore-skills slop-check <dir>` |
| `token-audit` | các cặp token có đạt tương phản WCAG **ở mọi theme** không? token nào thiếu giá trị tối? `var()` nào trỏ vào hư không? | `… token-audit <tokens.css\|.scss> --src <dir>` |
| `design-card` | mỗi bản vẽ đã đủ và đúng thương hiệu chưa (thiết bị, trạng thái, màu, font, route có tồn tại)? | `… design-card <drawings> --tokens … --fonts … --app\|--routes …` |
| `design-review` | thứ bậc có đứng vững khi nhìn xa, chuyển xám và bỏ trang trí không? (bảng ảnh + ảnh chụp) | `… design-review <drawings> --shot review.png` |
| `doc-drift` | con số nào viết trong tài liệu và quy tắc đã không còn đúng? | `… doc-drift docs --quiet` |

## Chạy được với stack của bạn

| Stack | UI được quét | Token đọc được | Route cho `design-card` |
|---|---|---|---|
| Next.js / React / Remix | `.tsx .jsx .css` | CSS custom properties, Tailwind v4 `@theme` | `--app src/app` hoặc `--app pages` |
| Laravel / PHP thuần / WordPress | `.blade.php .php .css .scss` | SCSS `$vars`, CSS custom properties | `--routes routes/web.php` |
| Symfony / Craft | `.twig` | CSS / SCSS | `--routes routes.txt` |
| Django / Flask | `.html .jinja .j2` | CSS / SCSS | `--routes routes.txt` |
| Rails | `.erb` | CSS / SCSS | `bin/rails routes > routes.txt` |
| Vue / Nuxt / Svelte / Astro | `.vue .svelte .astro` | CSS custom properties | `--routes routes.txt` |
| Shopify / Jekyll / Eleventy | `.liquid .njk .hbs` | CSS / SCSS | `--routes routes.txt` |
| ASP.NET | `.cshtml .razor` | CSS / SCSS | `--routes routes.txt` |

## Cài đặt

```bash
# Claude Code — all three plugins
/plugin marketplace add kennetvn/nextcore-skills
/plugin install nextcore-design@nextcore
/plugin install nextcore-dev@nextcore
/plugin install nextcore-workflow@nextcore
```

Agent khác: chép `SKILL.md` cần dùng vào tệp quy tắc của agent đó, gồm `.cursor/rules/*.mdc` (Cursor), `AGENTS.md`
(Codex), `GEMINI.md` (Gemini CLI), `.github/copilot-instructions.md` (Copilot), `.windsurf/rules/` (Windsurf), và để
thư mục `references/` cạnh nó.

## Bắt đầu từ cái nào?

| Bạn là… | Bắt đầu với |
|---|---|
| dev một mình, giao diện cứ vá đi vá lại | chạy `slop-check` + `token-audit` với `--warn-only`, rồi dùng nextcore-design cho màn hình mới kế tiếp |
| dev backend được giao mockup | nextcore-dev → [bàn giao](plugins/nextcore-dev/skills/nextcore-dev/references/handoff.md) và [hợp đồng API](plugins/nextcore-dev/skills/nextcore-dev/references/api-contract.md) |
| đội PHP (thuần, WordPress, Laravel) / Django / Rails | nextcore-dev [các stack](plugins/nextcore-dev/skills/nextcore-dev/references/stacks.md): với PHP thuần, cách gác và đếm mọi endpoint |
| người chạy nhiều agent hay nhiều CLI trên một repo | nextcore-workflow → [agent song song](plugins/nextcore-workflow/skills/nextcore-workflow/references/parallel-agents.md) |
| một agent AI được hỏi "cái này có ích cho dự án của tôi không?" | [AGENTS.md](AGENTS.md): đo dự án trước, rồi đề xuất một mức L0–L3 |

Dòng cuối đã được thử: một agent mới, chỉ được đưa link này và một dự án PHP thuần, đã đo dự án, đề xuất "chỉ tham
khảo (L0)" kèm số liệu, và tìm ra các endpoint upload không có cổng gác nêu ở trên.

## Khác ở đâu

| | skill design / code thường gặp | **nextcore-skills** |
|---|---|---|
| Nguồn | best practice, viết lại thành văn | sự cố trên sản phẩm đang chạy, kèm số đo |
| Chọn font và màu | thường có | không bao giờ: khoá design system của bạn |
| Đơn vị công việc | một trang code | đặc tả + bản vẽ được người duyệt, rồi mới code |
| "Xong" nghĩa là | trông có vẻ đúng | đã đo: công cụ, bảng nheo mắt, bảng khớp, cổng thử hai chiều |
| Ai chấm | chính agent làm ra nó | một agent phản biện tách riêng + script |
| Design ↔ backend | hai thế giới riêng | một hợp đồng: field map → hình dạng API → tín hiệu trạng thái UI |
| Nhiều agent / tài khoản | không đề cập | nhận việc, commit theo pathspec, repo giữ bản gốc |

## Repo này lớn lên thế nào

1. Một agent trên dự án thật gặp điều có giá trị chung: một cái bẫy, một lần báo "xong" giả, một quy tắc lẽ ra đã cứu một ngày.
2. Agent ghi bài học kèm một mục tiếng Anh đã ẩn danh và một cờ (`community: true`).
3. Một script chạy lúc mở phiên thấy cờ, lọc bỏ mọi thứ riêng tư, rồi mở một issue **lesson** ở đây.
4. Người duy trì biến nó thành quy tắc, kèm một ví dụ xấu phải bị bắt và một ví dụ tốt phải im lặng, hoặc
   đóng issue kèm lý do.

Tự mở một [issue lesson](https://github.com/kennetvn/nextcore-skills/issues/new?template=lesson.yml), hoặc đọc
[CONTRIBUTING.md](CONTRIBUTING.md). Người đóng góp được ghi công trong CHANGELOG, ngay cạnh quy tắc họ đã dạy, và ở đây:

[![Contributors](https://contrib.rocks/image?repo=kennetvn/nextcore-skills)](https://github.com/kennetvn/nextcore-skills/graphs/contributors)

## Hỏi đáp

**Có cần Claude Code không?** Không. Skill là Markdown, agent nào cũng làm theo được; công cụ là script Node. Claude Code
chỉ giúp cài mọi thứ bằng một lệnh.

**Có cần Claude Design không?** Không. Canvas nào hay prototype HTML nào cũng được; `design-card` và `design-review` đọc
artboard `.html` thường.

**Token của chúng tôi không đặt tên `--ds-*`.** `token-audit` ghép cặp theo hậu tố (`-fg`, `-ink`, `-soft`, `bg`, `surface`…)
và `--pair a:b` thêm bất kỳ cặp nào khác. SCSS `$variables` cũng chạy được.

**Bộ quét có làm ngập một ứng dụng cũ không?** Bắt đầu với `--warn-only`, giới hạn ở các tệp đã đổi, rồi siết dần.

**Code của tôi có bị gửi đi đâu không?** Không. Mọi công cụ đọc tệp cục bộ và in báo cáo; không gì gọi ra mạng.

## Một repo duy nhất

Mọi thứ nằm ở đây: `plugins/nextcore-design` (gộp từ repo `kennetvn/nextcore-design` cũ, giữ trọn lịch sử),
`plugins/nextcore-dev`, `plugins/nextcore-workflow` (đã nhận luôn các bản sửa từ repo `nextcore-solutions` cũ). Một CI
chạy mọi test trên Linux, Windows và macOS với Node 18, 20 và 22. Danh mục "NEXTCORE-SKILLS v3" trước đây (147 skill
viết trong một ngày, chưa từng được đo) còn nguyên ở tag
[`legacy-v3.0.1`](https://github.com/kennetvn/nextcore-skills/tree/legacy-v3.0.1).

## Ghi công

Viết bằng lời của chúng tôi, với các ý tưởng học từ những dự án MIT sau:
[Leonxlnx/taste-skill](https://github.com/Leonxlnx/taste-skill) (3 núm vặn, dòng đọc) ·
[Nutlope/hallmark](https://github.com/nutlope/hallmark) (khung xương trước, cổng chặn slop) ·
[alchaincyf/huashu-design](https://github.com/alchaincyf/huashu-design) (câu hỏi về hình thức, 3 hướng) ·
[nextlevelbuilder/ui-ux-pro-max-skill](https://github.com/nextlevelbuilder/ui-ux-pro-max-skill) (thứ tự ưu tiên khi kiểm) ·
[anthropics/skills](https://github.com/anthropics/skills) `frontend-design` (dấu hiệu của LLM, hai lượt).

## Giấy phép

[MIT](LICENSE)
