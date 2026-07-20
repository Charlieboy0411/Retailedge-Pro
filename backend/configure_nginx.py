import os
import sys

def configure_nginx():
    print("🔍 Scanning /etc/nginx for active Nginx configuration files...")
    found_files = []
    
    # Recursively scan /etc/nginx/ for all configuration files
    for root, dirs, files in os.walk("/etc/nginx"):
        for file in files:
            filepath = os.path.join(root, file)
            # Check config files and site configs
            if filepath.endswith(('.conf', 'default')) or 'sites-' in root:
                try:
                    with open(filepath, 'r', encoding='utf-8', errors='ignore') as f:
                        content = f.read()
                        if 'location /api' in content or 'proxy_pass' in content or 'location /' in content:
                            found_files.append((filepath, content))
                except Exception as e:
                    print(f"Could not read {filepath}: {e}")

    print(f"Found {len(found_files)} Nginx config files to inspect: {[f[0] for f in found_files]}")

    updated = False
    for filepath, content in found_files:
        if "/socket.io" not in content and ('location /api' in content or 'location /' in content):
            print(f"⚡ Injecting /socket.io WebSocket proxy into {filepath}...")
            socket_block = """
    # Proxy WebSockets for QuizHive Live Engine
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
"""
            if 'location /api' in content:
                new_content = content.replace('location /api', socket_block + '\n    location /api', 1)
            elif 'location /' in content:
                new_content = content.replace('location /', socket_block + '\n    location /', 1)
            else:
                continue

            tmp_path = "/tmp/nginx_patch.conf"
            try:
                with open(tmp_path, "w", encoding='utf-8') as f:
                    f.write(new_content)
                os.system(f"sudo mv {tmp_path} {filepath}")
                print(f"✅ Successfully patched Nginx config: {filepath}")
                updated = True
            except Exception as e:
                print(f"Failed to write patch to {filepath}: {e}")

    if not updated:
        print("⚠️ No config was updated inline. Creating fallback /etc/nginx/conf.d/quizhive_sockets.conf...")
        fallback = """
server {
    listen 80;
    server_name _;

    location /socket.io/ {
        proxy_pass http://127.0.0.1:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "Upgrade";
        proxy_set_header Host $host;
    }
}
"""
        try:
            with open("/tmp/quizhive_sockets.conf", "w") as f:
                f.write(fallback)
            os.system("sudo mv /tmp/quizhive_sockets.conf /etc/nginx/conf.d/quizhive_sockets.conf")
            print("✅ Created /etc/nginx/conf.d/quizhive_sockets.conf")
        except Exception as e:
            print(f"Failed to create fallback config: {e}")

if __name__ == "__main__":
    configure_nginx()
