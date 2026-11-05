# Phát triển

## Phiên bản

| Gói | Phiên bản |
| --- | --- |
| expo | ~58.0.23 |
| expo-router | ~58.0.30 |
| react-native | 0.88.1 |
| react | 19.3.0 |
| nativewind | 4.2.7 |
| tailwindcss | 3.4.17 |

Cài module native bằng `npx expo install <package>` để lấy bản khớp SDK. Project dùng npm, không dùng bun.

Node trên máy dev có thể mới hơn dải Expo khai báo (`^22.13 || ^24.3 || ^26 || >=27`). `npm install` vẫn chạy, kèm cảnh báo `EBADENGINE`.

## Lệnh

```bash
npx expo start
npx expo run:ios
npx expo run:android
npx tsc --noEmit
```

`npx expo lint` hiện chưa có cấu hình ESLint. Đừng tự thêm config eslint nếu chưa được yêu cầu.

## Expo Go và bản native

Expo Go chỉ hiện splash và icon của Expo Go. Icon cờ vàng và splash than (`#25292e`) chỉ xuất hiện trong development build hoặc APK preview.

Các thứ cần binary mới, reload Metro không đủ:

- `assets/images/icon.png` và `assets/expo.icon`
- splash trong `app.json`
- MapLibre
- `Info.plist`, trong đó có câu when-in-use

`ios.icon` trỏ `./assets/expo.icon`. `ASSETCATALOG_COMPILER_APPICON_NAME` là `expo`.

Quyền vị trí chỉ when-in-use. Câu trong `app.json`: “Allow EzGolf to center the map on your location while you are on the course.” Prebuild có thể thêm khóa Always; hãy xóa chúng. Đừng xin Always.

`CI=1 npx expo prebuild` xóa thư mục `ios`. Prebuild không có `CI=1` cũng có thể in “Clearing ios”. Sau prebuild, kiểm tra lại khóa vị trí.

## EAS

Project EAS: owner `ezerway`, slug `ez-golf`, package Android `com.ezerway.ezgolf`, bundle iOS `com.ezerway.EzGolf`.

Profile `preview` là `distribution: internal` và `android.buildType: apk`. Chưa có profile production hay submit.

```bash
EAS_NO_VCS=1 npx eas-cli@latest build -p android --profile preview
```

## Những ràng buộc đã chốt

- UI mặc định tiếng Anh. Chuỗi mới thêm vào cả `src/i18n/en.ts` và `src/i18n/vi.ts`.
- Nút và hàng danh sách trên Android dùng màu hex từ `buttonFace` / `cardFace`, không chỉ class Tailwind.
- `web.output` giữ `static`.
- Không tạo `extra.router.apiRoutes: true`.
- Không đưa lại la bàn theo hướng thiết bị. Xoay map là +45° mỗi lần bấm.
- Tee chỉ bốn màu: xanh dương, trắng, vàng, đỏ.
- Info dùng Pressable cho chọn ngôn ngữ và giao diện, không dùng `@expo/ui` Host/Picker.
