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

interface BinanceFormProps {
  control: Control<FlexibleCredentialFormValues>;
}

export function BinanceForm({ control }: BinanceFormProps) {
  return (
    <div className="mt-4 space-y-4">
      <FormField
        control={control}
        name="credentials.apiKey"
        render={({ field }) => (
          <FormItem>
            <FormLabel>API Key</FormLabel>
            <FormControl>
              <Input placeholder="Enter your Binance API key" {...field} value={field.value as string} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      <FormField
        control={control}
        name="credentials.secretKey"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Secret Key</FormLabel>
            <FormControl>
              <Input 
                type="password" 
                placeholder="Enter your Binance secret key" 
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
        name="credentials.testnet"
        render={({ field }) => (
          <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
            <FormControl>
              <Checkbox
                checked={field.value as boolean}
                onCheckedChange={field.onChange}
              />
            </FormControl>
            <div className="space-y-1 leading-none">
              <FormLabel>Use Testnet</FormLabel>
              <FormDescription>
                Use Binance testnet environment for testing
              </FormDescription>
            </div>
          </FormItem>
        )}
      />
    </div>
  );
}
