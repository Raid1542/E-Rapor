'use client';
import { Eye, EyeOff } from 'lucide-react';

const inputBase = "w-full border-2 rounded-xl px-4 py-3 pr-12 text-sm text-gray-800 outline-none transition-all bg-orange-50/40 placeholder:text-gray-400";
const inputNormal = `${inputBase} border-orange-200 focus:border-orange-400 focus:ring-2 focus:ring-orange-400/20`;
const inputError = `${inputBase} border-red-400 focus:border-red-500`;

interface PasswordInputProps {
    label: string; name: string; value: string; onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
    placeholder?: string; required?: boolean; show: boolean; onToggle: () => void; error?: string; hint?: React.ReactNode;
}

export default function PasswordInput({ label, name, value, onChange, placeholder, required, show, onToggle, error, hint }: PasswordInputProps) {
    return (
        <div className="flex flex-col gap-1.5">
            <label className="block text-sm font-semibold mb-1.5" style={{ color: '#7a3a0a' }}>
                {label}{required && <span className="text-red-500 ml-0.5">*</span>}
            </label>
            <div className="relative flex items-center">
                <input type={show ? 'text' : 'password'} name={name} value={value} onChange={onChange} placeholder={placeholder} required={required} autoComplete="off" className={error ? inputError : inputNormal} style={{ WebkitAppearance: 'none' }} />
                <button type="button" onClick={onToggle} tabIndex={-1} aria-label={show ? 'Sembunyikan' : 'Tampilkan'} className="absolute right-4 transition-colors" style={{ color: '#c95b08' }} onMouseEnter={e => (e.currentTarget.style.color = '#e8690a')} onMouseLeave={e => (e.currentTarget.style.color = '#c95b08')}>
                    {show ? <EyeOff size={17} /> : <Eye size={17} />}
                </button>
            </div>
            {error && <p className="text-xs text-red-500 flex items-center gap-1 mt-0.5 in-shake"><span className="inline-block w-1 h-1 rounded-full bg-red-500 flex-shrink-0" />{error}</p>}
            {hint && !error && hint}
        </div>
    );
}