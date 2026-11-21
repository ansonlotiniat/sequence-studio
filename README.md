# 序 · Sequence Studio

繁體中文的中學數學互動學習網站。以「觀察 → 理解 → 驗證」為主線，讓學生用圖形而不只是公式認識數列。

## 學習內容

| 章節 | 互動視覺化 | 數學重點 |
| --- | --- | --- |
| 平方數列 | 逐圈 L 形單位積木、平方和拼圖 | 奇數和、平方和、單項與總和的分別 |
| 等差數列 | 可調首項與公差的長條／座標圖 | 通項、首尾配對、負公差 |
| 等比數列 | 可調公比的長條／座標圖 | 錯位相減、r=0/1/負數、無窮和收斂條件 |
| 三角形數列 | 點陣三角形與補成長方形 | 配對證明、相鄰三角形數與平方數 |
| 斐波那契數列 | 遞推長條與前兩項來源 | 初始條件、遞推、O(n) 演算法 |
| 年金與複利 | 每筆存款終值的時間線 | 等比求和、期初／期末、零利率 |

每章具備項數滑桿、播放／暫停、累積和、圖表選點、公式推導、自訂數據練習和 CSV 匯出。學習進度只保存在瀏覽器的 localStorage，不需帳戶。

## 本機啟動

Node.js 22.13+ 或 24 LTS；本專案以 Node 24.22.2 驗證。

```sh
npm ci
cp .env.example .env
# 在 .env 設定 GEMINI_API_KEY；不設定仍可使用所有非 AI 功能
npm test
npm run build
npm start
```

開啟 `http://localhost:3000`。開發時另跑 `npm run dev`，Vite 會把 `/api` 轉送至 3000。

## 公開部署到 Vercel

1. 匯入此 GitHub repository，使用 Vite framework preset；build 為 `npm run build`，output 為 `dist`。
2. 在 **Project → Settings → Environment Variables** 設定 server-only 的 `GEMINI_API_KEY`，可選 `GEMINI_MODEL`（預設 `gemini-3.5-flash-lite`，已通過實際對話與建議設定測試）。不要使用 `VITE_` 前綴，不要把實際金鑰寫進 repo。
3. 重新部署；停用 Deployment Protection 的 Vercel Authentication，使老師可以不登入開啟 production URL。
4. 先檢查 `/api/health` 的 `ai` 為 `true`，再實際問一個數學問題。模型不可用時，可把 `GEMINI_MODEL` 改成帳戶支援的 Gemini 文字模型後重新部署。Google 已對新用戶停用部分舊模型；模型列表中出現不代表該帳戶仍可生成內容。

`api/tutor.js` 是 Vercel function；`server.js` 提供等價的本機 Node server。純 GitHub Pages 不能執行此後端，因此不應把只有靜態前端的部署說成已具備 AI。

## AI 的定位與資安

```text
瀏覽器（問題、章節、自訂參數）
  → 本站 /api/tutor
  → 驗證輸入／限制頻率／重新計算數列
  → Google Gemini（伺服器以 header 傳送 API key）
  → 驗證 JSON 與白名單 action
  → 純文字提示 + 等待學生確認的實驗設定
```

- AI 是引導式學伴，不是數學運算引擎；所有畫面數值由確定性程式計算。後端不信任客戶端提供的計算結果。
- 系統提示指定繁中、中學程度、先提示再解答、避免混淆 aₙ 與 Sₙ、年金與公比特殊情況。
- 模型只能建議白名單章節與有界數值參數。學生點擊確認後才套用；不執行模型產生的 HTML、JavaScript 或 URL。
- API key 只在 server runtime 讀取；不傳前端，不在 URL query，不回傳上游錯誤內容。React 以文字節點顯示回覆。
- 請求最多 10 則訊息，每則最多 2,000 字，總長有界；模型輸出 token 有界、25 秒逾時、每來源每分鐘 10 次的程序內頻率限制。**Serverless 的程序內限制不構成跨實例的硬性預算**；公開上線時應另設 Google API 配額、預算通知與 Vercel WAF rate limit。
- 對話不寫入本應用資料庫或瀏覽器儲存；最近訊息和實驗參數會傳給 Google 處理，依所用 Gemini 服務條款處理。不要輸入個人資料或金鑰。
- 未設定金鑰或服務失效時清楚顯示狀態，不以罐頭答案冒充大語言模型。

## 數學與測試

`src/math.js` 逐項計算，最多 12 項，時間複雜度 O(n)。教學公式提供封閉形式作獨立驗證。浮點數以 JavaScript Number 計算，畫面最多顯示三位小數；年金模型不計費用、稅項、通脹，並非投資建議。

`npm test` 覆蓋六種數列、零／負／小數公比、零利率、期初期末差異、輸入邊界、AI JSON/action 驗證、金鑰缺失、跨來源請求及上游錯誤處理。CI 另外執行 production build。

## 課堂展示建議

1. 平方數列：n=3，先問「第三項是 9，為甚麼前三項的和是 14？」切換累積求和。
2. 從 4² 到 5²：數出新加 L 形的 9 塊，推導奇數和。
3. 三角形數：切換「理解與推導」，按「拼成長方形」觀察配對。
4. 等比數列：把公比改為 1、0、−1，再比較圖表。
5. 年金：先用 0% 建立本金概念，再改 5%，比較期末與期初。
6. 向 AI 問「不要直接告訴我答案，提示我為甚麼平方數的差是奇數」，再要求改為 7 項並確認建議。

## 技術

React、Vite、Lucide、Noto Sans TC（自架字體）、Node.js／Vercel functions。沒有分析追蹤器。字體與圖示依各自套件授權使用。
