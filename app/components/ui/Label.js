'use client';

export default function Label({ children, htmlFor }) {
    return (
        <label htmlFor={htmlFor} className="text-sm text-zinc-300">
            {children}
        </label>
    );
}
