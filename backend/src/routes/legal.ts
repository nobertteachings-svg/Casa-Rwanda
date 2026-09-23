import { Router, type Request, type Response } from "express";

const router = Router();

function page(title: string, bodyHtml: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${title} — Casa Rwanda</title>
  <style>
    body { font-family: system-ui, -apple-system, Segoe UI, sans-serif; line-height: 1.55; max-width: 42rem; margin: 2rem auto; padding: 0 1.25rem; color: #122; }
    h1 { font-size: 1.75rem; margin-bottom: 0.35rem; }
    h2 { font-size: 1.15rem; margin-top: 1.75rem; }
    .muted { color: #456; font-size: 0.95rem; }
    a { color: #1a7a3c; }
  </style>
</head>
<body>
  <p class="muted"><a href="https://casahomesrwanda.com">Casa Rwanda</a></p>
  ${bodyHtml}
</body>
</html>`;
}

router.get("/privacy", (_req: Request, res: Response) => {
  res
    .type("html")
    .send(
      page(
        "Privacy Policy",
        `
  <h1>Privacy Policy</h1>
  <p class="muted">Last updated: 28 July 2026</p>
  <p>Casa Rwanda (“Casa”, “we”) provides a WhatsApp-based housing marketplace for Rwanda. This policy explains what data we collect and how we use it.</p>

  <h2>Information we collect</h2>
  <ul>
    <li>WhatsApp phone number and display name when you message Casa</li>
    <li>Messages you send (search preferences, listing details, photos/videos you upload)</li>
    <li>Location pins you choose to share for nearby search</li>
    <li>Landlord identity documents submitted for verification (e.g. National ID / passport images)</li>
    <li>Basic technical logs needed to run and secure the service</li>
  </ul>

  <h2>How we use information</h2>
  <ul>
    <li>To match tenants with landlords and deliver listing/search features</li>
    <li>To verify landlords and improve safety</li>
    <li>To operate, debug, and secure the platform</li>
    <li>To contact you about your account or support requests</li>
  </ul>

  <h2>Sharing</h2>
  <p>We share landlord contact details with a tenant only after an unlock action. We use processors such as Meta (WhatsApp), hosting providers, and AI services to operate features you request. We do not sell your personal data.</p>

  <h2>Retention</h2>
  <p>We keep account and listing data while your account is active and as needed for safety, legal, and operational purposes. You may request deletion (see below).</p>

  <h2>User data deletion</h2>
  <p>To delete your Casa Rwanda data:</p>
  <ol>
    <li>Message <strong>Casa on WhatsApp</strong> and ask to delete your account/data, or</li>
    <li>Email <a href="mailto:hello@casahomesrwanda.com">hello@casahomesrwanda.com</a> from the phone/email associated with your use of Casa, subject line “Delete my data”.</li>
  </ol>
  <p>We will remove or anonymise personal data within a reasonable period, except where we must retain information for legal, fraud-prevention, or security reasons.</p>

  <h2>Contact</h2>
  <p>Email: <a href="mailto:hello@casahomesrwanda.com">hello@casahomesrwanda.com</a><br/>
  Website: <a href="https://casahomesrwanda.com">casahomesrwanda.com</a></p>
`
      )
    );
});

router.get("/terms", (_req: Request, res: Response) => {
  res
    .type("html")
    .send(
      page(
        "Terms of Service",
        `
  <h1>Terms of Service</h1>
  <p class="muted">Last updated: 28 July 2026</p>
  <p>By using Casa Rwanda on WhatsApp or our website, you agree to these terms.</p>

  <h2>What Casa is</h2>
  <p>Casa Rwanda helps landlords list rental properties and tenants discover homes via WhatsApp. Casa is a technology platform. We are not a landlord, agent, or party to your rental agreement.</p>

  <h2>Your responsibilities</h2>
  <ul>
    <li>Provide accurate information</li>
    <li>Use the service lawfully and respectfully</li>
    <li>Landlords: only list properties you are authorised to rent</li>
    <li>Tenants: verify properties in person before paying rent or deposits</li>
  </ul>

  <h2>No agent middlemen</h2>
  <p>Casa is designed for direct landlord–tenant connection. Do not use Casa to run exploitative agency practices that mislead users.</p>

  <h2>Payments</h2>
  <p>Any unlock or platform fees will be disclosed in-product. Rent is paid between tenant and landlord, not through Casa unless we clearly say otherwise.</p>

  <h2>Content and media</h2>
  <p>You grant Casa a licence to store and display listing content you upload for operating the service. Do not upload illegal or infringing content.</p>

  <h2>Disclaimer</h2>
  <p>Listings are provided by users. Casa does not guarantee availability, accuracy, or outcome of any rental. Always inspect before paying.</p>

  <h2>Contact</h2>
  <p><a href="mailto:hello@casahomesrwanda.com">hello@casahomesrwanda.com</a></p>
  <p>Also see our <a href="/privacy">Privacy Policy</a>.</p>
`
      )
    );
});

export { router as legalRouter };
