#!/bin/bash
# 服务器一次性初始化脚本
# 适用：Ubuntu 24.04 / 阿里云 ECS
# 用法：bash setup-server.sh

set -e

DOMAIN="api-accounts.aitrealmaker.top"
EMAIL="eee1490581303@gmail.com"

echo "=== [1/5] 安装 Docker ==="
if ! command -v docker &>/dev/null; then
  apt-get update -y
  apt-get install -y ca-certificates curl
  install -m 0755 -d /etc/apt/keyrings
  curl -fsSL https://mirrors.aliyun.com/docker-ce/linux/ubuntu/gpg \
    -o /etc/apt/keyrings/docker.asc
  chmod a+r /etc/apt/keyrings/docker.asc
  echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.asc] \
    https://mirrors.aliyun.com/docker-ce/linux/ubuntu \
    $(. /etc/os-release && echo "$VERSION_CODENAME") stable" \
    > /etc/apt/sources.list.d/docker.list
  apt-get update -y
  apt-get install -y docker-ce docker-ce-cli containerd.io docker-compose-plugin
  systemctl enable docker
  systemctl start docker
  echo "Docker 安装完成"
else
  echo "Docker 已安装，跳过"
fi

echo "=== [2/5] 安装 Nginx ==="
if ! command -v nginx &>/dev/null; then
  apt-get update -y
  apt-get install -y nginx
  systemctl enable nginx
  systemctl start nginx
  echo "Nginx 安装完成"
else
  echo "Nginx 已安装，跳过"
fi

echo "=== [3/5] 安装 Certbot ==="
if ! command -v certbot &>/dev/null; then
  apt-get update -y
  apt-get install -y certbot python3-certbot-nginx
  echo "Certbot 安装完成"
else
  echo "Certbot 已安装，跳过"
fi

echo "=== [4/5] 申请 SSL 证书：$DOMAIN ==="
if [ ! -f "/etc/letsencrypt/live/$DOMAIN/fullchain.pem" ]; then
  # 临时开放 80 端口配置用于 ACME 验证
  cat > /etc/nginx/sites-available/temp-acme <<EOF
server {
    listen 80;
    server_name $DOMAIN;
    location / { return 200 'ok'; }
}
EOF
  ln -sf /etc/nginx/sites-available/temp-acme /etc/nginx/sites-enabled/temp-acme
  nginx -t && nginx -s reload

  certbot certonly --nginx \
    -d "$DOMAIN" \
    --email "$EMAIL" \
    --agree-tos \
    --non-interactive

  rm -f /etc/nginx/sites-enabled/temp-acme /etc/nginx/sites-available/temp-acme
  echo "证书申请成功"
else
  echo "证书已存在，跳过"
fi

echo "=== [5/5] 配置证书自动续签 ==="
# certbot 安装时已自动创建 systemd timer，确认它启用
systemctl enable certbot.timer
systemctl start certbot.timer
echo "自动续签已启用 (systemd certbot.timer)"

echo ""
echo "=== 初始化完成 ==="
echo "域名：$DOMAIN"
echo "证书路径：/etc/letsencrypt/live/$DOMAIN/"
echo "后续步骤：将 GitHub Secrets 配置好后，push 代码即可自动部署"
