import React from 'react';
import { Control } from 'react-hook-form';
import {
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormDescription,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { FlexibleCredentialFormValues } from '../credential-schemas';

interface CustomBrokerFormProps {
  control: Control<FlexibleCredentialFormValues>;
  // Removed unused form parameter
  customFields: { key: string; value: string }[];
  updateCustomField: (index: number, key: string, value: string) => void;
  removeCustomField: (index: number) => void;
  addCustomField: () => void;
}

export function CustomBrokerForm({ 
  control, 
  // Removed unused form parameter
  customFields, 
  updateCustomField, 
  removeCustomField, 
  addCustomField 
}: CustomBrokerFormProps) {
  return (
    <div className="mt-4 space-y-4">
      <FormField
        control={control}
        name="customBrokerName"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Broker Name</FormLabel>
            <FormControl>
              <Input placeholder="Enter broker name" {...field} value={field.value as string} />
            </FormControl>
            <FormDescription>
              Enter a name for your custom broker
            </FormDescription>
            <FormMessage />
          </FormItem>
        )}
      />

      <div className="space-y-2">
        <FormLabel>Credentials</FormLabel>
        <FormDescription>
          Add the required API credentials for your broker
        </FormDescription>

        {customFields.map((field, index) => (
          <div key={index} className="flex gap-2 items-end">
            <div className="flex-1">
              <FormLabel className="text-xs">Key</FormLabel>
              <Input
                placeholder="Key name"
                value={field.key}
                onChange={(e) => updateCustomField(index, e.target.value, field.value)}
              />
            </div>
            <div className="flex-1">
              <FormLabel className="text-xs">Value</FormLabel>
              <Input
                placeholder="Value"
                value={field.value}
                onChange={(e) => updateCustomField(index, field.key, e.target.value)}
              />
            </div>
            <Button 
              type="button" 
              variant="ghost" 
              className="shrink-0 h-10 w-10 p-0"
              onClick={() => removeCustomField(index)}
            >
              ✕
            </Button>
          </div>
        ))}

        <Button
          type="button"
          variant="outline"
          size="sm"
          className="mt-2"
          onClick={addCustomField}
        >
          Add Credential Field
        </Button>
      </div>
    </div>
  );
}
