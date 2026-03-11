import PegawaiSidebar from "@/components/pegawai-sidebar";

export default function PegawaiLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <PegawaiSidebar>
            {children}
        </PegawaiSidebar>
    );
}
