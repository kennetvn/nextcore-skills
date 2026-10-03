<p align="center"><img src="docs/hero.svg" width="100%" alt="nextcore-skills — agent AI giao UI và API chạy được lâu. Skill và công cụ kiểm không phụ thuộc thư viện, rút ra từ một sản phẩm đang chạy: design, dev, workflow."></p>

Ba skill để agent viết code bằng AI làm theo — **design**, **dev**, **workflow** — và bảy cổng kiểm nhỏ bạn chạy được
trên dự án của mình trong một phút: Next.js, Laravel, PHP thuần, Django, Rails, Vue, bất cứ thứ gì render ra HTML. Rút
ra từ [homestaynextcore.org](https://homestaynextcore.org), một nền tảng đặt phòng đang chạy thật, do các agent AI viết
và vẫn vận hành.

[![License: MIT](https://img.shields.io/badge/license-MIT-0293DA.svg)](LICENSE)
[![test](https://github.com/kennetvn/nextcore-skills/actions/workflows/test.yml/badge.svg)](https://github.com/kennetvn/nextcore-skills/actions/workflows/test.yml)
[![Node ≥18](https://img.shields.io/badge/node-%E2%89%A518-16181D.svg)](package.json)
[![Zero dependencies](https://img.shields.io/badge/dependencies-0-0293DA.svg)](package.json)
[English](README.md)

## Bắt đầu nhanh

```bash
# Claude Code — thêm skill
/plugin marketplace add kennetvn/nextcore-skills
/plugin install nextcore-design@nextcore      # thêm: nextcore-dev, nextcore-workflow

# Dự án bất kỳ, stack bất kỳ — đo, xem skill nào hợp (không cài, không gửi gì đi)
npx -y -p github:kennetvn/nextcore-skills nextcore measure
```

**Hoặc để agent tự làm** — dán câu này cho Claude Code, Cursor, Codex, Gemini CLI, Copilot hay Windsurf:

```text
Đọc https://github.com/kennetvn/nextcore-skills/blob/main/AGENTS.md, đo dự án này,
cho tôi biết skill nào hợp và vì sao, rồi tự cài những skill đó cho bạn.
```

Cài tay cho agent khác: [cài skill](#cài-skill). Kết quả mẫu và sáu công cụ còn lại: [thử trong một phút](#thử-trong-một-phút).

## Ba skill

![Các skill khớp với nhau thế nào: xác định cỡ → tìm hiểu vấn đề → đặc tả + vẽ → phản biện → hợp đồng API → thi công 1:1 → kiểm → kiểm chứng; sự cố thành case, quy tắc và cổng kiểm.](docs/pipeline.svg)

**[nextcore-design](plugins/nextcore-design/README.vi.md)**: cho ai giao UI. Xác định cỡ việc và tìm hiểu trước
(vấn đề, việc người dùng cần làm, mọi nhánh của luồng), rồi đặc tả và bản vẽ 5 trạng thái × 3 khổ, một lượt soát bởi
một *agent phản biện* tách riêng, thi công 1:1, và kiểm chứng người dùng thật sự làm xong được việc. Hai thuật ngữ bạn sẽ gặp: **phiếu thiết kế (design card)** là một checklist ngắn gắn vào
mỗi bản vẽ (tính năng nào, trang nào, vì sao, đã dựng chưa, cộng thiết bị, trạng thái, màu và font đã đo); **phép thử
nheo mắt (squint test)** cho xem mỗi bản vẽ ở cỡ nhỏ, thang xám và bỏ bóng đổ để kiểm những thứ quan trọng vẫn nổi bật.
Skill không bao giờ chọn màu hay font thay bạn: nó giữ design system bạn đang có.

**[nextcore-dev](plugins/nextcore-dev/skills/nextcore-dev/SKILL.md)**: cho việc backend và full-stack. Biến danh sách
trường của bản vẽ thành hợp đồng API (một hình dạng phản hồi, mã lỗi để UI ánh xạ sang trạng thái), auth trên mọi route
được chứng minh bằng một bước kiểm có đếm, tiền dùng số thập phân, migration viết tay, sửa dữ liệu production an toàn,
một hệ thống duy nhất cho job nền, 14 bẫy backend, và ghi chú cho Next.js, Laravel, Django, Rails, Express/Nest, PHP
thuần và WordPress.

**[nextcore-workflow](plugins/nextcore-workflow/skills/nextcore-workflow/SKILL.md)**: cho người vận hành agent. Quy tắc nào
máy kiểm được thì thành git hook bạn cài vào, mỗi hook được chứng minh bằng cách cố ý cho nó báo lỗi một lần; chẩn đoán trước lần vá
thứ ba; bằng chứng trước khi báo "xong"; nhiều agent trên một repo mà không ghi đè việc của nhau; quyết định ghi trên
issue; con số trong tài liệu được đo lại; dọn máy sau những phiên agent dài.

## Các công cụ

| Công cụ | Kiểm gì | Dùng khi |
|---|---|---|
| `slop-check` | 11 dấu hiệu của code UI viết theo quán tính: màu viết cứng, gradient tím mặc định, `transition: all`, icon emoji, dữ liệu mẫu giả, vá pixel… | trong CI, trên template / CSS |
| `token-audit` | cặp màu chữ/nền đạt độ tương phản WCAG ở chế độ sáng **và** dark mode; màu thiếu bản tối; `var()` trỏ vào thứ không tồn tại | khi đổi màu |
| `design-card` | mỗi bản vẽ có khổ điện thoại/máy tính bảng/desktop, đủ 4 trạng thái, màu và font thương hiệu, và trang đó có thật | trước khi duyệt bản vẽ |
| `design-review` | một trang HTML (kèm ảnh chụp) cho xem mỗi bản vẽ ở cỡ nhỏ, thang xám, bỏ trang trí | khi soát bản vẽ |
| `spec-check` | phần suy nghĩ trước khi vẽ và sau khi làm: cỡ task, vấn đề, việc người dùng cần làm, mọi nhánh của luồng, giả định kiểm được, báo cáo kiểm chứng khi đã lên | trước khi vẽ; trước khi báo xong |
| `doc-drift` | con số ghi trong tài liệu nay không còn đúng | đầu phiên, trong CI |
| `third-patch` | chặn lần sửa thứ ba vào cùng một tệp trong 72 h nếu chưa có ghi chú chẩn đoán | pre-commit hook |

Chạy bất kỳ công cụ nào bằng `npx -y -p github:kennetvn/nextcore-skills <tool> …`; `<tool> --help` in ra các tuỳ chọn.
Tất cả là Node ≥18 thuần, không phụ thuộc thư viện, và mỗi công cụ được thử theo hai chiều: phải bắt được
ví dụ sai và im lặng với ví dụ đúng.

## Agent làm theo skill thì khác gì

**Design: mọi trạng thái được vẽ và soát trước khi có dòng code nào.** Không có skill, agent code đúng một màn hình
"mọi thứ suôn sẻ" ở khổ desktop. Có skill, agent viết một đặc tả ngắn, vẽ các trạng thái trống / đang tải / lỗi /
thành công ở khổ điện thoại, máy tính bảng và desktop, chỉ dùng màu và font của bạn, rồi **một agent thứ hai** soát bản
vẽ. Một lượt soát thật, đã rút gọn:

```text
VERDICT: revise
BLOCKING
1. all 6 artboards · body text — uses a font the product doesn't ship → use the brand font token
3. no 768 px artboard — the header row (4 filter chips + button ≈ 560 px) cannot fit a tablet
4. grayscale view · "Copy hand-over" button — turns into a grey block as heavy as the filter chips:
   the hierarchy depends on colour alone → make the selected chip an outline, give the button its own row
```

**Backend: lỗi phải hiện ra là lỗi trên UI.** Không có skill:

```js
// a user without access gets 200 and an empty list — the screen says "No bookings yet"
if (!canView) return Response.json([])
```

Có `nextcore-dev`, mỗi trạng thái UI ứng với đúng một tín hiệu từ backend:

```js
if (!canView) return fail(403, 'FORBIDDEN', 'You can only see bookings for your own properties')
// UI: data: [] → Empty state · FORBIDDEN → Permission state · success: false → Error state
```

**Vận hành agent: lần vá nhanh thứ ba phải có chẩn đoán.** Với pre-commit hook của skill workflow:

```text
$ git commit -m "fix: cart total again"
third-patch: BLOCKED — src/cart.js already has 2 fix commits in the last 72h:
    2ac251f fix: cart total again
    6828023 fix: cart total rounding
Write a diagnosis before patching again: docs/diagnosis/<area>.md naming the file, with three sections —
  ## Symptom · ## Hypothesis · ## Observation
```

## Thử trong một phút

```bash
npx -y -p github:kennetvn/nextcore-skills slop-check resources --warn-only
npx -y -p github:kennetvn/nextcore-skills token-audit resources/sass/_tokens.scss
```

Lần chạy đầu tải gói về (≈20 s, không có thư viện nào phải cài). Trỏ `slop-check` vào thư mục template/CSS của bạn;
trỏ `token-audit` vào tệp khai báo màu (CSS custom property hoặc biến SCSS/LESS; không có thì bỏ qua). Kết quả trên
một view Laravel nhỏ:

<details>
<summary>Kết quả mẫu trên một view Laravel nhỏ</summary>

```text
ERROR  resources/views/rooms.blade.php:1  [color-literal] hex outside tokens — use var(--…)
warn   resources/views/rooms.blade.php:1  [purple-gradient] default AI gradient — use brand tokens
ERROR  resources/views/rooms.blade.php:1  [transition-all] list the properties you animate
warn   resources/views/rooms.blade.php:2  [emoji-icon] use an icon set, not emoji
ERROR  resources/views/rooms.blade.php:3  [placeholder-data] use realistic sample data
ERROR  resources/views/rooms.blade.php:4  [break-all] cuts identifiers in half — widen the box or shrink text
warn   resources/sass/_tokens.scss:6      [pixel-patch] off-scale spacing looks like a pixel patch
…  (2 more warnings trimmed)
slop-check: 9 finding(s), 4 error(s)

ERROR  [contrast] light: $warning-fg on $warning
        1.63:1 (X-fg on X) — needs 4.5:1 for body text
ERROR  [contrast] light: $ink-muted on $bg
        2.07:1 (text on surface) — needs 4.5:1 for body text
```

</details>

Trên ứng dụng production 2,226 tệp nơi các quy tắc này ra đời, `slop-check` báo 4,932 phát hiện trong 2 giây. Với một
codebase cũ thì vậy là bình thường: chạy kèm `--warn-only`, sửa code mới trước, để con số tự giảm dần.

## Các case

**[cases/](cases/README.md)** — những sự cố đứng sau các quy tắc, mỗi case một tệp: triệu chứng có số đo, nguyên nhân,
cách sửa kèm số trước/sau, một lệnh hoặc test bắt được nó, và quy tắc cho agent. Xếp theo **tầng** (code, data, infra,
devops, performance, testing, ai-agents, process), **mảng** (api, database, security, jobs…) và **stack** (nextjs,
prisma, mysql, nginx, pm2… — danh sách mở), để nhóm Laravel hay Django đi thẳng tới phần hợp với mình. Case mới được
thêm dần khi sản phẩm tiếp tục chạy; case của bạn cũng được chào đón.

## Vì sao có các quy tắc này

Mỗi quy tắc được thêm vào sau khi điều ngược lại đã xảy ra trên sản phẩm thật và đã được đo:

| Chuyện đã xảy ra | Quy tắc rút ra |
|---|---|
| 56 bản vẽ màn hình: 51 bản không có bố cục máy tính bảng, 29 bản dùng dưới 85% màu thương hiệu, 20 bản dùng font mà sản phẩm không có | vẽ 3 khổ; đo mọi bản vẽ (*phiếu thiết kế*) trước khi duyệt |
| lỗi không có quyền trả về HTTP 200 + danh sách rỗng, nên người dùng thấy "không có dữ liệu" thay vì "không có quyền" | một hình dạng phản hồi; mỗi trạng thái UI một tín hiệu backend |
| một bước kiểm auth in "OK" trong khi bỏ sót 53% tệp route | cổng kiểm phải in ra nó đã kiểm những gì ("728/739 routes, 11 exempt") |
| trên một dịch vụ PHP, 0 trong 27 endpoint API kiểm người gọi; hai endpoint upload "tạm thời" cho ai cũng ghi đè được code PHP | gác mọi endpoint và đếm chúng, trên mọi stack |
| một job nền báo SUCCESS suốt 23 ngày trong khi kết nối của nó đã chết | trạng thái của job phải phản ánh lỗi |
| 473 bản phát hành extension trong 90 ngày, 2 commit tìm ra nguyên nhân gốc; một tính năng mất 11 bản vá triệu chứng | lần vá thứ ba vào cùng một chỗ phải có chẩn đoán |
| tài liệu ghi "76 routes without auth"; số thật là 0 | con số trong tài liệu phải kèm ngày và được đo lại |

### Các con số này chứng minh gì, và không chứng minh gì

Chúng đến từ một sản phẩm, do chính người làm ra sản phẩm đó đo. Chúng cho thấy các vấn đề là có thật và công cụ tìm
ra được chúng. Chúng **không** phải bằng chứng độc lập rằng skill làm một nhóm làm việc nhanh hơn:

| Đã chứng minh | Chưa chứng minh |
|---|---|
| các sự cố ở bảng trên đã xảy ra trên sản phẩm đang chạy và được đếm từ git, CI, log của nó | "năng suất +X%", "bug −Y%", "chi phí AI −Z%" — không có phép so trước/sau có đối chứng, nên chúng tôi không nêu con số nào |
| `slop-check`, `token-audit`, `third-patch` tìm ra các vấn đề này — bạn tự kiểm được trên code của mình trong một phút | rằng các quy tắc hợp với mọi nhóm; chúng được chỉnh trên một codebase |
| công cụ có test chạy trong CI (3 hệ điều hành × Node 18/20/22) | kiểm chứng từ bên ngoài — repo còn mới, chưa ai bên ngoài lặp lại được các con số này |

Cách nhanh nhất để đánh giá: chạy công cụ trên repository của bạn và đếm những gì nó báo mà bạn đồng ý. Nếu bạn đo được
trước/sau trên một dự án thật, [thêm vào đây](https://github.com/kennetvn/nextcore-skills/issues/new?template=showcase.yml)
— đó là bằng chứng mà README này tự nó không đưa ra được.

## Chạy được với stack của bạn

| Stack | `slop-check` đọc | `token-audit` đọc | Trang cho `design-card` |
|---|---|---|---|
| Next.js / React / Remix | `.tsx .jsx .css` | CSS custom property, Tailwind v4 `@theme`, Tailwind v3 `tailwind.config.js` | `--app src/app` hoặc `--app pages` |
| Laravel / PHP thuần / WordPress | `.blade.php .php .css .scss` | SCSS `$vars`, CSS custom property, bảng màu `theme.json` của WordPress | `--routes routes/web.php` |
| Symfony / Craft | `.twig` | CSS / SCSS | `--routes routes.txt` |
| Django / Flask | `.html .jinja .j2` | CSS / SCSS | `--routes routes.txt` |
| Rails | `.erb` | CSS / SCSS | `bin/rails routes > routes.txt` |
| Vue / Nuxt / Svelte / Astro | `.vue .svelte .astro` | CSS custom property | `--routes routes.txt` |
| Shopify / Jekyll / Eleventy | `.liquid .njk .hbs` | CSS / SCSS | `--routes routes.txt` |
| ASP.NET | `.cshtml .razor` | CSS / SCSS | `--routes routes.txt` |

## Cài skill

```bash
# Claude Code
/plugin marketplace add kennetvn/nextcore-skills
/plugin install nextcore-design@nextcore      # and/or nextcore-dev@nextcore, nextcore-workflow@nextcore
```

`@nextcore` là tên marketplace ở lệnh đầu tiên, không phải số phiên bản.

Đo và chỉ cài những gì hợp, một lệnh: `nextcore all --agent <agent>`. Hoặc cài skill tự chọn — ghi đúng chỗ agent đó đọc,
giữ nguyên tệp của bạn, chạy lại chỉ cập nhật:

```bash
# --agent claude · cursor · codex · gemini · copilot · windsurf · generic
npx -y -p github:kennetvn/nextcore-skills nextcore-install --agent cursor --skills design
npx -y -p github:kennetvn/nextcore-skills nextcore-install --agent codex --dry-run
```

Claude Code → `.claude/skills/` + `.claude/agents/` · Cursor → `.cursor/rules/*.mdc` · Codex → `AGENTS.md` · Gemini CLI →
`GEMINI.md` · Copilot → `.github/copilot-instructions.md` · Windsurf → `.windsurf/rules/`; tệp skill nằm trong `.nextcore/`.
Agent làm gì sau khi cài: [AGENTS.md §4](AGENTS.md#4-use--after-install).

| Bạn là… | Bắt đầu với |
|---|---|
| developer có UI cứ phải vá đi vá lại | `slop-check` + `token-audit` với `--warn-only`, rồi nextcore-design cho màn hình mới kế tiếp |
| developer backend được giao mockup | nextcore-dev: [checklist bàn giao](plugins/nextcore-dev/skills/nextcore-dev/references/handoff.md) và [hợp đồng API](plugins/nextcore-dev/skills/nextcore-dev/references/api-contract.md) |
| team PHP / WordPress / Django / Rails | nextcore-dev [ghi chú theo stack](plugins/nextcore-dev/skills/nextcore-dev/references/stacks.md); PHP thuần: cách gác và đếm mọi endpoint |
| người chạy nhiều agent AI trên một repo | nextcore-workflow: [agent song song](plugins/nextcore-workflow/skills/nextcore-workflow/references/parallel-agents.md) và `third-patch` |
| một agent AI được hỏi "cái này có ích cho dự án của tôi không?" | [AGENTS.md](AGENTS.md): đo dự án trước, rồi mới khuyến nghị |

## Sản phẩm dùng các skill này

| Sản phẩm | Là gì | Stack |
|---|---|---|
| [homestaynextcore.org](https://homestaynextcore.org) | đặt phòng homestay ở Việt Nam, kèm các extension trình duyệt cho người vận hành; nơi mọi quy tắc ở đây được đo | Next.js, Prisma, MySQL, Chrome extension |

Bạn đang dùng skill hoặc công cụ cho một sản phẩm thật? [Thêm sản phẩm của bạn](https://github.com/kennetvn/nextcore-skills/issues/new?template=showcase.yml):
một dòng nói nó là gì, stack, và (nếu có) một con số đã thay đổi. Bài học đến từ sản phẩm có trong bảng này được ghi
tên sản phẩm ngay cạnh quy tắc mà nó tạo ra.

### Quy mô homestaynextcore.org

[![Quy mô homestaynextcore.org: tệp, dòng, trang, route API, model, commit và ước tính chi phí làm lại theo COCOMO](https://raw.githubusercontent.com/kennetvn/nextcore-stats/main/quy-mo.vi.svg)](https://raw.githubusercontent.com/kennetvn/nextcore-stats/main/quy-mo.json)

CI đếm lại sau mỗi lần push vào sản phẩm (và mỗi ngày), nên số đi theo sản phẩm; số thô ở
[quy-mo.json](https://raw.githubusercontent.com/kennetvn/nextcore-stats/main/quy-mo.json). Chỉ tệp git theo dõi, dòng không trống; bỏ các bản extension đã lưu trữ, bundle sinh tự
động, ghi chú kế hoạch và hình ảnh. Một người chủ điều khiển các agent AI viết code, các skill này được viết dần trong
lúc làm.

Các dòng chi phí là con số mô hình COCOMO chuẩn (basic, organic; mô hình mà `scc` in ra) ước tính để làm lại từ đầu —
không phải giá thị trường, doanh thu hay định giá công ty. Hãy đọc như một bậc độ lớn: COCOMO đếm dòng, mà code do AI
viết thường nhiều dòng hơn cho cùng một tính năng so với code viết tay, nên con số bị đội lên. Khoảng cách giữa ước
tính đó và những gì đã thực sự diễn ra không phải phép đo tác dụng của skill — xem
[các con số này chứng minh gì](#các-con-số-này-chứng-minh-gì-và-không-chứng-minh-gì).

## Đóng góp

**Đọc [CONTRIBUTING.md](CONTRIBUTING.md) trước** — nhận gì, mỗi loại đóng góp đặt ở đâu (case, quy tắc, cổng kiểm,
ghi chú stack, showcase), làm sao để qua `npm test`, và loại nào bị đóng. Issue viết tiếng Việt vẫn được nhận.

Gặp báo sai, một stack mà công cụ chưa đọc được, hay một bài học từ dự án của bạn? Mở issue. Các mẫu
[bug](https://github.com/kennetvn/nextcore-skills/issues/new?template=bug.yml),
[rule](https://github.com/kennetvn/nextcore-skills/issues/new?template=rule.yml) và
[lesson](https://github.com/kennetvn/nextcore-skills/issues/new?template=lesson.yml) hỏi đúng những gì chúng tôi cần:
một ví dụ sai, một ví dụ đúng phải được để yên, và chỗ nó đã gây chuyện cho bạn. Những đóng góp đầu tiên dễ bắt tay:

- chạy `slop-check` trên dự án của bạn và báo những chỗ nó đánh dấu mà thật ra không sao;
- thêm framework của bạn vào [ghi chú theo stack](plugins/nextcore-dev/skills/nextcore-dev/references/stacks.md);
- dạy `token-audit` đọc một định dạng token nó chưa đọc được (JSON của Style Dictionary / Tokens Studio, `colors.xml` của Android);
- thêm một case từ stack của bạn vào [cases/](cases/README.md) — Laravel, Django, Go và Rails còn trống.

Mỗi đóng góp được nhận đều được ghi công trong CHANGELOG và cạnh quy tắc mà nó tạo ra
([chi tiết](CONTRIBUTING.md#how-contributions-are-credited)). Team nào chạy agent cũng có thể để agent tự gửi bài học
([vòng bài học](plugins/nextcore-workflow/skills/nextcore-workflow/references/lesson-loop.md)).

[![Người đóng góp](https://contrib.rocks/image?repo=kennetvn/nextcore-skills)](https://github.com/kennetvn/nextcore-skills/graphs/contributors)

## Câu hỏi thường gặp

<details>
<summary><b>Có cần Claude Code không?</b></summary>

Không. Skill là Markdown, agent nào cũng làm theo được; công cụ là script Node.

</details>

<details>
<summary><b>"Claude Design" trong tài liệu là gì?</b></summary>

Canvas của Anthropic để vẽ màn hình. Bạn không cần nó: các công cụ design
đọc mockup `.html` thường từ bất kỳ nguồn nào.

</details>

<details>
<summary><b>Code của tôi có bị gửi đi đâu không?</b></summary>

Không. Mọi công cụ đọc tệp trên máy và in ra báo cáo.

</details>

<details>
<summary><b>Số liệu lấy từ đâu?</b></summary>

Từ [homestaynextcore.org](https://homestaynextcore.org): repository, CI và log production của
nó (mã nguồn không công khai). Các quy tắc được viết để bạn dùng được mà không cần biết sản phẩm đó.

</details>

<details>
<summary><b>`kennetvn/nextcore-design` và bộ catalogue 147 skill cũ đi đâu rồi?</b></summary>

Repo design đã được gộp vào
`plugins/nextcore-design` cùng toàn bộ lịch sử. Bộ catalogue cũ (chưa từng được đo trên một dự án thật) được giữ ở tag
[`legacy-v3.0.1`](https://github.com/kennetvn/nextcore-skills/tree/legacy-v3.0.1).

</details>
## Ghi công

Viết bằng lời của chúng tôi, với ý tưởng học từ các dự án MIT sau:
[Leonxlnx/taste-skill](https://github.com/Leonxlnx/taste-skill) ·
[Nutlope/hallmark](https://github.com/nutlope/hallmark) ·
[alchaincyf/huashu-design](https://github.com/alchaincyf/huashu-design) ·
[nextlevelbuilder/ui-ux-pro-max-skill](https://github.com/nextlevelbuilder/ui-ux-pro-max-skill) ·
[anthropics/skills](https://github.com/anthropics/skills) `frontend-design`.

## Giấy phép

[MIT](LICENSE)
