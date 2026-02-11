# Part 2 + Part 3 API 设计

## 1. 录音接口

### 开始录音
```
POST /api/recording/start
Response: { recordingId: string }
```

### 停止录音
```
POST /api/recording/stop
Body: { recordingId: string }
Response: { audioUrl: string, duration: number }
```

## 2. iFlytek ISE 评估接口

### 提交评估
```
POST /api/evaluation/ise
Body: { 
  recordingId: string,
  language: 'en' | 'zh'
}
Response: {
  rec_text: string,
  total_score: number,
  pron_score: number,
  flu_score: number,
  acc_score: number,
  inte_score: number
}
```

## 3. iFlytek ASR 转写接口

### 提交转写
```
POST /api/transcription/asr
Body: { 
  recordingId: string,
  language: 'en' | 'zh'
}
Response: {
  text: string,
  confidence: number,
  duration: number
}
```

## 4. DeepSeek AI 评估接口

### Part 2 评估
```
POST /api/evaluation/part2
Body: {
  transcript: string,
  topic: {
    title: string,
    hints: string[]
  }
}
Response: {
  overallBand: number,
  dimensions: {
    taskResponse: number,
    coherenceCohesion: number,
    lexicalResource: number,
    grammaticalRange: number
  },
  feedback: string,
  strengths: string[],
  improvements: string[]
}
```

### Part 3 评估
```
POST /api/evaluation/part3
Body: {
  transcript: string,
  question: string
}
Response: {
  logicalScore: number,
  depthScore: number,
  feedback: string,
  suggestions: string[]
}
```

## 5. 题目数据接口

### 获取 Part 2 题目列表
```
GET /api/topics/part2
Response: [{
  id: string,
  category: string,
  title: string,
  description: string,
  hints: string[],
  difficulty: 'easy' | 'medium' | 'hard'
}]
```

### 获取 Part 3 题目列表
```
GET /api/questions/part3
Response: [{
  id: string,
  topicId: string,
  question: string,
  followUp: boolean
}]
```

## 数据流

### Part 2 流程
```
用户选择题目 → 显示 Cue Card → 开始录音
    ↓
录音中（倒计时） → 录音结束
    ↓
上传音频 → iFlytek ISE 评估 → DeepSeek AI 评分
    ↓
显示结果（Band + 四维评分 + 反馈）
```

### Part 3 流程
```
用户选择问题 → 显示问题 → 开始录音
    ↓
录音中（倒计时） → 录音结束
    ↓
上传音频 → iFlytek ASR 转写 → DeepSeek AI 评估
    ↓
显示结果（逻辑性 + 深度 + 反馈）
```

## 6. 后台管理接口 (Admin APIs)

### 考季管理 (Season)
```typescript
// 创建考季
POST /api/admin/seasons
Body: { title: string, isActive: boolean: false }

// 设置当前考季
PUT /api/admin/seasons/:id/active
Body: { isActive: true }
```

### 题库管理 (Question Bank)
```typescript
// 创建 Topic
POST /api/admin/topics
Body: {
  seasonId: string,
  title: string,
  part: 1 | 2 | 3,
  order: number
}

// 创建 Question
POST /api/admin/questions
Body: {
  topicId: string,
  text: string,
  order: number
}
```

### 批量导入 (Import Tool)
*   目前前端直接调用 Firestore Batch Write 实现，无专属后端 API。
*   逻辑：解析 CSV -> 映射对象 -> `batch.set()` -> `batch.commit()`。

## 错误码

| 错误码 | 说明 |
|--------|------|
| 40001 | 参数错误 |
| 40002 | 录音不存在 |
| 40003 | 音频处理失败 |
| 40004 | AI 评估失败 |
| 40101 | 认证失败 |
| 40301 | 超出每日限制 |
