'use client'

import React from 'react'
import Header from '@/components/header'
import { useAuth } from '@/lib/auth-context'
import { 
  User, 
  Mail, 
  Phone, 
  MapPin, 
  BadgeInfo,
  GraduationCap, 
  BookOpen, 
  ShieldCheck,
  Calendar
} from 'lucide-react'
import { getRoleLabel } from '@/lib/roles'
import LoadingSpinner from '@/components/loading-spinner'

export default function ProfilePage() {
  const { profile, role, loading } = useAuth()

  if (loading) {
    return (
      <div className="flex-1 bg-[#f5f7fb] flex flex-col items-center justify-center min-h-screen">
        <LoadingSpinner size="lg" />
      </div>
    )
  }

  const isSiswa = role === 'siswa'
  const isGuru = role === 'guru'

  const getGradient = (role: string | null) => {
    switch (role) {
      case 'guru': return 'from-emerald-500 to-teal-600'
      case 'siswa': return 'from-orange-500 to-amber-600'
      case 'admin': return 'from-purple-500 to-indigo-600'
      case 'operator': return 'from-blue-500 to-indigo-600'
      default: return 'from-gray-500 to-slate-600'
    }
  }

  return (
    <div className="flex-1 bg-[#f5f7fb] flex flex-col min-h-screen">
      <Header title="Profil Saya" />

      <main className="p-8 flex-1">
        <div className="max-w-4xl mx-auto">
          {/* Profile Header Card */}
          <div className="bg-white rounded-3xl shadow-xl overflow-hidden mb-8 border border-gray-100">
            <div className={`h-32 bg-gradient-to-r ${getGradient(role)}`} />
            <div className="px-8 pb-8 flex flex-col md:flex-row items-start md:items-end -mt-16 gap-6">
              <div className="w-32 h-32 rounded-3xl bg-white p-2 shadow-xl shrink-0">
                <div className={`w-full h-full rounded-2xl bg-gradient-to-br ${getGradient(role)} flex items-center justify-center text-white text-4xl font-bold`}>
                  {profile?.nama?.charAt(0).toUpperCase() || <User size={48} />}
                </div>
              </div>
              <div className="flex-1 pb-2">
                <h1 className="text-3xl font-bold text-gray-800 mb-1">{profile?.nama}</h1>
                <div className="flex flex-wrap gap-3 items-center">
                  <span className={`px-4 py-1 rounded-full text-sm font-semibold text-white bg-gradient-to-r ${getGradient(role)} shadow-sm`}>
                    {getRoleLabel(role)}
                  </span>
                  <span className="text-gray-400 text-sm flex items-center gap-1">
                    <User size={14} /> @{profile?.username}
                  </span>
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Essential Info */}
            <div className="bg-white rounded-3xl shadow-lg p-8 border border-gray-50">
              <h2 className="text-xl font-bold text-gray-800 mb-6 flex items-center gap-2">
                <ShieldCheck className="text-blue-500" /> Informasi Akun
              </h2>
              <div className="space-y-6">
                <InfoItem icon={<User />} label="Nama Lengkap" value={profile?.nama} />
                <InfoItem icon={<Mail />} label="Email" value={profile?.email || 'Belum diatur'} />
                <InfoItem icon={<BadgeInfo />} label="Username" value={`@${profile?.username}`} />
                <InfoItem icon={<Calendar />} label="Bergabung Pada" value={new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })} />
              </div>
            </div>

            {/* Role Specific Info */}
            <div className="bg-white rounded-3xl shadow-lg p-8 border border-gray-50 h-full">
              <h2 className="text-xl font-bold text-gray-800 mb-6 flex items-center gap-2">
                {isSiswa ? <GraduationCap className="text-orange-500" /> : <BadgeInfo className="text-emerald-500" />} 
                Detail Identitas
              </h2>
              
              <div className="space-y-6">
                {isGuru && (
                  <InfoItem icon={<BadgeInfo />} label="NIP" value={profile?.nip || '-'} />
                )}
                
                {isSiswa && (
                  <>
                    <InfoItem icon={<BadgeInfo />} label="NISN" value={profile?.nisn || '-'} />
                    <InfoItem icon={<BookOpen />} label="Kelas" value={profile?.kelas || '-'} />
                    <InfoItem icon={<GraduationCap />} label="Konsentrasi Keahlian" value={profile?.konsentrasi_keahlian || '-'} />
                  </>
                )}

                <InfoItem icon={<Phone />} label="No. Telepon" value={profile?.no_telp || '-'} />
                <InfoItem icon={<MapPin />} label="Alamat" value={profile?.alamat || '-'} />
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}

function InfoItem({ icon, label, value }: { icon: React.ReactNode, label: string, value: string | null | undefined }) {
  return (
    <div className="flex gap-4 items-start group">
      <div className="w-10 h-10 rounded-xl bg-gray-50 flex items-center justify-center text-gray-400 group-hover:bg-blue-50 group-hover:text-blue-500 transition-colors shrink-0">
        {icon}
      </div>
      <div>
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-0.5">{label}</p>
        <p className="text-gray-700 font-medium leading-relaxed">{value || 'Tidak ada data'}</p>
      </div>
    </div>
  )
}
