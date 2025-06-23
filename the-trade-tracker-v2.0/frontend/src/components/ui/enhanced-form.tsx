"use client";

import { forwardRef, useId, useState } from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { AlertCircle, CheckCircle, Eye, EyeOff, HelpCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { announceToScreenReader, ariaAttributes, generateId } from "@/lib/accessibility-utils";

const formFieldVariants = cva("relative space-y-2", {
  variants: {
    variant: {
      default: "",
      floating: "relative",
      inline: "flex items-center space-y-0 space-x-3",
    },
    state: {
      default: "",
      error: "[&_input]:border-red-500 [&_textarea]:border-red-500 [&_label]:text-red-600",
      success: "[&_input]:border-green-500 [&_textarea]:border-green-500 [&_label]:text-green-600",
      warning: "[&_input]:border-yellow-500 [&_textarea]:border-yellow-500 [&_label]:text-yellow-600",
    },
  },
  defaultVariants: {
    variant: "default",
    state: "default",
  },
});

interface ValidationRule {
  test: (value: string) => boolean;
  message: string;
  type?: "error" | "warning";
}

interface EnhancedFormFieldProps extends VariantProps<typeof formFieldVariants> {
  label: string;
  name: string;
  type?: "text" | "email" | "password" | "number" | "tel" | "url" | "search" | "textarea";
  placeholder?: string;
  value?: string;
  defaultValue?: string;
  required?: boolean;
  disabled?: boolean;
  readonly?: boolean;
  autoComplete?: string;
  autoFocus?: boolean;
  maxLength?: number;
  minLength?: number;
  pattern?: string;
  min?: number;
  max?: number;
  step?: number;
  rows?: number; // for textarea
  validation?: ValidationRule[];
  realTimeValidation?: boolean;
  showCharacterCount?: boolean;
  helpText?: string;
  tooltip?: string;
  prefix?: React.ReactNode;
  suffix?: React.ReactNode;
  className?: string;
  inputClassName?: string;
  labelClassName?: string;
  onChange?: (value: string, isValid: boolean) => void;
  onBlur?: (e: React.FocusEvent) => void;
  onFocus?: (e: React.FocusEvent) => void;
}

const EnhancedFormField = forwardRef<HTMLInputElement | HTMLTextAreaElement, EnhancedFormFieldProps>(
  (
    {
      variant,
      state: stateProp,
      label,
      name,
      type = "text",
      placeholder,
      value,
      defaultValue,
      required = false,
      disabled = false,
      readonly = false,
      autoComplete,
      autoFocus = false,
      maxLength,
      minLength,
      pattern,
      min,
      max,
      step,
      rows = 3,
      validation = [],
      realTimeValidation = false,
      showCharacterCount = false,
      helpText,
      tooltip,
      prefix,
      suffix,
      className,
      inputClassName,
      labelClassName,
      onChange,
      onBlur,
      onFocus,
      ...props
    },
    ref
  ) => {
    const [internalValue, setInternalValue] = useState(defaultValue || "");
    const [errors, setErrors] = useState<string[]>([]);
    const [warnings, setWarnings] = useState<string[]>([]);
    const [showPassword, setShowPassword] = useState(false);
    const [isTouched, setIsTouched] = useState(false);
    const [isFocused, setIsFocused] = useState(false);

    const fieldId = useId();
    const errorId = generateId("error");
    const helpId = generateId("help");
    const countId = generateId("count");

    const currentValue = value !== undefined ? value : internalValue;
    const isControlled = value !== undefined;

    // Validation logic
    const validateValue = (val: string) => {
      const newErrors: string[] = [];
      const newWarnings: string[] = [];

      validation.forEach((rule) => {
        if (!rule.test(val)) {
          if (rule.type === "warning") {
            newWarnings.push(rule.message);
          } else {
            newErrors.push(rule.message);
          }
        }
      });

      // Built-in validation
      if (required && !val.trim()) {
        newErrors.push(`${label} is required`);
      }

      if (type === "email" && val && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val)) {
        newErrors.push("Please enter a valid email address");
      }

      if (minLength && val.length < minLength) {
        newErrors.push(`${label} must be at least ${minLength} characters`);
      }

      if (maxLength && val.length > maxLength) {
        newErrors.push(`${label} must not exceed ${maxLength} characters`);
      }

      if (pattern && val && !new RegExp(pattern).test(val)) {
        newErrors.push(`${label} format is invalid`);
      }

      setErrors(newErrors);
      setWarnings(newWarnings);

      return newErrors.length === 0;
    };

    // Handle value changes
    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      const newValue = e.target.value;

      if (!isControlled) {
        setInternalValue(newValue);
      }

      if (realTimeValidation || isTouched) {
        const isValid = validateValue(newValue);
        onChange?.(newValue, isValid);
      } else {
        onChange?.(newValue, true);
      }
    };

    // Handle blur
    const handleBlur = (e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      setIsTouched(true);
      setIsFocused(false);
      validateValue(currentValue);
      onBlur?.(e);
    };

    // Handle focus
    const handleFocus = (e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      setIsFocused(true);
      onFocus?.(e);
    };

    // Determine current state
    const currentState = stateProp || (errors.length > 0 ? "error" : warnings.length > 0 ? "warning" : "default");

    // Password visibility toggle
    const togglePasswordVisibility = () => {
      setShowPassword(!showPassword);
      announceToScreenReader(showPassword ? "Password hidden" : "Password visible");
    };

    // Character count
    const characterCount = currentValue.length;
    const isNearLimit = maxLength && characterCount > maxLength * 0.8;
    const isAtLimit = maxLength && characterCount >= maxLength;

    // ARIA attributes
    const ariaProps = {
      ...ariaAttributes.labelledBy(fieldId),
      ...ariaAttributes.describedBy(
        [errors.length > 0 ? errorId : undefined, helpText ? helpId : undefined, showCharacterCount && maxLength ? countId : undefined].filter(Boolean).join(" ")
      ),
      "aria-invalid": errors.length > 0,
      "aria-required": required,
    };

    const InputComponent = type === "textarea" ? Textarea : Input;
    const inputType = type === "password" ? (showPassword ? "text" : "password") : type === "textarea" ? undefined : type;

    return (
      <div className={cn(formFieldVariants({ variant, state: currentState }), className)}>
        {/* Label with tooltip */}
        <div className="flex items-center gap-2">
          <Label
            htmlFor={fieldId}
            className={cn(
              "text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70",
              variant === "floating" && "absolute left-3 top-3 transition-all duration-200 pointer-events-none",
              variant === "floating" && (isFocused || currentValue) && "top-1 text-xs text-muted-foreground",
              labelClassName
            )}>
            {label}
            {required && <span className="text-red-500 ml-1">*</span>}
          </Label>

          {tooltip && (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <HelpCircle className="h-4 w-4 text-muted-foreground cursor-help" />
                </TooltipTrigger>
                <TooltipContent side="top" className="max-w-xs">
                  <p>{tooltip}</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}
        </div>

        {/* Input wrapper */}
        <div className="relative">
          {/* Prefix */}
          {prefix && <div className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none">{prefix}</div>}

          {/* Input field */}
          <InputComponent
            ref={ref as React.Ref<HTMLInputElement & HTMLTextAreaElement>}
            id={fieldId}
            name={name}
            type={inputType}
            placeholder={placeholder}
            value={currentValue}
            disabled={disabled}
            readOnly={readonly}
            autoComplete={autoComplete}
            autoFocus={autoFocus}
            maxLength={maxLength}
            minLength={minLength}
            pattern={pattern}
            min={min}
            max={max}
            step={step}
            rows={type === "textarea" ? rows : undefined}
            className={cn(prefix && "pl-10", (suffix || type === "password") && "pr-10", inputClassName)}
            onChange={handleChange}
            onBlur={handleBlur}
            onFocus={handleFocus}
            {...ariaProps}
            {...props}
          />

          {/* Password visibility toggle */}
          {type === "password" && (
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="absolute right-2 top-1/2 -translate-y-1/2 h-8 w-8"
              onClick={togglePasswordVisibility}
              {...ariaAttributes.labelledBy("Toggle password visibility")}>
              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </Button>
          )}

          {/* Suffix */}
          {suffix && type !== "password" && <div className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none">{suffix}</div>}

          {/* State indicator */}
          {currentState !== "default" && (
            <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
              {currentState === "error" && <AlertCircle className="h-4 w-4 text-red-500" />}
              {currentState === "success" && <CheckCircle className="h-4 w-4 text-green-500" />}
              {currentState === "warning" && <AlertCircle className="h-4 w-4 text-yellow-500" />}
            </div>
          )}
        </div>

        {/* Help text */}
        {helpText && (
          <p id={helpId} className="text-sm text-muted-foreground">
            {helpText}
          </p>
        )}

        {/* Character count */}
        {showCharacterCount && maxLength && (
          <p id={countId} className={cn("text-xs text-right", isAtLimit ? "text-red-500" : isNearLimit ? "text-yellow-500" : "text-muted-foreground")}>
            {characterCount}/{maxLength}
          </p>
        )}

        {/* Error messages */}
        {errors.length > 0 && (
          <div id={errorId} className="space-y-1">
            {errors.map((error, index) => (
              <p key={index} className="text-sm text-red-600 flex items-center gap-2">
                <AlertCircle className="h-3 w-3 flex-shrink-0" />
                {error}
              </p>
            ))}
          </div>
        )}

        {/* Warning messages */}
        {warnings.length > 0 && (
          <div className="space-y-1">
            {warnings.map((warning, index) => (
              <p key={index} className="text-sm text-yellow-600 flex items-center gap-2">
                <AlertCircle className="h-3 w-3 flex-shrink-0" />
                {warning}
              </p>
            ))}
          </div>
        )}
      </div>
    );
  }
);

EnhancedFormField.displayName = "EnhancedFormField";

export { EnhancedFormField, formFieldVariants };
