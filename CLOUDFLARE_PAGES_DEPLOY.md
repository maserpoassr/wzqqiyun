# Cloudflare Pages 部署指南

## 方式1：通过GitHub自动部署（推荐）

### 步骤：

1. **推送代码到GitHub**
   ```bash
   git add _headers
   git commit -m "Add Cloudflare Pages headers configuration"
   git push origin main
   ```

2. **登录Cloudflare Dashboard**
   - 访问：https://dash.cloudflare.com/
   - 进入 "Workers & Pages"

3. **创建新项目**
   - 点击 "Create application"
   - 选择 "Pages"
   - 点击 "Connect to Git"

4. **连接GitHub仓库**
   - 选择你的GitHub账号
   - 选择仓库：`maserpoassr/wzqqiyun`
   - 点击 "Begin setup"

5. **配置构建设置**
   ```
   Project name: wzq-gomoku (或其他名称)
   Production branch: main
   Build command: npm run build
   Build output directory: dist
   Root directory: gomoku-calculator--master
   ```

6. **环境变量（必需）**
   ```
   NODE_VERSION=20
   NODE_OPTIONS=--openssl-legacy-provider
   ```
   
   **重要**: 必须设置这两个环境变量：
   - `NODE_VERSION=20`: Wrangler需要Node 20+
   - `NODE_OPTIONS=--openssl-legacy-provider`: 解决webpack与新版OpenSSL的兼容性问题

7. **点击 "Save and Deploy"**

8. **等待构建完成**
   - 首次构建需要5-10分钟
   - 构建完成后会得到一个 `.pages.dev` 域名

9. **测试访问**
   - 访问分配的域名
   - 测试AI加载和游戏功能

10. **绑定自定义域名（可选）**
    - 在项目设置中添加自定义域名
    - 配置DNS记录

---

## 方式2：手动上传dist文件夹

### 步骤：

1. **构建项目**
   ```bash
   cd gomoku-calculator--master
   npm run build
   ```

2. **复制_headers到dist**
   ```bash
   copy _headers dist\_headers
   ```

3. **登录Cloudflare Dashboard**
   - 访问：https://dash.cloudflare.com/
   - 进入 "Workers & Pages"

4. **创建新项目**
   - 点击 "Create application"
   - 选择 "Pages"
   - 选择 "Upload assets"

5. **上传dist文件夹**
   - 拖拽整个 `dist` 文件夹
   - 或点击选择文件夹

6. **等待上传完成**
   - 上传完成后自动部署

7. **测试访问**

---

## 注意事项

1. **文件大小限制**
   - Cloudflare Pages单个文件限制25MB
   - rapfi.data文件38MB，需要分割或压缩

2. **CORS头配置**
   - `_headers`文件已配置COOP和COEP
   - 支持多线程WASM

3. **缓存策略**
   - 静态资源缓存1年
   - 利用Cloudflare全球CDN

4. **国内访问**
   - Cloudflare在国内访问相对稳定
   - 建议绑定自定义域名提高稳定性

---

## 部署后验证

1. 打开浏览器控制台
2. 查看日志：
   ```
   [Engine] Browser capabilities: {threads: true, ...}
   ```
3. 确认AI正常加载
4. 测试游戏功能
