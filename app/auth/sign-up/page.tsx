// import { SignUpForm } from "@/components/sign-up-form";

// export default function Page() {
//   return (
//     <div className="flex min-h-svh w-full items-center justify-center p-6 md:p-10">
//       <div className="w-full max-w-sm">
//         <SignUpForm />
//       </div>
//     </div>
//   );
// }
'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import { createClient } from '@/lib/supabase/client'

// --- KONFIGURASI ROLE DI SINI ---
// Ganti string ini menjadi 'petugas' atau 'pegawai' sesuai kebutuhan halaman
const USER_ROLE = 'petugas'

// 1. Schema Validasi menggunakan Zod
const registerSchema = z.object({
  nama: z.string().min(3, 'Nama lengkap wajib diisi (min 3 huruf)'),
  email: z.string().email('Format email tidak valid'),
  nip: z.string().min(5, 'NIP wajib diisi'),
  username: z.string().min(3, 'Username wajib diisi'),
  alamat: z.string().min(5, 'Alamat lengkap wajib diisi'),
  password: z.string().min(6, 'Password minimal 6 karakter'),
})

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
    formState: { errors },
  } = useForm<RegisterFormValues>({
    resolver: zodResolver(registerSchema),
  })

  // 3. Handle Submit
  const onSubmit = async (formData: RegisterFormValues) => {
    setLoading(true)
    setServerError(null)

    try {
      const { data, error } = await supabase.auth.signUp({
        email: formData.email,
        password: formData.password,
        options: {
          // Data ini yang akan dibaca oleh Trigger PostgreSQL
          data: {
            nama: formData.nama,
            username: formData.username,
            nip: formData.nip,
            alamat: formData.alamat,
            role: USER_ROLE, // Role otomatis terisi dari variabel di atas
          },
        },
      })

      console.log(error)

      if (error) {
        throw error
      }

      alert('Registrasi berhasil! Silakan cek email untuk verifikasi (jika diaktifkan) atau login.')
      router.push('/login') // Redirect ke halaman login

    } catch (error: any) {
      console.log(error)
      setServerError(error.message || 'Terjadi kesalahan saat registrasi')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-md mx-auto mt-10 p-6 bg-white rounded-lg shadow-md border border-gray-200">
      <h2 className="text-2xl font-bold mb-6 text-center text-gray-800">
        Register {USER_ROLE === 'petugas' ? 'Petugas' : 'Pegawai'}
      </h2>

      {serverError && (
        <div className="mb-4 p-3 bg-red-100 text-red-700 rounded text-sm">
          {serverError}
        </div>
      )}

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        {/* Input Nama */}
        <div>
          <label className="block text-sm font-medium text-gray-700">Nama Lengkap</label>
          <input
            {...register('nama')}
            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            placeholder="Iqbal Lazuardi"
          />
          {errors.nama && <p className="text-red-500 text-xs mt-1">{errors.nama.message}</p>}
        </div>

        {/* Input Username & NIP (Grid 2 Kolom) */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">Username</label>
            <input
              {...register('username')}
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              placeholder="iqbal_dev"
            />
            {errors.username && <p className="text-red-500 text-xs mt-1">{errors.username.message}</p>}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">NIP</label>
            <input
              {...register('nip')}
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              placeholder="12345678"
            />
            {errors.nip && <p className="text-red-500 text-xs mt-1">{errors.nip.message}</p>}
          </div>
        </div>

        {/* Input Email */}
        <div>
          <label className="block text-sm font-medium text-gray-700">Email</label>
          <input
            type="email"
            {...register('email')}
            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            placeholder="email@contoh.com"
          />
          {errors.email && <p className="text-red-500 text-xs mt-1">{errors.email.message}</p>}
        </div>

        {/* Input Password */}
        <div>
          <label className="block text-sm font-medium text-gray-700">Password</label>
          <input
            type="password"
            {...register('password')}
            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            placeholder="******"
          />
          {errors.password && <p className="text-red-500 text-xs mt-1">{errors.password.message}</p>}
        </div>

        {/* Input Alamat */}
        <div>
          <label className="block text-sm font-medium text-gray-700">Alamat</label>
          <textarea
            {...register('alamat')}
            rows={3}
            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            placeholder="Jl. Raya Web Developer No. 1"
          />
          {errors.alamat && <p className="text-red-500 text-xs mt-1">{errors.alamat.message}</p>}
        </div>

        {/* Submit Button */}
        <button
          type="submit"
          disabled={loading}
          className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:bg-gray-400"
        >
          {loading ? 'Memproses...' : 'Daftar Sekarang'}
        </button>
      </form>
    </div>
  )
}