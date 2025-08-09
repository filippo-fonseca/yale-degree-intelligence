"use client";

import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { FiSend, FiRefreshCw, FiUser, FiChevronDown } from "react-icons/fi";
import { useAuth } from "@/context/AuthContext";
import { Course } from "@/lib/types";
import { calculateMajorProgress, MAJORS } from "@/lib/majors";
import { getCourseNameFromCode } from "@/lib/courseCatalog";
import { getGPAColor } from "@/lib/utils/utils";
import LogoIcon from "@/icons/LogoIcon";

interface Message {
  id: string;
  content: string;
  role: "user" | "assistant";
  timestamp: Date;
}

interface CleoAITabProps {
  courses: Course[];
  selectedMajor: string;
  userProfile: any;
  stats: any;
}

export default function CleoAITab({
  courses,
  selectedMajor,
  userProfile,
  stats,
}: CleoAITabProps) {
  const { user } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [showContextMenu, setShowContextMenu] = useState(false);

  // Calculate major progress for context
  const majorProgress = calculateMajorProgress(
    selectedMajor,
    courses
      .filter(
        (course) =>
          course.status === "completed" &&
          ((course.grade !== null && course.grade !== "In Progress") ||
            course.skipped)
      )
      .map((course) => course.code),
    courses
      .filter((course) => course.grade === "In Progress" && !course.skipped)
      .map((course) => course.code),
    courses.filter((course) => course.skipped).map((course) => course.code),
    courses.flatMap((course) =>
      (course.manualRequirementsFulfilled || [])
        .filter((m) => m.major_id === selectedMajor)
        .map((m) => ({
          code: course.code,
          requirement: m.requirement_title,
          credits: course.credits || 1,
        }))
    )
  );

  // Initial system message with user context
  useEffect(() => {
    if (user && courses.length > 0 && !messages.length) {
      const initialMessage = createSystemMessage();
      setMessages([initialMessage]);
    }
  }, [user, courses]);

  const createSystemMessage = (): Message => {
    const completedCredits = majorProgress?.completedCredits || 0;
    const totalCredits = majorProgress?.totalCredits || 0;
    const completionPercentage = majorProgress?.percentage || 0;
    const gpa = stats?.gpa || "N/A";

    return {
      id: "system-init",
      content: `Hello ${
        user?.displayName?.split(" ")[0] || "there"
      }! I'm CleoAI, your personalized academic assistant. Here's what I know about your Yale journey:

- **Major**: ${selectedMajor} (${MAJORS[selectedMajor] || ""})
- **Progress**: ${completedCredits}/${totalCredits} credits (${completionPercentage.toFixed(
        0
      )}% complete)
- **Cumulative GPA**: ${gpa}
- **Completed Courses**: ${
        courses.filter((c) => c.status === "completed").length
      }
- **In Progress**: ${courses.filter((c) => c.status === "in-progress").length}

How can I help you with your academic planning today?`,
      role: "assistant",
      timestamp: new Date(),
    };
  };

  const handleSendMessage = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      content: input,
      role: "user",
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setIsLoading(true);

    try {
      // Prepare context for the AI
      const context = {
        user: {
          name: user?.displayName,
          email: user?.email,
          graduationYear: userProfile?.graduationYear,
          majors: userProfile?.majors,
        },
        academicData: {
          courses: courses.map((c) => ({
            code: c.code,
            name: getCourseNameFromCode(c.code),
            semester: c.semester,
            year: c.year,
            grade: c.grade,
            credits: c.credits,
            status: c.status,
          })),
          stats,
          majorProgress,
        },
        conversationHistory: messages.slice(-4), // Send last 4 messages for context
      };

      // Call your AI API here
      const response = await fetch("/api/cleoai", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          prompt: input,
          context: JSON.stringify(context),
        }),
      });

      const data = await response.json();

      const aiMessage: Message = {
        id: Date.now().toString(),
        content: data.response,
        role: "assistant",
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, aiMessage]);
    } catch (error) {
      console.error("Error calling CleoAI:", error);
      const errorMessage: Message = {
        id: Date.now().toString(),
        content: "Sorry, I encountered an error. Please try again.",
        role: "assistant",
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const resetConversation = () => {
    setMessages([createSystemMessage()]);
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="mb-6 flex items-start justify-between">
        <div className="m-0">
          <h2 className="text-3xl m-0 font-medium bg-clip-text text-transparent bg-gradient-to-r from-blue-200 to-purple-200">
            CleoAI – Context-Powered Academic Insight
          </h2>
          <p className="text-gray-400 mt-2">
            More than just a chatbot – CleoAI is your tailored academic advisor,
            powered by your actual transcript data.
          </p>
        </div>

        <div className="relative">
          <button
            onClick={() => setShowContextMenu(!showContextMenu)}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-gray-900/50 border border-gray-800 hover:border-gray-700 text-gray-300 hover:text-white transition-all"
          >
            <LogoIcon className="w-4 h-4" />
            <span>Options</span>
            <FiChevronDown
              className={`transition-transform ${
                showContextMenu ? "rotate-180" : ""
              }`}
            />
          </button>

          <AnimatePresence>
            {showContextMenu && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 10 }}
                className="absolute right-0 mt-2 w-48 bg-gray-900 rounded-lg shadow-lg border border-gray-800 z-10"
              >
                <button
                  onClick={resetConversation}
                  className="w-full text-left px-4 py-2 text-sm text-gray-300 hover:bg-gray-800 transition-colors flex items-center gap-2"
                >
                  <FiRefreshCw size={14} />
                  Reset Conversation
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Chat Container */}
      <div className="flex-1 overflow-y-auto mb-4 space-y-6">
        {messages.map((message) => (
          <motion.div
            key={message.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className={`flex ${
              message.role === "user" ? "justify-end" : "justify-start"
            }`}
          >
            <div
              className={`max-w-[80%] rounded-xl p-4 ${
                message.role === "user"
                  ? "bg-blue-900/30 text-blue-100 border border-blue-800"
                  : "bg-gray-800/50 text-gray-200 border border-gray-700"
              }`}
            >
              {message.role === "assistant" && (
                <div className="flex items-center gap-2 mb-2">
                  <LogoIcon className="w-4 h-4" />
                  <span className="text-xs font-medium text-gray-400">
                    CleoAI
                  </span>
                </div>
              )}
              <div className="whitespace-pre-wrap">{message.content}</div>
              <div className="text-xs text-gray-500 mt-2 text-right">
                {message.timestamp.toLocaleTimeString([], {
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </div>
            </div>
          </motion.div>
        ))}
        {isLoading && (
          <div className="flex justify-start">
            <div className="max-w-[80%] rounded-xl p-4 bg-gray-800/50 text-gray-200 border border-gray-700">
              <div className="flex items-center gap-2">
                <LogoIcon className="w-4 h-4" />
                <span className="text-xs font-medium text-gray-400">
                  CleoAI is thinking...
                </span>
              </div>
              <div className="flex space-x-2 mt-2">
                <div className="w-2 h-2 rounded-full bg-gray-500 animate-bounce"></div>
                <div className="w-2 h-2 rounded-full bg-gray-500 animate-bounce delay-100"></div>
                <div className="w-2 h-2 rounded-full bg-gray-500 animate-bounce delay-200"></div>
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="sticky bottom-0 bg-gray-950/80 backdrop-blur-sm pt-4 border-t border-gray-800">
        <div className="relative">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask CleoAI about your academic progress, requirements, or planning..."
            className="w-full px-4 py-3 pr-12 bg-gray-900/50 border border-gray-800 rounded-xl text-gray-200 focus:outline-none focus:ring-2 focus:ring-purple-500/30 focus:border-purple-500 resize-none"
            rows={2}
            disabled={isLoading}
          />
          <button
            onClick={handleSendMessage}
            disabled={!input.trim() || isLoading}
            className={`absolute right-3 bottom-3 p-2 rounded-lg ${
              input.trim()
                ? "bg-purple-600 text-white hover:bg-purple-700"
                : "bg-gray-800 text-gray-500 cursor-not-allowed"
            } transition-colors`}
          >
            <FiSend />
          </button>
        </div>
        <p className="text-xs text-gray-500 mt-2 text-center">
          CleoAI has access to your academic data to provide personalized
          advice.
        </p>
      </div>
    </div>
  );
}
