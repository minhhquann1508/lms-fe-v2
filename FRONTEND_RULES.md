# Frontend Rules

## Mục tiêu

Không merge UI nếu còn bể layout, tràn ngang, chồng chéo action, hoặc nội dung không dùng được ở mobile/tablet/desktop.

## Quy tắc bắt buộc

1. Mọi màn hình phải dùng layout co giãn:
   - Grid/Flex phải có `min-width: 0` ở vùng chứa text dài.
   - Không khoá số cột cứng nếu card/action có thể co xuống nhiều kích thước màn hình.
   - Ưu tiên `repeat(auto-fit, minmax(...))` hoặc breakpoint rõ ràng.

2. Không được có horizontal overflow ở các mốc tối thiểu:
   - `360px`
   - `768px`
   - `1280px`

3. Action bar không được đẩy vỡ header:
   - Nếu action dài hoặc nhiều icon, phải chuyển xuống toolbar riêng hoặc wrap an toàn.
   - Không nhồi nhiều nút vào `extra` của card/collapse nếu mobile có nguy cơ vỡ layout.

4. Text dài phải có chiến lược:
   - `ellipsis`, `overflow-wrap: anywhere`, hoặc giới hạn chiều rộng hợp lý.
   - Tên khoá học, chương, bài giảng và badge không được làm vỡ card.

5. Form phải giữ được usability trên mobile:
   - Input full width.
   - Button tap target đủ lớn.
   - Các cặp field 2 cột phải rơi về 1 cột ở mobile.

## Checklist trước khi merge

- Kiểm tra visual ở `360px`, `768px`, `1280px`.
- Không có phần tử tràn khỏi viewport.
- Không có hàng action bị chồng hoặc cắt.
- Không có card nào bị ép chiều ngang làm text/icon lệch.
- Loading, empty, error state cũng phải responsive như trạng thái dữ liệu đầy đủ.

## Áp dụng cho màn admin

Màn admin chi tiết khoá học là ví dụ bắt buộc:

- Header chương chỉ giữ switch ngắn gọn.
- Action tạo/sửa/xoá chuyển vào toolbar trong body để mobile không bể.
- Lecture card phải tự co từ 2 cột về 1 cột.
