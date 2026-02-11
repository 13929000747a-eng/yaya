# YayaIELTS 文档索引

## 📁 文档目录结构

```
yayaielts/
├── README.md                          # 项目说明
├── docs/
│   ├── README.md                       # 文档索引（本文件）
│   │
│   ├── product/                        # 产品文档
│   │   └── prd.md                      # 产品需求文档
│   │
│   ├── education/                      # 教育教研文档
│   │   ├── research.md                 # IELTS 教研研究
│   │   └── feedback-prompts.md         # AI 反馈提示词
│   │
│   └── tech/                          # 技术文档
│       ├── api-design.md              # API 设计
│       └── dev-log-system.md          # 开发日志系统
│
└── src/
    ├── README.md                       # 代码说明
    └── types/index.ts                  # 类型定义
```

---

## 📄 文档列表

### 产品文档 (Product)
| 文档 | 说明 | 状态 |
|------|------|------|
| [prd.md](./product/prd.md) | Part 2 + Part 3 详细需求 | ✅ 完成 |
| [admin-manual.md](./product/admin-manual.md) | 后台操作与导入手册 | ✅ 完成 |
| [student-features.md](./product/student-features.md) | 学生端功能 (Dashboard/Part 1) | ✅ 完成 |

### 教育教研 (Education)
| 文档 | 说明 | 状态 |
|------|------|------|
| [research.md](./education/research.md) | IELTS 口语评分标准教研 | ✅ 完成 |
| [feedback-prompts.md](./education/feedback-prompts.md) | AI 反馈提示词模板 | ✅ 完成 |

### 技术文档 (Tech)
| 文档 | 说明 | 状态 |
|------|------|------|
| [api-design.md](./tech/api-design.md) | API 设计规范 | ✅ 完成 |
| [dev-log-system.md](./tech/dev-log-system.md) | 开发日志系统设计 | ✅ 完成 |

---

## 🔗 相关资源

### API 服务
- `src/services/aiService.ts` - DeepSeek AI 服务
- `src/services/feedbackService.ts` - 反馈服务
- `src/services/userService.ts` - 用户服务
- `src/services/questionService.ts` - 题库服务

### 类型定义
- `src/types/index.ts` - 核心类型

---

## 📋 待整理

- [ ] 移动端 UI/UX 规范
- [ ] 社区功能规范
- [ ] API 密钥配置文档

---

*最后更新: 2026-02-10*
