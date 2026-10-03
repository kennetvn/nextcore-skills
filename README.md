# nextcore-design

**Vẽ trước, code sau.** Skill "design-first" cho agent AI (Claude Code, Cursor, Codex…): bắt agent dựng
bản vẽ màn hình **trước** khi viết UI, khoá token màu ngay trong bản vẽ, đủ 5 trạng thái, dữ liệu mẫu như
thật, rồi code bám 100% bản vẽ và nghiệm thu bằng **đo trên trình duyệt thật**, không nhìn bằng mắt.

Rút ra từ một codebase production (Next.js, hơn 200 trang) sau nhiều lần "vá UI từng lượt" và
"mỗi lần thiết kế lại ra một kiểu khác", cộng với phần hay nhất của các design skill đang dẫn đầu GitHub.

## Có gì bên trong

| Tệp | Dùng để |
|---|---|
| `skills/nextcore-design/SKILL.md` | Quy trình: khi nào phải vẽ · đọc đề + 3 núm vặn · 1 khu vực = 1 canvas · 5 trạng thái · khoá token · bàn giao · nghiệm thu |
| `skills/nextcore-design/references/slop-tells.md` | ~35 dấu hiệu "UI kiểu AI", gộp và khử trùng từ 5 skill hàng đầu |
| `skills/nextcore-design/references/measurement-traps.md` | 19 bẫy đo khiến báo "đã đạt" mà thật ra sai, mỗi bẫy là một lần đã xảy ra |
| `skills/nextcore-design/scripts/slop-check.mjs` | Bộ quét không phụ thuộc thư viện: 10 luật máy kiểm được, chạy trong CI / pre-commit |

### Điểm khác so với các skill khác

- **Không tự chọn font/màu cho bạn.** Taste-skill, hallmark… giỏi chọn thẩm mỹ cho trang mới tinh, nhưng
  dự án đã có design system thì chúng đè lên token. Skill này chỉ lấy phần **quyết định bố cục** và giữ
  nguyên token của bạn.
- **Nghiệm thu bằng số đo**: computed style, ảnh trước/sau cùng điều kiện, bảng khớp bản vẽ ↔ code.
- **Bộ quét có thử hai chiều**: mẫu bẩn phải bắt đủ cả 10 luật, mẫu sạch phải ra 0. Không báo nhầm hex
  nằm trong `:root`, trong `var(--x, #fallback)`, trong logo SVG hay `href="#id"`.

## Cài đặt

```bash
# Claude Code — cho mọi dự án
git clone https://github.com/kennetvn/nextcore-design
cp -r nextcore-design/skills/nextcore-design ~/.claude/skills/

# hoặc chỉ cho một dự án
cp -r nextcore-design/skills/nextcore-design <du-an>/.claude/skills/
```

Cursor / Codex: chép nội dung `SKILL.md` vào `.cursor/rules/nextcore-design.mdc` hoặc `AGENTS.md`.

Skill tự kích hoạt khi bạn nhờ agent dựng trang mới, thiết kế lại, gửi ảnh mẫu, hoặc nói "nhìn như template".

## Bộ quét slop

```bash
node skills/nextcore-design/scripts/slop-check.mjs src          # exit 1 nếu có lỗi mức ERROR
node skills/nextcore-design/scripts/slop-check.mjs src --json   # cho CI
node skills/nextcore-design/scripts/slop-check.mjs src --warn-only --ignore legacy/
node tests/run.mjs                                              # thử hai chiều
```

| Luật | Mức | Bắt |
|---|---|---|
| `color-literal` | error | hex ngoài token (CSS) · hex trong `color/bg/border/shadow` (TSX/HTML) |
| `rgb-literal` | warn | `rgb()/hsl()` ngoài token |
| `transition-all` | error | `transition: all`, `transition-all` |
| `break-all` | error | `word-break: break-all` (cắt đôi email, SĐT, mã đơn) |
| `placeholder-data` | error | Lorem ipsum, John Doe, Nguyễn Văn A, Acme |
| `grid-1fr` | warn | `1fr` không bọc `minmax(0, …)` ⇒ cuộn ngang trên mobile |
| `purple-gradient` | warn | gradient tím/violet/indigo mặc định của AI |
| `italic-heading` | warn | heading in nghiêng / `<em>` trong heading |
| `emoji-icon` | warn | emoji dùng làm icon |
| `round-number` | warn | số tròn 1.000 / 10,000 trong nội dung |

Chạy thử trên một codebase production thật (hơn 1.000 tệp, 2,3 giây): bộ quét bắt được **gấp 3 lần** số
hex mà cổng nội bộ của chính dự án đếm được. Cổng cũ bỏ sót `border: 1px solid #hex` và gradient.

## Ghi công

Skill này viết lại bằng lời của mình, có học ý tưởng từ các dự án MIT sau (số sao đo 03/10/2026):

- [Leonxlnx/taste-skill](https://github.com/Leonxlnx/taste-skill) (92k★): 3 núm vặn variance/motion/density, dòng "đọc đề", quy tắc nhấn mạnh cùng font
- [Nutlope/hallmark](https://github.com/nutlope/hallmark) (29k★): chọn bố cục tổng trước, cổng kiểm slop, tự phê bình trước khi xuất
- [alchaincyf/huashu-design](https://github.com/alchaincyf/huashu-design) (24k★): 5 câu hỏi hình thức, 3 hướng khi đề mơ hồ
- [nextlevelbuilder/ui-ux-pro-max-skill](https://github.com/nextlevelbuilder/ui-ux-pro-max-skill) (132k★): thứ tự ưu tiên khi soát UI
- [anthropics/skills](https://github.com/anthropics/skills) `frontend-design`: danh sách "tells" của LLM, quy trình hai lượt

## English (short)

Design-first skill for AI coding agents: draw the screen (canvas/artifact) before writing UI code, lock
design tokens in the drawing, cover all 5 states (empty · loading · data · error · success), build 1:1 from
the drawing, verify by measuring in a real browser. Unlike taste/hallmark it never picks fonts or colours
for you, so it works on top of an existing design system. Ships a zero-dependency `slop-check.mjs` scanner
(10 rules, two-way tested) and 19 measurement traps from production. Install:
`cp -r skills/nextcore-design ~/.claude/skills/`.

## License

MIT
