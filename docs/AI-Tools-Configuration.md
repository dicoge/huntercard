# AI 工具 API 配置記錄

> ⚠️ **注意**：API Keys 已經過脫敏處理，請參考各工具的實際配置文件獲取完整 key

---

## 📋 團隊成員與配置

| 成員 | 工具 | 模型 | 狀態 | 用途 |
|------|------|------|------|------|
| **Hermes** | 本地 CLI | deepseek-v4-flash | ✅ | 調度協調 |
| Claude Code (CCR) | ccr | deepseek-v4-flash (預設) | ✅ | 通用開發 |
| Codex CLI | codex | deepseek-v3.2 | ✅ | 深度研究 |
| OpenCode | opencode | deepseek-v4-flash | ✅ | 備用開發 |
| gemini CLI | gemini | deepseek-v4-flash | ✅ | 備用研究 |
| OpenClaw | gateway/delegate | - | ✅ | hunterCard 作者 / 測試回報 |
| OpenManus | python main.py | 本地模型 | ✅ | 通用 AI 代理 |

---

## 🔧 各工具詳細配置

### 1. Claude Code (CCR) — Claude Code Router
- **配置文件**: `~/.claude-code-router/config.json`
- **啟動命令**: `ccr start`
- **使用命令**: `ccr code -p "任務"`
- **Provider**: openrouter
- **Models**: 
  - deepseek/deepseek-v4-pro
  - deepseek/deepseek-v4-flash
  - minimax/minimax-m2.7
- **說明**: 通過 HTTP API 運行，Port 3456

---

### 2. Codex CLI
- **配置文件**: `~/.codex/config.toml`
- **使用命令**: 
  ```bash
  export OPENROUTER_API_KEY="[你的Key]"
  cd /Users/dicoge/Documents/GitHub/hunterCard
  npx @openai/codex exec "任務"
  ```
- **Model**: deepseek-v3.2
- **Provider**: openrouter
- **Base URL**: https://openrouter.ai/api/v1
- **說明**: 需要設置環境變數，每次使用都要 export

---

### 3. OpenCode
- **配置文件**: `~/.local/share/opencode/auth.json`
- **使用命令**: 
  ```bash
  cd /Users/dicoge/Documents/GitHub/hunterCard
  ~/.npm-global/bin/opencode run -m openrouter/deepseek/deepseek-v4-flash "任務"
  ```
- **Default Model**: deepseek/deepseek-v4-flash
- **Provider**: openrouter
- **API Key**: [見 auth.json]

---

### 4. gemini CLI
- **配置文件**: `~/.gemini/settings.json`
- **使用命令**: 
  ```bash
  AI_ENGINE=openrouter AI_API_KEY=[你的Key] gemini -p "任務"
  ```
- **Engine**: openrouter
- **Model**: deepseek/deepseek-v4-flash
- **API Key**: [見 settings.json]

---

## 🔐 API Key 管理原則

1. **獨立原則**: 每個工具使用自己的 API Key，不混用
2. **保護原則**: 不在對話中暴露完整 API Key
3. **配置文件**: 所有 key 存儲在各自配置文件中
4. **環境變數**: 需要環境變數的工具，設置後使用

---

## 📁 配置文件位置

| 工具 | 配置路徑 |
|------|----------|
| CCR | `~/.claude-code-router/config.json` |
| Codex | `~/.codex/config.toml` |
| OpenCode | `~/.local/share/opencode/auth.json` |
| gemini | `~/.gemini/settings.json` |

---

## 🚀 快速啟動腳本

如果需要快速使用各工具，可以創建啟動腳本：

```bash
# Codex 環境設置
export OPENROUTER_API_KEY="[從 ~/.codex/config.toml 或環境變數獲取]"

# gemini 環境設置
export AI_ENGINE=openrouter
export AI_API_KEY="[從 ~/.gemini/settings.json 獲取]"
```

---

*最後更新: 2025-05-13*