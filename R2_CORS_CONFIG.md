# Cloudflare R2 CORS 配置

## 配置步骤

1. **登录Cloudflare Dashboard**
   - 访问：https://dash.cloudflare.com/
   - 进入 R2 存储桶管理

2. **选择你的存储桶**
   - 找到存储 `rapfi.data` 的桶

3. **配置CORS规则**
   - 点击 "Settings" 标签
   - 找到 "CORS Policy" 部分
   - 点击 "Edit CORS Policy"

4. **添加以下CORS配置**

```json
[
  {
    "AllowedOrigins": ["*"],
    "AllowedMethods": ["GET", "HEAD"],
    "AllowedHeaders": ["*"],
    "ExposeHeaders": ["Content-Length", "Content-Range", "Accept-Ranges"],
    "MaxAgeSeconds": 3600
  }
]
```

5. **保存配置**

## 验证CORS配置

在浏览器控制台测试：

```javascript
fetch('https://cdn.hfive.ggff.net/rapfi.data', {
  method: 'HEAD'
}).then(r => console.log('CORS OK:', r.headers.get('access-control-allow-origin')))
```

应该看到：`CORS OK: *`

## 注意事项

- AllowedOrigins设为`*`允许所有域名访问
- 如果只想允许特定域名，改为：`["https://your-pages-domain.pages.dev"]`
- ExposeHeaders必须包含Range相关头，支持分块下载
