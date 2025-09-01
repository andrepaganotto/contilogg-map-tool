'use client';

export default function Card({ children, className = '' }) {
    return (
        <div className={`rounded-2xl border border-zinc-800 bg-zinc-900/50 shadow-lg shadow-black/30 ${className}`}>
            {children}
        </div>
    );
}
