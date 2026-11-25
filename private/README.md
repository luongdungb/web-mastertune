# Dữ liệu riêng (không công khai)

Thư mục này **không** được phục vụ như file tĩnh. Chỉ máy chủ Node đọc được.
Chỉ đưa lên GitHub khi kho mã ở chế độ **Private**.

## warranty.csv — tra cứu bảo hành

```
serial,product,dealer,activated,expires
ST2401-0001,Amply 2 kênh STEG K2.02 Competition,Chính Thắng Auto,15/01/2026,15/01/2028
```

- Ngày theo dạng `dd/mm/yyyy`. Có thể xuất từ Excel dạng CSV (UTF-8).
- **Không** để tên, số điện thoại khách hàng trong file này. Khách tra cứu chỉ thấy đúng 5 cột trên.

## dealer-docs/ — tài liệu khu đại lý

Chép file (PDF, XLSX, DOCX, JPG, PNG, ZIP) vào đây, rồi khai báo trong `src/data/dealer-docs.json`:

```json
[{ "title": "Bảng giá đại lý 2026", "file": "bang-gia-2026.pdf", "updated": "01/01/2026" }]
```
