"use client";

import { useState } from "react";
import { CATEGORY_GROUPS } from "@/src/lib/eventCategories";

export default function CategoryLegend() {
  const [expanded, setExpanded] = useState(false);
  const maxPerGroup = expanded ? Number.POSITIVE_INFINITY : 4;

  return (
    <div className="max-h-56 overflow-y-auto rounded-lg bg-white/95 p-3 text-xs shadow">
      <p className="mb-2 font-semibold text-gray-700">Categories</p>
      <div className="space-y-2">
        {CATEGORY_GROUPS.map((group) => (
          <div key={group.group}>
            <p className="font-medium text-gray-700">{group.group}</p>
            <ul className="space-y-1">
              {group.options.slice(0, maxPerGroup).map((option) => (
                <li className="text-gray-700" key={option.value}>
                  {option.emoji} {option.label}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
      <button
        className="mt-2 text-xs font-medium text-blue-700"
        onClick={() => setExpanded((prev) => !prev)}
        type="button"
      >
        {expanded ? "Show less" : "Show more"}
      </button>
    </div>
  );
}
