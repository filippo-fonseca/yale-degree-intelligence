"use client";

import { FiBarChart2, FiGrid, FiUpload } from "react-icons/fi";
import ProductFrame from "./ProductFrame";
import {
  ProgressBar,
  RequirementPill,
  SimulatorMock,
} from "./LandingMocks";

const STEPS = [
  {
    number: "01",
    title: "Import your transcript",
    description:
      "Connect with CAS and pull courses automatically — no more copy-pasting from Yale Hub into a fragile spreadsheet.",
    icon: FiUpload,
    mock: (
      <div className="space-y-3 p-5">
        <div className="rounded-2xl border border-dashed border-gray-200 bg-gradient-to-br from-gray-50 to-white p-6 text-center dark:border-gray-700 dark:from-gray-900/50 dark:to-gray-950/40">
          <FiUpload className="mx-auto mb-2 text-pink-500" size={20} />
          <p className="font-sf text-xs text-gray-500">Transcript imported</p>
          <p className="mt-1 font-louize text-base font-medium text-gray-900 dark:text-white">
            16 courses · 18.5 credits
          </p>
        </div>
        <div className="flex flex-wrap justify-center gap-1.5">
          <RequirementPill label="CPSC 201" credits={1} status="complete" />
          <RequirementPill label="MATH 120" credits={1} status="complete" />
          <RequirementPill label="PHYS 180" credits={1} status="in-progress" />
        </div>
      </div>
    ),
  },
  {
    number: "02",
    title: "See major progress",
    description:
      "Requirement bars and status-colored cards show what’s done, what’s in flight, and what’s left — at a glance.",
    icon: FiBarChart2,
    mock: (
      <div className="space-y-3 p-5">
        <div className="space-y-2">
          <div className="flex justify-between font-sf text-[11px] text-gray-500">
            <span>Completed</span>
            <span className="text-blue-600 dark:text-blue-300">42%</span>
          </div>
          <ProgressBar percent={42} />
        </div>
        <div className="space-y-2">
          <div className="flex justify-between font-sf text-[11px] text-gray-500">
            <span>With in-progress</span>
            <span className="text-purple-600 dark:text-purple-300">67%</span>
          </div>
          <ProgressBar percent={67} />
        </div>
        <div className="flex flex-wrap gap-1.5 pt-1">
          <RequirementPill label="Core" status="complete" />
          <RequirementPill label="Elective" status="in-progress" />
          <RequirementPill label="Senior" status="not-taken" />
        </div>
      </div>
    ),
  },
  {
    number: "03",
    title: "Plan with the Simulator",
    description:
      "Drag courses into semesters, save multiple plans, and stress-test distributionals without breaking your path.",
    icon: FiGrid,
    mock: <SimulatorMock />,
  },
];

interface LandingStepsProps {
  onLogin?: () => void;
}

export default function LandingSteps({ onLogin }: LandingStepsProps) {
  return (
    <section className="py-20 sm:py-28">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <div className="mx-auto mb-16 max-w-2xl text-center">
          <p className="font-sf text-xs font-medium uppercase tracking-[0.18em] text-gray-500 dark:text-gray-400">
            How it works
          </p>
          <h2 className="mt-3 font-louize text-3xl font-medium tracking-tight text-gray-900 dark:text-white sm:text-4xl">
            From chaos to a clear plan
          </h2>
        </div>

        <div className="space-y-20 sm:space-y-28">
          {STEPS.map((step, i) => {
            const Icon = step.icon;
            const reverse = i % 2 === 1;
            return (
              <div
                key={step.number}
                className={`grid items-center gap-10 lg:grid-cols-2 lg:gap-16 ${
                  reverse ? "lg:[&>*:first-child]:order-2" : ""
                }`}
              >
                <div>
                  <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-pink-200/70 bg-pink-50/80 px-3 py-1 font-sf text-[11px] font-medium text-pink-600 dark:border-pink-500/20 dark:bg-pink-500/10 dark:text-pink-300">
                    <Icon size={12} />
                    Step {step.number}
                  </div>
                  <h3 className="font-louize text-2xl font-medium tracking-tight text-gray-900 dark:text-white sm:text-3xl">
                    {step.title}
                  </h3>
                  <p className="mt-3 max-w-md font-sf text-base leading-relaxed text-gray-600 dark:text-gray-300">
                    {step.description}
                  </p>
                  {onLogin && i === 2 && (
                    <button
                      onClick={onLogin}
                      className="mt-6 rounded-full bg-pink-500 px-5 py-2 font-sf text-sm font-medium text-white transition hover:bg-pink-600"
                    >
                      Try it free
                    </button>
                  )}
                </div>
                <ProductFrame showChrome={false} className="max-w-md lg:max-w-none">
                  {step.mock}
                </ProductFrame>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
