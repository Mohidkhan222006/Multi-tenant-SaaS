'use client';

import React from 'react';

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  options: { value: string; label: string }[];
}

export default function Select({ label, error, options, className = '', ...props }: SelectProps) {
  return (
    <div className="w-full flex flex-col gap-1.5">
      {label && (
        <label className="text-xs font-semibold uppercase tracking-wider text-slate-400 font-sans">
          {label}
        </label>
      )}
      <select
        className={`w-full rounded-xl border bg-slate-950 px-4 py-2.5 text-sm text-slate-100 placeholder-slate-500 transition-all duration-200 outline-none focus:ring-2 focus:ring-zinc-700/50 ${
          error ? 'border-rose-500 focus:ring-rose-500/30' : 'border-slate-800 focus:border-slate-700'
        } ${className}`}
        {...props}
      >
        {options.map((opt) => (
          <option key={opt.value} value={opt.value} className="bg-slate-900 text-slate-100">
            {opt.label}
          </option>
        ))}
      </select>
      {error && <span className="text-xs font-medium text-rose-500">{error}</span>}
    </div>
  );
}
