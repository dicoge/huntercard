# 任務：修復 CCR/OpenCode CLI 卡死問題

## 問題

CCR 和 OpenCode 透過 OpenRouter 使用 `deepseek/deepseek-v4-flash` 時，
Cloudflare 代理會在串流回應約 100 秒後斷開連線（"stream closed prematurely"）。
今天 19MB 的 log 中有 7,664 次斷流錯誤。

導致：
- CCR 卡在 "Content block is not a text block"
- OpenCode 執行 107 分鐘無輸出
- 整個團隊流程停擺

## 修復方案：切換預設模型

CCR config 在 `~/.claude-code-router/config.json`：

### 方案 A：預設改用 minimax/m2.7
minimax 速度更快，回應更短，較不容易觸發 Cloudflare 超時。

變更：
```json
"Router": {
  "default": "openrouter,minimax/minimax-m2.7",
  "background": "openrouter,minimax/minimax-m2.7",
  "think": "openrouter,deepseek/deepseek-v4-flash",
  "longContext": "openrouter,minimax/minimax-m2.7",
  ...
}
```

保留 `think` 路由用 DeepSeek（思考任務通常回應較短）。

### 方案 B：使用 direct DeepSeek API
跳過 OpenRouter 直接連 DeepSeek，避開 Cloudflare 代理。

需要：
1. 新增一個 Provider 指向 `https://api.deepseek.com/v1`
2. 使用 DeepSeek API Key
3. 預設路由指向新 provider

## 需求

1. 修改 `~/.claude-code-router/config.json` 的 Router 設定
2. 重啟 CCR（kill 舊 process，重新 ccr start）
3. 測試：執行一個短任務確認不再卡死

## 驗證

```bash
source ~/.hermes/cli-wrapper.sh
kill $(cat ~/.claude-code-router/.claude-code-router.pid 2>/dev/null) 2>/dev/null
ccr start
# 等 3 秒
curl -s http://localhost:3456/api/health
# 跑一個簡單任務
ccr code -p "echo hello" --dangerously-skip-permissions --max-turns 3
```
