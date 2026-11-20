import Swal from 'sweetalert2';

// Custom SweetAlert2 Theme Matching Abu Bakar Medical Store Design System
const ABMSwal = Swal.mixin({
  customClass: {
    popup: 'rounded-2xl border border-slate-200 shadow-2xl p-6 font-sans',
    title: 'text-lg font-extrabold text-black tracking-tight',
    htmlContainer: 'text-xs sm:text-sm text-slate-600 font-medium leading-relaxed',
    confirmButton:
      'px-4 py-2.5 rounded-xl font-bold text-xs sm:text-sm text-white bg-[#1C9A58] hover:bg-[#0F3A2C] transition-colors cursor-pointer shadow-md mx-1 border-0 focus:outline-none focus:ring-2 focus:ring-[#1C9A58]',
    cancelButton:
      'px-4 py-2.5 rounded-xl font-bold text-xs sm:text-sm text-slate-700 bg-slate-100 hover:bg-slate-200 transition-colors cursor-pointer shadow-xs mx-1 border-0 focus:outline-none focus:ring-2 focus:ring-slate-300',
    denyButton:
      'px-4 py-2.5 rounded-xl font-bold text-xs sm:text-sm text-white bg-rose-600 hover:bg-rose-700 transition-colors cursor-pointer shadow-md mx-1 border-0 focus:outline-none focus:ring-2 focus:ring-rose-500',
    actions: 'mt-5 gap-2',
  },
  buttonsStyling: false,
});

export const alert = {
  success: (title = 'Success!', text = '') => {
    return ABMSwal.fire({
      icon: 'success',
      iconColor: '#1C9A58',
      title,
      text,
      timer: 3000,
      timerProgressBar: true,
      confirmButtonText: 'Done',
    });
  },

  error: (title = 'Action Failed', text = '') => {
    return ABMSwal.fire({
      icon: 'error',
      iconColor: '#E11D48',
      title,
      text,
      confirmButtonText: 'Understood',
    });
  },

  warning: (title = 'Warning', text = '') => {
    return ABMSwal.fire({
      icon: 'warning',
      iconColor: '#D97706',
      title,
      text,
      confirmButtonText: 'Continue',
    });
  },

  info: (title = 'Information', text = '') => {
    return ABMSwal.fire({
      icon: 'info',
      iconColor: '#2563EB',
      title,
      text,
      confirmButtonText: 'Close',
    });
  },

  confirm: async ({
    title = 'Are you sure?',
    text = 'This action cannot be undone.',
    confirmButtonText = 'Yes, Proceed',
    cancelButtonText = 'Cancel',
    isDanger = false,
  } = {}) => {
    const result = await ABMSwal.fire({
      title,
      text,
      icon: isDanger ? 'warning' : 'question',
      iconColor: isDanger ? '#E11D48' : '#1C9A58',
      showCancelButton: true,
      confirmButtonText,
      cancelButtonText,
      customClass: {
        confirmButton: isDanger
          ? 'px-4 py-2.5 rounded-xl font-bold text-xs sm:text-sm text-white bg-rose-600 hover:bg-rose-700 transition-colors cursor-pointer shadow-md mx-1 border-0'
          : 'px-4 py-2.5 rounded-xl font-bold text-xs sm:text-sm text-white bg-[#1C9A58] hover:bg-[#0F3A2C] transition-colors cursor-pointer shadow-md mx-1 border-0',
        cancelButton:
          'px-4 py-2.5 rounded-xl font-bold text-xs sm:text-sm text-slate-700 bg-slate-100 hover:bg-slate-200 transition-colors cursor-pointer shadow-xs mx-1 border-0',
      },
    });
    return result.isConfirmed;
  },

  toast: (title, icon = 'success') => {
    const Toast = Swal.mixin({
      toast: true,
      position: 'top-end',
      showConfirmButton: false,
      timer: 3000,
      timerProgressBar: true,
      didOpen: (toastEl) => {
        toastEl.addEventListener('mouseenter', Swal.stopTimer);
        toastEl.addEventListener('mouseleave', Swal.resumeTimer);
      },
      customClass: {
        popup: 'rounded-xl shadow-lg border border-slate-100 p-3 font-sans text-xs font-bold',
      },
    });

    return Toast.fire({
      icon,
      title,
      iconColor: icon === 'success' ? '#1C9A58' : icon === 'error' ? '#E11D48' : '#2563EB',
    });
  },
};

export default alert;
