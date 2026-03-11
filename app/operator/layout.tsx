import OperatorSidebar from "@/components/operator-sidebar";

export default function OperatorLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <OperatorSidebar>
            {children}
        </OperatorSidebar>
    );
}
