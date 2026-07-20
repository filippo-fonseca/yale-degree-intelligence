"use client";

import { FiExternalLink, FiGithub, FiMail } from "react-icons/fi";

const TEAM = [
  {
    name: "Filippo Fonseca",
    role: "Founder | Mechanical Engineering (ABET) & EECS '28",
    bio: "Built the first version as a shell script after one too many long sessions trying to plan courses. Talks too much.",
    contact: "filippo.fonseca@yale.edu",
    photoRoute: "/team/filippo.jpeg",
    github: "https://github.com/filippo-fonseca",
    website: "https://filippofonseca.com",
  },
  {
    name: "Emir Ahmed",
    role: "Development | Electrical Engineering & CS (EECS) '28",
    bio: "Joined forces to continue scaling the platform and make it more robust.",
    contact: "emir.ahmed@yale.edu",
    photoRoute: "/team/emir.JPG",
    github: "https://github.com/EmirataG",
    website: "",
  },
];

export default function LandingTeam() {
  return (
    <section id="team" className="scroll-mt-28 py-20 sm:py-28">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <div className="mx-auto mb-12 max-w-2xl text-center">
          <p className="font-sf text-xs font-medium uppercase tracking-[0.18em] text-gray-500 dark:text-gray-400">
            The team
          </p>
          <h2 className="mt-3 font-louize text-3xl font-medium tracking-tight text-gray-900 dark:text-white sm:text-4xl">
            Built by Yalies who hit the same wall
          </h2>
          <p className="mx-auto mt-3 max-w-xl font-sf text-base text-gray-600 dark:text-gray-300">
            Two students tired of spreadsheet hell who decided to publish the
            tool they wished existed.
          </p>
        </div>

        <div className="mx-auto grid max-w-3xl gap-5 sm:grid-cols-2">
          {TEAM.map((person) => (
            <article
              key={person.name}
              className="rounded-2xl border border-black/[0.06] bg-white/80 p-5 shadow-neu backdrop-blur-md dark:border-white/[0.08] dark:bg-gradient-to-br dark:from-gray-900/70 dark:via-gray-900/45 dark:to-gray-950/70"
            >
              <div className="mb-4 flex items-center gap-3">
                <img
                  src={person.photoRoute}
                  alt={person.name}
                  className="h-12 w-12 rounded-full border-2 border-pink-200 object-cover dark:border-pink-500/30"
                />
                <div>
                  <h3 className="font-louize text-base font-medium text-gray-900 dark:text-white">
                    {person.name}
                  </h3>
                  <p className="font-sf text-xs text-blue-600 dark:text-blue-300">
                    {person.role}
                  </p>
                </div>
              </div>
              <p className="mb-4 font-sf text-sm leading-relaxed text-gray-600 dark:text-gray-300">
                {person.bio}
              </p>
              <div className="flex flex-wrap gap-2">
                <a
                  href={`mailto:${person.contact}`}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-black/[0.06] px-2.5 py-1 font-sf text-xs text-gray-600 transition hover:border-black/[0.12] hover:text-gray-900 dark:border-white/[0.08] dark:text-gray-400 dark:hover:text-white"
                >
                  <FiMail size={12} /> Email
                </a>
                <a
                  href={person.github}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 rounded-lg border border-black/[0.06] px-2.5 py-1 font-sf text-xs text-gray-600 transition hover:border-black/[0.12] hover:text-gray-900 dark:border-white/[0.08] dark:text-gray-400 dark:hover:text-white"
                >
                  <FiGithub size={12} /> GitHub
                </a>
                {person.website && (
                  <a
                    href={person.website}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 rounded-lg border border-black/[0.06] px-2.5 py-1 font-sf text-xs text-gray-600 transition hover:border-black/[0.12] hover:text-gray-900 dark:border-white/[0.08] dark:text-gray-400 dark:hover:text-white"
                  >
                    <FiExternalLink size={12} /> Website
                  </a>
                )}
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
