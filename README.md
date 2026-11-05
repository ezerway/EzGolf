# EzGolf

Ứng dụng di động ghi điểm và xem sân golf. Người chơi tìm sân, mở bản đồ từng lỗ, và ghi gậy trên điện thoại. Dữ liệu nằm trên máy, không cần tài khoản.

Stack: Expo SDK 58, Expo Router, React Native 0.88, SQLite, Zustand, NativeWind 4, MapLibre.

## Bốn tab

| Tab | Việc |
| --- | --- |
| Courses | Tìm sân, xem khoảng cách, mở chi tiết |
| Recent | Các vòng đã chơi gần đây |
| Scorecard | Thẻ điểm: gậy, gạt, phạt, FIR, GIR |
| Info | Ngôn ngữ, giao diện sáng/tối, chế độ developer |

Ngôn ngữ mặc định là tiếng Anh. Tiếng Việt chọn trong Info. Giao diện theo hệ thống, sáng, hoặc tối.

## Chạy local

```bash
npm install
npx expo start
```

MapLibre không có trong Expo Go. Bản đồ lỗ cần development build:

```bash
npx expo run:ios
npx expo run:android
```

Kiểm tra kiểu trước khi coi xong:

```bash
npx tsc --noEmit
```

## Build Android để test

`eas.json` chỉ có profile `preview`: APK nội bộ, không đưa lên Play Store.

```bash
EAS_NO_VCS=1 npx eas-cli@latest build -p android --profile preview
```

`EAS_NO_VCS=1` dùng khi working tree còn thay đổi chưa commit. File `.env` nằm trong gitignore và không được upload.

## Kiểm thử

Maestro chạy trên bản app đã cài, không chạy trong Expo Go.

```bash
npm run e2e:ios
npm run e2e:android
```

## Tài liệu

- [Kiến trúc](docs/architecture.md) — thư mục, điều hướng, trạng thái, theme
- [Dữ liệu](docs/data.md) — SQLite, ảnh, import và export
- [Phát triển](docs/development.md) — bản native, splash, những việc không làm
- [E2E](docs/e2e.md) — cài Maestro và chạy flow
