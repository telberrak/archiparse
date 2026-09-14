"""
Service d'envoi d'e-mails (SMTP)

Utilisé pour l'e-mail de réinitialisation de mot de passe. Configuration via
variables d'environnement (voir app/core/config.py et backend/.env.example).
N'échoue jamais bruyamment : un problème SMTP (identifiants non configurés,
serveur injoignable) est loggé mais ne doit jamais faire échouer une requête
HTTP — voir auth.py (l'endpoint « mot de passe oublié » renvoie toujours un
message générique, que l'e-mail parte réellement ou non).
"""

import smtplib
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText

from app.core.config import settings


class EmailService:
    def send_password_reset_email(self, to_email: str, reset_url: str) -> bool:
        subject = "Réinitialisation de votre mot de passe — Archiparse"
        html_body = f"""
        <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto;">
          <h2 style="color: #1f2430;">Réinitialisation de mot de passe</h2>
          <p>Vous avez demandé la réinitialisation de votre mot de passe Archiparse.</p>
          <p>
            <a href="{reset_url}" style="display: inline-block; padding: 10px 20px; background: #4f46e5; color: #fff; text-decoration: none; border-radius: 6px;">
              Réinitialiser mon mot de passe
            </a>
          </p>
          <p style="color: #8a8f98; font-size: 13px;">
            Ce lien expire dans 1 heure. Si vous n'êtes pas à l'origine de cette demande, ignorez cet e-mail.
          </p>
        </div>
        """
        return self._send(to_email, subject, html_body)

    def _send(self, to_email: str, subject: str, html_body: str) -> bool:
        if not settings.SMTP_USERNAME or not settings.SMTP_PASSWORD:
            print(f"[email_service] SMTP non configuré — e-mail à {to_email} non envoyé (voir backend/.env)")
            return False

        message = MIMEMultipart("alternative")
        message["Subject"] = subject
        message["From"] = settings.SMTP_FROM_EMAIL or settings.SMTP_USERNAME
        message["To"] = to_email
        message.attach(MIMEText(html_body, "html"))

        try:
            with smtplib.SMTP(settings.SMTP_HOST, settings.SMTP_PORT, timeout=10) as server:
                if settings.SMTP_USE_TLS:
                    server.starttls()
                server.login(settings.SMTP_USERNAME, settings.SMTP_PASSWORD)
                server.sendmail(message["From"], [to_email], message.as_string())
            return True
        except Exception as e:
            print(f"[email_service] Échec de l'envoi à {to_email}: {e}")
            return False


email_service = EmailService()
