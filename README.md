# MASTERTUNE — website

Website phân phối âm thanh xe hơi hi-end. Astro 7 + Node.js (adapter `@astrojs/node`, chế độ standalone).

## Chạy trên máy

```bash
npm install
npm run dev        # http://localhost:4321
npm run build      # build vào dist/
npm start          # chạy bản build bằng Node (dist/server/entry.mjs)
```

## Dữ liệu

| File | Nội dung |
|---|---|
| `src/data/products.json` | 197 sản phẩm: tên, thương hiệu, hạng mục, ảnh, thông số |
| `src/data/brands.json` | Thương hiệu + logo |
| `src/data/categories.json` | Hạng mục sản phẩm |
| `src/data/site.json` | Hotline, Zalo, địa chỉ, menu |

Dữ liệu sản phẩm được lấy từ mastertune.vn bằng các script trong `scripts/`:

```bash
node scripts/scrape-products.mjs   # tải trang sản phẩm -> data-raw/products.json
node scripts/download-images.mjs   # tải ảnh gốc
node scripts/optimize-images.mjs   # chuyển ảnh sang WebP -> public/images/
node scripts/build-data.mjs        # tách thông số -> src/data/*.json
```

`data-raw/` (dữ liệu thô, ảnh gốc) không đưa lên Git.

### Ảnh thêm, video và thông số tự nhập

`src/data/product-extras.json` ghi đè lên dữ liệu lấy từ mastertune.vn (chạy lại script lấy dữ liệu không làm mất):
thông số (`specs`), vị trí lắp (`install`), ảnh thêm (`gallery`) và video (`video`).
Trang sản phẩm hiện dải ảnh nhỏ dưới ảnh chính, video ở cuối dải.

```bash
# theo thứ tự muốn hiển thị; file .mp4 thành video (nén H.264 1080p, có ảnh bìa)
node scripts/import-media.mjs <slug> anh1.jpg anh2.png video.mp4
```

Sau đó sửa `alt` (mô tả ảnh) trong `product-extras.json`. Cần `ffmpeg` cho video.

## Thiết kế

- Cấu trúc: `/` là trang mở đầu toàn màn hình (chữ MASTERTUNE mạ chrome + "Âm thanh xe hơi cao cấp", phim sản phẩm, nút **Enter Portal**, phím Enter cũng vào được). Website bắt đầu ở `/trang-chu`; logo trên menu dẫn về đây. Thay phim: ghi đè `public/video/hero.mp4` và `hero.webm` (+ `hero-poster.webp`). Phim dọc nằm giữa và tan vào nền đen; phim ngang tự tràn toàn màn hình.
- Màu: nền gần đen `#0b0c0e`, thẻ than chì `#141518`, lưới kẻ mảnh và dấu chữ thập, điểm nhấn bạc chrome như logo: nút chính dạng kim loại bóng (`--chrome`), trạng thái đang chọn màu bạc `#c9ced6`. Ảnh sản phẩm (chụp nền trắng) nằm trong khung sáng `--well` để không bị ô trắng trên nền tối.
- Chữ: Exo 2 (nét kỹ thuật, hợp ngành ô tô, đủ dấu tiếng Việt) cho nội dung và tiêu đề; JetBrains Mono cho nhãn kiểu `[// NHÃN]` và thông số.
- Tâm điểm: 4 ô sản phẩm xếp 2 × 2 ở đầu `/trang-chu` (`src/data/spotlight.json`: `slug`, `label`, `tag` = Mới về / Bán chạy / Nổi bật). Sản phẩm có video thì ô chạy đoạn lặp ngắn không tiếng (`*-loop.mp4`, tạo bằng `node scripts/make-loop.mjs <slug> [giây bắt đầu] [độ dài]`), bấm vào mở video đầy đủ; chưa có video thì ảnh sản phẩm chuyển động chậm.
- Điểm nhấn: xe 3D xoay được (three.js) với các điểm lắp thiết bị — `src/components/CarSound3D.astro` + `src/scripts/car3d.ts`. three.js chỉ tải khi khách cuộn tới phần này.
- Mô hình xe: “Generic Sedan Car” — Márcio Meireles (Sketchfab), **CC BY 4.0** (bắt buộc ghi nguồn, đã có dòng ghi nguồn dưới phần 3D). File gốc tải về bị thiếu texture nên dùng vật liệu trơn: `node scripts/prepare-sedan.mjs` rồi `node scripts/compress-sedan.mjs` → `public/models/sedan.glb` (~410KB, Draco). Mui được cắt bằng mặt phẳng cắt (`CUT_HEIGHT` trong `src/scripts/car3d.ts`). Vị trí các điểm (toạ độ 3D) sửa trong mảng `spots` của component.
- Logo: file chính thức (chrome, nền trong) lưu ở `assets-src/logo-mastertune.png`, tách bằng `node scripts/prepare-logo.mjs` → `public/brand/` (logo đầy đủ, chữ MASTER TUNE, chữ M, favicon). Đổi logo: thay file rồi chạy lại lệnh.

## Phần chạy trên máy chủ

| Đường dẫn | Việc |
|---|---|
| `/dai-ly/khu-vuc-rieng` | Khu đại lý, đăng nhập bằng mã truy cập chung |
| `/dai-ly/tai-lieu/<file>` | Tải tài liệu trong `private/dealer-docs/` (chỉ khi đã đăng nhập) |
| `/api/bao-hanh` | Tra cứu serial trong `private/warranty.csv` |

Biến môi trường (xem `.env.example`): `DEALER_ACCESS_CODE`, `SESSION_SECRET`, `WARRANTY_FILE` (tuỳ chọn).
Khi chạy bằng `npm start`, khai báo các biến này trong phần Environment variables của Hostinger.
Hướng dẫn dữ liệu bảo hành và tài liệu đại lý: `private/README.md`.

Danh sách đại lý lấy từ mastertune.vn: `node scripts/scrape-dealers.mjs` → `src/data/dealers.json`.
