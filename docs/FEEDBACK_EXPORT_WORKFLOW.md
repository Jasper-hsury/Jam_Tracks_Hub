# Jam Tracks Hub Feedback Workflow

這份文件記錄如何在 Cloudflare D1 查詢 feedback、查看數量，以及匯出 CSV。Feedback 與訂閱者使用同一個 D1 database 與 binding。

## Runtime 設定

- Worker: `jamtrackshub`
- D1 database: `jamtrackshub_subscribers`
- D1 binding name: `SUBSCRIBERS_DB`
- Table: `feedback`
- Feedback endpoint: `https://jamtrackshub.com/api/feedback`

## Cloudflare 先確認

1. 開啟 Cloudflare Dashboard。
2. 進入 `Workers & Pages`。
3. 點選 Worker：`jamtrackshub`。
4. 進入 `Bindings`。
5. 確認有一筆 D1 database binding：
   - Name: `SUBSCRIBERS_DB`
   - Value/database: `jamtrackshub_subscribers`
6. 如果剛新增 binding，回到 `Deployments` 重新 deploy 最新版本。

如果送出 feedback 後網站顯示目前無法送出，通常要先確認：

- `SUBSCRIBERS_DB` binding 是否存在。
- 最新 Worker 是否已重新部署。
- `feedback` table 是否已建立。

## 查詢資料表欄位

Cloudflare 路徑：

`Storage & Databases` -> `D1 SQL Database` -> `jamtrackshub_subscribers` -> Console

輸入：

```sql
PRAGMA table_info(feedback);
```

預期欄位：

- `id`
- `topic`
- `suggestion`
- `page`
- `user_agent`
- `created_at`

## 查看最新 feedback

```sql
SELECT id, topic, suggestion, page, user_agent, created_at
FROM feedback
ORDER BY created_at DESC;
```

## 查看有多少 feedback

```sql
SELECT COUNT(*) AS feedback_count
FROM feedback;
```

## 搜尋 feedback

搜尋 topic 或 suggestion 內含某個關鍵字：

```sql
SELECT id, topic, suggestion, page, created_at
FROM feedback
WHERE topic LIKE '%download%'
   OR suggestion LIKE '%download%'
ORDER BY created_at DESC;
```

搜尋特定頁面：

```sql
SELECT id, topic, suggestion, page, created_at
FROM feedback
WHERE page LIKE '%feedback%'
ORDER BY created_at DESC;
```

## 匯出 CSV：Cloudflare Console

如果 Cloudflare D1 Console 的查詢結果有下載或匯出按鈕，先執行：

```sql
SELECT id, topic, suggestion, page, user_agent, created_at
FROM feedback
ORDER BY created_at DESC;
```

再使用 Console 內建匯出功能下載結果。

## 匯出 CSV：Wrangler

如果本機已登入 Wrangler，可以先匯出 JSON：

```bash
npx wrangler d1 execute jamtrackshub_subscribers --remote --command "SELECT id, topic, suggestion, page, user_agent, created_at FROM feedback ORDER BY created_at DESC;" --json > feedback.json
```

再將 `feedback.json` 裡的 results 轉成 CSV。匯出的 feedback 檔案不要 commit 到 GitHub。

## 匯出後檢查

CSV 表頭建議為：

```csv
id,topic,suggestion,page,user_agent,created_at
```

可以用資料列數量減掉表頭，比對 D1 的：

```sql
SELECT COUNT(*) AS feedback_count
FROM feedback;
```

## 常見錯誤

- `no such table: feedback`: migration 尚未建立 feedback table，或正在查看錯誤的 D1 database。
- `Feedback database is not configured.`: Worker 沒讀到 `SUBSCRIBERS_DB` binding。
- `404`: 最新 Worker 尚未部署 feedback route。
- `Could not send feedback`: 前端收到 API 失敗，先檢查 binding、table、deployment。

