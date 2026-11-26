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

- Phong cách sáng "mist": nền `#eef2f5`, thẻ trắng bo góc lớn, dải màu xanh xám (`--mist` trong `src/styles/global.css`) cho khung đầu trang, phần 3D và lời kêu gọi cuối trang. Nút chính là viên thuốc màu đen, chữ trên nền mist dùng xanh thép đậm `#10202e` để đủ tương phản.
- Chữ: Saira (variable, có tiếng Việt). Tiêu đề mảnh và hơi giãn (class `.display`: weight 300, stretch 112%); chữ MASTER / TUNE khổng lồ ở đầu trang chủ weight 200.
- Đầu trang chủ: video SFF1 (`public/video/hero.*`) trong khung vòm, hai chú thích nối đường kẻ tới sản phẩm (dữ liệu `heroProduct` trong `src/pages/index.astro`), ba ô dưới có cạnh vát.
- Tâm điểm: 4 ô sản phẩm dưới đầu trang (`src/data/spotlight.json`: `slug`, `label`, `tag` = Mới về / Bán chạy / Nổi bật). Sản phẩm có video thì ô chạy đoạn lặp ngắn không tiếng (`*-loop.mp4`, tạo bằng `node scripts/make-loop.mjs <slug> [giây bắt đầu] [độ dài]`), bấm vào mở video đầy đủ; chưa có video thì ảnh sản phẩm chuyển động chậm.
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
