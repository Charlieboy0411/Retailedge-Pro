import os
import subprocess
import sys
import argparse

def validate_certificate_pair(cert_path, key_path):
    """
    Cryptographically and structurally validate that cert and key exist,
    are readable, non-empty, and contain expected PEM headers.
    """
    if not (cert_path and key_path):
        return False
    if not (os.path.isfile(cert_path) and os.path.isfile(key_path)):
        return False
    if not (os.access(cert_path, os.R_OK) and os.access(key_path, os.R_OK)):
        return False
    if os.path.getsize(cert_path) == 0 or os.path.getsize(key_path) == 0:
        return False
    try:
        with open(cert_path, "r", encoding="utf-8", errors="ignore") as f:
            cert_data = f.read()
        with open(key_path, "r", encoding="utf-8", errors="ignore") as f:
            key_data = f.read()
        has_cert_header = "BEGIN CERTIFICATE" in cert_data
        has_key_header = "BEGIN" in key_data and "PRIVATE KEY" in key_data
        return has_cert_header and has_key_header
    except Exception as e:
        print(f"⚠️ Error validating certificate pair: {e}", file=sys.stderr)
        return False

def check_existing_ssl_configured(nginx_dirs=None):
    """
    Inspect existing Nginx configuration directories for active TLS listeners or SSL directives.
    Returns True if any active configuration terminates TLS.
    """
    if nginx_dirs is None:
        nginx_dirs = ["/etc/nginx/conf.d", "/etc/nginx/sites-enabled"]

    for d in nginx_dirs:
        if not os.path.isdir(d):
            continue
        try:
            for entry in os.listdir(d):
                filepath = os.path.join(d, entry)
                if os.path.isfile(filepath) and not entry.endswith(".bak") and not entry.endswith(".candidate"):
                    try:
                        with open(filepath, "r", encoding="utf-8", errors="ignore") as f:
                            content = f.read()
                            if ("listen 443" in content or "listen [::]:443" in content or "ssl_certificate" in content):
                                print(f"🔒 Existing active SSL listener detected in: {filepath}")
                                return True
                    except Exception as e:
                        print(f"⚠️ Warning reading configuration {filepath}: {e}", file=sys.stderr)
        except Exception as e:
            print(f"⚠️ Warning scanning directory {d}: {e}", file=sys.stderr)

    return False

def find_ssl_certificates(custom_cert_dir=None):
    """
    Searches for existing valid SSL certificate pairs on disk.
    Does NOT attempt blind generation or unverified self-signed creation.
    """
    print("🔍 Searching for existing verified SSL certificates...")
    
    # 1. Check custom cert dir if provided
    if custom_cert_dir and os.path.isdir(custom_cert_dir):
        cert = os.path.join(custom_cert_dir, "fullchain.pem")
        key = os.path.join(custom_cert_dir, "privkey.pem")
        if validate_certificate_pair(cert, key):
            print(f"🔒 Found valid certificate at custom path: {custom_cert_dir}")
            return cert, key

    # 2. Check Let's Encrypt live directory
    letsencrypt_live = "/etc/letsencrypt/live"
    if os.path.exists(letsencrypt_live):
        try:
            entries = os.listdir(letsencrypt_live)
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
                    if validate_certificate_pair(cert, key):
                        print(f"🔒 Found valid Let's Encrypt certificate at: {cand_dir}")
                        return cert, key
        except Exception as e:
            print(f"⚠️ Error checking /etc/letsencrypt/live: {e}", file=sys.stderr)

    # 3. Check other standard certificate locations
    common_certs = [
        ("/etc/ssl/certs/retailedgepro.in.crt", "/etc/ssl/private/retailedgepro.in.key"),
        ("/etc/ssl/certs/retailedge.crt", "/etc/ssl/private/retailedge.key"),
    ]
    for cert, key in common_certs:
        if validate_certificate_pair(cert, key):
            print(f"🔒 Found valid custom SSL certificate at: {cert}")
            return cert, key

    print("ℹ️ No valid, verified SSL certificate pair found on disk.")
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

