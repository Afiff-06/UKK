import Swal from 'sweetalert2';

// Consistent theme for all SweetAlert popups
const swalTheme = {
    confirmButtonColor: '#2563eb',
    cancelButtonColor: '#6b7280',
    background: '#ffffff',
    color: '#1f2937',
    customClass: {
        popup: 'rounded-2xl shadow-2xl',
        title: 'text-xl font-bold text-gray-800',
        htmlContainer: 'text-gray-600',
        confirmButton: 'rounded-xl px-6 py-2.5 font-medium',
        cancelButton: 'rounded-xl px-6 py-2.5 font-medium',
        input: 'rounded-xl border-gray-300',
    },
};

export const showSuccess = (title: string, text?: string) => {
    return Swal.fire({
        icon: 'success',
        title,
        text,
        timer: 2000,
        showConfirmButton: false,
        ...swalTheme,
    });
};

export const showError = (title: string, text?: string) => {
    return Swal.fire({
        icon: 'error',
        title,
        text,
        ...swalTheme,
    });
};

export const showWarning = (title: string, text?: string) => {
    return Swal.fire({
        icon: 'warning',
        title,
        text,
        ...swalTheme,
    });
};

export const showInfo = (title: string, text?: string) => {
    return Swal.fire({
        icon: 'info',
        title,
        text,
        ...swalTheme,
    });
};

export const showConfirm = async (
    title: string,
    text?: string,
    confirmText: string = 'Ya',
    cancelText: string = 'Batal'
) => {
    const result = await Swal.fire({
        icon: 'question',
        title,
        text,
        showCancelButton: true,
        confirmButtonText: confirmText,
        cancelButtonText: cancelText,
        reverseButtons: true,
        ...swalTheme,
    });
    return result.isConfirmed;
};

export const showConfirmDanger = async (
    title: string,
    text?: string,
    confirmText: string = 'Ya, Hapus',
    cancelText: string = 'Batal'
) => {
    const result = await Swal.fire({
        ...swalTheme,
        icon: 'warning',
        title,
        text,
        showCancelButton: true,
        confirmButtonText: confirmText,
        confirmButtonColor: '#dc2626',
        cancelButtonText: cancelText,
        reverseButtons: true,
    });
    return result.isConfirmed;
};

export const showInputDialog = async (
    title: string,
    text?: string,
    inputPlaceholder: string = 'Masukkan alasan...',
    confirmText: string = 'Kirim',
    cancelText: string = 'Batal'
) => {
    const result = await Swal.fire({
        ...swalTheme,
        icon: 'question',
        title,
        text,
        input: 'textarea',
        inputPlaceholder,
        inputAttributes: {
            'aria-label': inputPlaceholder,
        },
        showCancelButton: true,
        confirmButtonText: confirmText,
        cancelButtonText: cancelText,
        confirmButtonColor: '#dc2626',
        reverseButtons: true,
        inputValidator: (value) => {
            if (!value || value.trim().length === 0) {
                return 'Alasan wajib diisi!';
            }
            return null;
        },
    });

    if (result.isConfirmed) {
        return result.value as string;
    }
    return null;
};
