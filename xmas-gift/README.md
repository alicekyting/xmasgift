# Xmas 盲盒交換禮物

## 部署（約 3 分鐘）
1. 將成個 `xmas-gift` 資料夾 push 去 GitHub，喺 vercel.com → Add New Project → Import。Framework 揀 **Other**，其他唔使改。
2. 項目建好後：Storage（或 Marketplace）→ 加 **Upstash Redis**（free plan 夠用）→ Connect to Project。
   會自動加 `KV_REST_API_URL` / `KV_REST_API_TOKEN`（或 `UPSTASH_REDIS_REST_*`），兩種都支援。
3. Redeploy 一次，將網址 send 入 group。

## 可選 Environment Variables
- `PLAYERS`：人數，預設 8
- `RESET_KEY`：設咗先可以重置，用法：
  `curl -X POST https://你的網址/api/gift -H "Content-Type: application/json" -d '{"action":"reset","key":"你的RESET_KEY"}'`
