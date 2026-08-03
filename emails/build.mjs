#!/usr/bin/env node
/**
 * Build the v3 campaign emails.
 *
 * Two audiences get two different emails and nobody gets both:
 *   existing  — students who already have a DegreeIntelligence account
 *   newcomers — the rest of Yale, who have never signed up
 *
 * They share all their chrome (head, styles, header, video block, footer) and
 * differ only in copy and call to action, so the shared parts live here once
 * rather than drifting across two hand-maintained HTML files.
 *
 *   node emails/build.mjs
 *
 * Writes emails/dist/v3-existing.html and emails/dist/v3-newcomers.html.
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const DIST = path.join(HERE, "dist");

/** Replace once the Loom recording is up; both emails point at it. */
const VIDEO_URL = "https://www.loom.com/share/REPLACE_ME";
const SITE_URL = "https://degreeint.com";

/**
 * Logos are served from the site rather than inlined: Gmail strips SVG and
 * blocks data: URIs in img tags, so a hosted PNG is the only thing that renders
 * everywhere. Override the base when screenshotting locally, since these paths
 * only resolve once public/email/ has been deployed.
 */
const LOGO_BASE = process.env.EMAIL_LOGO_BASE ?? `${SITE_URL}/email`;

/** CAN-SPAM requires a real postal address in every commercial message. */
const POSTAL_ADDRESS = "DegreeIntelligence · 421 Temple St · New Haven, CT 06511";

/**
 * Resend swaps this for a working one-click unsubscribe link and suppresses
 * anyone who clicks it from later broadcasts.
 */
const UNSUBSCRIBE = "{{{RESEND_UNSUBSCRIBE_URL}}}";

/**
 * Two palettes rather than one. Email clients handle dark mode three different
 * ways: Apple Mail and iOS honour prefers-color-scheme, Outlook.com rewrites
 * the DOM and exposes [data-ogsc], and Outlook on Windows force-inverts
 * everything regardless. So the light palette has to look correct on its own
 * and survive a blind inversion, and the dark palette is layered on top for
 * the clients that ask for it properly.
 */
const LIGHT = {
  page: "#fafaf9",
  card: "#ffffff",
  border: "#e4e4e7",
  primary: "#09090b",
  secondary: "#52525b",
  muted: "#a1a1aa",
  btnBg: "#09090b",
  btnText: "#ffffff",
  wellBg: "#f4f4f5",
};

const DARK = {
  page: "#09090b",
  card: "#111113",
  border: "#27272a",
  primary: "#fafafa",
  secondary: "#a1a1aa",
  muted: "#71717a",
  btnBg: "#fafafa",
  btnText: "#09090b",
  wellBg: "#18181b",
};

const SANS =
  "-apple-system, BlinkMacSystemFont, 'SF Pro Text', 'Segoe UI', Roboto, Helvetica, Arial, sans-serif";
const SERIF = "'Instrument Serif', Louize, Georgia, 'Times New Roman', serif";
const MONO = "ui-monospace, SFMono-Regular, 'SF Mono', Menlo, Consolas, monospace";

/**
 * Dark-mode overrides.
 *
 * Every rule is duplicated for [data-ogsc], the attribute Outlook.com stamps on
 * elements when it rewrites a message for dark mode. Without that second
 * selector the message renders with light-mode colours on an inverted
 * background, which is the classic unreadable-email failure.
 */
function darkModeStyles() {
  const rules = [
    [".bg-page", `background-color: ${DARK.page} !important;`],
    [".bg-card", `background-color: ${DARK.card} !important; border-color: ${DARK.border} !important;`],
    [".bg-well", `background-color: ${DARK.wellBg} !important; border-color: ${DARK.border} !important;`],
    [".t-primary", `color: ${DARK.primary} !important;`],
    [".t-secondary", `color: ${DARK.secondary} !important;`],
    [".t-muted", `color: ${DARK.muted} !important;`],
    [".rule", `background-color: ${DARK.border} !important;`],
    // The player surface is near-black by design so it reads as video. On a
    // near-black page that makes it vanish, so in dark mode it lifts to sit
    // clearly above the background instead.
    [".video-surface", "background-color: #1c1c20 !important;"],
    [".btn", `background-color: ${DARK.btnBg} !important; color: ${DARK.btnText} !important; border-color: ${DARK.btnBg} !important;`],
    [".btn-text", `color: ${DARK.btnText} !important;`],
    // The logo's masking disc has to match the page behind it, so each theme
    // gets its own file and the pair is swapped rather than recoloured.
    [".logo-light", "display: none !important;"],
    [".logo-dark", "display: inline-block !important;"],
  ];

  const media = rules.map(([sel, decl]) => `      ${sel} { ${decl} }`).join("\n");
  const ogsc = rules.map(([sel, decl]) => `    [data-ogsc] ${sel} { ${decl} }`).join("\n");

  return `    @media (prefers-color-scheme: dark) {\n${media}\n    }\n\n${ogsc}`;
}

