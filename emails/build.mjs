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

/** The demo recording. Every email's film block points at it. */
const VIDEO_URL =
  "https://www.loom.com/share/05c17c15d00748579e06949a0d3ae69f";
const SITE_URL = "https://degreeint.com";
const REPO_URL = "https://github.com/filippo-fonseca/yale-degree-intelligence";

/** The button under the film. The one above it carries each email's own CTA. */
const CLOSING_CTA = "Try it out for yourself →";

/** Where replies and "email us" both land. Matches the campaign's Reply-To. */
const CONTACT_EMAIL = "filippo.fonseca@yale.edu";

/**
 * Logos are served from the site rather than inlined: Gmail strips SVG and
 * blocks data: URIs in img tags, so a hosted PNG is the only thing that renders
 * everywhere.
 *
 * The light lockup carries a white plate baked into the PNG. Gmail ignores
 * prefers-color-scheme entirely and darkens the message itself, and it never
 * touches image pixels, so a transparent PNG with a black wordmark ended up
 * black-on-charcoal in the Gmail app. The plate travels with the image, so the
 * mark stays legible wherever the swap does not happen. Both files are padded
 * to the same box so the header does not jump between the two.
 *
 * The -v2 in the filenames is deliberate. Gmail proxies every remote image
 * through googleusercontent and caches it by URL, so anyone who opened an
 * earlier send would keep getting the old plateless logo from that cache no
 * matter what the site now serves. A new path is the only reliable way to
 * invalidate it: any future change to these files needs a new name too. Override the base when screenshotting locally, since these paths
 * only resolve once public/email/ has been deployed.
 *
 * Points at the canonical www host rather than the apex. The apex answers 307
 * to www, and while browsers follow that, some mail clients and image proxies
 * will not follow a redirect for an img src and simply show nothing.
 */
const LOGO_BASE = process.env.EMAIL_LOGO_BASE ?? "https://www.degreeint.com/email";

/**
 * CAN-SPAM asks for a valid postal address in promotional mail, and filters
 * read its presence as a legitimacy signal. It is empty here because the only
 * address available is a student residence, which should not go out to
 * thousands of strangers. Set it to a PO box if one gets rented.
 */
const POSTAL_ADDRESS = "";

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
  accent: "#ec4899",
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
  accent: "#f472b6",
};

const SANS =
  "-apple-system, BlinkMacSystemFont, 'SF Pro Text', 'Segoe UI', Roboto, Helvetica, Arial, sans-serif";
/**
 * Louize is the brand serif and the face the logo wordmark is set in, so the
 * headline asks for it first and the two match wherever it loads: Apple Mail,
 * iOS Mail, and Outlook for Mac. Gmail and Outlook for Windows ignore
 * @font-face entirely and land on Georgia, which is the closest widely
 * installed transitional serif. Instrument Serif is deliberately gone; it was a
 * third, different look for no gain.
 */
const SERIF = "'Louize', Georgia, 'Times New Roman', serif";
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
    // The headline pink lifts a step on dark so it keeps its contrast.
    [".t-accent", `color: ${DARK.accent} !important;`],
    // Chip naming an in-app button. Its own rule rather than .bg-well because
    // the label colour has to lift with the background or it goes near-black
    // on near-black.
    [".pill", `background-color: ${DARK.wellBg} !important; border-color: ${DARK.border} !important; color: ${DARK.primary} !important;`],
  ];

  const media = rules.map(([sel, decl]) => `      ${sel} { ${decl} }`).join("\n");
  const ogsc = rules.map(([sel, decl]) => `    [data-ogsc] ${sel} { ${decl} }`).join("\n");

  return `    @media (prefers-color-scheme: dark) {\n${media}\n    }\n\n${ogsc}`;
}

