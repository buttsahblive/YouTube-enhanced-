import React from "react";

interface CategoryChipsProps {
  categories: string[];
  selectedCategory: string;
  onSelectCategory: (cat: string) => void;
}

export const CategoryChips: React.FC<CategoryChipsProps> = ({
  categories,
  selectedCategory,
  onSelectCategory,
}) => {
  return (
    <div className="flex items-center gap-2 overflow-x-auto py-2 px-1 scrollbar-none no-scrollbar">
      {categories.map((cat) => {
        const isSelected = selectedCategory === cat;
        return (
          <button
            key={cat}
            onClick={() => onSelectCategory(cat)}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer ${
              isSelected
                ? "bg-stone-100 text-stone-900 shadow-sm"
                : "bg-stone-800/80 text-stone-300 hover:bg-stone-700/80 hover:text-white"
            }`}
          >
            {cat}
          </button>
        );
      })}
    </div>
  );
};