/** The landing page's player chrome, rebuilt in table HTML so it needs no image. */
function videoBlock({ caption }) {
  return `
          <tr>
            <td style="padding: 0 0 36px 0;">
              <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" class="bg-card" style="background-color: ${LIGHT.card}; border: 1px solid ${LIGHT.border}; border-radius: 14px; overflow: hidden;">

                <!-- title bar -->
                <tr>
                  <td class="bg-well" style="background-color: ${LIGHT.wellBg}; border-bottom: 1px solid ${LIGHT.border}; padding: 11px 14px;">
                    <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                      <tr>
                        <td width="60" style="font-size: 0; line-height: 0;">
                          <span style="display: inline-block; width: 9px; height: 9px; border-radius: 50%; background-color: #ff5f57;"></span>
                          <span style="display: inline-block; width: 9px; height: 9px; border-radius: 50%; background-color: #febc2e; margin-left: 5px;"></span>
                          <span style="display: inline-block; width: 9px; height: 9px; border-radius: 50%; background-color: #28c840; margin-left: 5px;"></span>
                        </td>
                        <td align="center" class="t-muted" style="font-family: ${MONO}; font-size: 11px; color: ${LIGHT.muted}; letter-spacing: 0.2px;">
                          v3-launch-film.mp4
                        </td>
                        <td width="60">&nbsp;</td>
                      </tr>
                    </table>
                  </td>
                </tr>

                <!-- play surface: stays dark in both themes, like a real player -->
                <tr>
                  <td align="center" class="video-surface" style="background-color: #09090b; padding: 52px 24px;">
                    <a href="${VIDEO_URL}" target="_blank" style="text-decoration: none; display: block;">
                      <table role="presentation" cellspacing="0" cellpadding="0" border="0" align="center" style="margin: 0 auto;">
                        <tr>
                          <td align="center" valign="middle" width="62" height="62" style="width: 62px; height: 62px; background-color: #fafafa; border-radius: 31px; text-align: center;">
                            <span style="font-family: ${SANS}; font-size: 20px; line-height: 62px; color: #09090b;">&#9654;</span>
                          </td>
                        </tr>
                      </table>
                      <p style="margin: 18px 0 0 0; font-family: ${SANS}; font-size: 13px; color: #a1a1aa;">
                        ${caption}
                      </p>
                    </a>
                  </td>
                </tr>

              </table>
            </td>
          </tr>`;
}

function button({ label, href }) {
  return `
          <tr>
            <td align="center" style="padding: 0 0 14px 0;">
              <a href="${href}" target="_blank" class="btn"
                 style="display: inline-block; padding: 14px 26px; font-family: ${SANS}; font-size: 15px; font-weight: 600; text-decoration: none; color: ${LIGHT.btnText}; background-color: ${LIGHT.btnBg}; border: 1px solid ${LIGHT.btnBg}; border-radius: 10px;">
                ${label}
              </a>
            </td>
          </tr>`;
}

function shell({ title, preheader, body }) {
  return `<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
<html xmlns="http://www.w3.org/1999/xhtml" lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <meta http-equiv="X-UA-Compatible" content="IE=edge" />
  <meta name="x-apple-disable-message-reformatting" />
  <meta name="color-scheme" content="light dark" />
  <meta name="supported-color-schemes" content="light dark" />
  <title>${title}</title>
  <!--[if mso]>
  <noscript><xml><o:OfficeDocumentSettings><o:PixelsPerInch>96</o:PixelsPerInch></o:OfficeDocumentSettings></xml></noscript>
  <![endif]-->
  <link href="https://fonts.googleapis.com/css2?family=Instrument+Serif:ital@0;1&display=swap" rel="stylesheet" />
  <style type="text/css">
    :root { color-scheme: light dark; supported-color-schemes: light dark; }

    body, table, td, a { -webkit-text-size-adjust: 100%; -ms-text-size-adjust: 100%; }
    table, td { mso-table-lspace: 0pt; mso-table-rspace: 0pt; }
    img { border: 0; height: auto; line-height: 100%; outline: none; text-decoration: none; -ms-interpolation-mode: bicubic; }
    body { margin: 0 !important; padding: 0 !important; width: 100% !important; }
    a { text-decoration: none; }

${darkModeStyles()}

    @media screen and (max-width: 600px) {
      .container { width: 100% !important; }
      .gutter { padding-left: 20px !important; padding-right: 20px !important; }
      .h1 { font-size: 34px !important; }
    }
  </style>
</head>
<body class="bg-page" style="margin: 0; padding: 0; background-color: ${LIGHT.page};">

  <!-- preheader: the grey line clients show next to the subject -->
  <div style="display: none; max-height: 0; overflow: hidden; mso-hide: all; font-size: 1px; line-height: 1px; color: ${LIGHT.page};">
    ${preheader}
  </div>

  <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" class="bg-page" style="background-color: ${LIGHT.page};">
    <tr>
      <td align="center" class="gutter" style="padding: 44px 24px;">
        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="560" class="container" style="width: 560px; max-width: 560px;">
${body}
        </table>
      </td>
    </tr>
  </table>

</body>
</html>
`;
}

