import React, { memo } from "react";

interface CategoryChipsProps {
  categories: string[];
  selectedCategory: string;
  onSelectCategory: (cat: string) => void;
}

const CategoryChipsComponent: React.FC<CategoryChipsProps> = ({
  categories,
  selectedCategory,
  onSelectCategory,
}) => {
  return (
    <div className="relative w-full">
      <div className="flex items-center gap-2 overflow-x-auto py-1 px-0.5 no-scrollbar touch-momentum">
        {categories.map((cat) => {
          const isSelected = selectedCategory === cat;
          return (
            <button
              key={cat}
              onClick={() => onSelectCategory(cat)}
              className={`px-3 sm:px-3.5 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap shrink-0 transition-colors cursor-pointer active:scale-95 ${
                isSelected
                  ? "bg-stone-100 text-stone-900 shadow-sm"
                  : "bg-stone-900/90 text-stone-300 border border-stone-800/80 hover:bg-stone-800 hover:text-white"
              }`}
            >
              {cat}
            </button>
          );
        })}
      </div>
    </div>
  );
};

export const CategoryChips = memo(CategoryChipsComponent);

