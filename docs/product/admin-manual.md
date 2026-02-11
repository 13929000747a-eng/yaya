# 后台操作手册 (Admin Manual)

## 1. 访问后台

*   **URL**: `/admin`
*   **权限**: 目前无严格权限控制，建议仅限管理员访问。
*   **入口**: 包含 "Listenin Admin", "Question Bank", "Users", "Import Tool", "Dev Logs" 等模块。

## 2. 考季管理 (Season Management)

*   **路径**: `/admin/question-bank`
*   **功能**:
    *   **创建新考季**: 输入名称 (如 "Jan-Apr 2026") 并点击创建。
    *   **设置当前考季**: 点击 "Set Active" 将某个考季设为学生端默认显示的考季。
    *   **状态**: 只有 Active 的考季才会在 Dashboard 默认加载。

## 3. 题库管理 (Question Bank)

*   **路径**: `/admin/question-bank` -> 点击具体 Season
*   **层级结构**: `Season` -> `Topic` -> `Question`
*   **Topic 管理**:
    *   **Part 区分**: 创建时需选择 Part 1, 2, 或 3。
    *   **Part 2 特性**: 包含 Cue Card 四个提示点 (Cue 1~4) 的编辑。
*   **Question 管理**:
    *   在 Topic 详情页添加具体问题。
    *   支持拖拽排序 (To be implemented)。

## 4. 批量导入工具 (Batch Import Tool)

*   **路径**: `/admin/import`
*   **功能**: 通过 CSV 文件批量导入 Part 1 题目。
*   **CSV 格式**:
    ```csv
    date,type,topic,question,answer,remark
    20260104,new,Hometown,Where is your hometown?,My hometown is...,High Freq
    ```
    *   关键列: `topic`, `question`。
    *   自动去重: 相同 `topic` 的问题会自动归组。
*   **一键导入 (Auto-Import)**:
    *   点击 "One-Click Import" 按钮。
    *   系统会自动检查/创建 "Jan-Apr 2026" 考季。
    *   解析内置的 CSV 数据并写入 Firestore。
*   **日志**: 页面下方显示详细的导入日志 (Log)。
