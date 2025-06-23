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
import { Checkbox } from '@/components/ui/checkbox';
import { FlexibleCredentialFormValues } from '../credential-schemas';

interface CapitalComFormProps {
  control: Control<FlexibleCredentialFormValues>;
}

export function CapitalComForm({ control }: CapitalComFormProps) {
  return (
    <div className="mt-4 space-y-4">
      <FormField
        control={control}
        name="name"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Credential Name</FormLabel>
            <FormControl>
              <Input placeholder="Enter a name for this credential" {...field} value={field.value as string} />
            </FormControl>
            <FormDescription>
              A friendly name to identify this broker connection (e.g., "My Trading Account")
            </FormDescription>
            <FormMessage />
          </FormItem>
        )}
      />
      <FormField
        control={control}
        name="credentials.apiKey"
        render={({ field }) => (
          <FormItem>
            <FormLabel>API Key</FormLabel>
            <FormControl>
              <Input placeholder="Enter your Capital.com API key" {...field} value={field.value as string} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      <FormField
        control={control}
        name="credentials.identifier"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Identifier</FormLabel>
            <FormControl>
              <Input placeholder="Enter your Capital.com identifier" {...field} value={field.value as string} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      <FormField
        control={control}
        name="credentials.password"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Password</FormLabel>
            <FormControl>
              <Input 
                type="password" 
                placeholder="Enter your Capital.com password" 
                {...field} 
                value={field.value as string}
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      <FormField
        control={control}
        name="credentials.isDemo"
        render={({ field }) => (
          <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
            <FormControl>
              <Checkbox
                checked={field.value as boolean}
                onCheckedChange={field.onChange}
              />
            </FormControl>
            <div className="space-y-1 leading-none">
              <FormLabel>Use Demo Account</FormLabel>
              <FormDescription>
                Use Capital.com demo environment for testing
              </FormDescription>
            </div>
          </FormItem>
        )}
      />
    </div>
  );
}
