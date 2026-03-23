import json
from datetime import datetime, timezone
from urllib import request
from urllib.parse import urlparse
from urllib.error import HTTPError, URLError
from core.config import Config


def is_valid_discord_webhook_url(webhook_url: str) -> bool:
    if not webhook_url:
        return False

    parsed = urlparse(webhook_url)
    return (
        parsed.scheme in ('http', 'https')
        and parsed.netloc in ('discord.com', 'canary.discord.com', 'ptb.discord.com', 'discordapp.com')
        and '/api/webhooks/' in parsed.path
    )


def _masked_webhook_reference(webhook_url: str) -> str | None:
    if not webhook_url:
        return None

    parsed = urlparse(webhook_url)
    parts = [part for part in parsed.path.split('/') if part]
    if len(parts) < 4 or parts[0] != 'api' or parts[1] != 'webhooks':
        return None

    webhook_id = parts[2]
    token = parts[3]
    token_tail = token[-6:] if len(token) >= 6 else token
    return f'{webhook_id}:***{token_tail}'


def _send_discord_webhook(webhook_url: str, payload: dict):
    if not webhook_url:
        return False, 'Webhook URL is not configured'

    if not is_valid_discord_webhook_url(webhook_url):
        message = 'Webhook URL is not a valid Discord webhook endpoint'
        print(f'Discord webhook skipped: {message}.')
        return False, message

    def _post(post_payload: dict):
        req = request.Request(
            webhook_url,
            data=json.dumps(post_payload).encode('utf-8'),
            headers={
                'Content-Type': 'application/json',
                'Accept': '*/*',
                'User-Agent': 'FLIRT-Webhook/1.0 (+https://discord.gg/TWPsZHvhH3)',
            },
            method='POST',
        )
        with request.urlopen(req, timeout=8) as response:
            response.read()

    try:
        _post(payload)
        return True, None
    except HTTPError as exc:
        response_body = ''
        discord_message = ''
        discord_code = None
        try:
            response_body = exc.read().decode('utf-8', errors='ignore')
            if response_body:
                parsed_body = json.loads(response_body)
                discord_message = parsed_body.get('message', '')
                discord_code = parsed_body.get('code')
        except Exception:
            response_body = ''

        if exc.code == 403:
            message = 'HTTP 403 Forbidden: invalid webhook, missing channel permissions, or webhook disabled'
            if discord_message:
                message = f"{message} (Discord: {discord_message}{f' | code={discord_code}' if discord_code is not None else ''})"
            elif response_body:
                message = f'{message} (response: {response_body[:200]})'

            has_embed_payload = isinstance(payload, dict) and bool(payload.get('embeds'))
            if has_embed_payload:
                fallback_payload = {
                    'username': payload.get('username', 'FLIRT Notifications'),
                    'content': 'FLIRT notification fallback: embed blocked by channel permissions. Please enable Embed Links for this webhook.',
                }
                try:
                    _post(fallback_payload)
                    fallback_message = f'{message} (fallback content-only message sent successfully)'
                    print(f'Discord webhook fallback sent ({fallback_message}).')
                    return True, fallback_message
                except Exception:
                    pass

            print(f'Discord webhook failed ({message}).')
            return False, message
        else:
            message = f'HTTP {exc.code}: {exc.reason}'
            if discord_message:
                message = f"{message} (Discord: {discord_message}{f' | code={discord_code}' if discord_code is not None else ''})"
            elif response_body:
                message = f'{message} (response: {response_body[:200]})'
            print(f"Discord webhook HTTP error ({exc.code}): {exc.reason}")
            return False, message
    except URLError as exc:
        message = f'Network error: {exc.reason}'
        print(f"Discord webhook network error: {exc.reason}")
        return False, message
    except Exception as exc:
        message = f'Unexpected error: {exc}'
        print(f"Discord webhook send failed: {exc}")
        return False, message


def send_discord_notification(title: str, description: str, audience: str = 'both', fields: list | None = None):
    fields = fields or []

    embed = {
        'title': title,
        'description': description,
        'color': 2103031,
        'timestamp': datetime.now(timezone.utc).isoformat(),
        'fields': fields,
    }

    payload = {
        'username': 'FLIRT Notifications',
        'embeds': [embed],
    }

    admin_webhook = Config.DISCORD_ADMIN_WEBHOOK_URL
    user_webhook = Config.DISCORD_USER_WEBHOOK_URL

    if audience in ('admin', 'both') and admin_webhook:
        _send_discord_webhook(admin_webhook, payload)

    if audience in ('users', 'both') and user_webhook:
        _send_discord_webhook(user_webhook, payload)


def test_discord_webhooks() -> dict:
    title = 'FLIRT Webhook Test'
    description = 'This is a test notification from the admin webhook test endpoint.'
    fields = [
        {'name': 'Source', 'value': 'sift/admin/test-webhooks', 'inline': True},
        {'name': 'Environment', 'value': 'development', 'inline': True},
    ]

    embed = {
        'title': title,
        'description': description,
        'color': 2103031,
        'timestamp': datetime.now(timezone.utc).isoformat(),
        'fields': fields,
    }

    payload = {
        'username': 'FLIRT Notifications',
        'embeds': [embed],
    }

    admin_ok, admin_error = _send_discord_webhook(Config.DISCORD_ADMIN_WEBHOOK_URL, payload)
    user_ok, user_error = _send_discord_webhook(Config.DISCORD_USER_WEBHOOK_URL, payload)

    return {
        'admin': {
            'configured': bool(Config.DISCORD_ADMIN_WEBHOOK_URL),
            'valid_format': is_valid_discord_webhook_url(Config.DISCORD_ADMIN_WEBHOOK_URL or ''),
            'webhook_ref': _masked_webhook_reference(Config.DISCORD_ADMIN_WEBHOOK_URL or ''),
            'success': admin_ok,
            'error': admin_error,
        },
        'users': {
            'configured': bool(Config.DISCORD_USER_WEBHOOK_URL),
            'valid_format': is_valid_discord_webhook_url(Config.DISCORD_USER_WEBHOOK_URL or ''),
            'webhook_ref': _masked_webhook_reference(Config.DISCORD_USER_WEBHOOK_URL or ''),
            'success': user_ok,
            'error': user_error,
        },
    }
