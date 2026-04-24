# 古建华章部署说明

这个项目现在已经是标准 Flask 部署结构，服务入口为 `wsgi:application`，可以直接部署到 Docker、Render，或 Ubuntu + Gunicorn + Nginx。

## 当前部署文件

- `wsgi.py`：WSGI 入口
- `gunicorn.conf.py`：Gunicorn 启动配置
- `Procfile`：适合 Render / Railway / Heroku 风格平台
- `render.yaml`：Render 自动部署配置
- `Dockerfile`：容器镜像构建文件
- `docker-compose.yml`：本地容器启动文件

## 1. 本地直接启动

安装依赖：

```bash
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
```

开发模式：

```bash
python app.py
```

生产模式本地验证：

```bash
gunicorn -c gunicorn.conf.py wsgi:application
```

验证地址：

- `/`
- `/achievements`
- `/gallery`
- `/map`
- `/figures/culture`
- `/healthz`

## 2. Docker 部署

构建镜像：

```bash
docker build -t ancientbuilding .
```

运行容器：

```bash
docker run -d --name ancientbuilding -p 8000:8000 \
  -e PORT=8000 \
  -e WEB_CONCURRENCY=2 \
  -e GUNICORN_TIMEOUT=120 \
  ancientbuilding
```

如果本机有 Docker Compose，也可以直接运行：

```bash
docker compose up --build
```

访问：

```text
http://127.0.0.1:8000
```

## 3. Render 部署

1. 把项目推到 GitHub
2. 在 Render 创建新的 Web Service
3. 让 Render 读取仓库里的 `render.yaml`

Render 将使用：

- Build Command：`pip install -r requirements.txt`
- Start Command：`gunicorn -c gunicorn.conf.py wsgi:application`

建议环境变量：

- `WEB_CONCURRENCY=2`
- `GUNICORN_TIMEOUT=120`

部署完成后优先检查：

- `/`
- `/messages`
- `/collections`
- `/figures/treatises`
- `/healthz`

## 4. Ubuntu + Gunicorn + Nginx

安装基础依赖：

```bash
sudo apt update
sudo apt install -y python3.11 python3.11-venv nginx
```

部署项目并安装依赖：

```bash
cd /srv/ancientbuilding
python3.11 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
```

先手动验证 Gunicorn：

```bash
cd /srv/ancientbuilding
source .venv/bin/activate
PORT=8000 gunicorn -c gunicorn.conf.py wsgi:application
```

### systemd 服务示例

保存为 `/etc/systemd/system/ancientbuilding.service`：

```ini
[Unit]
Description=Ancient Building Flask App
After=network.target

[Service]
User=www-data
Group=www-data
WorkingDirectory=/srv/ancientbuilding
Environment="PORT=8000"
Environment="WEB_CONCURRENCY=2"
Environment="GUNICORN_TIMEOUT=120"
ExecStart=/srv/ancientbuilding/.venv/bin/gunicorn -c /srv/ancientbuilding/gunicorn.conf.py wsgi:application
Restart=always

[Install]
WantedBy=multi-user.target
```

启用服务：

```bash
sudo systemctl daemon-reload
sudo systemctl enable ancientbuilding
sudo systemctl start ancientbuilding
sudo systemctl status ancientbuilding
```

### Nginx 反向代理示例

保存为 `/etc/nginx/sites-available/ancientbuilding`：

```nginx
server {
    listen 80;
    server_name your-domain.com;

    location / {
        proxy_pass http://127.0.0.1:8000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

启用并重载：

```bash
sudo ln -s /etc/nginx/sites-available/ancientbuilding /etc/nginx/sites-enabled/ancientbuilding
sudo nginx -t
sudo systemctl reload nginx
```

### HTTPS

```bash
sudo apt install -y certbot python3-certbot-nginx
sudo certbot --nginx -d your-domain.com
```

## 上线前检查

- `gunicorn -c gunicorn.conf.py wsgi:application` 能正常启动
- `/healthz` 返回 `{"status":"ok"}`
- 首页、专题页、详情页、互动页都能打开
- CSS、图片、JS 都能正常加载
- 域名和 HTTPS 已配置完成
