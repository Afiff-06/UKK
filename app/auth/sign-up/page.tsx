'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import { createClient } from '@/lib/supabase/client'
import { GraduationCap, UserCircle, Phone, MapPin, Hash, BookOpen, GraduationCap as StudentIcon } from 'lucide-react'

// 1. Schema Validasi menggunakan Zod
const registerSchema = z.object({
  nama: z.string().min(3, 'Nama lengkap wajib diisi (min 3 huruf)'),
  email: z.string().email('Format email tidak valid'),
  username: z.string().min(3, 'Username wajib diisi'),
  password: z.string().min(6, 'Password minimal 6 karakter'),
  role: z.enum(['guru', 'siswa']),
  no_telp: z.string().min(10, 'Nomor telepon minimal 10 digit'),
  alamat: z.string().min(5, 'Alamat lengkap wajib diisi'),
  // Optional fields that will be validated in refine
  nip: z.string().optional(),
  nisn: z.string().optional(),
  kelas: z.string().optional(),
  konsentrasi_keahlian: z.string().optional(),
}).refine((data) => {
  if (data.role === 'guru') {
    return !!data.nip && data.nip.length === 18;
  }
  if (data.role === 'siswa') {
    return !!data.nisn && !!data.kelas && !!data.konsentrasi_keahlian;
  }
  return true;
}, {
  message: "Lengkapi data identitas anda",
  path: ["role"] // This is a bit generic, but refine handles it
});

type RegisterFormValues = z.infer<typeof registerSchema>

