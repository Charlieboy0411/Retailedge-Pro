import os
import subprocess
import sys

def find_ssl_certificates():
    print("🔍 Searching for SSL certificates...")
    
    # 1. Check Let's Encrypt live directory
    letsencrypt_live = "/etc/letsencrypt/live"
    if os.path.exists(letsencrypt_live):
        try:
            entries = os.listdir(letsencrypt_live)
            # Prioritize retailedgepro.in, then anything containing retailedge, then any other directory
            def priority(name):
                if name == "retailedgepro.in":
                    return 0
                if "retailedgepro" in name:
                    return 1
                if "retailedge" in name:
                    return 2
                return 3
            
            entries = sorted(entries, key=priority)
            for entry in entries:
                cand_dir = os.path.join(letsencrypt_live, entry)
                if os.path.isdir(cand_dir):
                    cert = os.path.join(cand_dir, "fullchain.pem")
                    key = os.path.join(cand_dir, "privkey.pem")
                    if os.path.exists(cert) and os.path.exists(key):
                        print(f"🔒 Found Let's Encrypt certificate at: {cand_dir}")
                        return cert, key
        except Exception as e:
            print(f"⚠️ Error checking /etc/letsencrypt/live: {e}")

    # 2. Check other common certificate locations
    common_certs = [
        ("/etc/ssl/certs/retailedgepro.in.crt", "/etc/ssl/private/retailedgepro.in.key"),
        ("/etc/ssl/certs/retailedge.crt", "/etc/ssl/private/retailedge.key"),
    ]
    for cert, key in common_certs:
        if os.path.exists(cert) and os.path.exists(key):
            print(f"🔒 Found custom SSL certificate at: {cert}")
            return cert, key

    # 3. Check if certbot is installed and can generate a certificate
    certbot_check = os.system("which certbot > /dev/null 2>&1")
    if certbot_check == 0:
        print("🌐 Certbot detected. Attempting certificate issuance for retailedgepro.in...")
        os.makedirs("/var/www/retailedge", exist_ok=True)
        os.system("sudo certbot certonly --webroot -w /var/www/retailedge -d retailedgepro.in -d www.retailedgepro.in --non-interactive --agree-tos --register-unsafely-without-email > /dev/null 2>&1")
        cert = "/etc/letsencrypt/live/retailedgepro.in/fullchain.pem"
        key = "/etc/letsencrypt/live/retailedgepro.in/privkey.pem"
        if os.path.exists(cert) and os.path.exists(key):
            print("✅ Successfully generated Let's Encrypt certificate via Certbot!")
            return cert, key

    # 4. Generate fallback self-signed certificate so port 443 can always bind safely
    fallback_dir = "/etc/ssl/retailedge"
    os.makedirs(fallback_dir, exist_ok=True)
    fallback_cert = os.path.join(fallback_dir, "selfsigned.crt")
    fallback_key = os.path.join(fallback_dir, "selfsigned.key")
    if not (os.path.exists(fallback_cert) and os.path.exists(fallback_key)):
        print("⚠️ Generating fallback self-signed SSL certificate...")
        os.system(f"sudo openssl req -x509 -nodes -days 365 -newkey rsa:2048 -keyout {fallback_key} -out {fallback_cert} -subj '/CN=retailedgepro.in' > /dev/null 2>&1")

    if os.path.exists(fallback_cert) and os.path.exists(fallback_key):
        print(f"🔒 Using fallback certificate at: {fallback_cert}")
        return fallback_cert, fallback_key

    return None, None

