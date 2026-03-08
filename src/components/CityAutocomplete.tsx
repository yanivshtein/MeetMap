"use client";

import { useMemo, useState } from "react";
import { getCityDisplayLabel, isValidCity, searchCities } from "@/src/lib/cities";

type CityAutocompleteProps = {
  value: string;
  onChange: (city: string) => void;
  selected?: boolean;
  onSelectionChange?: (selected: boolean) => void;
  label?: string;
  placeholder?: string;
  required?: boolean;
};

export default function CityAutocomplete({
  value,
  onChange,
  selected,
  onSelectionChange,
  label = "City",
  placeholder = "Start typing a city",
  required = false,
}: CityAutocompleteProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(0);
  const [touched, setTouched] = useState(false);
  const [wasSelected, setWasSelected] = useState(false);

  const suggestions = useMemo(() => searchCities(value), [value]);
  const inputId = label.toLowerCase().replace(/\s+/g, "-");
  const hasTypedValue = value.trim().length > 0;
  const effectiveSelected = selected ?? wasSelected;
  const isValidSelection =
    !hasTypedValue ? !required : effectiveSelected && isValidCity(value);
  const showError = touched && !isValidSelection;

  const handleSelect = (city: string) => {
    onChange(city);
    onSelectionChange?.(true);
    setWasSelected(true);
    setTouched(true);
    setIsOpen(false);
  };

  return (
    <div className="relative">
      <label className="label-base" htmlFor={inputId}>
        {label}
      </label>
      <input
        autoComplete="off"
        className={[
          "input-base",
          showError ? "border-red-500 focus:border-red-500 focus:ring-red-100" : "",
        ].join(" ")}
        id={inputId}
        onBlur={() => {
          setTouched(true);
          window.setTimeout(() => {
            setIsOpen(false);
          }, 120);
        }}
        onChange={(event) => {
          onChange(event.target.value);
          onSelectionChange?.(false);
          setWasSelected(false);
          setTouched(true);
          setIsOpen(true);
          setHighlightedIndex(0);
        }}
        onFocus={() => {
          setIsOpen(true);
        }}
        onKeyDown={(event) => {
          if (!isOpen && event.key === "ArrowDown") {
            setIsOpen(true);
            setHighlightedIndex(0);
            return;
          }

          if (!isOpen) {
            return;
          }

          if (event.key === "ArrowDown") {
            event.preventDefault();
            setHighlightedIndex((prev) =>
              suggestions.length === 0 ? 0 : (prev + 1) % suggestions.length,
            );
            return;
          }

          if (event.key === "ArrowUp") {
            event.preventDefault();
            setHighlightedIndex((prev) =>
              suggestions.length === 0
                ? 0
                : (prev - 1 + suggestions.length) % suggestions.length,
            );
            return;
          }

          if (event.key === "Enter") {
            if (isOpen) {
              event.preventDefault();
            }
            if (suggestions[highlightedIndex]) {
              handleSelect(suggestions[highlightedIndex]);
            }
            return;
          }

          if (event.key === "Escape") {
            event.preventDefault();
            setIsOpen(false);
          }
        }}
        placeholder={placeholder}
        required={required}
        type="text"
        value={value}
      />

      {showError ? (
        <p className="mt-1 text-sm text-red-600">Please choose a city from the list</p>
      ) : null}

      {isOpen ? (
        <div className="absolute z-20 mt-1 w-full rounded-lg border border-gray-200 bg-white shadow-sm">
          {suggestions.length === 0 ? (
            <p className="px-3 py-2 text-sm text-gray-500">No matching cities</p>
          ) : (
            <ul className="max-h-56 overflow-y-auto py-1">
              {suggestions.map((city, index) => {
                const isHighlighted = index === highlightedIndex;
                const isSelected = city === value && effectiveSelected;

                return (
                  <li key={city}>
                    <button
                      className={[
                        "flex w-full items-center justify-between px-3 py-2 text-left text-sm",
                        isHighlighted ? "bg-gray-100" : "hover:bg-gray-50",
                      ].join(" ")}
                      onMouseDown={(event) => {
                        event.preventDefault();
                        handleSelect(city);
                      }}
                      type="button"
                    >
                      <span>{getCityDisplayLabel(city)}</span>
                      {isSelected ? <span className="text-green-600">✓</span> : null}
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      ) : null}
    </div>
  );
}
