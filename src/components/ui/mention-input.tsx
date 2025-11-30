"use client";

import * as Mention from "@diceui/mention";
import { useMemo, useState, useEffect, useRef } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

interface MentionUser {
  id: number;
  name: string | null;
  email: string;
  avatarUrl?: string | null;
}

interface MentionInputProps {
  value: string;
  onChange: (value: string) => void;
  onKeyDown?: (e: React.KeyboardEvent) => void;
  placeholder?: string;
  className?: string;
  users: MentionUser[];
  disabled?: boolean;
}

export function MentionInput({
  value,
  onChange,
  onKeyDown,
  placeholder = "Type @ to mention someone...",
  className = "",
  users,
  disabled = false,
}: MentionInputProps) {
  const [open, setOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Filter users based on search query
  const filteredUsers = useMemo(() => {
    if (!open) return [];
    // Extract the current mention query from the value
    const match = value.match(/@([^\s@]*)$/);
    const query = match ? match[1].toLowerCase() : "";
    
    if (!query) return users.slice(0, 10);
    
    return users
      .filter((user) => {
        const name = (user.name || "").toLowerCase();
        const email = user.email.toLowerCase();
        return name.includes(query) || email.includes(query);
      })
      .slice(0, 10);
  }, [value, users, open]);

  // Check if we should show the mention popover
  useEffect(() => {
    const match = value.match(/@([^\s@]*)$/);
    const shouldOpen = match !== null;
    setOpen(shouldOpen && filteredUsers.length > 0);
  }, [value, filteredUsers.length]);

  const handleSelect = (user: MentionUser) => {
    const match = value.match(/(.*)@[^\s@]*$/);
    if (match) {
      const before = match[1];
      const mentionText = `@${user.name || user.email} `;
      onChange(before + mentionText);
    } else {
      onChange(value + `@${user.name || user.email} `);
    }
    setOpen(false);
    setTimeout(() => {
      inputRef.current?.focus();
      if (inputRef.current) {
        const length = inputRef.current.value.length;
        inputRef.current.setSelectionRange(length, length);
      }
    }, 0);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (open && e.key === "Escape") {
      setOpen(false);
    }
    onKeyDown?.(e);
  };

  return (
    <div className="flex-1 min-w-0">
      <Mention.Root open={open} onOpenChange={setOpen} trigger="@">
        <Mention.Label className="sr-only">Comment with mentions</Mention.Label>
        <Mention.Input
          ref={inputRef}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          className={`w-full text-xs px-2 py-1.5 border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 ${disabled ? "opacity-50 cursor-not-allowed bg-gray-50" : "bg-white"} ${className}`}
          disabled={disabled}
        />
        
        <Mention.Portal>
          <Mention.Content
            className="z-50 min-w-[200px] max-h-[300px] overflow-auto rounded-md border bg-white p-1 shadow-lg"
            side="top"
            align="start"
          >
            {filteredUsers.length === 0 ? (
              <div className="px-2 py-1.5 text-sm text-gray-500">
                No users found
              </div>
            ) : (
              filteredUsers.map((user) => (
                <Mention.Item
                  key={user.id}
                  value={user.name || user.email}
                  onSelect={() => handleSelect(user)}
                  className="relative flex cursor-pointer select-none items-center gap-2 rounded-sm px-2 py-1.5 text-sm outline-none hover:bg-gray-100 focus:bg-gray-100 data-[disabled]:pointer-events-none data-[disabled]:opacity-50"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    handleSelect(user);
                  }}
                >
                  <Avatar className="h-6 w-6">
                    <AvatarImage src={user.avatarUrl || undefined} alt={user.name || user.email} />
                    <AvatarFallback className="text-xs bg-blue-600 text-white">
                      {(user.name || user.email).charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex flex-col min-w-0">
                    <span className="text-sm font-medium truncate">{user.name || "User"}</span>
                    <span className="text-xs text-gray-500 truncate">{user.email}</span>
                  </div>
                </Mention.Item>
              ))
            )}
          </Mention.Content>
        </Mention.Portal>
      </Mention.Root>
    </div>
  );
}
