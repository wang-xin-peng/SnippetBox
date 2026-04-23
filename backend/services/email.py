"""
邮件服务
"""
import smtplib
import logging
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from typing import Optional

from config import settings

logger = logging.getLogger(__name__)


class EmailService:
    """邮件服务类"""

    def __init__(self):
        self.smtp_host = getattr(settings, 'SMTP_HOST', None)
        self.smtp_port = getattr(settings, 'SMTP_PORT', 465)
        self.smtp_user = getattr(settings, 'SMTP_USER', None)
        self.smtp_password = getattr(settings, 'SMTP_PASSWORD', None)
        self.from_email = getattr(settings, 'SMTP_FROM_EMAIL', self.smtp_user)
        self.enabled = all([self.smtp_host, self.smtp_user, self.smtp_password])

    def send_email(self, to_email: str, subject: str, body: str, body_type: str = 'plain') -> bool:
        """
        发送邮件
        返回: 是否发送成功
        """
        if not self.enabled:
            logger.warning(f"Email service not configured. Would send to {to_email}: {subject}")
            logger.info(f"Email body: {body}")
            return True

        try:
            msg = MIMEMultipart()
            msg['From'] = self.from_email
            msg['To'] = to_email
            msg['Subject'] = subject

            msg.attach(MIMEText(body, body_type, 'utf-8'))

            port = int(self.smtp_port)
            if port == 465:
                with smtplib.SMTP_SSL(self.smtp_host, port) as server:
                    server.login(self.smtp_user, self.smtp_password)
                    server.send_message(msg)
            else:
                with smtplib.SMTP(self.smtp_host, port) as server:
                    server.starttls()
                    server.login(self.smtp_user, self.smtp_password)
                    server.send_message(msg)

            logger.info(f"Email sent to {to_email}: {subject}")
            return True
        except Exception as e:
            logger.error(f"Failed to send email to {to_email}: {e}")
            return False

    def send_verification_code(self, to_email: str, code: str) -> bool:
        """发送验证码邮件"""
        subject = "SnippetBox 验证码"
        body = f"""
您好！

您的 SnippetBox 验证码是：

    {code}

验证码有效期为 5 分钟，请尽快完成验证。

如果您没有请求此验证码，请忽略此邮件。

- SnippetBox 团队
"""
        return self.send_email(to_email, subject, body)

    def send_reset_code(self, to_email: str, code: str) -> bool:
        """发送重置密码验证码邮件"""
        subject = "SnippetBox 重置密码验证码"
        body = f"""
您好！

您正在重置 SnippetBox 账户密码，验证码是：

    {code}

验证码有效期为 5 分钟，请尽快完成验证。

如果您没有请求重置密码，请忽略此邮件，您的账户不会被修改。

- SnippetBox 团队
"""
        return self.send_email(to_email, subject, body)


email_service = EmailService()
