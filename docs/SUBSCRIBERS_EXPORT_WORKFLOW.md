# Jam Tracks Hub Subscriber Email Workflow

這份文件記錄如何在 Cloudflare D1 查詢訂閱者 email、查看訂閱者數量，以及匯出 CSV。這份文件可以在 VSCode 中保留作為本地操作筆記。

## Runtime 設定

- Worker: `jamtrackshub`
- D1 database: `jamtrackshub_subscribers`
- D1 binding name: `SUBSCRIBERS_DB`
- Admin secret name: `SUBSCRIBERS_ADMIN_TOKEN`
- Table: `subscribers`
- CSV endpoint: `https://jamtrackshub.com/api/subscribers.csv`（Bearer token only）

## Cloudflare 先確認

1. 開啟 Cloudflare Dashboard。
2. 進入 `Workers & Pages`。
3. 點選 Worker：`jamtrackshub`。
4. 進入 `Bindings`。
5. 確認有一筆 D1 database binding：
   - Name: `SUBSCRIBERS_DB`
   - Value/database: `jamtrackshub_subscribers`
6. 進入 `Settings` -> `Variables and secrets`。
7. 確認有 secret：
   - Name: `SUBSCRIBERS_ADMIN_TOKEN`
8. 如果剛新增 binding 或 secret，回到 `Deployments` 重新 deploy 最新版本。

如果用假 token 測試：

```bash
curl -i -H "Authorization: Bearer test" https://jamtrackshub.com/api/subscribers.csv
```

看到 `Unauthorized` 代表 endpoint、binding、secret 已經連好，只是 token 不對。看到 `Service unavailable.` 代表必要的 binding 或 secret 尚未可用。不要把 token 放進 URL query string；URL 可能進入瀏覽器歷史、proxy 或 access logs。

## 查詢資料表欄位

Cloudflare 路徑：

`Storage & Databases` -> `D1 SQL Database` -> `jamtrackshub_subscribers` -> Console

輸入：

```sql
PRAGMA table_info(subscribers);
```

目前 `subscribers` table 欄位應該包含：

- `email`
- `subscribed_at`
- `source`
- `page`
- `user_agent`

## 查看最新訂閱者

```sql
SELECT email, subscribed_at, source, page
FROM subscribers
ORDER BY subscribed_at DESC;
```

注意：不要使用 `created_at`，這個 table 的時間欄位是 `subscribed_at`。

## 查看有多少訂閱者

```sql
SELECT COUNT(*) AS subscriber_count
FROM subscribers;
```

## 搜尋特定 email 或網域

搜尋完整 email：

```sql
SELECT email, subscribed_at, source, page
FROM subscribers
WHERE email = 'name@example.com'
ORDER BY subscribed_at DESC;
```

模糊搜尋：

```sql
SELECT email, subscribed_at, source, page
FROM subscribers
WHERE email LIKE '%example.com%'
ORDER BY subscribed_at DESC;
```

## 匯出 CSV

在本機 terminal 以 Authorization header 下載：

```bash
curl -L \
  -H "Authorization: Bearer YOUR_PRIVATE_TOKEN" \
  -o jam-tracks-hub-subscribers.csv \
  https://jamtrackshub.com/api/subscribers.csv
```

`YOUR_PRIVATE_TOKEN` 要填 Cloudflare `SUBSCRIBERS_ADMIN_TOKEN` 的實際值。不要把 token commit 到 GitHub，也不要放進公開文件。

## 匯出後檢查

CSV 表頭應該是：

```csv
email,subscribed_at,source,page
```

可以用資料列數量減掉表頭，比對 D1 的：

```sql
SELECT COUNT(*) AS subscriber_count
FROM subscribers;
```

## 常見錯誤

- `no such column: created_at`: 欄位名稱打錯，請用 `subscribed_at`。
- `no such column: email`: 通常是 SQL 沒有一次貼完整，請整段一起執行。
- `Unauthorized`: token 錯誤或沒有填真實 token。
- `Service unavailable.`: Worker 尚未取得必要的 database binding 或 admin secret。