export default function RegisterForm() {
  const router = useRouter()
  const supabase = createClient();
  const [loading, setLoading] = useState(false)
  const [serverError, setServerError] = useState<string | null>(null)

  // 2. Setup React Hook Form
  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<RegisterFormValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      role: 'siswa'
    }
  })

  const selectedRole = watch('role')

  // 3. Handle Submit
  const onSubmit = async (formData: RegisterFormValues) => {
    setLoading(true)
    setServerError(null)

    try {
      const { data, error } = await supabase.auth.signUp({
        email: formData.email,
        password: formData.password,
        options: {
          data: {
            nama: formData.nama,
            username: formData.username,
            role: formData.role,
            no_telp: formData.no_telp,
            alamat: formData.alamat,
            nip: formData.role === 'guru' ? formData.nip : null,
            nisn: formData.role === 'siswa' ? formData.nisn : null,
            kelas: formData.role === 'siswa' ? formData.kelas : null,
            konsentrasi_keahlian: formData.role === 'siswa' ? formData.konsentrasi_keahlian : null,
          },
        },
      })

      if (error) throw error

      alert('Registrasi berhasil! Silakan cek email untuk verifikasi atau silakan login.')
      router.push('/auth/login')

    } catch (error: any) {
      console.error(error)
      setServerError(error.message || 'Terjadi kesalahan saat registrasi')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4 py-12">
      <div className="max-w-2xl w-full bg-white rounded-3xl shadow-xl border border-gray-100 overflow-hidden">
        <div className="bg-gradient-to-r from-blue-600 to-indigo-700 p-8 text-white text-center">
          <h2 className="text-3xl font-bold mb-2">Buat Akun Baru</h2>
          <p className="opacity-80">Daftar sebagai Guru atau Siswa untuk mengakses sistem</p>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="p-8 space-y-6">
          {serverError && (
            <div className="p-4 bg-red-50 border-l-4 border-red-500 text-red-700 rounded-lg text-sm flex items-center gap-3">
              <span className="font-bold">⚠️</span>
              {serverError}
            </div>
          )}

          {/* Role Selection */}
          <div className="grid grid-cols-2 gap-4">
            <label className={`relative flex flex-col items-center gap-3 p-4 border-2 rounded-2xl cursor-pointer transition-all ${selectedRole === 'guru' ? 'border-blue-600 bg-blue-50 ring-4 ring-blue-100' : 'border-gray-100 hover:border-gray-200'}`}>
              <input type="radio" {...register('role')} value="guru" className="sr-only" />
              <div className={`w-12 h-12 rounded-full flex items-center justify-center ${selectedRole === 'guru' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-400'}`}>
                <GraduationCap size={24} />
              </div>
              <span className={`font-semibold ${selectedRole === 'guru' ? 'text-blue-700' : 'text-gray-500'}`}>Guru</span>
            </label>
            <label className={`relative flex flex-col items-center gap-3 p-4 border-2 rounded-2xl cursor-pointer transition-all ${selectedRole === 'siswa' ? 'border-indigo-600 bg-indigo-50 ring-4 ring-indigo-100' : 'border-gray-100 hover:border-gray-200'}`}>
              <input type="radio" {...register('role')} value="siswa" className="sr-only" />
              <div className={`w-12 h-12 rounded-full flex items-center justify-center ${selectedRole === 'siswa' ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-400'}`}>
                <StudentIcon size={24} />
              </div>
              <span className={`font-semibold ${selectedRole === 'siswa' ? 'text-indigo-700' : 'text-gray-500'}`}>Siswa</span>
            </label>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Input Nama */}
            <div className="space-y-1">
              <label className="text-sm font-medium text-gray-700 flex items-center gap-2">
                <UserCircle size={16} /> Nama Lengkap
              </label>
              <input
                {...register('nama')}
                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                placeholder="Contoh: Budi Santoso"
              />
              {errors.nama && <p className="text-red-500 text-xs">{errors.nama.message}</p>}
            </div>

            {/* Input Username */}
            <div className="space-y-1">
              <label className="text-sm font-medium text-gray-700 flex items-center gap-2">
                @ Username
              </label>
              <input
                {...register('username')}
                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                placeholder="username"
              />
              {errors.username && <p className="text-red-500 text-xs">{errors.username.message}</p>}
            </div>

            {/* Input Email */}
            <div className="space-y-1">
              <label className="text-sm font-medium text-gray-700 flex items-center gap-2">
                ✉️ Email
              </label>
              <input
                type="email"
                {...register('email')}
                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                placeholder="nama@sekolah.sch.id"
              />
              {errors.email && <p className="text-red-500 text-xs">{errors.email.message}</p>}
            </div>

            {/* Input Password */}
            <div className="space-y-1">
              <label className="text-sm font-medium text-gray-700 flex items-center gap-2">
                🔑 Password
              </label>
              <input
                type="password"
                {...register('password')}
                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                placeholder="Minimal 6 karakter"
              />
              {errors.password && <p className="text-red-500 text-xs">{errors.password.message}</p>}
            </div>

            {/* Role Specific Fields */}
            {selectedRole === 'guru' ? (
              <div className="space-y-1 md:col-span-2">
                <label className="text-sm font-medium text-gray-700 flex items-center gap-2">
                  <Hash size={16} /> NIP (Nomor Induk Pegawai)
                </label>
                <input
                  {...register('nip')}
                  maxLength={18}
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                  placeholder="18 digit NIP"
                />
                <p className="text-xs text-gray-400">Pastikan NIP anda sesuai (18 digit)</p>
              </div>
            ) : (
              <>
                <div className="space-y-1">
                  <label className="text-sm font-medium text-gray-700 flex items-center gap-2">
                    <Hash size={16} /> NISN
                  </label>
                  <input
                    {...register('nisn')}
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all"
                    placeholder="Nomor Induk Siswa Nasional"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-sm font-medium text-gray-700 flex items-center gap-2">
                    <BookOpen size={16} /> Kelas
                  </label>
                  <input
                    {...register('kelas')}
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all"
                    placeholder="Contoh: XII RPL 1"
                  />
                </div>
                <div className="space-y-1 md:col-span-2">
                  <label className="text-sm font-medium text-gray-700 flex items-center gap-2">
                    <StudentIcon size={16} /> Konsentrasi Keahlian
                  </label>
                  <input
                    {...register('konsentrasi_keahlian')}
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all"
                    placeholder="Contoh: Rekayasa Perangkat Lunak"
                  />
                </div>
              </>
            )}

            {/* Common Fields */}
            <div className="space-y-1 md:col-span-2">
              <label className="text-sm font-medium text-gray-700 flex items-center gap-2">
                <Phone size={16} /> Nomor Telepon
              </label>
              <input
                {...register('no_telp')}
                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                placeholder="Contoh: 08123456789"
              />
              {errors.no_telp && <p className="text-red-500 text-xs">{errors.no_telp.message}</p>}
            </div>

            <div className="space-y-1 md:col-span-2">
              <label className="text-sm font-medium text-gray-700 flex items-center gap-2">
                <MapPin size={16} /> Alamat
              </label>
              <textarea
                {...register('alamat')}
                rows={3}
                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all resize-none"
                placeholder="Alamat lengkap tempat tinggal"
              />
              {errors.alamat && <p className="text-red-500 text-xs">{errors.alamat.message}</p>}
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className={`w-full py-4 rounded-xl text-white font-bold text-lg shadow-lg transition-all ${loading ? 'bg-gray-400 cursor-not-allowed' : 'bg-gradient-to-r from-blue-600 to-indigo-700 hover:shadow-blue-200 hover:scale-[1.02] active:scale-[0.98]'}`}
          >
            {loading ? (
              <div className="flex items-center justify-center gap-2">
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                Memproses...
              </div>
            ) : 'Daftar Sekarang'}
          </button>

          <p className="text-center text-gray-500 text-sm">
            Sudah punya akun?{' '}
            <button
              type="button"
              onClick={() => router.push('/auth/login')}
              className="text-blue-600 font-bold hover:underline"
            >
              Masuk di sini
            </button>
          </p>
        </form>
      </div>
    </div>
  )
}