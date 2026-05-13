# Dive Checklist · 旅遊潛水裝備與用品檢查表

**線上使用：[dive.kuronetwork.me](https://dive.kuronetwork.me)**

一個給潛水員用的行前裝備清單工具。從 Notion 靜態清單進化而來，支援互動勾選、多種行程模式、目的地建議與飛行間隔計算。100% 在瀏覽器端運作，不追蹤、不收集任何資料。

---

## 功能

- **雙模式切換** — 多天住宿 / 當天來回，勾選狀態各自獨立儲存
- **國內 / 國外切換** — 國外模式自動顯示護照、簽證、DAN 保險等加項
- **目的地 preset** — 選擇潛點後自動帶入水溫、防寒衣建議、季節說明，並注入目的地專屬裝備
- **飛行間隔計算器** — 輸入最後一潛時間，顯示 DAN 建議的 +12h / +18h / +24h 可搭機時刻，含即時倒數
- **自訂項目** — 每個分類可新增個人裝備，重新整理後仍保留
- **隱藏已勾選** — 打包到一半，一鍵收起已確認項目
- **深色模式** — 首次載入依系統設定，可手動切換
- **localStorage 持久化** — 所有狀態存在瀏覽器本地，關掉重開不會消失

---

## 支援潛點

| 國內 | 國外 |
|------|------|
| 綠島 | 薄荷島（菲律賓） |
| 墾丁 | 斯米蘭群島（泰國） |
| 小琉球 | 帛琉 |
| 東北角 | 馬爾地夫 |

---

## 技術架構

純靜態網頁，無後端、無 build pipeline、無 npm 依賴（runtime）。

- HTML5 + CSS3 + Vanilla JavaScript (ES2020+)
- [Alpine.js](https://alpinejs.dev/) v3.14.1（CDN，SRI hash 鎖定）
- 字型：DM Serif Display + DM Sans（Google Fonts）
- 部署：GitHub Pages + 自訂網域

---

## 隱私

100% client-side。沒有追蹤腳本、沒有 cookies、沒有後端。所有資料只存在你的瀏覽器 localStorage，不會離開你的裝置。

---

## Fork 使用

1. Fork 或 clone 此 repo
2. 編輯 `data/gear.json` — 修改裝備清單（新增、刪除、調整分類）
3. 編輯 `data/destinations.json` — 修改目的地資料
4. 更新 `CNAME` 為你自己的 domain，或直接用 GitHub Pages 預設 URL

不需要任何 build 工具，直接用靜態伺服器開啟：

```bash
python3 -m http.server 8080
# 開啟 http://localhost:8080
```

### ★ 標記說明

清單中標有 ★ 的項目為作者個人裝備（Insta360、Garmin 等）。Fork 後請依自身裝備調整 `data/gear.json`。

---

## 關於作者

由 [Kuro](https://explorediving.org/) 製作。

同場加映：**[Explore Diving 探索潛水](https://explorediving.org/)** — 離線優先的潛水嚮導 APP，雙平台。

---

## 授權

- 程式碼：[MIT License](LICENSE)
- 清單內容（gear.json, destinations.json）：[CC BY 4.0](LICENSE-CONTENT)
