import * as z from 'zod';

// Define broker types that we support
export const brokerTypes = [
  { value: 'capital.com', label: 'Capital.com' },
  { value: 'binance', label: 'Binance' },
  { value: 'coinbase', label: 'Coinbase' },
  { value: 'custom', label: 'Custom' },
];

// Base form schema
export const baseCredentialSchema = z.object({
  name: z.string().min(1, { message: 'A credential name is required' }),
  brokerName: z.string().min(1, { message: 'Please select a broker' }),
  isActive: z.boolean().default(true),
});

// Capital.com schema
export const capitalComSchema = baseCredentialSchema.extend({
  brokerName: z.literal('capital.com'),
  credentials: z.object({
    apiKey: z.string().min(1, { message: 'API Key is required' }),
    identifier: z.string().min(1, { message: 'Identifier is required' }),
    password: z.string().min(1, { message: 'Password is required' }),
    isDemo: z.boolean().default(true),
  }),
});

// Binance schema
export const binanceSchema = baseCredentialSchema.extend({
  brokerName: z.literal('binance'),
  credentials: z.object({
    apiKey: z.string().min(1, { message: 'API Key is required' }),
    secretKey: z.string().min(1, { message: 'Secret Key is required' }),
    testnet: z.boolean().default(true),
  }),
});

// Coinbase schema
export const coinbaseSchema = baseCredentialSchema.extend({
  brokerName: z.literal('coinbase'),
  credentials: z.object({
    apiKey: z.string().min(1, { message: 'API Key is required' }),
    apiSecret: z.string().min(1, { message: 'API Secret is required' }),
    passphrase: z.string().min(1, { message: 'Passphrase is required' }),
    sandbox: z.boolean().default(true),
  }),
});

// Custom broker schema
export const customBrokerSchema = baseCredentialSchema.extend({
  brokerName: z.literal('custom'),
  customBrokerName: z.string().min(1, { message: 'Broker name is required' }),
  credentials: z.record(z.string().or(z.boolean())),
});

// Combined schema
export const credentialFormSchema = z.discriminatedUnion('brokerName', [
  capitalComSchema,
  binanceSchema,
  coinbaseSchema,
  customBrokerSchema,
]);

// Define a more flexible type for form values
export type AnyCredentials = Record<string, string | boolean | undefined>;

// This type is more flexible for form handling
export type FlexibleCredentialFormValues = {
  name: string;
  brokerName: string;
  customBrokerName?: string;
  isActive: boolean;
  credentials: AnyCredentials;
};

// Strict type from Zod schema - direct inference from the schema
export type CredentialFormValues = z.infer<typeof credentialFormSchema>;

// Helper type guard - detects if a value matches the credentials structure
export function isValidCredentials(credentials: unknown): credentials is AnyCredentials {
  return typeof credentials === 'object' && credentials !== null;
}

// Helper function to get default values based on broker type
export const getDefaultValues = (brokerType: string) => {
  switch (brokerType) {
    case 'capital.com':
      return {
        name: 'My Capital.com Account',
        brokerName: 'capital.com',
        isActive: true,
        credentials: {
          apiKey: '',
          identifier: '',
          password: '',
          isDemo: true,
        }
      };
    case 'binance':
      return {
        name: 'My Binance Account',
        brokerName: 'binance',
        isActive: true,
        credentials: {
          apiKey: '',
          secretKey: '',
          testnet: true,
        }
      };
    case 'coinbase':
      return {
        name: 'My Coinbase Account',
        brokerName: 'coinbase',
        isActive: true,
        credentials: {
          apiKey: '',
          apiSecret: '',
          passphrase: '',
          sandbox: true,
        }
      };
    case 'custom':
      return {
        name: 'My Custom Broker',
        brokerName: 'custom',
        customBrokerName: '',
        isActive: true,
        credentials: {}
      };
    default:
      return {
        brokerName: '',
        isActive: true,
        credentials: {}
      };
  }
};
