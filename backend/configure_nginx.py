import os

def configure_nginx():
    print("🧹 Cleaning up old Nginx configurations...")
    # Remove potentially broken or competing configurations
    os.system("sudo rm -f /etc/nginx/sites-enabled/default")
    os.system("sudo rm -f /etc/nginx/sites-available/default")
    os.system("sudo rm -f /etc/nginx/sites-enabled/quizhive")
    os.system("sudo rm -f /etc/nginx/sites-available/quizhive")
    os.system("sudo rm -f /etc/nginx/sites-enabled/retailedge")
    os.system("sudo rm -f /etc/nginx/sites-available/retailedge")
    os.system("sudo rm -f /etc/nginx/conf.d/default.conf")
    
    print("📝 Writing clean Nginx configuration for QuizHive...")
    config = """
server {
    listen 80 default_server;
    listen [::]:80 default_server;
    server_name _;
    
    root /var/www/retailedge;
    index index.html index.htm;
    
    location / {
        try_files $uri $uri/ /index.html;
    }
    
    location /api/ {
        proxy_pass http://127.0.0.1:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "Upgrade";
        proxy_set_header Host $host;
    }
    
    location /socket.io/ {
        proxy_pass http://127.0.0.1:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "Upgrade";
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
    
    location /uploads/ {
        proxy_pass http://127.0.0.1:5000;
        proxy_set_header Host $host;
    }
}
"""
    tmp_path = "/tmp/quizhive.conf"
    try:
        with open(tmp_path, "w", encoding='utf-8') as f:
            f.write(config)
        os.system(f"sudo mv {tmp_path} /etc/nginx/conf.d/quizhive.conf")
        print("✅ Successfully installed new Nginx config at /etc/nginx/conf.d/quizhive.conf")
    except Exception as e:
        print(f"❌ Failed to write new config: {e}")

if __name__ == "__main__":
    configure_nginx()
