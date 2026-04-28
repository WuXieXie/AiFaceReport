# 1Panel 容器编排部署

这个目录是 1Panel 可直接导入的容器编排包。

## 使用方式

1. 将整个 `1panel-medspa-deploy` 文件夹上传到服务器。
2. 在 1Panel 中进入“容器” -> “编排” -> “创建编排”。
3. 选择本目录中的 `docker-compose.yml`。
4. 创建时不要填写远程镜像名；本编排会使用当前目录的 `Dockerfile` 本地构建镜像。
5. 按需修改 `.env`：
   - `APP_PORT`: 宿主机访问端口，默认 `15000`
   - `JWT_SECRET`: JWT 密钥，生产环境请保持为随机字符串
   - `AI_ANALYSIS_PROVIDER`: 文本分析接口，`openai` 或 `grok`
   - `AI_IMAGE_PROVIDER`: 提拉线图片接口，`openai` 或 `grok`
   - `AI_IMAGE_MODE`: 图片生成方式，`edit` 为基于原图编辑，`generate` 为参考原图生成新图
   - `OPENAI_API_KEY` / `XAI_API_KEY`: OpenAI 或 Grok/xAI API Key
   - `OPENAI_MODEL` / `XAI_MODEL`: 文本分析模型
   - `OPENAI_IMAGE_MODEL` / `XAI_IMAGE_MODEL`: 提拉线图片模型
6. 启动编排，访问 `http://服务器IP:APP_PORT`。

## 反向代理超时

AI 面诊接口最长按 3 分钟处理。如果通过 1Panel 网站反向代理访问域名，进入该网站的“反向代理”或“配置文件”，把 `1panel-nginx-timeout.conf` 中的配置加入高级配置：

```nginx
proxy_connect_timeout 180s;
proxy_send_timeout 180s;
proxy_read_timeout 180s;
send_timeout 180s;
```

如果不修改反向代理，域名访问可能仍会在 60 秒左右返回 `504 Gateway Timeout`。

## 图片与报告

- 上传图片保存在 Docker volume `medspa_uploads`，不会随容器重建丢失。
- 图片模型只生成“淡红色点位 + 大间隔虚线提拉方向”的面部标注图。
- 系统会把提拉线标注图、六维雷达图、综合评分、整体评价、问题诊断、问题详解、改善方案、效果对比合成为完整 PNG 报告。

## 默认账号

首次启动会自动初始化数据库并写入默认数据：

| 角色 | 用户名 | 密码 |
| --- | --- | --- |
| 管理员 | admin | admin123 |
| 员工 | demo | 123456 |

## 数据持久化

Compose 已配置两个 Docker volume：

- `medspa_data`: SQLite 数据库
- `medspa_uploads`: 上传图片

删除容器不会删除数据；删除 volume 会清空数据库和上传文件。
