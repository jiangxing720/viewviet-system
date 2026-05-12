# ViewViet — Hostinger VPS 部署指南

## 系统要求

- Node.js 18+ (推荐 20+)
- PostgreSQL 14+
- nginx
- PM2 (`npm install -g pm2`)

---

## 第一步：上传文件

将压缩包上传到服务器并解压到 `/var/www/viewviet/`：

```bash
unzip viewviet-hostinger.zip -d /var/www/viewviet/
cd /var/www/viewviet/
```

目录结构：
```
/var/www/viewviet/
├── api/          ← Node.js API 服务（已打包）
├── public/       ← 前端静态文件
├── schema.sql    ← 数据库建表语句
├── create-admin.sql ← 创建管理员账号
├── .env.example  ← 环境变量模板
├── ecosystem.config.cjs ← PM2 配置
└── nginx.conf    ← nginx 配置
```

---

## 第二步：配置环境变量

```bash
cp .env.example .env
nano .env
```

填写以下内容：
- `DATABASE_URL` — PostgreSQL 连接字符串
- `SESSION_SECRET` — 随机字符串（至少32位）

---

## 第三步：创建数据库

在 PostgreSQL 中执行：

```bash
# 创建数据库和用户
psql -U postgres -c "CREATE USER viewviet_user WITH PASSWORD 'your_password';"
psql -U postgres -c "CREATE DATABASE viewviet OWNER viewviet_user;"

# 建表
psql -U viewviet_user -d viewviet -f schema.sql

# 创建管理员账号
psql -U viewviet_user -d viewviet -f create-admin.sql
```

管理员账号：
- 邮箱：`admin@viewviet.com`
- 密码：`admin123`（请登录后尽快修改）

---

## 第四步：配置 nginx

```bash
# 修改 nginx.conf 中的域名
sed -i 's/yourdomain.com/你的域名.com/g' nginx.conf

# 复制到 nginx 配置目录
cp nginx.conf /etc/nginx/sites-available/viewviet
ln -s /etc/nginx/sites-available/viewviet /etc/nginx/sites-enabled/viewviet

# 删除默认配置（如果有冲突）
rm -f /etc/nginx/sites-enabled/default

# 测试并重启 nginx
nginx -t && systemctl reload nginx
```

---

## 第五步：启动 API 服务

```bash
cd /var/www/viewviet/
mkdir -p logs

# 用 PM2 启动
pm2 start ecosystem.config.cjs

# 开机自启
pm2 save
pm2 startup
```

---

## 第六步：验证

```bash
# 检查 API 是否正常
curl http://localhost:8080/api/healthz

# 检查 nginx 是否正常
curl http://你的域名/api/healthz
```

浏览器访问 `http://你的域名` 即可看到网站。

---

## HTTPS（推荐）

```bash
apt install certbot python3-certbot-nginx
certbot --nginx -d 你的域名.com -d www.你的域名.com
```

---

## 常用命令

```bash
pm2 status            # 查看服务状态
pm2 logs viewviet-api # 查看日志
pm2 restart viewviet-api  # 重启服务
pm2 stop viewviet-api     # 停止服务
```

---

## 注意事项

- 数据库连接必须在 `.env` 中正确配置，否则 API 无法启动
- `SESSION_SECRET` 请使用强随机字符串，不要用示例值
- 生产环境建议开启 HTTPS (Let's Encrypt 免费证书)
- 防火墙需要开放 80 和 443 端口
