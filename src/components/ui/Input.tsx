'use client';

import React from 'react';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

export default function Input({ label, error, className = '', ...props }: InputProps) {
  return (
    <div className="w-full flex flex-col gap-1.5">
      {label && (
        <label className="text-xs font-semibold uppercase tracking-wider text-slate-400 font-sans">
          {label}
        </label>
      )}
      <input
        className={`w-full rounded-xl border bg-slate-950 px-4 py-2.5 text-sm text-slate-100 placeholder-slate-500 transition-all duration-200 outline-none focus:ring-2 focus:ring-violet-500/50 ${
          error ? 'border-rose-500 focus:ring-rose-500/30' : 'border-slate-800 focus:border-slate-700'
        } ${className}`}
        {...props}
      />
      {error && <span className="text-xs font-medium text-rose-500">{error}</span>}
    </div>
  );
}
