"""Portfolio contact form: validates a message and publishes it to an SNS topic,
which emails it to me. Called through a Lambda Function URL from the site."""
import json, os, re
import boto3

sns = boto3.client("sns")
TOPIC = os.environ["TOPIC_ARN"]
ORIGINS = [o for o in os.environ.get("ALLOWED_ORIGINS", "").split(",") if o]
EMAIL = re.compile(r"^[^@\s]{1,64}@[^@\s]{1,255}\.[^@\s]{2,}$")


def reply(code, body, origin=""):
    headers = {"Content-Type": "application/json"}
    if origin in ORIGINS:
        headers["Access-Control-Allow-Origin"] = origin
        headers["Vary"] = "Origin"
    return {"statusCode": code, "headers": headers, "body": json.dumps(body)}


def handler(event, context):
    origin = (event.get("headers") or {}).get("origin", "")
    if origin not in ORIGINS:
        return reply(403, {"ok": False, "error": "forbidden"})
    try:
        data = json.loads(event.get("body") or "{}")
    except ValueError:
        return reply(400, {"ok": False, "error": "bad request"}, origin)
    if data.get("website"):  # honeypot field: real people leave it empty
        return reply(200, {"ok": True}, origin)
    name = str(data.get("name", "")).strip()[:80]
    email = str(data.get("email", "")).strip()[:200]
    message = str(data.get("message", "")).strip()[:2000]
    if not name or not message or not EMAIL.match(email):
        return reply(400, {"ok": False, "error": "Please fill in your name, a valid email and a message."}, origin)
    sns.publish(
        TopicArn=TOPIC,
        Subject=("Portfolio message from " + name)[:100],
        Message="From: %s <%s>\n\n%s\n\n(sent from the portfolio contact form)" % (name, email, message),
    )
    return reply(200, {"ok": True}, origin)
