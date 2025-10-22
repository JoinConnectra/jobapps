"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { Search, Plus, Briefcase, Bell, X } from "lucide-react";
import { Button } from "@/components/ui/button";

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
  orgId?: number;
}

interface SearchResult {
  id: number;
  name: string;
  email: string;
  type: 'applicant' | 'application';
}

export default function CommandPalette({ isOpen, onClose, orgId }: CommandPaletteProps) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [isSearching, setIsSearching] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const commands = [
    {
      id: "search-candidates",
      title: "Search Candidates",
      icon: Search,
      shortcut: "1",
      action: () => {
        // This will be handled by the search functionality
      }
    },
    {
      id: "create-job",
      title: "Create a Job",
      icon: Plus,
      shortcut: "2",
      action: () => {
        router.push("/dashboard/jobs?create=1");
        onClose();
      }
    },
    {
      id: "jobs",
      title: "Jobs",
      icon: Briefcase,
      shortcut: "3",
      action: () => {
        router.push("/dashboard/jobs");
        onClose();
      }
    },
    {
      id: "activities",
      title: "Activities",
      icon: Bell,
      shortcut: "4",
      action: () => {
        router.push("/dashboard");
        onClose();
      }
    }
  ];

  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;

      if (e.key === "Escape") {
        onClose();
        return;
      }

      if (e.key === "ArrowDown") {
        e.preventDefault();
        setSelectedIndex((prev) => 
          Math.min(prev + 1, commands.length + searchResults.length - 1)
        );
        return;
      }

      if (e.key === "ArrowUp") {
        e.preventDefault();
        setSelectedIndex((prev) => Math.max(prev - 1, 0));
        return;
      }

      if (e.key === "Enter") {
        e.preventDefault();
        const totalItems = commands.length + searchResults.length;
        if (selectedIndex < commands.length) {
          commands[selectedIndex].action();
        } else {
          const resultIndex = selectedIndex - commands.length;
          if (searchResults[resultIndex]) {
            handleCandidateClick(searchResults[resultIndex]);
          }
        }
        return;
      }

      // Handle shortcuts
      if (e.key === "1" && !e.shiftKey && !e.ctrlKey && !e.metaKey) {
        e.preventDefault();
        inputRef.current?.focus();
        return;
      }

      if (e.key === "2" && !e.shiftKey && !e.ctrlKey && !e.metaKey) {
        e.preventDefault();
        commands.find(cmd => cmd.id === "create-job")?.action();
        return;
      }

      if (e.key === "3" && !e.shiftKey && !e.ctrlKey && !e.metaKey) {
        e.preventDefault();
        commands.find(cmd => cmd.id === "jobs")?.action();
        return;
      }

      if (e.key === "4" && !e.shiftKey && !e.ctrlKey && !e.metaKey) {
        e.preventDefault();
        commands.find(cmd => cmd.id === "activities")?.action();
        return;
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, selectedIndex, commands, searchResults]);

  const searchCandidates = async (searchQuery: string) => {
    if (!searchQuery.trim() || !orgId) {
      setSearchResults([]);
      return;
    }

    setIsSearching(true);
    try {
      const token = localStorage.getItem("bearer_token");
      const response = await fetch(`/api/applications?search=${encodeURIComponent(searchQuery)}&orgId=${orgId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.ok) {
        const applications = await response.json();
        const results: SearchResult[] = applications.map((app: any) => ({
          id: app.id,
          name: app.applicantEmail, // Using email as name for now
          email: app.applicantEmail,
          type: 'application' as const
        }));
        setSearchResults(results);
      }
    } catch (error) {
      console.error("Search failed:", error);
    } finally {
      setIsSearching(false);
    }
  };

  const handleCandidateClick = (candidate: SearchResult) => {
    if (candidate.type === 'application') {
      router.push(`/dashboard/applications/${candidate.id}`);
    }
    onClose();
  };

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (query.trim()) {
        searchCandidates(query);
      } else {
        setSearchResults([]);
      }
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [query]);

  if (!isOpen) return null;

  const allItems = [...commands, ...searchResults];
  const totalItems = allItems.length;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-20">
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black/50" 
        onClick={onClose}
      />
      
      {/* Command Palette */}
      <div className="relative w-full max-w-2xl mx-4">
        <div className="bg-gray-900 rounded-lg shadow-xl border border-gray-700">
          {/* Header */}
          <div className="flex items-center gap-3 p-4 border-b border-gray-700">
            <Search className="w-5 h-5 text-gray-400" />
            <input
              ref={inputRef}
              type="text"
              placeholder="Type a command or search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="flex-1 bg-transparent text-white placeholder-gray-400 outline-none"
            />
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
              className="text-gray-400 hover:text-white"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>

          {/* Content */}
          <div className="max-h-96 overflow-y-auto">
            {totalItems === 0 && query && !isSearching && (
              <div className="p-4 text-center text-gray-400">
                No results found
              </div>
            )}

            {isSearching && (
              <div className="p-4 text-center text-gray-400">
                Searching...
              </div>
            )}

            {allItems.map((item, index) => {
              const isSelected = index === selectedIndex;
              const isCommand = index < commands.length;
              const command = isCommand ? commands[index] : null;
              const result = !isCommand ? searchResults[index - commands.length] : null;

              return (
                <div
                  key={isCommand ? command?.id : `result-${result?.id}`}
                  className={`flex items-center gap-3 p-3 cursor-pointer ${
                    isSelected ? "bg-gray-800" : "hover:bg-gray-800"
                  }`}
                  onClick={() => {
                    if (isCommand && command) {
                      command.action();
                    } else if (result) {
                      handleCandidateClick(result);
                    }
                  }}
                >
                  <div className="flex-shrink-0">
                    {isCommand && command ? (
                      <command.icon className="w-5 h-5 text-gray-400" />
                    ) : (
                      <Search className="w-5 h-5 text-gray-400" />
                    )}
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="text-white font-medium">
                      {isCommand ? command?.title : result?.name}
                    </div>
                    {!isCommand && result && (
                      <div className="text-sm text-gray-400">
                        {result.email}
                      </div>
                    )}
                  </div>

                  <div className="flex-shrink-0 text-xs text-gray-500">
                    {isCommand ? command?.shortcut : "Application"}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
