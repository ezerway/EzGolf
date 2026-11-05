# Kiểm thử end-to-end

EzGolf dùng [Maestro](https://maestro.dev). Maestro điều khiển bản app đã cài trên simulator hoặc máy thật. Không có gói npm nào được thêm vào app.

Flow nằm trong `.maestro/flows/`. `config.yaml` tắt animation và ghi log vào `.maestro/output` (thư mục này không commit).

| Flow | Việc |
| --- | --- |
| `smoke.yaml` | Mở app, đi qua Info, Scorecard, Recent, rồi về Courses |
| `search.yaml` | Gõ một tên không tồn tại và chờ trạng thái trống |

Hai flow không xóa dữ liệu sân. Quyền vị trí bị từ chối lúc mở app để hộp thoại hệ thống không chặn test.

Tab dùng `testID` và `accessibilityLabel` cố định (`tab-courses`, `tab-recent`, `tab-scorecard`, `tab-info`). Trên Android, Maestro không đọc `testID` của tab native, nên nhãn trợ năng chính là id đó. Chữ người dùng nhìn thấy vẫn là bản dịch.

## Cài Maestro

```bash
curl -Ls "https://get.maestro.mobile.dev" | bash
```

Maestro cần Java 17. Trên máy này OpenJDK 17 nằm ở `/opt/homebrew/opt/openjdk@17` và không được đưa vào `PATH` mặc định của Homebrew. `npm run e2e:*` tự thêm thư mục đó và `~/.maestro/bin`.

Sau khi cài, mở terminal mới. Trình cài cũng ghi `~/.maestro/bin` vào `~/.zshrc`.

## Chạy

Cài development build hoặc APK preview lên simulator/máy đang kết nối. Metro phải chạy nếu đó là dev client. Expo Go không dùng được vì MapLibre và id app là của Expo Go.

```bash
npm run e2e:ios
npm run e2e:android
```

`e2e:ios` truyền `MAESTRO_APP_ID=com.ezerway.EzGolf`. `e2e:android` truyền `com.ezerway.ezgolf`.

Chạy một flow:

```bash
MAESTRO_APP_ID=com.ezerway.ezgolf maestro test .maestro/flows/smoke.yaml
```
