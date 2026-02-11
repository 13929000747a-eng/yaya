# 开发日志系统

## 概述

开发日志系统用于记录 yayaielts 项目的开发历程，包括新功能、Bug 修复、性能优化等。

## 功能特性

### 1. 日志列表（第一层级）
- 显示时间、类别、简要说明
- 支持按类别筛选（颜色区分）
- 点击查看详情

### 2. 日志详情（第二层级）
- 完整时间戳
- 负责人信息
- 详细描述
- 相关链接

### 3. 自动记录
- Agent 完成任务时自动生成日志
- 支持多种日志类型

### 4. Firebase 集成
- `dev_logs` 集合存储日志
- 支持实时查询

## 使用方法

### 访问日志页面

```
/admin/dev-logs
```

### 手动记录日志

```typescript
import { logNewFeature, logBugFix, logOptimization } from './utils/devLogRecorder';

// 记录新功能
await logNewFeature(
  'Part 2 练习页功能',           // 标题
  '实现了 Part 2 练习页的所有功能', // 描述
  ['/docs/prd.md']               // 相关链接（可选）
);

// 记录 Bug 修复
await logBugFix(
  '录音中断问题',
  '修复了录音在某些情况下中断的问题'
);

// 记录优化
await logOptimization(
  '页面加载速度',
  '优化了首屏加载性能，提升 30%'
);
```

### 通用日志记录

```typescript
import { logDevActivity } from './utils/devLogRecorder';

await logDevActivity(
  '🆕 新增',           // 类别
  '新功能标题',         // 标题
  '详细描述内容',       // 描述
  '作者名',            // 作者
  '作者ID',           // 作者ID（可选）
  ['链接1', '链接2']  // 相关链接（可选）
);
```

## 日志类别

| 类别 | 图标 | 用途 |
|------|------|------|
| 🆕 新增 | 绿色 | 新功能上线 |
| 🔧 修复 | 红色 | Bug 修复 |
| ✨ 优化 | 蓝色 | 性能优化 |
| 📖 文档 | 黄色 | 文档更新 |
| ⚠️ 警告 | 橙色 | 重要警告 |
| ❌ 错误 | 深红 | 错误修复 |
| 🎨 UI | 紫色 | UI 改进 |
| 🔀 合并 | 青色 | 分支合并 |

## Firebase 配置

在 `.env` 文件中配置：

```env
VITE_FIREBASE_API_KEY=your_api_key
VITE_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your_project_id
VITE_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
VITE_FIREBASE_APP_ID=your_app_id
```

## 目录结构

```
src/
├── services/
│   ├── firebase.ts          # Firebase 配置
│   └── devLogService.ts     # API 服务
├── types/
│   └── devLog.ts            # 类型定义
├── utils/
│   └── devLogRecorder.ts    # 自动记录工具
├── pages/
│   └── AdminDevLogs.tsx      # 日志管理页面
│   └── AdminDevLogs.css     # 样式文件
└── ...
```

## 运行测试

```bash
npm test
```

## 注意事项

1. 确保 Firebase 项目已创建 `dev_logs` 集合
2. 日志创建后不支持修改
3. 建议使用统一的作者信息
4. 相关链接建议使用绝对路径或完整 URL
