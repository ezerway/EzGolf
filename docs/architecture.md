# Kiến trúc

EzGolf là app Expo Router. Mỗi file trong `src/app/` là một route. Màn hình, component, store và util nằm ngoài thư mục route.

Alias `@/*` trỏ tới `./src/*`.

## Thư mục

```
src/app/            route và layout
src/screens/        UI của từng màn
src/components/     nút, hàng danh sách, bản đồ, form
src/stores/         Zustand + SQLite
src/i18n/           en.ts, vi.ts
src/theme.ts        bảng màu sáng/tối
src/utils/          tọa độ, import, loại điểm trên sân
assets/             icon, splash, Lottie
```

`ios/` được prebuild sinh ra và nằm trong gitignore. `android/` chưa có trong repo; EAS sinh lúc build. Sửa hành vi native trong `app.json` và config plugin, không sửa project native bằng tay.

## Điều hướng

Root dùng `NativeTabs` trong `src/app/_layout.tsx`.

| Route | Màn |
| --- | --- |
| `(courses)/index` | Danh sách sân, tìm kiếm |
| `(courses)/add` | Thêm câu lạc bộ |
| `(courses)/[id]` | Chi tiết sân |
| `(courses)/[id]/edit` | Sửa câu lạc bộ |
| `(courses)/[id]/layout/[layoutId]` | Sửa layout |
| `(courses)/[id]/layout/[layoutId]/hole/[holeId]` | Sửa lỗ, vẽ góc và điểm |
| `(courses)/[id]/play` | Chọn layout khi sân có nhiều hơn một |
| `(courses)/[id]/round` | Bản đồ vòng chơi |
| `recent` | Vòng gần đây |
| `scorecard` | Danh sách thẻ điểm; `?roundId=` mở chi tiết |
| `info` | Cài đặt |

`typedRoutes` và `reactCompiler` đang bật. `web.output` là `static`. Đừng đổi thành `server`: bước export server của Android sẽ load MapLibre trên web và crash vì `codegenNativeComponent`.

## Dữ liệu và trạng thái

SQLite (`ezgolf.db`) là nguồn sự thật. Zustand chỉ giữ bản UI đã đọc từ database.

| Store | Việc |
| --- | --- |
| `useCoursesStore` | Sân, layout, lỗ, điểm trên sân, import, export |
| `useRoundsStore` | Vòng chơi và điểm từng lỗ |
| `useSettingsStore` | Developer mode, giao diện, ngôn ngữ |

Ba store dùng chung `getDatabase()` trong `src/stores/courses.ts`.

## Bản đồ vòng chơi

Style đường phố là OpenFreeMap Liberty, không cần API key. Nút Vệ tinh đổi sang ảnh Esri World Imagery. MapLibre chỉ chạy trong development build hoặc bản EAS, không chạy trong Expo Go.

Khi chọn một tee, các marker tee khác bị ẩn. Camera khung polygon góc của lỗ, xoay sao cho tee ở dưới và lỗ ở trên, trừ khi người dùng đã xoay. Nút xoay cộng 45° mỗi lần bấm. Vị trí chỉ xin quyền when-in-use để căn map.

## Giao diện

Bảng màu nằm trong `src/theme.ts`.

| Token | Dark | Light |
| --- | --- | --- |
| background | `#25292e` | `#f4f5f7` |
| text | `#ffffff` | `#18181b` |
| muted | `#a1a1aa` | `#71717a` |
| tint | `#ffd33d` | `#ffd33d` |
| card | `#32383f` | `#ffffff` |
| onTint | `#25292e` | `#25292e` |

NativeWind đọc các biến `--color-*`. Trên Android, `Pressable` không tô nền từ class `bg-*` / `rounded-full`, và màn trong tab không luôn kế thừa biến CSS từ root. Vì vậy:

- Nút dùng `buttonFace()` trong `src/components/button-face.ts` với màu hex.
- Hàng danh sách dùng `cardFace()`.
- Mỗi màn gắn `themeVars[scheme]` lên view gốc.
- Chữ quan trọng đặt `color` từ `usePalette()`.

Tab Android dùng nền card, pill vàng sau icon, chữ chọn màu vàng. iOS vẫn overlay tab bar lên nội dung, nên padding đáy của iOS giữ inset của tab bar. Android không cộng thêm inset đó.

## Ngôn ngữ

`src/i18n/en.ts` là catalog gốc (`MessageKey`). `src/i18n/vi.ts` phải có đủ key. `useT()` trả hàm dịch. Thuật ngữ golf giữ nguyên: Par, Index, FIR, GIR. Bản dịch: putts = Gạt, strokes = Gậy, penalty = Phạt, scorecard = Thẻ điểm, round = vòng.

## Chế độ developer

Mặc định tắt, lưu trong bảng `settings`. Khi bật, Courses hiện Add, Import, Export, Remove, và nút sửa sân. Import chỉ thêm, không ghi đè dữ liệu cũ.
