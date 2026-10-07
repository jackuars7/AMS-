import React from 'react';

export type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'danger' | 'ghost';
export type ButtonSize = 'sm' | 'md' | 'lg';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  isLoading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

export const Button: React.FC<ButtonProps> = ({
  children,
  variant = 'secondary',
  size = 'md',
  isLoading = false,
  leftIcon,
  rightIcon,
  className = '',
  disabled,
  ...rest
}) => {
  // Respecting the rule: Button horizontal padding must be exactly 2x vertical padding
  const sizeClasses: Record<ButtonSize, string> = {
    sm: 'py-1.5 px-3 text-xs gap-1.5 rounded-md min-h-[32px]',
    md: 'py-2 px-4 text-sm gap-2 rounded-md min-h-[38px]',
    lg: 'py-2.5 px-5 text-base gap-2.5 rounded-lg min-h-[44px]',
  };

  const variantClasses: Record<ButtonVariant, string> = {
    primary:
      'bg-slate-900 text-white hover:bg-slate-800 active:bg-slate-950 font-medium shadow-xs border border-transparent disabled:bg-slate-300 disabled:text-slate-500 disabled:cursor-not-allowed',
    secondary:
      'bg-white text-slate-800 hover:bg-slate-50 active:bg-slate-100 font-medium border border-slate-300 shadow-2xs disabled:bg-slate-100 disabled:text-slate-400 disabled:border-slate-200 disabled:cursor-not-allowed',
    outline:
      'bg-transparent text-slate-700 hover:bg-slate-100/60 active:bg-slate-100 font-medium border border-slate-300 disabled:text-slate-400 disabled:border-slate-200 disabled:cursor-not-allowed',
    danger:
      'bg-rose-600 text-white hover:bg-rose-700 active:bg-rose-800 font-medium shadow-xs border border-transparent disabled:bg-rose-300 disabled:cursor-not-allowed',
    ghost:
      'bg-transparent text-slate-600 hover:bg-slate-100 hover:text-slate-900 font-medium border border-transparent disabled:text-slate-400 disabled:cursor-not-allowed',
  };

  return (
    <button
      disabled={disabled || isLoading}
      className={`inline-flex items-center justify-center font-sans select-none transition-colors duration-150 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-900 cursor-pointer ${sizeClasses[size]} ${variantClasses[variant]} ${className}`}
      {...rest}
    >
      {isLoading ? (
        <svg
          className="animate-spin h-4 w-4 text-current shrink-0"
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
        >
          <circle
            className="opacity-25"
            cx="12"
            cy="12"
            r="10"
            stroke="currentColor"
            strokeWidth="4"
          />
          <path
            className="opacity-75"
            fill="currentColor"
            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
          />
        </svg>
      ) : (
        leftIcon && <span className="shrink-0">{leftIcon}</span>
      )}
      <span className="whitespace-nowrap">{children}</span>
      {!isLoading && rightIcon && <span className="shrink-0">{rightIcon}</span>}
    </button>
  );
};
