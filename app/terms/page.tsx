export default function TermsOfService() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-blue-900/80 to-purple-900 text-gray-200 px-6 py-12 font-louize relative">
      {/* Access Platform Button - Top Right */}
      <div className="fixed top-6 right-6 z-50">
        <a
          href="/"
          target="_blank"
          className="flex items-center gap-2 px-4 py-2 border border-blue-500 bg-blue-500/30 hover:bg-blue-500/40 backdrop-blur-md rounded-lg text-white font-medium transition-all shadow-sm hover:shadow-md"
        >
          <span>Access Platform</span>
          <svg
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth="1.5"
            stroke="currentColor"
            className="w-4 h-4 opacity-80"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3"
            />
          </svg>
        </a>
      </div>

      <div className="max-w-4xl mx-auto space-y-8">
        <h1 className="text-4xl font-bold text-blue-200">Terms of Service</h1>
        <p className="text-sm text-gray-400">Last updated: July 29, 2025</p>

        <section>
          <h2 className="text-2xl font-semibold text-purple-300">
            1. About the App
          </h2>
          <p>
            Yale DegreeIntelligence is a student-built tool designed to help
            Yale students visualize and plan their academic trajectories. It
            allows users to upload transcript data, which we parse into course
            and grade records to track academic progress. This app is
            student-run, free to use, and{" "}
            <strong>not officially affiliated with Yale University</strong>.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-semibold text-purple-300">
            2. Eligibility
          </h2>
          <ul className="list-disc list-inside space-y-1">
            <li>Be a current or former Yale student</li>
            <li>Log in using your Yale credentials (CAS)</li>
            <li>Be at least 13 years old</li>
          </ul>
        </section>

        <section>
          <h2 className="text-2xl font-semibold text-purple-300">
            3. User Accounts
          </h2>
          <p>
            You agree to provide accurate account information and to keep it
            secure. You are responsible for all activity that occurs under your
            login.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-semibold text-purple-300">
            4. Data Privacy
          </h2>
          <p>We take your data seriously. Here's what you should know:</p>
          <ul className="list-disc list-inside space-y-1">
            <li>
              <strong>We do not store your raw transcript documents.</strong>
            </li>
            <li>
              <strong>
                We do store structured data extracted from transcripts
              </strong>
              , such as courses, semesters, grades, and majors.
            </li>
            <li>
              This information is used solely to provide insights and planning
              tools within the app.
            </li>
          </ul>
          <p>
            Our infrastructure uses Firebase for authentication and storage, and
            OpenAI APIs for intelligent feedback features. We do not share or
            sell your data to third parties. You may request data deletion at
            any time by emailing{" "}
            <a
              className="text-blue-400 hover:underline"
              href="mailto:filippo.fonseca@yale.edu"
            >
              filippo.fonseca@yale.edu
            </a>
            .
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-semibold text-purple-300">
            5. No Guarantees
          </h2>
          <p>
            This tool is provided <strong>as-is</strong>, with no guarantees.
            This includes but is not limited to:
          </p>
          <ul className="list-disc list-inside space-y-1">
            <li>Accuracy of course or GPA calculations</li>
            <li>Correctness of feedback or suggestions</li>
            <li>Fulfillment of Yale degree requirements</li>
            <li>Outcomes from decisions made using the app</li>
          </ul>
          <p>
            We are not responsible for any loss, error, or misinterpretation
            arising from use of the app.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-semibold text-purple-300">
            6. Acceptable Use
          </h2>
          <p>You agree not to:</p>
          <ul className="list-disc list-inside space-y-1">
            <li>
              Attempt to gain unauthorized access to the app or other accounts
            </li>
            <li>Reverse-engineer, scrape, or tamper with the system</li>
            <li>Use the app for any unlawful or harmful purpose</li>
          </ul>
          <p>
            We reserve the right to suspend or ban accounts that violate these
            terms.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-semibold text-purple-300">
            7. Intellectual Property
          </h2>
          <p>
            All content on the app (except user-submitted data) is the property
            of the creators of Yale DegreeIntelligence. You may not copy,
            distribute, or modify content without permission.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-semibold text-purple-300">
            8. Changes to the Terms
          </h2>
          <p>
            We may update these Terms from time to time. When we do, we’ll
            update the date at the top of this page. Continued use of the app
            after changes means you accept the new terms.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-semibold text-purple-300">
            9. Governing Law
          </h2>
          <p>
            These Terms are governed by the laws of the State of Connecticut,
            United States.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-semibold text-purple-300">
            10. Contact
          </h2>
          <p>For questions or data deletion requests, contact us:</p>
          <ul className="list-inside">
            <li>
              📧{" "}
              <a
                className="text-blue-400 hover:underline"
                href="mailto:filippo.fonseca@yale.edu"
              >
                filippo.fonseca@yale.edu
              </a>
            </li>
            <li>
              📧{" "}
              <a
                className="text-blue-400 hover:underline"
                href="mailto:emir.ahmed@yale.edu"
              >
                emir.ahmed@yale.edu
              </a>
            </li>
          </ul>
        </section>
      </div>
    </div>
  );
}
