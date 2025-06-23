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

interface CoinbaseFormProps {
  control: Control<FlexibleCredentialFormValues>;
}

export function CoinbaseForm({ control }: CoinbaseFormProps) {
  return (
    <div className="mt-4 space-y-4">
      <FormField
        control={control}
        name="credentials.apiKey"
        render={({ field }) => (
          <FormItem>
            <FormLabel>API Key</FormLabel>
            <FormControl>
              <Input placeholder="Enter your Coinbase API key" {...field} value={field.value as string} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      <FormField
        control={control}
        name="credentials.apiSecret"
        render={({ field }) => (
          <FormItem>
            <FormLabel>API Secret</FormLabel>
            <FormControl>
              <Input 
                type="password" 
                placeholder="Enter your Coinbase API secret" 
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
        name="credentials.passphrase"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Passphrase</FormLabel>
            <FormControl>
              <Input 
                type="password" 
                placeholder="Enter your Coinbase passphrase" 
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
        name="credentials.sandbox"
        render={({ field }) => (
          <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
            <FormControl>
              <Checkbox
                checked={field.value as boolean}
                onCheckedChange={field.onChange}
              />
            </FormControl>
            <div className="space-y-1 leading-none">
              <FormLabel>Use Sandbox</FormLabel>
              <FormDescription>
                Use Coinbase sandbox environment for testing
              </FormDescription>
            </div>
          </FormItem>
        )}
      />
    </div>
  );
}
