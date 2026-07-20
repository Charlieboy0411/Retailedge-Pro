import os
import sys

def configure_nginx():
    print("Ensuring Nginx WebSocket /socket.io proxy is configured...")
    conf_files = [
        "/etc/nginx/sites-available/default",
        "/etc/nginx/sites-enabled/default",
        "/etc/nginx/conf.d/default.conf"
    ]
    target_file = None
    for cf in conf_files:
        if os.path.exists(cf):
            try:
                with open(cf, "r") as f:
                    if "location /api" in f.read():
                        target_file = cf
                        break
            except Exception as e:
                print(f"Could not read {cf}: {e}")

    if target_file:
        with open(target_file, "r") as f:
            content = f.read()

        if "/socket.io" not in content:
            socket_block = """
    location /socket.io/ {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "Upgrade";
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }

    location /uploads/ {
        proxy_pass http://localhost:5000;
        proxy_set_header Host $host;
    }
"""
            new_content = content.replace("location /api", socket_block + "\n    location /api", 1)
            tmp_path = "/tmp/nginx_updated.conf"
            with open(tmp_path, "w") as f:
                f.write(new_content)
            os.system(f"sudo mv {tmp_path} {target_file}")
            print(f"✅ Successfully updated Nginx configuration at {target_file}")
        else:
            print(f"ℹ️ /socket.io proxy already present in {target_file}")
    else:
        print("⚠️ Could not locate Nginx config containing 'location /api'")

if __name__ == "__main__":
    configure_nginx()
