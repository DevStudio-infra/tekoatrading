"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

interface RadioGroupContextType {
  value?: string;
  onValueChange?: (value: string) => void;
  name?: string;
}

const RadioGroupContext = React.createContext<RadioGroupContextType | undefined>(undefined);

interface RadioGroupProps extends React.HTMLAttributes<HTMLDivElement> {
  value?: string;
  onValueChange?: (value: string) => void;
  name?: string;
}

const RadioGroup = React.forwardRef<HTMLDivElement, RadioGroupProps>(({ className, value, onValueChange, name, children, ...props }, ref) => {
  const generatedName = React.useId();
  const radioName = name || generatedName;

  return (
    <RadioGroupContext.Provider value={{ value, onValueChange, name: radioName }}>
      <div className={cn("grid gap-2", className)} ref={ref} role="radiogroup" {...props}>
        {children}
      </div>
    </RadioGroupContext.Provider>
  );
});
RadioGroup.displayName = "RadioGroup";

interface RadioGroupItemProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "type"> {
  value: string;
}

const RadioGroupItem = React.forwardRef<HTMLInputElement, RadioGroupItemProps>(({ className, value, ...props }, ref) => {
  const context = React.useContext(RadioGroupContext);

  if (!context) {
    throw new Error("RadioGroupItem must be used within a RadioGroup");
  }

  const { value: selectedValue, onValueChange, name } = context;

  return (
    <input
      type="radio"
      className={cn(
        "aspect-square h-4 w-4 rounded-full border border-primary text-primary ring-offset-background focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
        className
      )}
      ref={ref}
      name={name}
      value={value}
      checked={selectedValue === value}
      onChange={(e) => {
        if (e.target.checked && onValueChange) {
          onValueChange(value);
        }
      }}
      {...props}
    />
  );
});
RadioGroupItem.displayName = "RadioGroupItem";

export { RadioGroup, RadioGroupItem };