/** The landing page's player chrome, around the recording's own first frame. */
function videoBlock({ caption, lead }) {
  return `${lead ? `
          <tr>
            <td align="center" style="padding: 0 0 14px 0;">
              <p class="t-secondary" style="margin: 0; font-family: ${SANS}; font-size: 14px; line-height: 1.6; color: ${LIGHT.secondary};">
                ${lead}
              </p>
            </td>
          </tr>` : ""}
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
                          v3-launch-demo
                        </td>
                        <td width="60">&nbsp;</td>
                      </tr>
                    </table>
                  </td>
                </tr>

                <!--
                  The real first frame of the recording, with a play button
                  baked into the image.

                  No client will run an iframe, so a Loom that plays inside the
                  message is not on the table: Gmail, Outlook, and Apple Mail
                  all strip them. Loom's own advice is a thumbnail that links
                  out, which is what this is. It is a still rather than Loom's
                  animated GIF because that GIF is 460kb of a mostly static
                  page, and Outlook would show a single frame of it anyway.

                  The image is hosted on the site for the same reason the logos
                  are, and the surface behind it stays dark so a client that
                  blocks images still shows a player rather than a white gap.
                -->
                <tr>
                  <td align="center" class="video-surface" style="background-color: #09090b; padding: 0;">
                    <a href="${VIDEO_URL}" target="_blank" style="text-decoration: none; display: block;">
                      <img src="${LOGO_BASE}/demo-thumb.jpg" width="558" alt="Watch the DegreeIntelligence v3 demo"
                           style="display: block; width: 100%; max-width: 558px; height: auto; border: 0;" />
                    </a>
                  </td>
                </tr>

                <tr>
                  <td align="center" class="video-surface" style="background-color: #09090b; padding: 14px 24px 18px 24px;">
                    <a href="${VIDEO_URL}" target="_blank" style="text-decoration: none;">
                      <span style="font-family: ${SANS}; font-size: 13px; color: #a1a1aa;">
                        ${caption} &rarr;
                      </span>
                    </a>
                  </td>
                </tr>

              </table>
            </td>
          </tr>`;
}

