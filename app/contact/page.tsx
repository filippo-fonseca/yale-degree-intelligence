"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import {
  FiSend,
  FiMail,
  FiMessageCircle,
  FiUser,
  FiAlertCircle,
  FiArrowLeft,
} from "react-icons/fi";
import LogoIcon from "@/icons/LogoIcon";
import CosmicBackground from "@/components/CosmicBackground/page";

type FormState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "success"; msg: string }
  | { status: "error"; msg: string };

export default function ContactPage() {
  const [form, setForm] = useState({
    name: "",
    email: "",
    category: "bug",
    subject: "",
    message: "",
  });
  const [state, setState] = useState<FormState>({ status: "idle" });

  const onChange =
    (key: keyof typeof form) =>
    (
      e: React.ChangeEvent<
        HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
      >
    ) =>
      setForm((f) => ({ ...f, [key]: e.target.value }));

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setState({ status: "loading" });

    if (
      !form.name.trim() ||
      !form.email.trim() ||
      !form.subject.trim() ||
      !form.message.trim()
    ) {
      setState({
        status: "error",
        msg: "Please fill out all required fields.",
      });
      return;
    }

    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        throw new Error(data?.error || "Failed to send message.");
      }

      if (data.mailto) {
        window.location.href = data.mailto;
      }

      setState({
        status: "success",
        msg: "Message sent. We'll get back to you ASAP.",
      });
      setForm({
        name: "",
        email: "",
        category: "bug",
        subject: "",
        message: "",
      });
    } catch (err: unknown) {
      setState({
        status: "error",
        msg:
          err instanceof Error ? err.message : "Something went wrong.",
      });
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-950 via-gray-900 to-gray-900 font-louize">
      <CosmicBackground mode="stars" opacity={0.7} />

      <header className="sticky top-0 z-40 bg-gray-950/70 backdrop-blur-xl border-b border-white/[0.06] shadow-[0_4px_24px_rgba(0,0,0,0.3)]">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-3 flex justify-between items-center">
          <Link href="/" className="flex items-center gap-2 group">
            <LogoIcon width={24} height={24} />
            <span className="text-sm font-medium text-gray-300 group-hover:text-white transition-colors">
              DegreeIntelligence
            </span>
          </Link>
          <Link
            href="/"
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg bg-gradient-to-r from-blue-500/20 to-purple-500/20 hover:from-blue-500/30 hover:to-purple-500/30 border border-white/[0.1] text-gray-300 hover:text-white transition-all shadow-[inset_0_1px_0_rgba(255,255,255,0.1)]"
          >
            <FiArrowLeft size={12} />
            <span>Back to platform</span>
          </Link>
        </div>
      </header>

      <main className="relative min-h-[70vh]">
        <div className="relative max-w-4xl mx-auto px-6 py-10">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-8"
          >
            <h1 className="text-3xl font-medium text-white">Contact us</h1>
            <p className="text-gray-400 mt-1">
              Found a bug, have feedback, or want a feature? Shoot us a note.
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-2xl bg-gray-900/60 border border-gray-800 p-6 backdrop-blur-md"
          >
            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <label className="flex flex-col gap-2">
                  <span className="text-sm text-gray-300 flex items-center gap-2">
                    <FiUser className="opacity-80" />
                    Name <span className="text-pink-300">*</span>
                  </span>
                  <input
                    value={form.name}
                    onChange={onChange("name")}
                    placeholder="Jane Doe"
                    className="w-full rounded-xl bg-gray-900/60 border border-gray-800 px-3 py-2 text-gray-200 placeholder-gray-500 focus:outline-none focus:border-gray-700"
                    required
                  />
                </label>

                <label className="flex flex-col gap-2">
                  <span className="text-sm text-gray-300 flex items-center gap-2">
                    <FiMail className="opacity-80" />
                    Email <span className="text-pink-300">*</span>
                  </span>
                  <input
                    type="email"
                    value={form.email}
                    onChange={onChange("email")}
                    placeholder="you@yale.edu"
                    className="w-full rounded-xl bg-gray-900/60 border border-gray-800 px-3 py-2 text-gray-200 placeholder-gray-500 focus:outline-none focus:border-gray-700"
                    required
                  />
                </label>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <label className="flex flex-col gap-2">
                  <span className="text-sm text-gray-300">Category</span>
                  <select
                    value={form.category}
                    onChange={onChange("category")}
                    className="w-full rounded-xl bg-gray-900/60 border border-gray-800 px-3 py-2 text-gray-200 focus:outline-none focus:border-gray-700"
                  >
                    <option value="bug">Bug</option>
                    <option value="feature">Feature Request</option>
                    <option value="data">Data Issue</option>
                    <option value="other">Other</option>
                  </select>
                </label>

                <label className="flex flex-col gap-2">
                  <span className="text-sm text-gray-300 flex items-center gap-2">
                    <FiMessageCircle className="opacity-80" />
                    Subject <span className="text-pink-300">*</span>
                  </span>
                  <input
                    value={form.subject}
                    onChange={onChange("subject")}
                    placeholder="Short summary"
                    className="w-full rounded-xl bg-gray-900/60 border border-gray-800 px-3 py-2 text-gray-200 placeholder-gray-500 focus:outline-none focus:border-gray-700"
                    required
                  />
                </label>
              </div>

              <label className="flex flex-col gap-2">
                <span className="text-sm text-gray-300">
                  Message <span className="text-pink-300">*</span>
                </span>
                <textarea
                  value={form.message}
                  onChange={onChange("message")}
                  placeholder="Tell us what's up…"
                  rows={6}
                  className="w-full rounded-xl bg-gray-900/60 border border-gray-800 px-3 py-2 text-gray-200 placeholder-gray-500 focus:outline-none focus:border-gray-700"
                  required
                />
              </label>

              {state.status === "error" && (
                <div className="flex items-center gap-2 text-sm text-red-300 bg-red-900/20 border border-red-800 px-3 py-2 rounded-lg">
                  <FiAlertCircle />
                  {state.msg}
                </div>
              )}
              {state.status === "success" && (
                <div className="text-sm text-emerald-300 bg-emerald-900/20 border border-emerald-800 px-3 py-2 rounded-lg">
                  {state.msg}
                </div>
              )}

              <div className="flex justify-end">
                <motion.button
                  whileHover={{ y: -2 }}
                  whileTap={{ scale: 0.98 }}
                  disabled={state.status === "loading"}
                  type="submit"
                  className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl transition-all shadow-[0_4px_20px_rgba(0,0,0,0.25)]
                  ${
                    state.status === "loading"
                      ? "bg-gray-800 text-gray-400 border border-gray-700 cursor-not-allowed"
                      : "bg-gray-900 border border-gray-800 hover:border-gray-700 text-gray-200"
                  }`}
                >
                  <FiSend className="text-blue-400" />
                  {state.status === "loading" ? "Sending..." : "Send message"}
                </motion.button>
              </div>
            </form>
          </motion.div>

          <p className="text-[11px] text-gray-500 leading-tight text-justify mt-3">
            We'll only use your email to reply to this message. No spam, no
            sharing.
          </p>
        </div>
      </main>
    </div>
  );
}
