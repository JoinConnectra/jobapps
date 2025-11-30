"use client";

import { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { motion, AnimatePresence } from "motion/react";
import {
  Search,
  Send,
  BarChart3,
  Users,
  Briefcase,
  Calendar,
  FileText,
  Settings,
} from "lucide-react";

function useDebounce<T>(value: T, delay: number = 500): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);
    return () => {
      clearTimeout(timer);
    };
  }, [value, delay]);
  return debouncedValue;
}

export interface Action {
  id: string;
  label: string;
  icon: React.ReactNode;
  description?: string;
  short?: string;
  end?: string;
}

interface SearchResult {
  actions: Action[];
}

const allActions = [
  {
    id: "1",
    label: "View Analytics",
    icon: <BarChart3 className="h-4 w-4 text-[#3d6a4a]" />,
    description: "Dashboard",
    short: "⌘K",
    end: "Analytics",
  },
  {
    id: "2",
    label: "Manage Jobs",
    icon: <Briefcase className="h-4 w-4 text-blue-500" />,
    description: "Jobs",
    short: "⌘J",
    end: "Jobs",
  },
  {
    id: "3",
    label: "View Applications",
    icon: <FileText className="h-4 w-4 text-purple-500" />,
    description: "Candidates",
    short: "⌘A",
    end: "Applications",
  },
  {
    id: "4",
    label: "Schedule Interview",
    icon: <Calendar className="h-4 w-4 text-green-500" />,
    description: "Interviews",
    short: "⌘I",
    end: "Calendar",
  },
  {
    id: "5",
    label: "Team Members",
    icon: <Users className="h-4 w-4 text-orange-500" />,
    description: "Settings",
    short: "⌘T",
    end: "Team",
  },
  {
    id: "6",
    label: "Settings",
    icon: <Settings className="h-4 w-4 text-gray-500" />,
    description: "Config",
    short: "⌘,",
    end: "Settings",
  },
];

function ActionSearchBar({ 
  actions = allActions, 
  autoShow = false 
}: { 
  actions?: Action[];
  autoShow?: boolean;
}) {
  const [query, setQuery] = useState("");
  const [result, setResult] = useState<SearchResult | null>(null);
  const [isFocused, setIsFocused] = useState(autoShow);
  const [isTyping, setIsTyping] = useState(false);
  const [selectedAction, setSelectedAction] = useState<Action | null>(null);
  const debouncedQuery = useDebounce(query, 200);

  // Auto-show animation for background display
  useEffect(() => {
    if (autoShow) {
      // Automatically show results after a short delay
      const timer = setTimeout(() => {
        setIsFocused(true);
        setResult({ actions: allActions });
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [autoShow]);

  useEffect(() => {
    if (!isFocused && !autoShow) {
      setResult(null);
      return;
    }
    if (!debouncedQuery) {
      setResult({ actions: allActions });
      return;
    }
    const normalizedQuery = debouncedQuery.toLowerCase().trim();
    const filteredActions = allActions.filter((action) => {
      const searchableText = action.label.toLowerCase();
      return searchableText.includes(normalizedQuery);
    });
    setResult({ actions: filteredActions });
  }, [debouncedQuery, isFocused, autoShow]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setQuery(e.target.value);
    setIsTyping(true);
  };

  const container = {
    hidden: { opacity: 0, height: 0 },
    show: {
      opacity: 1,
      height: "auto",
      transition: {
        height: {
          duration: 0.4,
        },
        staggerChildren: 0.1,
      },
    },
    exit: {
      opacity: 0,
      height: 0,
      transition: {
        height: {
          duration: 0.3,
        },
        opacity: {
          duration: 0.2,
        },
      },
    },
  };

  const item = {
    hidden: { opacity: 0, y: 20 },
    show: {
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.3,
      },
    },
    exit: {
      opacity: 0,
      y: -10,
      transition: {
        duration: 0.2,
      },
    },
  };

  // Reset selectedAction when focusing the input
  const handleFocus = () => {
    setSelectedAction(null);
    setIsFocused(true);
  };

  return (
    <div className="w-full max-w-xl mx-auto">
      <div className="relative flex flex-col justify-start items-center min-h-[200px]">
        <div className="w-full max-w-sm sticky top-0 bg-background/80 backdrop-blur-sm z-10 pt-2 pb-1">
          <label
            className="text-[10px] font-medium text-gray-500 dark:text-gray-400 mb-1 block"
            htmlFor="search"
          >
            Quick Actions
          </label>
          <div className="relative">
            <Input
              type="text"
              placeholder="Search commands..."
              value={query}
              onChange={handleInputChange}
              onFocus={handleFocus}
              onBlur={() => !autoShow && setTimeout(() => setIsFocused(false), 200)}
              disabled={autoShow}
              className="pl-2 pr-8 py-1 h-8 text-xs rounded-md focus-visible:ring-offset-0"
            />
            <div className="absolute right-2 top-1/2 -translate-y-1/2 h-3 w-3">
              <AnimatePresence mode="popLayout">
                {query.length > 0 ? (
                  <motion.div
                    key="send"
                    initial={{ y: -20, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    exit={{ y: 20, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                  >
                    <Send className="w-3 h-3 text-gray-400 dark:text-gray-500" />
                  </motion.div>
                ) : (
                  <motion.div
                    key="search"
                    initial={{ y: -20, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    exit={{ y: 20, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                  >
                    <Search className="w-3 h-3 text-gray-400 dark:text-gray-500" />
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>
        <div className="w-full max-w-sm">
          <AnimatePresence>
            {(isFocused || autoShow) && result && !selectedAction && (
              <motion.div
                className="w-full border rounded-md shadow-sm overflow-hidden dark:border-gray-800 bg-white/95 dark:bg-black/95 backdrop-blur-sm mt-1"
                variants={container}
                initial="hidden"
                animate="show"
                exit="exit"
              >
                <motion.ul>
                  {result.actions.map((action) => (
                    <motion.li
                      key={action.id}
                      className="px-2 py-1.5 flex items-center justify-between hover:bg-gray-200 dark:hover:bg-zinc-900 cursor-pointer rounded-md"
                      variants={item}
                      layout
                      onClick={() => setSelectedAction(action)}
                    >
                      <div className="flex items-center gap-1.5 justify-between">
                        <div className="flex items-center gap-1.5">
                          <span className="text-gray-500">{action.icon}</span>
                          <span className="text-xs font-medium text-gray-900 dark:text-gray-100">
                            {action.label}
                          </span>
                          <span className="text-[10px] text-gray-400">
                            {action.description}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className="text-[10px] text-gray-400">
                          {action.short}
                        </span>
                        <span className="text-[10px] text-gray-400 text-right">
                          {action.end}
                        </span>
                      </div>
                    </motion.li>
                  ))}
                </motion.ul>
                <div className="mt-1 px-2 py-1 border-t border-gray-100 dark:border-gray-800">
                  <div className="flex items-center justify-between text-[10px] text-gray-500">
                    <span>⌘K to open</span>
                    <span>ESC to close</span>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}

export { ActionSearchBar, Action };

