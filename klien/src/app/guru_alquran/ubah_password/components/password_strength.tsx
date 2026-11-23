'use client';
import { CheckCircle2 } from 'lucide-react';

function getStrength(pw: string) {
    if (!pw) return { level: 0, label: '', color: '', barColor: '' };
    let score = 0;
    if (pw.length >= 8) score++; if (pw.length >= 12) score++;
    if (/[A-Z]/.test(pw)) score++; if (/[0-9]/.test(pw)) score++;
    if (/[^A-Za-z0-9]/.test(pw)) score++;
    if (score <= 1) return { level: 1, label: 'Lemah', color: 'text-red-500', barColor: 'bg-red-400' };
    if (score <= 2) return { level: 2, label: 'Sedang', color: 'text-yellow-500', barColor: 'bg-yellow-400' };
    if (score <= 3) return { level: 3, label: 'Kuat', color: 'text-orange-500', barColor: 'bg-orange-400' };
    return { level: 4, label: 'Sangat Kuat', color: 'text-green-500', barColor: 'bg-green-500' };
}

interface Props { newPassword: string; confirmPassword: string; }

export default function PasswordStrength({ newPassword, confirmPassword }: Props) {
    if (!newPassword && !confirmPassword) return null;
    const strength = getStrength(newPassword);
    const rules = [
        { label: 'Minimal 8 karakter', ok: newPassword.length >= 8 },
        { label: 'Mengandung huruf kapital', ok: /[A-Z]/.test(newPassword) },
        { label: 'Mengandung angka', ok: /[0-9]/.test(newPassword) },
        { label: 'Mengandung karakter khusus', ok: /[^A-Za-z0-9]/.test(newPassword) },
        { label: 'Konfirmasi cocok', ok: confirmPassword !== '' && newPassword === confirmPassword },
    ];

    return (
        <>
            {newPassword && (
                <div className="mt-1">
                    <div className="flex items-center justify-between mb-1.5">
                        <span className="text-xs text-gray-500">Kekuatan kata sandi</span>
                        <span className={`text-xs font-bold ${strength.color}`}>{strength.label}</span>
                    </div>
                    <div className="flex gap-1">
                        {[1, 2, 3, 4].map(i => (
                            <div key={i} className={`h-1.5 flex-1 rounded-full transition-all duration-300 ${i <= strength.level ? strength.barColor : 'bg-gray-200'}`} />
                        ))}
                    </div>
                </div>
            )}
            <div className="rounded-xl px-5 py-4 space-y-2" style={{ background: '#f9fafb', border: '1px solid #e5e7eb' }}>
                {rules.map((r, i) => (
                    <div key={i} className="flex items-center gap-2">
                        <CheckCircle2 size={16} className={`flex-shrink-0 transition-colors duration-200 ${r.ok ? 'text-green-500' : 'text-gray-300'}`} />
                        <span className={`text-sm transition-colors duration-200 ${r.ok ? 'text-green-600' : 'text-gray-400'}`}>{r.label}</span>
                    </div>
                ))}
            </div>
        </>
    );
}