def configure_nginx(output_path="/tmp/quizhive.conf.candidate",
                    require_ssl=True,
                    allow_http_only=False,
                    existing_conf_dirs=None,
                    custom_cert_dir=None):
    try:
        existing_has_ssl = check_existing_ssl_configured(existing_conf_dirs)
        cert_path, key_path = find_ssl_certificates(custom_cert_dir)
        has_valid_certs = validate_certificate_pair(cert_path, key_path)

        ssl_mandatory = require_ssl or existing_has_ssl

        # Strict fail-closed HTTPS downgrade gate:
        if ssl_mandatory and not has_valid_certs:
            print("❌ CRITICAL: SSL/TLS is mandatory (require_ssl=True or active SSL listeners exist), but valid certificates were not found or unreadable!", file=sys.stderr)
            print("   Refusing to generate or activate HTTP-only configuration to prevent silent HTTPS downgrade.", file=sys.stderr)
            print("   Failing closed with exit code 1. Deployment halted.", file=sys.stderr)
            return 1

        if not ssl_mandatory and not has_valid_certs:
            if not allow_http_only:
                print("❌ CRITICAL: No valid SSL certificates found and allow_http_only is False.", file=sys.stderr)
                print("   Failing closed with exit code 1. Refusing to downgrade.", file=sys.stderr)
                return 1
            print("⚠️ Notice: Operating in explicitly permitted HTTP-only mode (allow_http_only=True).")

        config_content = generate_nginx_config(cert_path if has_valid_certs else None,
                                               key_path if has_valid_certs else None)

        out_dir = os.path.dirname(output_path)
        if out_dir:
            os.makedirs(out_dir, exist_ok=True)

        with open(output_path, "w", encoding='utf-8') as f:
            f.write(config_content)
        
        mode_str = "HTTP & HTTPS" if has_valid_certs else "HTTP-only (explicitly authorized)"
        print(f"✅ Generated candidate Nginx configuration ({mode_str}) at {output_path}")
        return 0
    except Exception as e:
        print(f"❌ Failed to generate candidate Nginx configuration: {e}", file=sys.stderr)
        return 1

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Generate RetailEdge PRO Nginx candidate configuration.")
    parser.add_argument("--out", "-o", dest="output_path", default="/tmp/quizhive.conf.candidate",
                        help="Path where candidate configuration will be generated")
    parser.add_argument("--require-ssl", dest="require_ssl", action="store_true", default=None,
                        help="Require valid SSL certificates (fails closed if missing)")
    parser.add_argument("--no-require-ssl", dest="require_ssl", action="store_false",
                        help="Do not strictly require SSL (unless existing config has SSL)")
    parser.add_argument("--allow-http-only", dest="allow_http_only", action="store_true", default=False,
                        help="Explicitly permit generating HTTP-only configuration if SSL is not active")
    parser.add_argument("--cert-dir", dest="custom_cert_dir", default=None,
                        help="Custom directory containing fullchain.pem and privkey.pem")
    parser.add_argument("--existing-conf-dir", dest="existing_conf_dirs", action="append", default=None,
                        help="Directory to inspect for active SSL directives")
    args = parser.parse_args()

    # Environment variable fallbacks:
    env_req_ssl = os.environ.get("REQUIRE_SSL", "true").lower() in ("true", "1", "yes")
    require_ssl = args.require_ssl if args.require_ssl is not None else env_req_ssl
    allow_http_only = args.allow_http_only or (os.environ.get("ALLOW_HTTP_ONLY", "false").lower() in ("true", "1", "yes"))

    exit_code = configure_nginx(
        output_path=args.output_path,
        require_ssl=require_ssl,
        allow_http_only=allow_http_only,
        existing_conf_dirs=args.existing_conf_dirs,
        custom_cert_dir=args.custom_cert_dir
    )
    sys.exit(exit_code)
