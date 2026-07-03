"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import { FiSend, FiRefreshCw } from "react-icons/fi";
import { useAuth } from "@/context/AuthContext";
import { Course, Message } from "@/lib/types";
import { calculateMajorProgress } from "@/lib/majors";
import BulldogIcon from "@/icons/BulldogIcon";
import { db } from "@/config/firebase";
import { doc, getDoc, setDoc } from "firebase/firestore";
import ReactMarkdown from "react-markdown";
import { streamDan, DanMessage } from "@/lib/dan/client";

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
  const [thinkingChip, setThinkingChip] = useState<string | null>(null);
  const [noKeyError, setNoKeyError] = useState(false);
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
    const excludedReqs = courses.flatMap((c) =>
      (c.excludedFromRequirements || [])
        .filter((m) => m.major_id === majorId)
        .map((m) => ({ code: c.code, requirement: m.requirement_title }))
    );
    allMajorProgress[majorId] = calculateMajorProgress(majorId, completedCodes, inProgressCodes, skippedCodes, manualReqs, excludedReqs);
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

  const toolLabels: Record<string, string> = {
    get_major_progress: "Checking your major progress…",
    preview_plan: "Simulating that plan…",
    search_catalog: "Searching the course catalog…",
    get_course: "Looking up that course…",
    list_my_courses: "Reviewing your courses…",
    get_distributional_progress: "Checking your distributionals…",
  };

  const handleSendMessage = async () => {
    if (!input.trim() || isLoading || !user) return;

    setNoKeyError(false);

    const userMessage: Message = {
      id: Date.now().toString(),
      content: input,
      role: "user",
      timestamp: new Date().toISOString(),
    };

    // Build the messages array including history + new user message.
    // Map Message (role: "system"|"user"|"assistant") to DanMessage (role: "user"|"assistant").
    // System-role messages from the app's own welcome/history are omitted since Dan's backend
    // handles system context itself; only user/assistant turns are forwarded.
    const historyForDan: DanMessage[] = messages
      .filter((m) => m.role === "user" || m.role === "assistant")
      .map((m) => ({ role: m.role as "user" | "assistant", content: m.content }));

    const danMessages: DanMessage[] = [
      ...historyForDan,
      { role: "user", content: input },
    ];

    // Add user message and a blank in-progress assistant message to state.
    const assistantPlaceholderId = (Date.now() + 1).toString();
    const updatedMessages: Message[] = [
      ...messages,
      userMessage,
      {
        id: assistantPlaceholderId,
        content: "",
        role: "assistant",
        timestamp: new Date().toISOString(),
      },
    ];
    setMessages(updatedMessages);
    setInput("");
    setIsLoading(true);

    await streamDan(danMessages, {
      onText: (delta: string) => {
        // Clear thinking chip as soon as text arrives.
        setThinkingChip(null);
        // Append delta to the last assistant message in state.
        setMessages((prev) => {
          const copy = [...prev];
          const lastIdx = copy.length - 1;
          if (copy[lastIdx]?.role === "assistant") {
            copy[lastIdx] = { ...copy[lastIdx], content: copy[lastIdx].content + delta };
          }
          return copy;
        });
      },
      onTool: (name: string) => {
        setThinkingChip(toolLabels[name] ?? "Thinking…");
      },
      onDone: () => {
        setThinkingChip(null);
        setIsLoading(false);
        // Persist the final messages array to Firestore.
        setMessages((prev) => {
          saveConversation(prev, currentHash);
          return prev;
        });
        setContextHash(currentHash);
      },
      onError: (error: string) => {
        setThinkingChip(null);
        setIsLoading(false);
        if (error === "NO_KEY") {
          setNoKeyError(true);
          // Remove the blank assistant placeholder since we won't stream into it.
          setMessages((prev) => prev.filter((m) => m.id !== assistantPlaceholderId));
        } else {
          // Replace blank placeholder with an error bubble.
          setMessages((prev) => {
            const copy = [...prev];
            const lastIdx = copy.length - 1;
            if (copy[lastIdx]?.id === assistantPlaceholderId) {
              copy[lastIdx] = {
                ...copy[lastIdx],
                content: error || "Sorry, something went wrong. Please try again.",
              };
            }
            return copy;
          });
        }
      },
    });
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
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2.5">
          <BulldogIcon className="w-8 h-8 text-blue-400" />
          <div>
            <h2 className="text-xl font-medium text-gray-900 dark:text-white">
              Handsome Dan
            </h2>
            <p className="text-gray-400 dark:text-gray-500 text-xs">Your Yale bulldog advisor</p>
          </div>
        </div>
        <button
          onClick={resetConversation}
          className="p-1.5 rounded-lg neu-control text-gray-500 dark:text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 transition-all"
          title="Reset conversation"
        >
          <FiRefreshCw size={14} />
        </button>
      </div>

      {/* NO_KEY banner */}
      {noKeyError && (
        <div className="mb-3 px-3 py-2.5 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/40 text-amber-800 dark:text-amber-300 text-xs">
          Connect your Anthropic API key in Settings to chat with Dan.
        </div>
      )}

      {/* Messages */}
      <div className="flex-1 overflow-y-auto space-y-3 mb-3">
        {messages.map((message, idx) => {
          const isLastAssistant =
            message.role === "assistant" && idx === messages.length - 1 && isLoading;
          return (
            <motion.div
              key={message.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}
            >
              <div
                className={`max-w-[85%] rounded-xl p-3 backdrop-blur-md shadow-[inset_0_1px_0_rgba(255,255,255,0.04),0_4px_12px_rgba(0,0,0,0.15)] ${
                  message.role === "user"
                    ? "bg-gradient-to-br from-blue-100 to-blue-50 dark:from-blue-900/40 dark:to-blue-950/40 text-blue-900 dark:text-blue-100 border border-blue-300/60 dark:border-blue-700/30"
                    : "neu-surface-sm text-gray-800 dark:text-gray-200"
                }`}
              >
                {message.role === "assistant" && (
                  <div className="flex items-center gap-1.5 mb-1.5">
                    <BulldogIcon className="w-3.5 h-3.5 text-blue-400" />
                    <span className="text-[10px] font-medium text-gray-400 dark:text-gray-500">Dan</span>
                  </div>
                )}
                {/* Thinking chip: shown inside the in-progress assistant bubble */}
                {isLastAssistant && thinkingChip && message.content === "" && (
                  <div className="flex items-center gap-1.5 animate-pulse">
                    <div className="w-1.5 h-1.5 rounded-full bg-blue-400" />
                    <span className="text-[10px] text-gray-400 dark:text-gray-500 italic">{thinkingChip}</span>
                  </div>
                )}
                {/* Show bouncing dots when loading but no tool chip and no content yet */}
                {isLastAssistant && !thinkingChip && message.content === "" && (
                  <div className="flex items-center gap-1.5">
                    <span className="text-[10px] text-gray-400 dark:text-gray-500">Dan is sniffing around...</span>
                    <div className="flex space-x-1 ml-0.5">
                      <div className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-bounce" />
                      <div className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-bounce" style={{ animationDelay: "0.1s" }} />
                      <div className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-bounce" style={{ animationDelay: "0.2s" }} />
                    </div>
                  </div>
                )}
                {message.content && (
                  <>
                    <div className="prose prose-sm dark:prose-invert max-w-none prose-p:my-1 prose-ul:my-1 prose-li:my-0 text-sm">
                      <ReactMarkdown>{message.content}</ReactMarkdown>
                    </div>
                    {/* Thinking chip shown alongside streaming content */}
                    {isLastAssistant && thinkingChip && (
                      <div className="flex items-center gap-1.5 mt-1.5 animate-pulse">
                        <div className="w-1.5 h-1.5 rounded-full bg-blue-400" />
                        <span className="text-[10px] text-gray-400 dark:text-gray-500 italic">{thinkingChip}</span>
                      </div>
                    )}
                  </>
                )}
              </div>
            </motion.div>
          );
        })}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="border-t border-gray-200 dark:border-gray-800/40 pt-3">
        <div className="relative">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask Dan about requirements, courses, planning..."
            className="w-full px-3 py-2.5 pr-11 text-sm neu-inset rounded-xl text-gray-900 dark:text-gray-200 focus:outline-none focus:ring-1 focus:ring-purple-500/40 resize-none placeholder:text-gray-400 dark:placeholder:text-gray-500"
            rows={2}
            disabled={isLoading}
          />
          <button
            onClick={handleSendMessage}
            disabled={!input.trim() || isLoading}
            className={`absolute right-2.5 bottom-2.5 p-1.5 rounded-lg transition-all ${
              input.trim()
                ? "bg-gradient-to-br from-purple-600 to-purple-700 text-white hover:from-purple-500 hover:to-purple-600 shadow-[0_2px_8px_rgba(147,51,234,0.3)]"
                : "neu-inset text-gray-400 dark:text-gray-500 cursor-not-allowed"
            }`}
          >
            <FiSend size={14} />
          </button>
        </div>
      </div>
    </div>
  );
}
