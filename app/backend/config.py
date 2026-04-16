import os
from dotenv import load_dotenv
load_dotenv(os.path.join(os.path.dirname(__file__), '.env'))

MYSQL_HOST = os.environ.get('MYSQL_HOST', 'localhost')
MYSQL_USER = os.environ.get('MYSQL_USER', 'root')
MYSQL_PASSWORD = os.environ.get('MYSQL_PASSWORD', 'root')
MYSQL_DB = os.environ.get('MYSQL_DB', 'iitgn_connect')

JWT_SECRET_KEY = 'iitgn-connect-jwt-secret-cs432-2026'
JWT_ACCESS_TOKEN_EXPIRES = 86400  # 24 hours in seconds

# Email / SMTP config (Gmail)
SMTP_HOST = os.environ.get('SMTP_HOST', 'smtp.gmail.com')
SMTP_PORT = int(os.environ.get('SMTP_PORT', 587))
SMTP_EMAIL = os.environ.get('SMTP_EMAIL', 'anonymous.cse.iitgn@gmail.com')
SMTP_PASSWORD = os.environ.get('SMTP_PASSWORD', '')
OTP_EXPIRY_MINUTES = 10
