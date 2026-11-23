'use client';

const inputCls = "w-full border rounded-xl px-4 py-2.5 text-sm text-gray-800 outline-none transition-all focus:ring-2 focus:ring-orange-400 focus:border-orange-400 bg-orange-50/40 border-orange-200 placeholder:text-gray-400";
const inputErrCls = "w-full border rounded-xl px-4 py-2.5 text-sm text-gray-800 outline-none transition-all focus:ring-2 focus:ring-orange-400 focus:border-orange-400 bg-orange-50/40 border-red-500 placeholder:text-gray-400";
const readonlyCls = "w-full border rounded-xl px-4 py-2.5 text-sm text-gray-500 outline-none bg-gray-50 border-gray-200 cursor-not-allowed";
const labelCls = "block text-sm font-semibold mb-1.5";
const labelColor = { color: '#7a3a0a' };
const CARD_STYLE = { border: '1px solid #fde0c8', boxShadow: '0 2px 16px rgba(200,80,10,0.07)' };
const HEADER_GRAD = { background: 'linear-gradient(135deg,#c95b08,#e8690a,#f5870a)' };

interface ProfileFormProps {
    formData: any;
    errors: Record<string, string>;
    isSaving: boolean;
    onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => void;
    onClearError: (field: string) => void;
    onSubmit: () => void;
}

export default function ProfileForm({ formData, errors, isSaving, onChange, onClearError, onSubmit }: ProfileFormProps) {
    return (
        <div className="flex-1 w-full anim-in d3">
            <div className="bg-white rounded-2xl overflow-hidden" style={CARD_STYLE}>
                <div className="px-6 py-4" style={HEADER_GRAD}><p className="text-base font-bold text-white">Edit Profil</p></div>
                <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-5">
                    <div className="flex flex-col gap-1.5">
                        <label className={labelCls} style={labelColor}>Nama <span className="text-red-500">*</span></label>
                        <input type="text" name="nama" value={formData.nama} onChange={onChange} placeholder="Masukkan nama lengkap" className={inputCls} required />
                    </div>
                    <div className="flex flex-col gap-1.5">
                        <label className={labelCls} style={labelColor}>Email Akun</label>
                        <input type="email" name="email" value={formData.email} className={readonlyCls} readOnly />
                        <p className="text-xs text-gray-400">Email tidak dapat diubah</p>
                    </div>
                    <div className="flex flex-col gap-1.5">
                        <label className={labelCls} style={labelColor}>NUPTK</label>
                        <input type="text" name="nuptk" value={formData.nuptk} onChange={onChange} placeholder="Nomor Unik Pendidik" className={inputCls} />
                    </div>
                    <div className="flex flex-col gap-1.5">
                        <label className={labelCls} style={labelColor}>NIY</label>
                        <input type="text" name="niy" value={formData.niy} onChange={onChange} placeholder="Nomor Induk Yayasan" className={inputCls} />
                    </div>
                    <div className="flex flex-col gap-1.5">
                        <label className={labelCls} style={labelColor}>Jenis Kelamin <span className="text-red-500">*</span></label>
                        <select name="jenisKelamin" value={formData.jenisKelamin} onChange={onChange} className={inputCls} required>
                            <option value="Laki-laki">Laki-laki</option>
                            <option value="Perempuan">Perempuan</option>
                        </select>
                    </div>
                    <div className="flex flex-col gap-1.5">
                        <label className={labelCls} style={labelColor}>Telepon</label>
                        <input type="tel" name="telepon" value={formData.telepon} onChange={onChange} placeholder="Misal: 081234567890" className={inputCls} />
                    </div>
                    <div className="flex flex-col gap-1.5">
                        <label className={labelCls} style={labelColor}>Tempat Lahir <span className="text-red-500">*</span></label>
                        <input type="text" name="tempatLahir" value={formData.tempatLahir} onChange={onChange} placeholder="Masukkan tempat lahir" className={inputCls} required />
                    </div>
                    <div className="flex flex-col gap-1.5">
                        <label className={labelCls} style={labelColor}>Tanggal Lahir <span className="text-red-500">*</span></label>
                        <input type="date" name="tanggalLahir" value={formData.tanggalLahir} onChange={(e) => { onChange(e); onClearError('tanggalLahir'); }} className={errors.tanggalLahir ? inputErrCls : inputCls} required />
                        {errors.tanggalLahir && <p className="text-red-500 text-xs flex items-center gap-1">{errors.tanggalLahir}</p>}
                    </div>
                    <div className="md:col-span-2 flex flex-col gap-1.5">
                        <label className={labelCls} style={labelColor}>Alamat</label>
                        <textarea name="alamat" value={formData.alamat} onChange={onChange} rows={3} placeholder="Masukkan alamat lengkap" className={inputCls} />
                    </div>
                </div>
                <div className="px-6 pb-6">
                    <div className="pt-4" style={{ borderTop: '1px solid #fde0c8' }}>
                        <div className="flex justify-end">
                            <button type="button" onClick={onSubmit} disabled={isSaving} className="flex items-center gap-2 text-white text-sm font-bold px-6 py-2.5 rounded-xl transition-all disabled:opacity-60 disabled:cursor-not-allowed" style={{ background: 'linear-gradient(135deg,#e8690a,#f5a623)', boxShadow: '0 3px 12px rgba(232,105,10,0.3)' }} onMouseEnter={e => { if (!isSaving) e.currentTarget.style.background = 'linear-gradient(135deg,#c95b08,#e8690a)'; }} onMouseLeave={e => { if (!isSaving) e.currentTarget.style.background = 'linear-gradient(135deg,#e8690a,#f5a623)'; }}>
                                {isSaving ? (<><div className="w-4 h-4 rounded-full border-2 border-white/40 border-t-white animate-spin" /> Menyimpan...</>) : (<><span>Simpan Profil</span></>)}
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}