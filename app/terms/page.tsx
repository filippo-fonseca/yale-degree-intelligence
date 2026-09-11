import type { ReactNode } from "react";
import {
  Kicker,
  StaticPageFooter,
  StaticPageNav,
  StaticPageShell,
} from "@/components/ui/StaticPageChrome";

/**
 * Terms of service, in the v3 system.
 *
 * The wording is unchanged apart from the OpenAI line in §4, which still
 * described the removed advisor. Everything else here is layout: the page used
 * to be a blue-to-purple gradient with blue and purple headings and no light
 * mode at all.
 */

const LAST_UPDATED = "August 24, 2026";
const CONTACT_EMAILS = ["filippo.fonseca@yale.edu"];

function Section({
  index,
  title,
  children,
}: {
  index: number;
  title: string;
  children: ReactNode;
}) {
  return (
    <section className="border-t border-black/[0.07] pt-8 dark:border-white/[0.08]">
      <div className="flex items-baseline gap-3">
        <span className="font-mono text-[11px] text-gray-400 dark:text-gray-500">
          {String(index).padStart(2, "0")}
        </span>
        <h2 className="text-[1.35rem]/[1.3] font-medium tracking-[-0.02em] text-gray-900 dark:text-white">
          {title}
        </h2>
      </div>
      <div className="mt-3 space-y-3 font-sf text-sm leading-relaxed text-gray-600 dark:text-gray-400">
        {children}
      </div>
    </section>
  );
}

function List({ children }: { children: ReactNode }) {
  return (
    <ul className="ml-1 list-outside list-disc space-y-1.5 pl-4 marker:text-gray-300 dark:marker:text-gray-600">
      {children}
    </ul>
  );
}

function Strong({ children }: { children: ReactNode }) {
  return (
    <strong className="font-semibold text-gray-900 dark:text-gray-200">
      {children}
    </strong>
  );
}

function MailLink({ address }: { address: string }) {
  return (
    <a
      href={`mailto:${address}`}
      className="text-pink-600 underline underline-offset-2 transition-colors hover:text-pink-500 dark:text-pink-300 dark:hover:text-pink-200"
    >
      {address}
    </a>
  );
}

export default function TermsOfService() {
  return (
    <StaticPageShell>
      <StaticPageNav />

      <main className="mx-auto max-w-3xl px-4 pb-4 pt-16 sm:px-6">
        <Kicker>Legal</Kicker>
        <h1 className="mt-4 text-balance text-[2.25rem]/[1.1] font-medium tracking-[-0.02em] text-gray-900 dark:text-white sm:text-5xl/[1.1]">
          Terms of service.
        </h1>
        <p className="mt-4 font-mono text-xs tracking-tight text-gray-400 dark:text-gray-500">
          Last updated: {LAST_UPDATED}
        </p>

        <div className="mt-12 space-y-10">
          <Section index={1} title="About the app">
            <p>
              DegreeIntelligence is a fun, open, student-built tool designed to
              help Yale students visualize and plan their academic trajectories.
              We built it because we use it ourselves and decided to share it
              with the Yale community. It lets you upload a transcript and/or
              write in courses and grades by hand so you can track progress and
              plan ahead.
            </p>
            <p>
              This app is{" "}
              <Strong>
                not affiliated with Yale University, Yale College, or
                DegreeAudit
              </Strong>{" "}
              in any way, shape, or form. It is not an official Yale student
              group or university service.
            </p>
            <p>
              <Strong>DegreeIntelligence is free forever.</Strong> We stand to
              make no money from this. In fact we lose money running it, and we
              will never charge a dime for it.
            </p>
          </Section>

          <Section index={2} title="Eligibility">
            <List>
              <li>Be a current or former Yale student</li>
              <li>Log in using your @yale.edu Google account</li>
              <li>Be at least 13 years old</li>
            </List>
          </Section>

          <Section index={3} title="User accounts">
            <p>
              You agree to provide accurate account information and to keep it
              secure. You are responsible for all activity that occurs under
              your login.
            </p>
          </Section>

          <Section index={4} title="Data privacy">
            <p>We take your data seriously. Here&apos;s what you should know:</p>
            <List>
              <li>
                By uploading a transcript or writing in courses and grades, you{" "}
                <Strong>voluntarily</Strong> share that academic data with us.
              </li>
              <li>
                <Strong>We do NOT store your raw transcript PDF</Strong> after
                parsing.
              </li>
              <li>
                <Strong>
                  We DO store structured course and grade data on our servers
                </Strong>{" "}
                (private to your account). That storage is essential for
                progress tracking, the Simulator, and related planning features.
              </li>
              <li>
                Course text from a transcript upload may be sent to OpenAI
                solely to extract structured course records.
              </li>
              <li>
                This information is used solely to provide insights and planning
                tools within the app. We do not sell your data.
              </li>
            </List>
            <p>
              Our infrastructure uses Firebase for authentication and storage.
              Transcript parsing is the only feature that sends anything to a
              model provider, and it sends only the transcript text needed to
              extract your courses. We do not share or sell your data to third
              parties. You may request data deletion at any time by emailing{" "}
              <MailLink address={CONTACT_EMAILS[0]} />.
            </p>
          </Section>

          <Section index={5} title="No guarantees">
            <p>
              This tool is provided <Strong>as-is</Strong>, with no guarantees.
              This includes but is not limited to:
            </p>
            <List>
              <li>Accuracy of course or GPA calculations</li>
              <li>Correctness of feedback or suggestions</li>
              <li>Fulfillment of Yale degree requirements</li>
              <li>Outcomes from decisions made using the app</li>
            </List>
            <p>
              We are not responsible for any loss, error, or misinterpretation
              arising from use of the app.
            </p>
          </Section>

          <Section index={6} title="Acceptable use">
            <p>You agree not to:</p>
            <List>
              <li>
                Attempt to gain unauthorized access to the app or other accounts
              </li>
              <li>Reverse-engineer, scrape, or tamper with the system</li>
              <li>Use the app for any unlawful or harmful purpose</li>
            </List>
            <p>
              We reserve the right to suspend or ban accounts that violate these
              terms.
            </p>
          </Section>

          <Section index={7} title="Intellectual property">
            <p>
              All content on the app (except user-submitted data) is the
              property of the creators of Yale DegreeIntelligence. You may not
              copy, distribute, or modify content without permission.
            </p>
          </Section>

          <Section index={8} title="Changes to the terms">
            <p>
              We may update these Terms from time to time. When we do, we&rsquo;ll
              update the date at the top of this page. Continued use of the app
              after changes means you accept the new terms.
            </p>
          </Section>

          <Section index={9} title="Governing law">
            <p>
              These Terms are governed by the laws of the State of Connecticut,
              United States.
            </p>
          </Section>

          <Section index={10} title="Contact">
            <p>For questions or data deletion requests, contact us:</p>
            <List>
              {CONTACT_EMAILS.map((address) => (
                <li key={address}>
                  <MailLink address={address} />
                </li>
              ))}
            </List>
          </Section>
        </div>
      </main>

      <StaticPageFooter />
    </StaticPageShell>
  );
}
