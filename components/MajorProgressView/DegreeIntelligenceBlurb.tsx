import { motion } from "framer-motion";

export default function DegreeIntelligence() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="p-5 rounded-xl bg-gradient-to-br from-gray-800/50 to-gray-900/50 border border-gray-700/50 shadow-neumorphic"
    >
      <div className="flex items-start gap-3">
        <div className="flex-shrink-0">
          <div className="relative">
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center text-white shadow-lg">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="currentColor"
                className="w-5 h-5"
              >
                <path d="M16.5 7.5h-9v9h9v-9z" />
                <path
                  fillRule="evenodd"
                  d="M8.25 2.25A.75.75 0 019 3v.75h2.25V3a.75.75 0 011.5 0v.75H15V3a.75.75 0 011.5 0v.75h.75a3 3 0 013 3v.75H21A.75.75 0 0121 9h-.75v2.25H21a.75.75 0 010 1.5h-.75V15H21a.75.75 0 010 1.5h-.75v.75a3 3 0 01-3 3h-.75V21a.75.75 0 01-1.5 0v-.75h-2.25V21a.75.75 0 01-1.5 0v-.75H9V21a.75.75 0 01-1.5 0v-.75h-.75a3 3 0 01-3-3v-.75H3A.75.75 0 013 15h.75v-2.25H3a.75.75 0 010-1.5h.75V9H3a.75.75 0 010-1.5h.75v-.75a3 3 0 013-3h.75V3a.75.75 0 01.75-.75zM6 6.75A.75.75 0 016.75 6h10.5a.75.75 0 01.75.75v10.5a.75.75 0 01-.75.75H6.75a.75.75 0 01-.75-.75V6.75z"
                  clipRule="evenodd"
                />
              </svg>
            </div>
            <div className="absolute -bottom-1 -right-1 bg-emerald-500 text-white text-xs px-1.5 py-0.5 rounded-full border-2 border-gray-900">
              AI
            </div>
          </div>
        </div>
        <div className="flex-1">
          <h4 className="font-medium text-white/90 flex items-center gap-2">
            Degree Intelligence
            <span className="text-xs bg-emerald-500/20 text-emerald-300 px-2 py-0.5 rounded-full">
              Beta
            </span>
          </h4>
          <div className="mt-2 text-sm text-gray-300 space-y-2">
            <p>
              Based on your current progress, you're{" "}
              <span className="font-medium text-white">on track</span> to
              complete your major in 4 semesters.
            </p>
            <p>
              Consider taking{" "}
              <span className="font-medium text-blue-300">CS 301</span> next
              term—students who complete it early have 25% higher graduation
              rates.
            </p>
            <p className="text-xs text-gray-400 mt-3">
              Analysis updated: {new Date().toLocaleDateString()}
            </p>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
