"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import { FiSend, FiRefreshCw } from "react-icons/fi";
import { useAuth } from "@/context/AuthContext";
import { Course, Message } from "@/lib/types";
import { calculateMajorProgress } from "@/lib/majors";
import { getCourseNameFromCode } from "@/lib/courseCatalog";
import BulldogIcon from "@/icons/BulldogIcon";
import { db } from "@/config/firebase";
import { doc, getDoc, setDoc } from "firebase/firestore";
import ReactMarkdown from "react-markdown";

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
  const [isInitialized, setIsInitialized] = useState(false);
  const [contextHash, setContextHash] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Calculate progress for ALL majors (for double majors)
  const completedCodes = courses.filter((c) => c.status === "completed" && c.grade !== "In Progress").map((c) => c.code);
  const inProgressCodes = courses.filter((c) => c.status === "in-progress" || c.grade === "In Progress").map((c) => c.code);
  const skippedCodes = courses.filter((c) => c.skipped).map((c) => c.code);

  const allMajorProgress: Record<string, any> = {};
  const userMajors = userProfile?.majors || [selectedMajor];

  for (const majorId of userMajors) {
    const manualReqs = courses.flatMap((c) =>
      (c.manualRequirementsFulfilled || [])
        .filter((m) => m.major_id === majorId)
        .map((m) => ({ code: c.code, requirement: m.requirement_title, credits: c.credits || 1 }))
    );
    allMajorProgress[majorId] = calculateMajorProgress(majorId, completedCodes, inProgressCodes, skippedCodes, manualReqs);
  }

  // Primary major progress for welcome message
  const majorProgress = allMajorProgress[selectedMajor];

  // Generate context hash to detect data changes
  const currentHash = `${stats?.totalCredits}-${stats?.completedCourses}`;

  // Load conversation from Firestore (single conversation per user)
  useEffect(() => {
    if (!user) return;

    const loadConversation = async () => {
      try {
        const docRef = doc(db, "cleoai_conversations", user.uid);
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
          const data = docSnap.data();
          const loadedMessages = data.messages || [];
          if (loadedMessages.length > 0) {
            setMessages(loadedMessages);
            setContextHash(data.contextHash || "");
          }
        }
      } catch (error) {
        console.error("Error loading conversation:", error);
      } finally {
        setIsInitialized(true);
      }
    };

    loadConversation();
  }, [user]);

  // Save conversation to Firestore
  const saveConversation = async (newMessages: Message[], hash: string) => {
    if (!user) return;

    try {
      await setDoc(doc(db, "cleoai_conversations", user.uid), {
        messages: newMessages,
        contextHash: hash,
        updatedAt: new Date().toISOString(),
      });
    } catch (error) {
      console.error("Error saving conversation:", error);
    }
  };

  // Create welcome message
  const createWelcomeMessage = useCallback((): Message => {
    const majors = userProfile?.majors || [selectedMajor];
    const isDoubleMajor = majors.length > 1;

    let progressText = "";
    if (isDoubleMajor) {
      progressText = majors.map((m: string) => `${m}: ${allMajorProgress[m]?.percentage?.toFixed(0) || 0}%`).join(", ");
    } else {
      progressText = `${majorProgress?.percentage?.toFixed(0) || 0}% done`;
    }

    return {
      id: "welcome",
      content: `Woof! Hey ${user?.displayName?.split(" ")[0] || "there"}! I'm Dan, your Yale bulldog advisor. 🐾

I can see you're ${isDoubleMajor ? `double majoring in **${majors.join(" + ")}**` : `majoring in **${selectedMajor}**`} with a **${stats?.gpa || "N/A"} GPA**.

${isDoubleMajor ? `Progress: ${progressText}` : `Major progress: ${progressText}`}

What can I help you with? I can help plan your schedule, find courses that count for both majors, or figure out what you still need to graduate.`,
      role: "assistant",
      timestamp: new Date().toISOString(),
    };
  }, [user, selectedMajor, majorProgress, allMajorProgress, stats, userProfile]);

  // Start fresh conversation
  const resetConversation = async () => {
    const welcome = createWelcomeMessage();
    setMessages([welcome]);
    setContextHash(currentHash);
    await saveConversation([welcome], currentHash);
  };

  // Initialize if no messages (after load completes)
  useEffect(() => {
    if (user && isInitialized && messages.length === 0) {
      resetConversation();
    }
  }, [user, isInitialized]);

  const handleSendMessage = async () => {
    if (!input.trim() || isLoading || !user) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      content: input,
      role: "user",
      timestamp: new Date().toISOString(),
    };

    const updatedMessages = [...messages, userMessage];
    setMessages(updatedMessages);
    setInput("");
    setIsLoading(true);

    try {
      const context = {
        user: {
          name: user.displayName,
          email: user.email,
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
            skipped: c.skipped,
          })),
          stats: {
            gpa: stats?.gpa,
            totalCredits: stats?.totalCredits,
            completedCourses: stats?.completedCourses,
            inProgressCourses: stats?.inProgressCourses,
          },
          majorProgress,
          allMajorProgress, // Progress for ALL majors (double major support)
        },
        lastContextHash: contextHash,
        // Send last 20 messages for good conversation memory
        conversationHistory: messages.slice(-20).map((m) => ({
          role: m.role,
          content: m.content,
        })),
      };

      const response = await fetch("/api/cleoai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: input,
          context: JSON.stringify(context),
        }),
      });

      const data = await response.json();

      if (data.error) throw new Error(data.error);

      const aiMessage: Message = {
        id: (Date.now() + 1).toString(),
        content: data.response,
        role: "assistant",
        timestamp: new Date().toISOString(),
      };

      const finalMessages = [...updatedMessages, aiMessage];
      setMessages(finalMessages);
      setContextHash(currentHash);
      await saveConversation(finalMessages, currentHash);
    } catch (error) {
      console.error("Error:", error);
      const errorMsg: Message = {
        id: (Date.now() + 1).toString(),
        content: "Sorry, something went wrong. Please try again.",
        role: "assistant",
        timestamp: new Date().toISOString(),
      };
      setMessages([...updatedMessages, errorMsg]);
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

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <BulldogIcon className="w-10 h-10 text-blue-400" />
          <div>
            <h2 className="text-2xl font-medium bg-clip-text text-transparent bg-gradient-to-r from-blue-300 to-blue-100">
              Handsome Dan
            </h2>
            <p className="text-gray-400 text-sm">Your Yale bulldog advisor</p>
          </div>
        </div>
        <button
          onClick={resetConversation}
          className="p-2 rounded-lg hover:bg-gray-800 text-gray-400 hover:text-white transition-colors"
          title="Reset conversation"
        >
          <FiRefreshCw size={18} />
        </button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto space-y-4 mb-4">
        {messages.map((message) => (
          <motion.div
            key={message.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}
          >
            <div
              className={`max-w-[85%] rounded-xl p-4 ${
                message.role === "user"
                  ? "bg-blue-900/30 text-blue-100 border border-blue-800"
                  : "bg-gray-800/50 text-gray-200 border border-gray-700"
              }`}
            >
              {message.role === "assistant" && (
                <div className="flex items-center gap-2 mb-2">
                  <BulldogIcon className="w-4 h-4 text-blue-400" />
                  <span className="text-xs font-medium text-gray-400">Dan</span>
                </div>
              )}
              <div className="prose prose-invert prose-sm max-w-none prose-p:my-1 prose-ul:my-1 prose-li:my-0">
                <ReactMarkdown>{message.content}</ReactMarkdown>
              </div>
            </div>
          </motion.div>
        ))}
        {isLoading && (
          <div className="flex justify-start">
            <div className="rounded-xl p-4 bg-gray-800/50 border border-gray-700">
              <div className="flex items-center gap-2">
                <BulldogIcon className="w-4 h-4 text-blue-400" />
                <span className="text-xs text-gray-400">Dan is sniffing around...</span>
              </div>
              <div className="flex space-x-1 mt-2">
                <div className="w-2 h-2 rounded-full bg-blue-400 animate-bounce" />
                <div className="w-2 h-2 rounded-full bg-blue-400 animate-bounce" style={{ animationDelay: "0.1s" }} />
                <div className="w-2 h-2 rounded-full bg-blue-400 animate-bounce" style={{ animationDelay: "0.2s" }} />
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="border-t border-gray-800 pt-4">
        <div className="relative">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask Dan about requirements, courses, planning..."
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
      </div>
    </div>
  );
}