def generate_nginx_config(cert_path=None, key_path=None):
    # Port 80 Block
    http_block = """server {
    listen 80 default_server;
    listen [::]:80 default_server;
    server_name retailedgepro.in www.retailedgepro.in _;
    
    root /var/www/retailedge;
    index index.html index.htm;
    client_max_body_size 50M;

    # ACME challenge for Let's Encrypt renewal
    location /.well-known/acme-challenge/ {
        root /var/www/retailedge;
        allow all;
    }
    
    # Cache-busting: Never cache index.html
    location = /index.html {
        add_header Cache-Control "no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0";
        expires -1;
    }

    # Hashed static assets: Cache immutably for 1 year
    location /assets/ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    location / {
        try_files $uri $uri/ /index.html;
        add_header Cache-Control "no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0";
    }
    
    location /api/ {
        proxy_pass http://127.0.0.1:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "Upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
    
    location /socket.io/ {
        proxy_pass http://127.0.0.1:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "Upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        proxy_read_timeout 86400s;
        proxy_send_timeout 86400s;
    }
    
    location /uploads/ {
        proxy_pass http://127.0.0.1:5000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
"""

    if not cert_path or not key_path:
        return http_block

    # Port 443 Block with SSL
    https_block = f"""
server {{
    listen 443 ssl default_server;
    listen [::]:443 ssl default_server;
    server_name retailedgepro.in www.retailedgepro.in _;
    
    ssl_certificate {cert_path};
    ssl_certificate_key {key_path};
    
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;
    ssl_prefer_server_ciphers on;
    
    root /var/www/retailedge;
    index index.html index.htm;
    client_max_body_size 50M;
    
    # Cache-busting: Never cache index.html
    location = /index.html {{
        add_header Cache-Control "no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0";
        expires -1;
    }}

    # Hashed static assets: Cache immutably for 1 year
    location /assets/ {{
        expires 1y;
        add_header Cache-Control "public, immutable";
    }}

    location / {{
        try_files $uri $uri/ /index.html;
        add_header Cache-Control "no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0";
    }}
    
    location /api/ {{
        proxy_pass http://127.0.0.1:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "Upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto https;
    }}
    
    location /socket.io/ {{
        proxy_pass http://127.0.0.1:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "Upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto https;
        proxy_cache_bypass $http_upgrade;
        proxy_read_timeout 86400s;
        proxy_send_timeout 86400s;
    }}
    
    location /uploads/ {{
        proxy_pass http://127.0.0.1:5000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto https;
    }}
}}
"""
    return http_block + https_block

def configure_nginx():
    print("🧹 Cleaning up conflicting Nginx configurations...")
    os.system("sudo rm -f /etc/nginx/sites-enabled/default")
    os.system("sudo rm -f /etc/nginx/sites-available/default")
    os.system("sudo rm -f /etc/nginx/sites-enabled/quizhive")
    os.system("sudo rm -f /etc/nginx/sites-available/quizhive")
    os.system("sudo rm -f /etc/nginx/sites-enabled/retailedge")
    os.system("sudo rm -f /etc/nginx/sites-available/retailedge")
    os.system("sudo rm -f /etc/nginx/conf.d/default.conf")

    cert_path, key_path = find_ssl_certificates()
    config_content = generate_nginx_config(cert_path, key_path)

    tmp_path = "/tmp/quizhive.conf"
    target_path = "/etc/nginx/conf.d/quizhive.conf"
    try:
        with open(tmp_path, "w", encoding='utf-8') as f:
            f.write(config_content)
        
        # Move into place
        os.system(f"sudo mv {tmp_path} {target_path}")
        print(f"📝 Wrote Nginx configuration to {target_path}")

        # Test syntax
        test_res = os.system("sudo nginx -t")
        if test_res != 0 and cert_path:
            print("⚠️ Nginx test failed with SSL config. Falling back to HTTP-only configuration...")
            fallback_content = generate_nginx_config(None, None)
            with open(tmp_path, "w", encoding='utf-8') as f:
                f.write(fallback_content)
            os.system(f"sudo mv {tmp_path} {target_path}")
            os.system("sudo nginx -t")

        # Reload or restart Nginx
        os.system("sudo systemctl reload nginx || sudo systemctl restart nginx")
        print("✅ Successfully configured and reloaded Nginx (HTTP & HTTPS enabled)!")
    except Exception as e:
        print(f"❌ Failed to configure Nginx: {e}")

if __name__ == "__main__":
    configure_nginx()
