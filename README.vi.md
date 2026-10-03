# nextcore-skills

**Skill rút từ một sản phẩm thật, không phải bản demo.** Ba plugin Claude Code chắt lọc từ một nền tảng đặt phòng
đang chạy production, do các agent AI viết và vận hành hằng ngày: có khách trả tiền, khoảng 230 trang, khoảng 740 API
route, 10 tiện ích trình duyệt, nhiều agent chạy song song, hai tài khoản AI thay phiên. Mỗi quy tắc ở đây có mặt vì
điều ngược lại đã xảy ra và đã được đo.

[![License: MIT](https://img.shields.io/badge/license-MIT-0293DA.svg)](LICENSE)
[![test](https://github.com/kennetvn/nextcore-skills/actions/workflows/test.yml/badge.svg)](https://github.com/kennetvn/nextcore-skills/actions/workflows/test.yml)
[English](README.md)

| Plugin | Dành cho | Agent nhận được gì |
|---|---|---|
| [**nextcore-design**](plugins/nextcore-design/README.vi.md) | ai làm giao diện | đặc tả và thứ bậc thông tin trước, vẽ trước khi code (5 trạng thái × 3 khổ máy), agent phản biện tách riêng, 4 công cụ đo không phụ thuộc thư viện: `slop-check`, `token-audit`, `design-card`, `design-review` |
| [**nextcore-dev**](plugins/nextcore-dev/skills/nextcore-dev/SKILL.md) | backend / full-stack | hợp đồng để design và code khớp nhau: field map → hình dạng API → tín hiệu trạng thái UI; cổng xác thực trên mọi route; tiền, migration, sửa dữ liệu production; việc nền; 14 bẫy backend; ghi chú cho Next.js, Laravel, Django, Rails, Express/Nest |
| [**nextcore-workflow**](plugins/nextcore-workflow/skills/nextcore-workflow/SKILL.md) | người vận hành agent | chẩn đoán trước lần vá thứ ba; bằng chứng trước khi báo xong; nhiều agent song song không giẫm chân; nhiều tài khoản AI; quyết định nằm trên issue; tài liệu có hạn dùng (`doc-drift`); dọn máy cho phiên agent chạy lâu; vòng bài học quay về repo này |

Design và development là hai nửa của một hợp đồng: `nextcore-design` viết field map trong `spec.md`, `nextcore-dev`
biến nó thành hợp đồng API và các luật backend giữ hợp đồng đúng, `nextcore-workflow` giữ cho các agent làm cả hai một
cách trung thực.

## Cài đặt

```bash
# Claude Code
/plugin marketplace add kennetvn/nextcore-skills
/plugin install nextcore-design@nextcore
/plugin install nextcore-dev@nextcore
/plugin install nextcore-workflow@nextcore
```

Agent khác (Cursor, Codex, Windsurf, Gemini CLI, Copilot): chép `SKILL.md` cần dùng vào tệp quy tắc của agent đó
(`.cursor/rules/*.mdc`, `AGENTS.md`, `GEMINI.md`, `.github/copilot-instructions.md`) và để thư mục `references/` cạnh
nó. Các công cụ là script Node ≥18 thuần, không cần cài thư viện, chạy thẳng không cần cài:

```bash
npx -y -p github:kennetvn/nextcore-skills slop-check src --warn-only          # dấu hiệu "UI kiểu AI" + vá pixel, mọi stack HTML
npx -y -p github:kennetvn/nextcore-skills token-audit src/styles/tokens.css   # tương phản ở mọi chế độ, token thiếu bản tối
npx -y -p github:kennetvn/nextcore-skills design-card design --tokens src/styles/tokens.css --fonts "Inter"
npx -y -p github:kennetvn/nextcore-skills design-review design --shot review.png
npx -y -p github:kennetvn/nextcore-skills doc-drift docs --quiet               # số liệu trong tài liệu đã trôi
```

## Bắt đầu từ đâu?

| Bạn là… | Bắt đầu với |
|---|---|
| dev một mình, giao diện cứ vá đi vá lại | nextcore-design mức L1: chạy `slop-check` + `token-audit` với `--warn-only` |
| dev backend được giao bản vẽ | nextcore-dev → `references/handoff.md` và `references/api-contract.md` |
| đội PHP / Laravel / Django / Rails | nextcore-dev `references/stacks.md`; công cụ của nextcore-design đọc được Blade, Twig, ERB, Jinja và SCSS |
| chạy nhiều agent hay nhiều CLI trên một repo | nextcore-workflow → `references/parallel-agents.md` |
| agent được hỏi "repo này có hợp với dự án của tôi không?" | [AGENTS.md](AGENTS.md): đo dự án trước, rồi mới đề xuất mức áp dụng |

## Repo này lớn lên thế nào

Bài học đến từ việc thật, không đến từ ngồi nghĩ ra:

1. Một agent làm việc trên dự án thật gặp điều có giá trị chung: một cái bẫy, một lần báo "xong" giả, một luật lẽ ra đã cứu một ngày.
2. Agent ghi bài học kèm một mục tiếng Anh đã ẩn danh và một cờ (`community: true`).
3. Một script chạy lúc mở phiên thấy cờ, lọc bỏ mọi thứ riêng tư, rồi mở issue **lesson** ở đây.
4. Người duy trì biến nó thành luật, kèm một ví dụ sai phải bị bắt và một ví dụ đúng phải không bị bắt, hoặc đóng issue kèm lý do.

Vòng này được mô tả ở [`nextcore-workflow/references/lesson-loop.md`](plugins/nextcore-workflow/skills/nextcore-workflow/references/lesson-loop.md)
để dự án nào cũng chạy được. Bạn cũng có thể tự mở một [issue lesson](https://github.com/kennetvn/nextcore-skills/issues/new?template=lesson.yml).

Người đóng góp được ghi công trong CHANGELOG, ngay cạnh luật họ đã dạy, và trên danh sách người đóng góp:

[![Contributors](https://contrib.rocks/image?repo=kennetvn/nextcore-skills)](https://github.com/kennetvn/nextcore-skills/graphs/contributors)

## Một repo duy nhất

Mọi thứ nằm ở đây: `plugins/nextcore-design` (gộp từ repo `kennetvn/nextcore-design` cũ, giữ trọn lịch sử commit),
`plugins/nextcore-dev`, `plugins/nextcore-workflow` (đã nhận luôn các bài dọn máy từ repo `nextcore-solutions` cũ).
Một CI chạy mọi test trên Linux, Windows, macOS với Node 18, 20, 22.

## Về phiên bản trước

Tới tháng 10/2026, repo này chứa "NEXTCORE-SKILLS v3": một danh mục 147 skill trải trên 10 IDE, viết trong một ngày và
chưa từng được đo trên dự án thật. Nó đã được thay bằng ba plugin có bằng chứng ở trên. Cây thư mục cũ còn nguyên ở
tag [`legacy-v3.0.1`](https://github.com/kennetvn/nextcore-skills/tree/legacy-v3.0.1).

## Giấy phép

[MIT](LICENSE)
