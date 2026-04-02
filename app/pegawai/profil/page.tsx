'use client'

import React from 'react'
import Header from '@/components/header'
import { useAuth } from '@/lib/auth-context'
import { 
  User, 
  Phone, 
  MapPin, 
  BadgeInfo,
  GraduationCap, 
  BookOpen, 
  ShieldCheck,
  Calendar,
  IdCard
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
    return 'from-blue-600 to-blue-700';
  }

  return (
    <div className="flex-1 bg-[#f8faff] flex flex-col min-h-screen">
      <Header title="Profil Saya" />

      <main className="p-4 sm:p-8 flex-1">
        <div className="max-w-4xl mx-auto space-y-6 sm:space-y-8">
          {/* Profile Header Card */}
          <div className="bg-white rounded-[2rem] shadow-sm hover:shadow-md transition-shadow duration-300 overflow-hidden border border-gray-100/60">
            <div className={`h-40 bg-gradient-to-r ${getGradient(role)} relative overflow-hidden`}>
              <div className="absolute inset-0 bg-black/10"></div>
              <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10"></div>
            </div>
            
            <div className="px-6 sm:px-10 pb-8 flex flex-col md:flex-row items-center md:items-end -mt-20 gap-6 md:gap-8 relative z-10">
              <div className="w-36 h-36 rounded-full bg-white p-2 shadow-xl shrink-0 group">
                <div className={`w-full h-full rounded-full bg-gradient-to-br ${getGradient(role)} flex items-center justify-center text-white text-5xl font-bold transition-transform duration-300 group-hover:scale-105`}>
                  {profile?.nama?.charAt(0).toUpperCase() || <User size={56} />}
                </div>
              </div>
              
              <div className="flex-1 text-center md:text-left pb-2">
                <h1 className="text-3xl font-extrabold text-gray-900 mb-2 truncate">{profile?.nama}</h1>
                <div className="flex flex-wrap justify-center md:justify-start gap-4 items-center">
                  <span className={`px-5 py-1.5 rounded-full text-xs font-bold text-white uppercase tracking-wider bg-gradient-to-r ${getGradient(role)} shadow-sm`}>
                    {getRoleLabel(role)}
                  </span>
                  <span className="text-gray-500 text-sm font-medium flex items-center gap-1.5 bg-gray-50 px-3 py-1 rounded-full border border-gray-100">
                    <User size={14} className="text-gray-400" /> @{profile?.username}
                  </span>
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 sm:gap-8">
            {/* Essential Info */}
            <div className="bg-white rounded-[2rem] shadow-sm hover:shadow-md transition-shadow duration-300 p-6 sm:p-8 border border-gray-100/60">
              <div className="flex items-center gap-3 mb-8 pb-4 border-b border-gray-50">
                <div className="p-2.5 bg-blue-50 text-blue-600 rounded-xl">
                  <ShieldCheck size={24} />
                </div>
                <h2 className="text-xl font-bold text-gray-800">Informasi Akun</h2>
              </div>
              <div className="space-y-6">
                <InfoItem icon={<User size={20} />} label="Nama Lengkap" value={profile?.nama} />
                <InfoItem icon={<BadgeInfo size={20} />} label="Username" value={`@${profile?.username}`} />
                <InfoItem icon={<Calendar size={20} />} label="Bergabung Pada" value={new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })} />
              </div>
            </div>

            {/* Role Specific Info */}
            <div className="bg-white rounded-[2rem] shadow-sm hover:shadow-md transition-shadow duration-300 p-6 sm:p-8 border border-gray-100/60 h-full">
               <div className="flex items-center gap-3 mb-8 pb-4 border-b border-gray-50">
                <div className="p-2.5 bg-blue-50 text-blue-600 rounded-xl">
                  {isSiswa ? <GraduationCap size={24} /> : <IdCard size={24} />} 
                </div>
                <h2 className="text-xl font-bold text-gray-800">Detail Identitas</h2>
              </div>
              
              <div className="space-y-6">
                {isGuru && (
                  <InfoItem icon={<IdCard size={20} />} label="NIP" value={profile?.nip || '-'} />
                )}
                
                {isSiswa && (
                  <>
                    <InfoItem icon={<IdCard size={20} />} label="NISN" value={profile?.nisn || '-'} />
                    <InfoItem icon={<BookOpen size={20} />} label="Kelas" value={profile?.kelas || '-'} />
                    <InfoItem icon={<GraduationCap size={20} />} label="Konsentrasi Keahlian" value={profile?.konsentrasi_keahlian || '-'} />
                  </>
                )}

                <InfoItem icon={<Phone size={20} />} label="No. Telepon" value={profile?.no_telp || '-'} />
                <InfoItem icon={<MapPin size={20} />} label="Alamat" value={profile?.alamat || '-'} />
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
    <div className="flex gap-4 items-center group p-3 -mx-3 rounded-2xl hover:bg-gray-50/80 transition-all duration-200">
      <div className="w-12 h-12 rounded-full bg-gray-50 flex items-center justify-center text-gray-400 group-hover:bg-blue-50 group-hover:text-blue-600 group-hover:scale-110 transition-all duration-300 shrink-0 shadow-sm border border-gray-100/50">
        {icon}
      </div>
      <div>
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-0.5">{label}</p>
        <p className="text-gray-700 font-medium leading-relaxed">{value || 'Tidak ada data'}</p>
      </div>
    </div>
  )
}
