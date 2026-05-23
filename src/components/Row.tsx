"use client";

import { useRef, useState, useEffect } from "react";
import MemoryCard from "./MemoryCard";
import { DbSeason, DbEpisode, DbSeries } from "@/types";
import { ChevronLeft, ChevronRight } from "lucide-react";

interface RowProps {
  title: string;
  items: (DbSeason | DbEpisode | DbSeries)[];
  type: "season" | "episode" | "series";
}

export default function Row({ title, items, type }: RowProps) {
  const rowRef = useRef<HTMLDivElement>(null);
  const [showLeftArrow, setShowLeftArrow] = useState(false);
  const [showRightArrow, setShowRightArrow] = useState(true);

  // Check scroll positions to toggle arrow visibilities
  const updateArrows = () => {
    if (rowRef.current) {
      const { scrollLeft, scrollWidth, clientWidth } = rowRef.current;
      setShowLeftArrow(scrollLeft > 5);
      // Give a tiny tolerance of 5px for scrollWidth measurements
      setShowRightArrow(scrollLeft + clientWidth < scrollWidth - 5);
    }
  };

  useEffect(() => {
    updateArrows();
    
    // Add window resize listener to update arrows
    window.addEventListener("resize", updateArrows);
    return () => window.removeEventListener("resize", updateArrows);
  }, [items]);

  const handleScroll = (direction: "left" | "right") => {
    if (rowRef.current) {
      const { clientWidth } = rowRef.current;
      // Scroll by 75% of the row viewport width for beautiful spacing shifts
      const scrollAmount = direction === "left" ? -clientWidth * 0.75 : clientWidth * 0.75;
      
      rowRef.current.scrollBy({
        left: scrollAmount,
        behavior: "smooth"
      });
      
      // Delay check slightly to wait for smooth scrolling animation
      setTimeout(updateArrows, 500);
    }
  };

  if (items.length === 0) return null;

  return (
    <div className="space-y-1.5 md:space-y-3 px-6 md:px-16 group/row relative select-none font-sans overflow-visible">
      {/* Row Title */}
      <h3 className="text-sm sm:text-base md:text-xl font-extrabold tracking-wide text-white/80 group-hover/row:text-white transition-all duration-300 uppercase sm:normal-case">
        {title}
      </h3>

      {/* Row Slider Container */}
      <div className="relative overflow-visible">
        
        {/* Left Scroll Button */}
        {showLeftArrow && (
          <button
            onClick={() => handleScroll("left")}
            className="absolute top-4 bottom-4 left-[-24px] md:left-[-64px] w-6 md:w-16 z-20 bg-black/50 hover:bg-black/85 backdrop-blur-[2px] flex items-center justify-center opacity-0 group-hover/row:opacity-100 transition-all duration-300 cursor-pointer rounded-r-md border-r border-white/5 shadow-2xl group"
          >
            <ChevronLeft className="w-8 h-8 text-white group-hover:scale-125 transition-transform duration-300" />
          </button>
        )}

        {/* Horizontal scroll cards */}
        <div
          ref={rowRef}
          onScroll={updateArrows}
          className="netflix-row gap-2.5 sm:gap-4 overflow-visible pt-16 pb-36 -mt-12 -mb-32 flex items-center"
        >
          {items.map((item) => (
            <MemoryCard 
              key={item.id} 
              item={item} 
              type={type} 
              rowTitle={title}
            />
          ))}
        </div>

        {/* Right Scroll Button */}
        {showRightArrow && (
          <button
            onClick={() => handleScroll("right")}
            className="absolute top-4 bottom-4 right-[-24px] md:right-[-64px] w-6 md:w-16 z-20 bg-black/50 hover:bg-black/85 backdrop-blur-[2px] flex items-center justify-center opacity-0 group-hover/row:opacity-100 transition-all duration-300 cursor-pointer rounded-l-md border-l border-white/5 shadow-2xl group"
          >
            <ChevronRight className="w-8 h-8 text-white group-hover:scale-125 transition-transform duration-300" />
          </button>
        )}

        {/* Gradient overlays at the row borders for premium Netflix fade look */}
        <div className="absolute top-4 bottom-4 left-[-24px] md:left-[-64px] w-2 pointer-events-none bg-gradient-to-r from-[#000000] to-transparent z-10 opacity-0 group-hover/row:opacity-100 transition-opacity duration-300"></div>
        <div className="absolute top-4 bottom-4 right-[-24px] md:right-[-64px] w-2 pointer-events-none bg-gradient-to-l from-[#000000] to-transparent z-10 opacity-0 group-hover/row:opacity-100 transition-opacity duration-300"></div>

      </div>
    </div>
  );
}
