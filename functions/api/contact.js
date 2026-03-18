export async function onRequestPost(context) {
  try {
    const { request, env } = context;

    const formData = await request.formData();

    const name = String(formData.get("name") || "").trim();
    const email = String(formData.get("email") || "").trim();
    const subject = String(formData.get("subject") || "").trim();
    const message = String(formData.get("message") || "").trim();
    const honeypot = String(formData.get("company") || "").trim();
    const turnstileToken = String(formData.get("cf-turnstile-response") || "").trim();

    if (honeypot) {
      return json({ error: "Spam detected." }, 400);
    }

    if (!name || !email || !subject || !message) {
      return json({ error: "All fields are required." }, 400);
    }

    if (!isValidEmail(email)) {
      return json({ error: "Enter a valid email address." }, 400);
    }

    if (name.length > 120 || email.length > 190 || subject.length > 180 || message.length > 5000) {
      return json({ error: "One or more fields are too long." }, 400);
    }

    if (!turnstileToken) {
      return json({ error: "Spam check is required." }, 400);
    }

    // Validate Turnstile server-side
    const ip =
      request.headers.get("CF-Connecting-IP") ||
      request.headers.get("x-forwarded-for") ||
      "";

    const turnstileBody = new URLSearchParams();
    turnstileBody.set("secret", env.TURNSTILE_SECRET_KEY);
    turnstileBody.set("response", turnstileToken);
    if (ip) turnstileBody.set("remoteip", ip);

    const turnstileResp = await fetch(
      "https://challenges.cloudflare.com/turnstile/v0/siteverify",
      {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: turnstileBody.toString()
      }
    );

    const turnstileResult = await turnstileResp.json();

    if (!turnstileResult.success) {
      return json({ error: "Spam check failed. Please try again." }, 400);
    }

    // Optional lightweight rate limiting per IP using Cloudflare KV
    if (env.CONTACT_RATE_LIMIT_KV && ip) {
      const key = `contact:${ip}`;
      const recent = await env.CONTACT_RATE_LIMIT_KV.get(key);
      if (recent) {
        return json({ error: "Too many attempts. Please wait a bit and try again." }, 429);
      }
      await env.CONTACT_RATE_LIMIT_KV.put(key, "1", { expirationTtl: 60 });
    }

    const resendPayload = {
      from: env.CONTACT_FROM_EMAIL,
      to: [env.CONTACT_TO_EMAIL],
      reply_to: email,
      subject: subject,
      text:
`New portfolio contact form message

Name: ${name}
Email: ${email}

Message:
${message}`
    };

    const resendResp = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${env.RESEND_API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify(resendPayload)
    });

    const resendData = await resendResp.json();

    if (!resendResp.ok) {
      return json(
        { error: resendData.message || resendData.error || "Email send failed." },
        502
      );
    }

    return json({ ok: true }, 200);
  } catch (error) {
    return json({ error: "Server error." }, 500);
  }
}

function isValidEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "no-store"
    }
  });
}