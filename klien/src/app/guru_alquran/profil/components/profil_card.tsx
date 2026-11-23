'use client';
import { Camera, Upload, KeyRound } from 'lucide-react';
import { useRouter } from 'next/navigation';

interface ProfileCardProps {
    nama: string;
    email: string;
    profileImage: string | null;
    previewImage: string | null;
    selectedFileName: string;
    isUploading: boolean;
    onFileSelect: (e: React.ChangeEvent<HTMLInputElement>) => void;
    fileInputRef: React.RefObject<HTMLInputElement | null>;
}

const HEADER_GRAD = { background: 'linear-gradient(135deg,#c95b08,#e8690a,#f5870a)' };
const CARD_STYLE = { border: '1px solid #fde0c8', boxShadow: '0 2px 16px rgba(200,80,10,0.07)' };

export default function ProfileCard({ nama, email, profileImage, previewImage, selectedFileName, isUploading, onFileSelect, fileInputRef }: ProfileCardProps) {
    const router = useRouter();
    const initials = (nama || '??').split(' ').slice(0, 2).map(w => w[0]?.toUpperCase() || '').join('') || '??';

    return (
        <div className="lg:w-72 flex-shrink-0 w-full anim-in d2">
            <div className="bg-white rounded-2xl overflow-hidden" style={CARD_STYLE}>
                <div className="px-5 py-4" style={HEADER_GRAD}><p className="text-sm font-bold text-white">Foto Profil</p></div>
                <div className="p-6 flex flex-col items-center gap-4">
                    <div className="relative">
                        <div className="w-28 h-28 rounded-full overflow-hidden flex items-center justify-center ring-4" style={{ background: 'linear-gradient(135deg,#fde0c8,#f5a623)' }}>
                            {(previewImage || profileImage) ? (
                                <img src={previewImage || profileImage!} alt="Foto Profil" className="w-full h-full object-cover" onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                            ) : (
                                <span className="text-3xl font-bold" style={{ color: '#c95b08' }}>{initials}</span>
                            )}
                        </div>
                        <button type="button" onClick={() => fileInputRef.current?.click()} disabled={isUploading} className="absolute bottom-1 right-1 w-8 h-8 rounded-full flex items-center justify-center shadow-md transition-all disabled:opacity-60" style={{ background: 'linear-gradient(135deg,#e8690a,#f5a623)' }} title="Ganti foto">
                            <Camera size={14} className="text-white" />
                        </button>
                    </div>
                    <div className="text-center">
                        <p className="font-bold text-gray-800 text-base">{nama || 'Guru Al-Qur\'an'}</p>
                        <p className="text-xs mt-0.5 px-2 py-0.5 rounded-full inline-block" style={{ background: '#fff0e5', color: '#c95b08', border: '1px solid #fde0c8' }}>Guru Al-Qur'an</p>
                        <p className="text-xs text-gray-400 mt-1">{email || ''}</p>
                    </div>
                    <div className="w-full" style={{ borderTop: '1px solid #fde0c8' }} />
                    <button type="button" onClick={() => router.push('/guru_alquran/ubah_password')} className="w-full flex items-center justify-center gap-2 text-white text-sm font-bold px-4 py-2.5 rounded-xl transition-all" style={{ background: 'linear-gradient(135deg,#e8690a,#f5a623)', boxShadow: '0 3px 10px rgba(232,105,10,0.25)' }} onMouseEnter={e => (e.currentTarget.style.background = 'linear-gradient(135deg,#c95b08,#e8690a)')} onMouseLeave={e => (e.currentTarget.style.background = 'linear-gradient(135deg,#e8690a,#f5a623)')}>
                        <KeyRound size={15} /> Ubah Password
                    </button>
                    <div className="w-full" style={{ borderTop: '1px solid #fde0c8' }} />
                    <div className="w-full">
                        <p className="text-sm font-semibold mb-2" style={{ color: '#7a3a0a' }}>Ganti Foto Profil</p>
                        <div className="w-full flex items-center rounded-xl overflow-hidden cursor-pointer transition-all" style={{ border: '1px solid #fde0c8', background: '#fffaf6' }} onClick={() => !isUploading && fileInputRef.current?.click()} onMouseEnter={e => { if (!isUploading) e.currentTarget.style.background = '#fff0e5'; }} onMouseLeave={e => { if (!isUploading) e.currentTarget.style.background = '#fffaf6'; }}>
                            <span className="text-xs font-semibold px-3 py-2 whitespace-nowrap" style={{ borderRight: '1px solid #fde0c8', color: '#7a3a0a', background: '#fff0e5' }}>Pilih File</span>
                            <span className="text-xs text-gray-400 px-3 py-2 truncate">{selectedFileName || 'Belum ada file dipilih'}</span>
                        </div>
                        <p className="text-xs text-gray-400 mt-1.5">Format .jpg | .png | .webp · Maks 5 MB</p>
                        <input type="file" ref={fileInputRef} onChange={onFileSelect} accept="image/jpeg,image/png,image/webp" className="hidden" disabled={isUploading} />
                        <button type="button" onClick={() => fileInputRef.current?.click()} disabled={isUploading} className="mt-3 w-full flex items-center justify-center gap-2 text-white text-sm font-bold px-4 py-2.5 rounded-xl transition-all disabled:opacity-60 disabled:cursor-not-allowed" style={{ background: 'linear-gradient(135deg,#e8690a,#f5a623)', boxShadow: '0 2px 8px rgba(232,105,10,0.2)' }} onMouseEnter={e => { if (!isUploading) e.currentTarget.style.background = 'linear-gradient(135deg,#c95b08,#e8690a)'; }} onMouseLeave={e => { if (!isUploading) e.currentTarget.style.background = 'linear-gradient(135deg,#e8690a,#f5a623)'; }}>
                            {isUploading ? (<><div className="w-4 h-4 rounded-full border-2 border-white/40 border-t-white animate-spin" /> Mengupload...</>) : (<><Upload size={14} /> Upload Foto</>)}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}