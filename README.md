# 医美智能面诊系统

AI 辅助的医美面诊、报告生成与机构管理系统。当前项目已经按 1Panel 容器编排部署场景整理，默认外部访问端口为 `15000`。

## 当前进度

- 已完成机构、员工、管理员登录与基础管理，支持机构内容值提示、员工归属机构、项目类别与提示词预设管理。
- 已完成图片上传持久化，报告列表与详情页可稳定预览上传图片，避免上传后图片丢失。
- 已完成分析报告时间精确到秒，报告状态支持 `analyzing`、`image_processing`、`completed`、`failed`。
- 已完成异步分析流程：`/api/analysis` 先返回文本分析结果，AI 完整报告图片区域显示占位；后台生成提拉线标注图和完整 PNG 后，详情页轮询刷新展示。
- 已完成接口配置拆分：文本分析接口和提拉线图片接口分开管理，可分别选择 OpenAI 或 Grok/xAI；配置项会根据供应商切换。
- 已完成图片生成方式切换：支持基于原图编辑 `edit` 和参考原图生成新图 `generate` 两种模式。
- 已完成 AI 图片传输调整：图片输入和图片生成结果按 base64/data URL 处理，不再把远程图片 URL 写入报告。
- 已完成 AI 完整报告 PNG 合成：系统负责合成雷达图、综合评分、整体评价、问题诊断、问题详解、改善方案、效果预期对比和提拉线标注图，避免 AI 直接生成报告文字导致乱码或分数失真。
- 已完成中文字体兼容：Docker 镜像安装 Noto CJK 字体，完整报告图片中的中文可正常显示。
- 已完成提拉线图片提示词更新：以原图为主，只允许调整为正面面诊视角；点位为淡红色，提拉线为白色大间隔细虚线，不改变背景，不遮挡五官。
- 已完成 1Panel 部署包：包含 `Dockerfile`、`docker-compose.yml`、`.env.example` 和启动脚本，容器内包含 OpenSSL 与 Prisma 运行所需依赖。

## 脱敏说明

- 本仓库不提交真实 `.env`、`1panel-medspa-deploy/.env`、数据库、上传图片、构建产物、依赖目录和部署压缩包。
- `.env.example` 与 `1panel-medspa-deploy/.env.example` 只保留占位配置，请部署时自行填写真实 Key、JWT 密钥和供应商地址。
- 已对常见 OpenAI、xAI Key 形态和自定义接口域名进行扫描，当前代码中仅发现占位值、环境变量名和业务字段名。

## 1Panel 部署

1. 使用项目根目录的 `1panel-medspa-deploy` 文件夹，或现有的 `1panel-medspa-deploy.zip` 上传到 1Panel。
2. 在 1Panel 中创建容器编排，选择该目录内的 `docker-compose.yml`。
3. 复制 `.env.example` 为 `.env`，至少修改：
   - `JWT_SECRET`
   - `OPENAI_API_KEY` 或 `XAI_API_KEY`
   - `OPENAI_BASE_URL` 或 `XAI_BASE_URL`
   - 文本和图片模型配置
4. 启动后访问 `http://服务器IP:15000`。

容器数据默认挂载：

- `/app/data`：SQLite 数据库
- `/app/public/uploads`：上传图片与生成报告图片

## 本地开发

```bash
npm install
cp .env.example .env
npx prisma db push
npm run db:seed
npm run dev
```

常用命令：

```bash
npm run build
npx tsx --test src/lib/report-status.test.ts src/lib/openai.test.ts src/lib/report-image.test.ts src/lib/ai-providers.test.ts src/lib/display.test.ts
```

默认账号：

| 角色 | 用户名 | 密码 |
| --- | --- | --- |
| 管理员 | admin | admin123 |
| 员工 | demo | 123456 |

## 关键配置

- `APP_PORT`：容器外部端口，当前为 `15000`。
- `AI_ANALYSIS_PROVIDER`：文本分析供应商，支持 `openai` 或 `grok`。
- `AI_IMAGE_PROVIDER`：提拉线图片供应商，支持 `openai` 或 `grok`。
- `AI_IMAGE_MODE`：图片生成方式，`edit` 表示基于原图编辑，`generate` 表示参考原图生成新图。
- `DATABASE_URL`：SQLite 数据库路径，容器内建议使用 `file:/app/data/medspa.db`。

## 已知事项

- Next.js 构建时，部分依赖 cookie 的 API 路由会出现 `DYNAMIC_SERVER_USAGE` 提示，这是动态接口的构建期提示；当前构建流程可正常结束。
- 当前后台图片生成是进程内异步任务，适合单机部署；如果容器重启，正在生成的图片任务可能需要重新发起。
- AI 提拉线效果仍强依赖图片模型能力和提示词服从度，已优先约束“原图背景不变、白色虚线、淡红点位、医学美学提拉方向”。

## 后续改进方向

- 将后台图片生成迁移到 Redis/BullMQ 或其他持久化队列，支持任务重试、断点恢复和多实例部署。
- 增加图片生成失败原因展示、手动重试和单独重新生成提拉线入口。
- 引入人脸关键点检测或可控视觉模型，减少提拉线随机性，让线雕路径更贴合苹果肌、法令纹、下颌线等区域。
- 为提示词、接口配置和报告生成结果增加版本记录，便于回溯不同模型或提示词下的报告差异。
- 将上传图片和完整报告图片迁移到对象存储，减少容器本地磁盘依赖。
- 增加报告导出 PDF、批量下载、机构水印和医生签名能力。
- 补充 Playwright 端到端测试、Docker 启动冒烟测试和 API 集成测试。
- 增强安全能力：接口频控、操作审计、角色权限细分、密钥轮换与配置加密存储。
