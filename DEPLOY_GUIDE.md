# 五子棋AI - Cloudflare Pages + R2 部署完整指南

## 架构说明

- **网页文件**: Cloudflare Pages（全球CDN）
- **AI模型文件**: Cloudflare R2（绕过25MB限制）
- **国内访问**: 相对稳定

## 部署步骤

### 第一步：配置R2 CORS

1. 登录 Cloudflare Dashboard
2. 进入 R2 存储桶
3. 配置CORS（参考 `R2_CORS_CONFIG.md`）

### 第二步：推送代码到GitHub

```bash
git push origin main v2.22
```

### 第三步：部署到Cloudflare Pages

#### 方式A：GitHub自动部署（推荐）

1. 访问 https://dash.cloudflare.com/
2. 进入 "Workers & Pages"
3. 点击 "Create application" → "Pages" → "Connect to Git"
4. 选择仓库：`maserpoassr/wzqqiyun`
5. 配置构建：
   - Build command: `npm run build`
   - Build output: `dist`
   - Root directory: `gomoku-calculator--master`
6. 点击 "Save and Deploy"

#### 方式B：手动部署

1. 构建项目：
   ```bash
   npm run build
   ```
2. 上传 `dist` 文件夹到 Cloudflare Pages

### 第四步：验证部署

1. 访问分配的 `.pages.dev` 域名
2. 打开浏览器控制台
3. 查看日志确认CDN加载成功
4. 测试游戏功能

## 文件说明

- `_headers`: Cloudflare Pages HTTP头配置（CORS、缓存）
- `R2_CORS_CONFIG.md`: R2 CORS配置说明
- `CLOUDFLARE_PAGES_DEPLOY.md`: 详细部署文档

## 注意事项

1. R2必须配置CORS，否则无法加载AI模型
2. CDN URL: `https://cdn.hfive.ggff.net/rapfi.data`
3. 首次加载会从R2下载38MB模型文件
4. 后续访问会使用浏览器缓存

## 故障排查

如果AI无法加载，检查：
1. R2 CORS配置是否正确
2. 浏览器控制台是否有CORS错误
3. CDN URL是否可访问
