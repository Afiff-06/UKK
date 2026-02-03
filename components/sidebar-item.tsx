import { ReactNode } from "react";

function SidebarItem({ icon, label, active, onClick }: { icon: ReactNode; label: string; active?: boolean, onClick?: () => void }) {
    return (
        <button
            onClick={onClick}
            className={`w-full flex items-center gap-3 px-5 py-3 rounded-xl ${active
                ? "bg-blue-600 text-white shadow"
                : "text-gray-600 hover:bg-gray-100"
                }`}
        >
            {icon}
            {label}
        </button>
    );
}

export default SidebarItem;
