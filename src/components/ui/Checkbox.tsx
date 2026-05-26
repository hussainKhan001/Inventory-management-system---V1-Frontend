import React from 'react';
import { cn } from '../../lib/utils';
import { Check } from 'lucide-react';

export interface CheckboxProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: React.ReactNode;
  error?: string;
}

export const Checkbox = React.forwardRef<HTMLInputElement, CheckboxProps>(({
  className,
  label,
  error,
  checked,
  onChange,
  disabled,
  ...props
}, ref) => {
  return (
    <label className={cn(
      "flex items-center gap-3 cursor-pointer group w-fit",
      disabled && "opacity-50 cursor-not-allowed",
      className
    )}>
      <div className="relative flex items-center justify-center">
        <input
          type="checkbox"
          ref={ref}
          className="peer sr-only"
          checked={checked}
          onChange={onChange}
          disabled={disabled}
          {...props}
        />
        <div className={cn(
          "w-5 h-5 rounded-[4px] flex items-center justify-center transition-all duration-200 border",
          "border-gray-300 dark:border-gray-600 bg-white dark:bg-[#334155]/50",
          "peer-checked:border-primary peer-checked:bg-primary",
          "group-hover:border-primary/80 dark:group-hover:border-primary/50",
          "peer-focus-visible:ring-4 peer-focus-visible:ring-primary/20",
          error && "border-red-500 dark:border-red-500"
        )}>
          <Check 
            className={cn(
              "w-3.5 h-3.5 text-white transition-all duration-200",
              checked ? "opacity-100 scale-100" : "opacity-0 scale-50"
            )} 
            strokeWidth={4} 
          />
        </div>
      </div>
      {label && (
        <span className="text-[13px] font-medium text-gray-700 dark:text-gray-300 select-none">
          {label}
        </span>
      )}
    </label>
  );
});

Checkbox.displayName = "Checkbox";