/**
 * Logo mark plus wordmark. The wordmark stays live text rather than becoming
 * part of the image, so the header still reads when a client blocks images,
 * which Outlook does by default.
 */
function header() {
  return `
          <tr>
            <td align="center" style="padding: 0 0 30px 0;">
              <a href="${SITE_URL}" target="_blank" style="text-decoration: none;">
                <img src="${LOGO_BASE}/logo-light.png" width="42" height="42" alt="DegreeIntelligence" class="logo-light" style="display: inline-block; width: 42px; height: 42px; border: 0;" />
                <img src="${LOGO_BASE}/logo-dark.png" width="42" height="42" alt="DegreeIntelligence" class="logo-dark" style="display: none; width: 42px; height: 42px; border: 0;" />
                <div style="height: 10px; font-size: 0; line-height: 0;">&nbsp;</div>
                <span class="t-primary" style="font-family: ${SANS}; font-size: 15px; font-weight: 600; color: ${LIGHT.primary}; letter-spacing: -0.2px;">DegreeIntelligence</span>
              </a>
            </td>
          </tr>`;
}

function footer() {
  return `
          <tr>
            <td style="padding: 40px 0 26px 0;">
              <div class="rule" style="height: 1px; background-color: ${LIGHT.border}; font-size: 0; line-height: 0;">&nbsp;</div>
            </td>
          </tr>

          <tr>
            <td align="center" style="padding: 0 0 18px 0;">
              <p class="t-muted" style="margin: 0; font-family: ${SANS}; font-size: 11px; line-height: 1.6; color: ${LIGHT.muted};">
                Not affiliated with Yale University in any way.
              </p>
            </td>
          </tr>

          <tr>
            <td align="center" style="padding: 0 0 10px 0;">
              <p class="t-muted" style="margin: 0; font-family: ${MONO}; font-size: 10px; color: ${LIGHT.muted};">
                ${POSTAL_ADDRESS}
              </p>
            </td>
          </tr>

          <tr>
            <td align="center">
              <p class="t-muted" style="margin: 0; font-family: ${SANS}; font-size: 11px; color: ${LIGHT.muted};">
                <a href="${UNSUBSCRIBE}" class="t-muted" style="color: ${LIGHT.muted}; text-decoration: underline;">unsubscribe</a>
                &nbsp;·&nbsp;
                <a href="${SITE_URL}/terms" class="t-muted" style="color: ${LIGHT.muted}; text-decoration: underline;">terms</a>
              </p>
            </td>
          </tr>`;
}

