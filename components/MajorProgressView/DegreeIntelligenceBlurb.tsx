import { motion } from "framer-motion";
import { useEffect, useState } from "react";
import { collection, query, where, getDocs } from "firebase/firestore";
import { Timestamp } from "firebase/firestore";
import { db } from "@/config/firebase";
import { useAuth } from "@/context/AuthContext";

type Major = {
  id: string;
  name: string;
};

type AdviceParams = {
  selectedMajor: Major[];
  graduationYear: string;
  currentDate: string;
  currentSemester: string;
  currentYear: string;
};

type AIAdvice = {
  id: string;
  advice: string;
  userId: string;
  dateGenerated: Timestamp;
  params: AdviceParams;
};

export default function DegreeIntelligence() {
  const [advice, setAdvice] = useState<AIAdvice | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const { user } = useAuth();

  // useEffect(() => {
  //   const fetchUserAdvice = async () => {
  //     if (!user?.uid) return;

  //     try {
  //       const adviceRef = collection(db, "ai_responses");
  //       const q = query(adviceRef, where("userId", "==", user.uid));

  //       const querySnapshot = await getDocs(q);

  //       if (!querySnapshot.empty) {
  //         // Convert to array of advice with ids
  //         const allAdvice = querySnapshot.docs.map((doc) => ({
  //           id: doc.id,
  //           ...doc.data(),
  //         })) as AIAdvice[];

  //         // Sort by dateGenerated (newest first)
  //         const sortedAdvice = [...allAdvice].sort(
  //           (a, b) => b.dateGenerated.toMillis() - a.dateGenerated.toMillis()
  //         );

  //         setAdvice(sortedAdvice[0]);
  //       }
  //     } catch (err) {
  //       console.error("Error fetching advice:", err);
  //     } finally {
  //       setLoading(false);
  //     }
  //   };

  //   fetchUserAdvice();
  // }, [user?.uid]);

  //TODO: remove this once the AI is implemented!!
  useEffect(() => {
    setLoading(false);
  }, []);

  if (loading) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="p-5 rounded-xl bg-gray-50 dark:bg-transparent dark:bg-gradient-to-br dark:from-gray-800/50 dark:to-gray-900/50 border border-gray-200 dark:border-gray-700/50 shadow-neumorphic"
      >
        <div className="flex items-center gap-3">
          <div className="animate-pulse w-10 h-10 rounded-lg bg-gray-200 dark:bg-gray-700/50"></div>
          <div className="space-y-2 flex-1">
            <div className="animate-pulse h-4 w-1/3 rounded bg-gray-200 dark:bg-gray-700/50"></div>
            <div className="animate-pulse h-3 w-full rounded bg-gray-200 dark:bg-gray-700/50"></div>
            <div className="animate-pulse h-3 w-2/3 rounded bg-gray-200 dark:bg-gray-700/50"></div>
          </div>
        </div>
      </motion.div>
    );
  }

  // if (!advice) {
  //   return (
  //     <motion.div
  //       initial={{ opacity: 0, y: 20 }}
  //       animate={{ opacity: 1, y: 0 }}
  //       className="p-5 rounded-xl bg-gradient-to-br from-gray-800/50 to-gray-900/50 border border-gray-700/50 shadow-neumorphic"
  //     >
  //       <div className="text-gray-400 text-sm">
  //         No advice found for your account
  //       </div>
  //     </motion.div>
  //   );
  // }

  // const formattedDate = advice.dateGenerated.toDate().toLocaleDateString();

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="p-5 rounded-xl bg-gray-50 dark:bg-transparent dark:bg-gradient-to-br dark:from-gray-800/50 dark:to-gray-900/50 border border-gray-200 dark:border-gray-700/50 shadow-neumorphic"
    >
      <div className="flex items-start gap-5">
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
            <div className="absolute -bottom-2 -right-3 bg-purple-500 text-white text-xs px-1.5 py-0.5 rounded-full border-2 border-white dark:border-gray-900">
              AI
            </div>
          </div>
        </div>
        <div className="flex-1">
          <h4 className="font-medium text-gray-900 dark:text-white/90 flex items-center gap-2">
            Cleo
            <span className="text-xs bg-purple-500/20 text-purple-300 px-2 py-0.5 rounded-full">
              Beta
            </span>
          </h4>
          <div className="mt-2 text-sm text-gray-700 dark:text-gray-300 space-y-2">
            {/* <p>{advice.advice}</p> */}
            <p>
              I'm coming to your DegreeIntelligence platform soon! Stay tuned.
              {" :)"}
            </p>
            {/* <p className="text-xs text-gray-400 mt-3">
              Analysis updated: {formattedDate}
            </p> */}
          </div>
        </div>
      </div>
    </motion.div>
  );
}
