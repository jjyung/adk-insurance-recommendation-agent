# Markdown 撰寫語法參考

本文件定義 `md-to-codelab-html` skill 讀取來源 `.md` 檔案時使用的全部語法慣例。

---

## 1. 教材結構（必要）

### 1.1 文件標題（H1）

文件最開頭必須有一個 H1，作為整份 Codelab 的標題及 `<title>`：

```markdown
# 使用 RAG 建立知識引擎
```

### 1.2 作者與日期（選填）

H1 下方可選擇性加入 Frontmatter block（HTML 注釋格式），供 header 顯示：

```markdown
<!-- author: Christina Lin | date: 2025-04-01 -->
```

或以純文字行放在 H1 正下方：

```markdown
作者：Christina Lin　　最後更新：2025-04-01
```

### 1.3 步驟標題（H2）

每個 `##` 標題自動轉為一個**步驟（section）**，顯示在側邊欄並在主內容區生成 `<section id="step-N">`。

```markdown
## 1. 概覽
## 2. 環境準備
## 3. 建立 Agent
## 4. 測試與驗收
```

> 步驟編號可以寫在標題文字中（`## 1. 概覽`），也可以省略（`## 概覽`），側邊欄數字皆由生成時自動計算。

---

## 2. 圖片注入（核心功能）

### 2.1 語法

使用標準 Markdown 圖片語法，**alt text 為圖片 key**，path 欄位可以留空或填寫 key 名稱（不含副檔名）：

```markdown
![圖一](圖一)
![系統架構圖](系統架構圖)
![部署流程](部署流程)
```

### 2.2 對應規則

| 狀況 | 行為 |
|------|------|
| 同目錄有 `圖一.png` | 生成 `<img src="圖一.png" alt="圖一">` + 圖說 |
| 同目錄有 `圖一.jpg` | 生成 `<img src="圖一.jpg" alt="圖一">` + 圖說 |
| 找不到任何符合檔案 | 生成黃底佔位框，顯示「⬛ 待補圖：圖一」 |

### 2.3 支援副檔名（搜尋優先順序）

`.png` → `.jpg` → `.jpeg` → `.gif` → `.webp` → `.svg`

### 2.4 指定圖片目錄（選填）

若圖片集中存放在子目錄，可在呼叫時以 `--images <dir>` 指定：

```
/md-to-codelab-html 教材.md --images assets/images/
```

### 2.5 完整圖片注入輸出 HTML 範例

```html
<div class="codelab-img-wrapper">
  <img src="圖一.png" alt="圖一" loading="lazy" />
  <p class="codelab-img-caption">圖一</p>
</div>
```

### 2.6 佔位框 HTML 範例（圖片未找到）

```html
<div class="codelab-img-placeholder">圖一</div>
```

---

## 3. Callout 框

使用 Markdown blockquote（`>`）+ 粗體前綴：

| 來源語法 | CSS class | 顏色 |
|---------|-----------|------|
| `> **NOTE:** 文字` | `callout-note` | 藍 |
| `> **WARNING:** 文字` | `callout-warning` | 橘 |
| `> **IMPORTANT:** 文字` | `callout-important` | 紅 |
| `> **TIP:** 文字` | `callout-tip` | 綠 |

範例：

```markdown
> **NOTE:** 這個步驟需要先完成 GCP 帳號設定。

> **WARNING:** 請勿在正式環境執行此指令，僅限本地開發測試。

> **TIP:** 可以使用 `gcloud config list` 確認目前的設定。
```

---

## 4. 程式碼區塊

使用標準 triple-backtick 圍欄並指定語言（必填，用於 highlight.js 語法上色）：

````markdown
```python
def hello():
    print("Hello, World!")
```

```bash
gcloud run deploy my-agent --region us-central1
```

```yaml
apiVersion: v1
kind: ConfigMap
```
````

HTML 輸出加上 `data-lang` 屬性：

```html
<pre data-lang="python"><code class="language-python">
def hello():
    print("Hello, World!")
</code></pre>
```

---

## 5. 表格

使用標準 GFM 表格語法：

```markdown
| 欄位 | 型別 | 說明 |
|------|------|------|
| id   | int  | 主鍵 |
| name | str  | 名稱 |
```

輸出加上 `codelab-table` class：

```html
<table class="codelab-table">
  <thead>...</thead>
  <tbody>...</tbody>
</table>
```

---

## 6. 行內格式

| Markdown | HTML 輸出 |
|----------|-----------|
| `**粗體**` | `<strong>粗體</strong>` |
| `*斜體*` | `<em>斜體</em>` |
| `` `行內程式碼` `` | `<code>行內程式碼</code>` |
| `[連結文字](https://...)` | `<a href="...">連結文字</a>` |

---

## 7. 完整範例 `.md` 來源檔

```markdown
# 使用 Cloud SQL 建立向量資料庫

<!-- author: 資料工程師 | date: 2025-04-01 -->

## 1. 概覽

本實驗帶你在 Google Cloud 上建立向量搜尋系統。

![系統架構圖](系統架構圖)

> **NOTE:** 此實驗需要具備 GCP 基本操作能力。

## 2. 環境準備

確認已安裝下列工具：

- Google Cloud CLI
- Python 3.11+
- Docker

```bash
gcloud auth login
gcloud config set project YOUR_PROJECT_ID
```

## 3. 建立 Cloud SQL 實例

在 GCP Console 建立 PostgreSQL 實例：

![建立實例截圖](建立實例截圖)

> **WARNING:** 實例啟動需要 3-5 分鐘，請耐心等候。

| 參數 | 建議值 |
|------|--------|
| 版本 | PostgreSQL 15 |
| vCPU | 2 |
| RAM  | 8 GB  |
```
