# Jam Tracks Hub Subscriber Email Workflow

這份文件記錄如何在 Cloudflare D1 查詢訂閱者 email、查看訂閱者數量，以及匯出 CSV。這份文件可以在 VSCode 中保留作為本地操作筆記。

## Runtime 設定

- Worker: `jamtrackshub`
- D1 database: `jamtrackshub_subscribers`
- D1 binding name: `SUBSCRIBERS_DB`
- Admin secret name: `SUBSCRIBERS_ADMIN_TOKEN`
- Table: `subscribers`
- CSV endpoint: `https://jamtrackshub.com/api/subscribers.csv?token=YOUR_PRIVATE_TOKEN`

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

如果用假 token 開：

```text
https://jamtrackshub.com/api/subscribers.csv?token=test
```

看到 `Unauthorized` 代表 endpoint、binding、secret 已經連好，只是 token 不對。看到 `Subscriber export is not configured.` 代表 binding 或 secret 還沒被 Worker 讀到。

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

使用瀏覽器開啟：

```text
https://jamtrackshub.com/api/subscribers.csv?token=YOUR_PRIVATE_TOKEN
```

或在本機 terminal 下載：

```bash
curl -L -o jam-tracks-hub-subscribers.csv "https://jamtrackshub.com/api/subscribers.csv?token=YOUR_PRIVATE_TOKEN"
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
- `Subscriber export is not configured.`: Worker 沒讀到 `SUBSCRIBERS_DB` 或 `SUBSCRIBERS_ADMIN_TOKEN`。

