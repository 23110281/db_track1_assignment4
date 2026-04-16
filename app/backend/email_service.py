import random
import string
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from datetime import datetime, timedelta
from config import SMTP_HOST, SMTP_PORT, SMTP_EMAIL, SMTP_PASSWORD, OTP_EXPIRY_MINUTES

# In-memory OTP store: { email: { code, expires_at, verified, created_at } }
_otp_store = {}

def generate_otp(length=6):
    """Generate a random 6-digit OTP"""
    return ''.join(random.choices(string.digits, k=length))

def send_otp_email(email, otp):
    """Send OTP email via Gmail SMTP"""
    subject = "IITGN Connect - Email Verification OTP"

    html_body = f"""
    <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 480px; margin: 0 auto; padding: 2rem; background: #f8fafc; border-radius: 12px;">
        <div style="text-align: center; margin-bottom: 1.5rem;">
            <h1 style="color: #1e3a5f; margin: 0;">IITGN Connect</h1>
            <p style="color: #64748b; font-size: 0.9rem;">Campus Community Platform</p>
        </div>
        <div style="background: white; padding: 2rem; border-radius: 8px; border: 1px solid #e2e8f0;">
            <p style="color: #334155; font-size: 1rem;">Your verification code is:</p>
            <div style="text-align: center; margin: 1.5rem 0;">
                <span style="font-size: 2.5rem; font-weight: 800; letter-spacing: 8px; color: #4F46E5; background: #EEF2FF; padding: 0.75rem 1.5rem; border-radius: 8px; display: inline-block;">{otp}</span>
            </div>
            <p style="color: #64748b; font-size: 0.85rem;">This code expires in {OTP_EXPIRY_MINUTES} minutes.</p>
            <p style="color: #64748b; font-size: 0.85rem;">If you didn't request this, please ignore this email.</p>
        </div>
        <p style="text-align: center; color: #94a3b8; font-size: 0.75rem; margin-top: 1rem;">&copy; 2026 IITGN Connect &middot; CS432 Databases</p>
    </div>
    """

    msg = MIMEMultipart('alternative')
    msg['Subject'] = subject
    msg['From'] = f'IITGN Connect <{SMTP_EMAIL}>'
    msg['To'] = email
    msg.attach(MIMEText(f'Your IITGN Connect verification OTP is: {otp}\nExpires in {OTP_EXPIRY_MINUTES} minutes.', 'plain'))
    msg.attach(MIMEText(html_body, 'html'))

    try:
        with smtplib.SMTP(SMTP_HOST, SMTP_PORT) as server:
            server.starttls()
            server.login(SMTP_EMAIL, SMTP_PASSWORD)
            server.send_message(msg)
        return True
    except Exception as e:
        print(f"Email send error: {e}")
        return False

def create_otp(email):
    """Generate OTP, store in memory, send email. Returns (success, message)"""
    if not email.endswith('@iitgn.ac.in'):
        return False, 'Only @iitgn.ac.in email addresses are allowed'

    # Rate limit: check if a recent OTP was sent less than 60s ago
    existing = _otp_store.get(email)
    if existing and (datetime.now() - existing['created_at']).total_seconds() < 60:
        return False, 'Please wait before requesting another OTP'

    otp = generate_otp()

    # Store in memory
    _otp_store[email] = {
        'code': otp,
        'expires_at': datetime.now() + timedelta(minutes=OTP_EXPIRY_MINUTES),
        'verified': False,
        'created_at': datetime.now(),
    }

    # Send email
    sent = send_otp_email(email, otp)
    if not sent:
        return False, 'Failed to send verification email. Please try again.'

    return True, 'OTP sent successfully'

def verify_otp(email, otp_code):
    """Verify OTP code from in-memory store. Returns (success, message)"""
    record = _otp_store.get(email)

    if not record or record['code'] != otp_code:
        return False, 'Invalid OTP code'

    if datetime.now() > record['expires_at']:
        del _otp_store[email]
        return False, 'OTP has expired. Please request a new one.'

    # Mark as verified
    record['verified'] = True
    return True, 'Email verified successfully'

def is_email_verified(email):
    """Check if an email has been verified via OTP"""
    record = _otp_store.get(email)
    return record is not None and record['verified']

def clear_otp(email):
    """Remove OTP record after successful registration"""
    _otp_store.pop(email, None)
