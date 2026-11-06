# Dữ liệu

Mọi thứ nằm trong SQLite `ezgolf.db` trên máy. Ảnh sân nằm trong `Paths.document/course-photos`.

## Bảng

`courses` — câu lạc bộ: tên, địa chỉ, ảnh, điện thoại, website, mô tả, polygon `corners` (JSON).

`layouts` — một sân trong câu lạc bộ. Có địa chỉ và polygon riêng. Sân cũ chưa có layout được gắn một layout trùng tên câu lạc bộ.

`holes` — lỗ của layout: tên, par, stroke index, polygon góc.

`features` — một điểm trên lỗ: `kind`, vĩ độ, kinh độ, `hole_id`.

`rounds` — một vòng: câu lạc bộ, layout, `started_at` (ms), tee đã chọn.

`hole_scores` — điểm của một lỗ trong một vòng. Khóa là `(round_id, hole_id)`. Cột: `strokes`, `putts`, `penalty`, `fir`, `gir`.

`settings` — khóa/giá trị: `developerMode` (`0`/`1`), `appearance` (`system` | `light` | `dark`), `language` (`system` | `en` | `vi`).

Migration chạy trong `migrate()` mỗi lần mở database. Cột mới được `ALTER TABLE` khi chưa có. Không có file migration riêng.

## Điểm trên sân

Bốn tee: `tee-blue`, `tee-white`, `tee-yellow`, `tee-red`. Giá trị cũ `tee` thành `tee-yellow`, `tee-black` thành `tee-blue`.

Điểm khác: `green`, `hole`, `rough`, `bunker`, `hazard`, `fringe`. Màu marker nằm trong `featureCatalog` (`src/utils/feature-kinds.ts`) và không đổi theo theme.

## Ảnh

Ảnh chọn từ máy được copy vào `course-photos`. URL `http`/`https` giữ nguyên trong app. Khi export, ảnh local và ảnh từ URL được tải rồi ghi vào `photoBase64` cùng `photoType`. `photoUri` chỉ còn khi không đọc được ảnh. Import tạo lại file từ base64 trước, rồi mới dùng URL.

## Import và export

Export (`exportData`) trả JSON version 1:

```json
{
  "version": 1,
  "courses": [
    {
      "name": "Long Bien Golf Course",
      "address": "Long Bien, Hanoi",
      "phone": null,
      "website": null,
      "description": null,
      "corners": [{ "latitude": 21.04, "longitude": 105.89 }],
      "photoUri": null,
      "photoBase64": null,
      "layouts": [
        {
          "name": "Championship",
          "holes": [
            {
              "name": "1",
              "par": 4,
              "strokeIndex": 7,
              "corners": [],
              "features": [
                { "kind": "tee-white", "latitude": 21.04, "longitude": 105.89 }
              ]
            }
          ]
        }
      ]
    }
  ]
}
```

Import nhận JSON (một sân, một mảng, hoặc `{ "courses": [] }`) và CSV. Mỗi sân cần `name` và `address`. Khóa tiếng Việt được nhận: `ten`, `diaChi`, `sdt`, `gioiThieu`. Sân thiếu tên hoặc địa chỉ bị bỏ. Import thêm vào database, không xóa sân đang có.

Điểm số vòng chơi không nằm trong file export.

## Vòng chơi

`beginRound` tái sử dụng vòng mới nhất của layout đó và cập nhật `started_at`. Layout chưa có vòng thì tạo vòng mới. Chọn tee ghi vào `rounds.tee`. Nút vòng mới trên thẻ điểm xóa điểm, không xóa sân.
