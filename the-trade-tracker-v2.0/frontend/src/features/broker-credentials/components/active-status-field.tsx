import React from 'react';
import { Control } from 'react-hook-form';
import {
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormDescription,
} from '@/components/ui/form';
import { Switch } from '@/components/ui/switch';
import { FlexibleCredentialFormValues } from '../credential-schemas';

interface ActiveStatusFieldProps {
  control: Control<FlexibleCredentialFormValues>;
}

export function ActiveStatusField({ control }: ActiveStatusFieldProps) {
  return (
    <FormField
      control={control}
      name="isActive"
      render={({ field }) => (
        <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
          <div className="space-y-0.5">
            <FormLabel className="text-base">
              Enable Immediately
            </FormLabel>
            <FormDescription>
              Make this broker connection available for trading
            </FormDescription>
          </div>
          <FormControl>
            <Switch
              checked={field.value as boolean}
              onCheckedChange={field.onChange}
            />
          </FormControl>
        </FormItem>
      )}
    />
  );
}
