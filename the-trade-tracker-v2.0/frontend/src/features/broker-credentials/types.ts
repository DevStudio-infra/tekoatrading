// Broker credential interface
export interface BrokerCredential {
  id: number | string; // Updated to support both numeric IDs and UUID strings
  name: string; // Added name field for the user-friendly credential name
  brokerName: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  lastVerified?: string;
  isVerified?: boolean;
  credentials?: Record<string, string>;
}

// Credentials form values
export interface BaseCredentialFormValues {
  brokerName: string;
  isActive: boolean;
  credentials: Record<string, string>;
}