function button({ label, href, gap = 14 }) {
  return `
          <tr>
            <td align="center" style="padding: 0 0 ${gap}px 0;">
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
  <style type="text/css">
    @font-face {
      font-family: "Louize";
      src: url("https://www.degreeint.com/fonts/louize-medium.otf") format("opentype");
      font-weight: 400 700;
      font-style: normal;
      font-display: swap;
    }

    :root { color-scheme: light dark; supported-color-schemes: light dark; }

    body, table, td, a { -webkit-text-size-adjust: 100%; -ms-text-size-adjust: 100%; }
    table, td { mso-table-lspace: 0pt; mso-table-rspace: 0pt; }
    img { border: 0; height: auto; line-height: 100%; outline: none; text-decoration: none; -ms-interpolation-mode: bicubic; }
    body { margin: 0 !important; padding: 0 !important; width: 100% !important; }
    a { text-decoration: none; }

    .grad {
      background-image: linear-gradient(100deg, #f472b6 0%, #db2777 100%);
      -webkit-background-clip: text;
      background-clip: text;
      -webkit-text-fill-color: transparent;
    }

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
                <img src="${LOGO_BASE}/lockup-light-v2.png" width="234" height="45" alt="DegreeIntelligence" class="logo-light" style="display: inline-block; width: 234px; height: 45px; border: 0;" />
                <img src="${LOGO_BASE}/lockup-dark-v2.png" width="234" height="45" alt="DegreeIntelligence" class="logo-dark" style="display: none; width: 234px; height: 45px; border: 0;" />
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
            <td align="center" style="padding: 0 0 14px 0;">
              <p class="t-muted" style="margin: 0; font-family: ${SANS}; font-size: 12px; line-height: 1.65; color: ${LIGHT.muted};">
                This is the only email we'll send until registration opens again for the
                Spring semester. Unsubscribe if you don't want to be emailed.
              </p>
            </td>
          </tr>

          <tr>
            <td align="center" style="padding: 0 0 18px 0;">
              <p class="t-muted" style="margin: 0; font-family: ${SANS}; font-size: 11px; line-height: 1.6; color: ${LIGHT.muted};">
                Not affiliated with Yale University in any way other than us being
                students sharing our project.
              </p>
            </td>
          </tr>


${POSTAL_ADDRESS ? `
          <tr>
            <td align="center" style="padding: 0 0 10px 0;">
              <p class="t-muted" style="margin: 0; font-family: ${MONO}; font-size: 10px; color: ${LIGHT.muted};">
                ${POSTAL_ADDRESS}
              </p>
            </td>
          </tr>
` : ""}
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

/**
 * One layout for all three audiences.
 *
 * They differ only in headline, the paragraph explaining why this landed in
 * your inbox, and the call to action. Keeping the shape identical is the point:
 * a student who forwards one to a friend on a different list should see the
 * same email, and it means copy edits cannot leave the three drifting apart.
 */
/**
 * Underline a feature name inside body copy.
 *
 * Deliberately not an anchor and not link-coloured: these are emphasis, not
 * destinations, and colouring them like links would invite clicks that go
 * nowhere.
 */
/**
 * A real destination inside body copy, as opposed to u(), which is emphasis
 * only. Accent-coloured and underlined so it reads as clickable, with the
 * .t-accent class carrying the lighter pink for dark-mode clients.
 */
function link(text, href) {
  return `<a href="${href}" target="_blank" class="t-accent" style="color: ${LIGHT.accent}; text-decoration: underline;">${text}</a>`;
}

/**
 * The one line in the body that should stop a skimmer.
 *
 * Bold and italic together, in the primary colour rather than the body grey,
 * with the weight inline: Outlook drops <strong>'s styling in places but
 * honours an inline font-weight, and the colour is what actually pulls the eye
 * on a phone.
 */
function lede(text) {
  return `<span style="font-weight: 700; font-style: italic; color: ${LIGHT.primary};" class="t-primary">${text}</span>`;
}

function u(text) {
  return `<span style="text-decoration: underline;">${text}</span>`;
}

/**
 * Weight-only emphasis. Unlike lede() it stays in the body grey and upright,
 * so it can carry a long clause without turning a paragraph into a pull quote.
 * font-weight inline rather than <strong>, which Outlook drops the styling of.
 */
function b(text) {
  return `<span style="font-weight: 700;">${text}</span>`;
}

/**
 * An inline chip that names a real control in the app.
 *
 * Deliberately not a link and not underlined: it is a picture of a button the
 * reader has to find on screen, so it should look like that button rather than
 * like something to click here. Bold does the emphasis u() would otherwise do.
 *
 * inline-block rather than a nested table because it sits mid-sentence and has
 * to wrap with the text around it. Outlook's Word engine drops border-radius
 * and inline padding, so it degrades there to bold text on a grey ground,
 * which still reads as a label. white-space: nowrap keeps the icon from ending
 * a line on its own with the words orphaned onto the next.
 */
function pill(label, icon) {
  const img = (variant, display) =>
    `<img src="${LOGO_BASE}/${icon}-${variant}.png" width="12" height="12" alt="" class="logo-${variant}" style="display: ${display}; width: 12px; height: 12px; border: 0; vertical-align: -2px;" />`;

  return `<span class="pill" style="display: inline-block; padding: 1px 9px 2px 8px; border-radius: 100px; background-color: ${LIGHT.wellBg}; border: 1px solid ${LIGHT.border}; font-weight: 700; color: ${LIGHT.primary}; white-space: nowrap;">${img("light", "inline-block")}${img("dark", "none")}&nbsp;${label}</span>`;
}

/**
 * Pink gradient text.
 *
 * The gradient lives in a stylesheet class while the inline style carries a
 * solid pink. That split is deliberate and load-bearing: gradient text needs
 * -webkit-text-fill-color: transparent, and a client that keeps that property
 * while dropping background-clip would render the word invisible. Clients that
 * strip the class fall back to the inline pink, so the worst case is a flat
 * headline rather than a missing one.
 */
function grad(text) {
  return `<span class="grad" style="color: ${LIGHT.accent};">${text}</span>`;
}

/**
 * The body copy under the headline.
 *
 * Takes a string or an array of strings. Separate <p> elements rather than
 * <br /> pairs, because Outlook collapses the second <br /> and the paragraphs
 * run together; spacing goes on margin-top so the first paragraph still sits
 * flush against the headline above it.
 */
function copyRow(paragraph, { pad }) {
  return `          <tr>
            <td align="center" style="padding: 0 0 ${pad}px 0;">
${bodyCopy(paragraph)}
            </td>
          </tr>`;
}

function bodyCopy(paragraph) {
  const parts = Array.isArray(paragraph) ? paragraph : [paragraph];
  return parts
    .map(
      (text, index) => `              <p class="t-secondary" style="margin: ${index === 0 ? "0" : "16px 0 0 0"}; font-family: ${SANS}; font-size: 15px; line-height: 1.7; color: ${LIGHT.secondary};">
                ${text}
              </p>`,
    )
    .join("\n");
}

function campaignEmail({
  headline,
  subheadline,
  subnote,
  paragraph,
  cta,
  videoCaption,
  title,
  preheader,
}) {
  const parts = Array.isArray(paragraph) ? paragraph : [paragraph];
  const [opening, ...rest] = parts;

  const body = `${header()}

          <tr>
            <td align="center" style="padding: 0 0 16px 0;">
              <h1 class="t-primary h1" style="margin: 0; font-family: ${SERIF}; font-size: 46px; font-weight: 400; font-style: italic; line-height: 1.05; color: ${LIGHT.primary};">
                ${headline}
              </h1>
            </td>
          </tr>
${/* Optional, and only the returning-user email uses them today. Rendered as
     their own rows rather than <br />s inside the h1, so the serif headline
     keeps its own line-height and the two lines can carry different sizes. */ ""}
${
  subheadline
    ? `
          <tr>
            <td align="center" style="padding: 0 0 10px 0;">
              <p class="t-primary" style="margin: 0; font-family: ${SANS}; font-size: 15px; font-weight: 600; line-height: 1.4; color: ${LIGHT.primary};">
                ${subheadline}
              </p>
            </td>
          </tr>`
    : ""
}${
  subnote
    ? `
          <tr>
            <td align="center" style="padding: 0 0 8px 0;">
              <p class="t-muted" style="margin: 0; font-family: ${SANS}; font-size: 13px; line-height: 1.6; color: ${LIGHT.muted};">
                ${subnote}
              </p>
            </td>
          </tr>`
    : ""
}

${copyRow(opening, { pad: 26 })}
${/* The way in sits right after the opening paragraph, not at the bottom. A
     reader who is already sold should not have to read the rest, or scroll
     past a two-minute film, to find the link. The second one below the film
     catches everyone who watched it first. */ ""}
${button({ label: cta, href: SITE_URL, gap: 30 })}
${rest.length ? copyRow(rest, { pad: 34 }) : ""}
${videoBlock({ caption: videoCaption, lead: "we've recorded a quick demo for you:" })}
${button({ label: CLOSING_CTA, href: SITE_URL })}

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
                made with <span style="color: ${LIGHT.accent};">&#9829;</span> by yalies, for all of us.
                we genuinely make no money from this and just want to share what we use to
                plan for ourselves. it's changed our lives!
              </p>
            </td>
          </tr>

          <tr>
            <td align="center" style="padding: 18px 0 0 0;">
              <p class="t-muted" style="margin: 0; font-family: ${SANS}; font-size: 13px; color: ${LIGHT.muted};">
                have feedback? just reply to this email.
              </p>
            </td>
          </tr>

          <!--
            The open-source note. Still understated (mono, muted, no button), but
            it sits with the sign-off rather than down in the legal block, where
            it was reading as boilerplate and getting skipped. The icon is a
            hosted PNG in two themes because Gmail strips SVG.
          -->
          <tr>
            <td align="center" style="padding: 14px 0 0 0;">
              <a href="${REPO_URL}" target="_blank" class="t-secondary" style="font-family: ${MONO}; font-size: 12px; line-height: 1.6; color: ${LIGHT.secondary}; text-decoration: none;">
                <img src="${LOGO_BASE}/github-light.png" width="14" height="14" alt="" class="logo-light" style="display: inline-block; width: 14px; height: 14px; border: 0; vertical-align: -2px;" />
                <img src="${LOGO_BASE}/github-dark.png" width="14" height="14" alt="" class="logo-dark" style="display: none; width: 14px; height: 14px; border: 0; vertical-align: -2px;" />
                &nbsp;btw, for the devs: we're open source now.
                <span style="text-decoration: underline;">have a look at the repo &rarr;</span>
              </a>
            </td>
          </tr>
${footer()}`;

  return shell({ title, preheader, body });
}

const TARGETS = [
  {
    // Already has an account. No sign-up language, no explaining what DI is.
    file: "v3-existing.html",
    render: () =>
      campaignEmail({
        headline: `${grad("v3")} is here.`,
        subheadline: "Last semester is over! Time to update your classes on DegreeIntelligence.",
        subnote: `Click ${pill("Re-upload transcript", "refresh")} to refresh your stats and see
                where you're at in terms of your major, certificates, GPA, distributionals, and
                much more.`,
        paragraph: `If you're getting this email, ${b(`you're among the 1 in 6 Yale students who have
                signed up to use DegreeIntelligence over the past year.`)} First of all, thank you!
                It's your support + feedback that makes our free, student-run, open-source app
                possible to democratize academic planning at Yale and eliminate guesswork.
                We just wanted to let you know we've been hard at work making Yale's most used degree-planning platform even
                better. We now have ${u("Certificates")}, a rebuilt ${u("Simulator")},
                ${u("distributionals")}, a ${u("cleaner UI")}, and ${u("much more")}.`,
        cta: "Log back into DegreeIntelligence →",
        videoCaption: "Watch the demo",
        title: "Are you sure you chose the right classes?",
        preheader:
          "Choosing the right Yale classes to fulfill requirements for your major, certificates, distributionals, etc. is hard (all the while keeping track of your GPA, etc.). Don't worry. We're here to help.",
      }),
  },
  {
    // Class of 2030. They have already registered, so this cannot open on
    // choosing courses. It opens on getting the courses they picked into the
    // app, and on the part nobody hands you: what the next four years look like.
    //
    // Registration is what produces the Yale Hub unofficial transcript, not
    // grades, so the import works for them on day one. It is still only one of
    // three ways in, and the copy says so: nobody should think an import is
    // required before they can use any of this.
    file: "v3-frosh.html",
    render: () =>
      campaignEmail({
        headline: "welcome to Yale.",
        paragraph: [
          `Class of 2030, you've made it! We know navigating Yale is messy... from looking at
                the requirements for the many potential majors you might be considering to the
                distributionals you must fulfill to graduate... we're sure you've gained a
                sense of this already. Yale is
                famous for offering thousands of classes and allowing students to pick their own
                schedule, which presents tons of logistical problems and planning pains. We've
                been there. For even the most organized among us, the best of Google
                Sheets docs with fancy dropdown pills were not enough, leaving us wanting more. Luckily, ${lede(
                  "a few years ago we built a completely free, open-source app used by 1 in 6 Yale students",
                )} to stay on top of what can seem like a lot at first (if it does, that's because it is!).`,
          `Not sure what you're majoring in yet? Try a few on. When you switch majors, every
                number updates instantly, including nifty features that TRUST US will come in
                handy later, like our ${u("double major conflict tracker")}. *If you didn't know,
                you can only share 2 credits or less between majors if you're doubling. This (and
                countless other nuances) is all built into how we engineered the backend of
                DegreeIntelligence, so you know you're covered. One of our most popular features
                is our ${u("Simulator")}, a drag-and-drop experience that makes sure you can
                visualize your entire Yale trajectory, keep different versions of plans, and more,
                all the while allocating the classes you pick to your distributionals, major
                requirements, and more.`,
          `Once you have real grades, the ${u("Stats")} page keeps you on top of your GPA, your
                credits, and your pace. Furthermore, the ${u("Distributionals tracker")} shows
                which of Yale's requirements you've cleared and which are still open. *We also have
                a ton more features we didn't want to bombard you with on here. Made by Yalies,
                for Yalies, DegreeIntelligence is free (forever) and requires nothing to install.`,
          `Don't like something, or have a suggestion? ${link("Email us", `mailto:${CONTACT_EMAIL}`)}.
                Or hey, we're open source, so you could code it yourself and submit a PR :)`,
        ],
        cta: "Try DegreeIntelligence →",
        videoCaption: "Watch the demo",
        title: "Welcome to Yale",
        preheader: "The free, open-source app 1 in 6 Yalies use to make sense of majors, distributionals, and what to take next.",
      }),
  },
  {
    // Upperclass students who never signed up. Proof first, since they need a
    // reason to trust an email from a name they do not recognise.
    file: "v3-newcomers.html",
    render: () =>
      campaignEmail({
        // Second line is sized down inside the h1 rather than split into its own
        // row: it belongs to the headline, and a row would let clients that add
        // their own paragraph spacing pull the two lines apart.
        headline: `1 in 6 Yalies use this.<br /><span class="t-muted" style="color: ${LIGHT.muted}; font-size: 34px;">Why don't you? :)</span>`,
        subnote: `Just hit ${pill("Upload transcript", "upload")} with your unofficial Yale Hub
                transcript (or add your courses manually) and everything fills in from there.`,
        // Nested on purpose. campaignEmail splits a flat array around the CTA,
        // so [a, b] would drop the sign-off below the button; one array of two
        // keeps both paragraphs in the same block above it.
        paragraph: [
          [
            `1.2k Yalies across every residential college use DegreeIntelligence to plan their
                degrees, and we've been hard at work making it even better. We now have
                ${u("Certificates")}, a rebuilt ${u("Simulator")}, ${u("distributionals")},
                a ${u("cleaner UI")}, and ${u("much more")}. Luckily, ${u("add/drop is still open")},
                so there's time to change what you're taking this semester (to see where the
                classes you already picked put you in the grand scheme of things for your major,
                certificates, and distributionals).`,
            `Made by Yalies, for Yalies, DegreeIntelligence is free (forever) and open-source.
                It requires nothing to install!`,
          ],
        ],
        cta: "Try DegreeIntelligence →",
        videoCaption: "Watch the demo",
        title: "Are you sure you chose the right classes?",
        preheader:
          "Choosing the right Yale classes to fulfill requirements for your major, certificates, distributionals, etc. is hard (all the while keeping track of your GPA, etc.). Don't worry. We're here to help.",
      }),
  },
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
