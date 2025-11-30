"use client"

import { useEffect, useMemo, useState, useRef } from "react"
import { motion, AnimatePresence } from "motion/react"

export function AnimatedList({ className, children }: { className?: string; children: React.ReactNode }) {
  const childrenArray = useMemo(() => {
    return Array.isArray(children) ? children : [children]
  }, [children])

  const [items, setItems] = useState<{ id: number; content: React.ReactNode }[]>([])
  const intervalRef = useRef<NodeJS.Timeout | null>(null)
  const idCounterRef = useRef(0)

  useEffect(() => {
    if (childrenArray.length === 0) return

    let currentIndex = 0

    // Add first item immediately
    setItems([{ id: idCounterRef.current++, content: childrenArray[0] }])

    const addNextItem = () => {
      currentIndex = (currentIndex + 1) % childrenArray.length
      setItems((prev) => {
        const newItems = [...prev, { id: idCounterRef.current++, content: childrenArray[currentIndex] }]
        // Keep only last 4 items visible
        return newItems.slice(-4)
      })
    }

    // Add items one by one
    intervalRef.current = setInterval(addNextItem, 2000)

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
      }
    }
  }, [childrenArray])

  return (
    <div className={className}>
      <AnimatePresence mode="popLayout">
        {items.map((item) => (
          <motion.div
            key={item.id}
            layout
            initial={{ opacity: 0, y: 50, scale: 0.3 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, scale: 0.5, y: -20 }}
            transition={{
              opacity: { duration: 0.2 },
              layout: {
                type: "spring",
                bounce: 0.4,
                duration: 0.6,
              },
            }}
            style={{ originX: 0.5, originY: 0.5 }}
          >
            {item.content}
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  )
}
