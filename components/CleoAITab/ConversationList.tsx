// components/ConversationList.tsx

import { Conversation } from "@/lib/types";

interface ConversationListProps {
  conversations: Conversation[];
  activeId: string | null;
  onSelect: (id: string) => void;
  onNew: () => void;
  onDelete: (id: string) => void;
}

export default function ConversationList({
  conversations,
  activeId,
  onSelect,
  onNew,
  onDelete,
}: ConversationListProps) {
  return (
    <aside className="w-64 bg-gray-900 border-r border-gray-800 flex flex-col h-full">
      <div className="p-4 flex items-center justify-between">
        <span className="font-bold text-lg text-white">Conversations</span>
        <button
          onClick={onNew}
          className="px-2 py-1 bg-purple-600 rounded text-white text-sm"
        >
          New
        </button>
      </div>
      <ul className="flex-1 overflow-y-auto">
        {conversations.map((c) => (
          <li
            key={c.id}
            className={`flex items-center justify-between px-4 py-3 cursor-pointer
            ${activeId === c.id ? "bg-gray-800" : "hover:bg-gray-800/70"}
            `}
            onClick={() => onSelect(c.id)}
          >
            <span className="truncate">{c.title || "Untitled"}</span>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onDelete(c.id);
              }}
              className="ml-2 text-xs text-gray-500 hover:text-red-500"
            >
              ✕
            </button>
          </li>
        ))}
      </ul>
    </aside>
  );
}