/** Email 1: students who already have an account. No sign-up language. */
function existingUsersEmail() {
  const body = `${header()}

          <tr>
            <td align="center" style="padding: 0 0 16px 0;">
              <h1 class="t-primary h1" style="margin: 0; font-family: ${SERIF}; font-size: 46px; font-weight: 400; font-style: italic; line-height: 1.05; color: ${LIGHT.primary};">
                v3 is here.
              </h1>
            </td>
          </tr>

          <tr>
            <td align="center" style="padding: 0 0 34px 0;">
              <p class="t-secondary" style="margin: 0; font-family: ${SANS}; font-size: 15px; line-height: 1.7; color: ${LIGHT.secondary};">
                If you're getting this email, you've signed up to DegreeIntelligence in the past.
                We wanted to let you know we've been hard at work making Yale's most used
                degree-planning platform even better. We now have Certificates, a rebuilt
                Simulator, distributionals, a cleaner UI, and much more.
              </p>
            </td>
          </tr>
${videoBlock({ caption: "Watch the v3 tour" })}
${button({ label: "Open DegreeIntelligence →", href: SITE_URL })}

          <tr>
            <td align="center" style="padding: 26px 0 0 0;">
              <p class="t-primary" style="margin: 0; font-family: ${SERIF}; font-size: 24px; font-style: italic; line-height: 1.3; color: ${LIGHT.primary};">
                we cannot wait to see what you think!
              </p>
            </td>
          </tr>

          <tr>
            <td align="center" style="padding: 16px 0 0 0;">
              <p class="t-secondary" style="margin: 0; font-family: ${SANS}; font-size: 14px; line-height: 1.7; color: ${LIGHT.secondary};">
                made with <span style="color: #ec4899;">&#9829;</span> by yalies, for all of us.
                we genuinely make no money from this and just want to share what we use to
                plan for ourselves. it's changed our lives!
              </p>
            </td>
          </tr>
${footer()}`;

  return shell({
    title: "v3 is here",
    preheader: "Certificates, a rebuilt Simulator, distributionals, a cleaner UI, and much more.",
    body,
  });
}

/** Email 2: the rest of Yale, who have never signed up. Leads with proof. */
function newcomersEmail() {
  const body = `${header()}

          <tr>
            <td align="center" style="padding: 0 0 12px 0;">
              <p class="t-muted" style="margin: 0; font-family: ${MONO}; font-size: 11px; letter-spacing: 1.4px; text-transform: uppercase; color: ${LIGHT.muted};">
                featured in the Yale Daily News
              </p>
            </td>
          </tr>

          <tr>
            <td align="center" style="padding: 0 0 14px 0;">
              <h1 class="t-primary h1" style="margin: 0; font-family: ${SERIF}; font-size: 42px; font-weight: 400; line-height: 1.1; color: ${LIGHT.primary};">
                The control plane<br />for your Yale degree.
              </h1>
            </td>
          </tr>

          <tr>
            <td align="center" style="padding: 0 0 32px 0;">
              <p class="t-secondary" style="margin: 0; font-family: ${SANS}; font-size: 15px; line-height: 1.65; color: ${LIGHT.secondary};">
                Plan semesters, track requirements, simulate outcomes, and see exactly
                how your degree is going. Built by Yalies, for Yalies.
              </p>
            </td>
          </tr>
${videoBlock({ caption: "Watch the two-minute tour" })}
${button({ label: "Log in with @yale.edu Google →", href: SITE_URL })}

          <tr>
            <td align="center" style="padding: 0 0 40px 0;">
              <p class="t-muted" style="margin: 0; font-family: ${MONO}; font-size: 11px; color: ${LIGHT.muted};">
                Free forever · No install
              </p>
            </td>
          </tr>

          <tr>
            <td align="center" class="bg-well" style="background-color: ${LIGHT.wellBg}; border: 1px solid ${LIGHT.border}; border-radius: 14px; padding: 28px 24px;">
              <p class="t-primary" style="margin: 0 0 4px 0; font-family: ${SERIF}; font-size: 26px; line-height: 1.2; color: ${LIGHT.primary};">
                Used by 1 in 6 Yale undergrads.
              </p>
              <p class="t-muted" style="margin: 0 0 14px 0; font-family: ${SERIF}; font-size: 22px; font-style: italic; line-height: 1.2; color: ${LIGHT.muted};">
                Some of them even like it.
              </p>
              <p class="t-muted" style="margin: 0; font-family: ${MONO}; font-size: 11px; line-height: 1.7; color: ${LIGHT.muted};">
                ~1,200 students · every residential college · zero ads, zero fees
              </p>
            </td>
          </tr>
${footer()}`;

  return shell({
    title: "The control plane for your Yale degree",
    preheader: "Plan semesters, track requirements, and see how your degree is actually going.",
    body,
  });
}

const TARGETS = [
  { file: "v3-existing.html", render: existingUsersEmail },
  { file: "v3-newcomers.html", render: newcomersEmail },
];

fs.mkdirSync(DIST, { recursive: true });
for (const { file, render } of TARGETS) {
  const html = render();
  fs.writeFileSync(path.join(DIST, file), html);
  console.log(`wrote emails/dist/${file}  (${(html.length / 1024).toFixed(1)} kb)`);
}

if (VIDEO_URL.includes("REPLACE_ME")) {
  console.log("\nheads up: VIDEO_URL is still a placeholder. Set it before the real send.");
}
