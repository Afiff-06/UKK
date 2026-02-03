export default function LoadingSpinner({ size = 'md' }: { size?: 'sm' | 'md' | 'lg' }) {
    const sizeClasses = {
        sm: 'w-5 h-5',
        md: 'w-8 h-8',
        lg: 'w-12 h-12',
    };

    return (
        <div className="flex items-center justify-center">
            <div
                className={`${sizeClasses[size]} border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin`}
            />
        </div>
    );
}

export function FullPageLoader() {
    return (
        <div className="min-h-screen flex items-center justify-center bg-[#f5f7fb]">
            <div className="text-center">
                <LoadingSpinner size="lg" />
                <p className="mt-4 text-gray-500">Memuat...</p>
            </div>
        </div>
    );
}
