import React from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { 
  MoreVerticalIcon, 
  PencilIcon, 
  TrashIcon,
  CheckCircleIcon,
  XCircleIcon,
  KeyIcon,
} from 'lucide-react';
import { toast } from 'sonner';

// Broker credential interface
interface BrokerCredential {
  id: number;
  brokerName: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  lastVerified?: string;
  isVerified?: boolean;
}

interface CredentialsListProps {
  credentials: BrokerCredential[];
  isLoading: boolean;
  isRefreshing?: boolean;
  onRefresh: (showRefreshingState?: boolean) => Promise<BrokerCredential[] | []>;
}

export function CredentialsList({ credentials, isLoading, isRefreshing = false, onRefresh }: CredentialsListProps) {
  // Using Sonner toast directly
  
  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {[...Array(3)].map((_, i) => (
          <Card key={i} className="overflow-hidden">
            <CardHeader className="pb-2">
              <Skeleton className="h-6 w-2/3" />
              <Skeleton className="h-4 w-1/2" />
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-4/5" />
              </div>
            </CardContent>
            <CardFooter>
              <Skeleton className="h-9 w-full" />
            </CardFooter>
          </Card>
        ))}
      </div>
    );
  }

  if (credentials.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 bg-gray-50 dark:bg-gray-800 rounded-lg">
        <h3 className="text-lg font-medium mb-2">No Broker Credentials Yet</h3>
        <p className="text-gray-500 dark:text-gray-400 mb-4 text-center max-w-md">
          Add credentials to connect to trading platforms like Capital.com, Binance, or others
        </p>
        <Button onClick={() => document.getElementById('add-credentials-button')?.click()}>
          Add Your First Broker Connection
        </Button>
      </div>
    );
  }

  async function handleToggleActive(credentialId: number, currentState: boolean) {
    try {
      const response = await fetch(`/api/broker-credentials/${credentialId}/toggle-active`, {
        method: 'PATCH',
      });
      
      if (!response.ok) {
        throw new Error('Failed to toggle credential active state');
      }
      
      onRefresh();
      toast.success(`Credential ${currentState ? 'deactivated' : 'activated'} successfully`, {
        description: 'Broker connection updated'
      });
    } catch (error) {
      console.error('Error toggling credential:', error);
      toast.error('Failed to update credential status');
    }
  }

  async function handleVerifyCredential(credentialId: number) {
    try {
      toast.loading('Please wait while we verify your broker credentials...', {
        description: 'Verifying connection'
      });
      
      const response = await fetch(`/api/broker-credentials/${credentialId}/verify`, {
        method: 'POST',
      });
      
      if (!response.ok) {
        throw new Error('Failed to verify credential');
      }
      
      const result = await response.json();
      
      if (result.isVerified) {
        toast.success('Your broker credentials are valid and working', {
          description: 'Verification successful'
        });
      } else {
        toast.error(result.message || 'Your broker credentials could not be verified', {
          description: 'Verification failed'
        });
      }
      
      onRefresh();
    } catch (error) {
      console.error('Error verifying credential:', error);
      toast.error('An error occurred while verifying your credentials', {
        description: 'Verification error'
      });
    }
  }

  async function handleDeleteCredential(credentialId: number) {
    if (!confirm('Are you sure you want to delete this broker credential? Any bots using this credential will stop working.')) {
      return;
    }
    
    try {
      const response = await fetch(`/api/broker-credentials/${credentialId}`, {
        method: 'DELETE',
      });
      
      if (!response.ok) {
        throw new Error('Failed to delete credential');
      }
      
      onRefresh();
      toast.success('Broker credential has been removed successfully', {
        description: 'Credential deleted'
      });
    } catch (error) {
      console.error('Error deleting credential:', error);
      toast.error('Failed to delete broker credential');
    }
  }

  // Format date
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString();
  };

  // Get broker logo based on broker name
  const getBrokerLogo = (brokerName: string) => {
    const name = brokerName.toLowerCase();
    if (name.includes('capital.com')) {
      return '/logos/capital-com.svg';
    } else if (name.includes('binance')) {
      return '/logos/binance.svg';
    } else if (name.includes('coinbase')) {
      return '/logos/coinbase.svg';
    } else {
      return '/logos/generic-broker.svg';
    }
  };

  return (
    <>
      {isRefreshing && (
        <div className="mb-4 p-2 bg-blue-50 text-blue-700 rounded-md flex items-center justify-center">
          <div className="h-4 w-4 mr-2 animate-spin rounded-full border-2 border-blue-700 border-t-transparent"></div>
          <span>Refreshing credentials...</span>
        </div>
      )}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {credentials.map((credential) => (
        <Card key={credential.id} className="overflow-hidden">
          <CardHeader className="pb-2">
            <div className="flex justify-between items-start">
              <div className="flex items-center">
                <div className="h-10 w-10 rounded-full overflow-hidden mr-3 bg-gray-100 flex items-center justify-center">
                  <img
                    src={getBrokerLogo(credential.brokerName)}
                    alt={credential.brokerName}
                    className="h-8 w-8 object-contain"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = '/logos/generic-broker.svg';
                    }}
                  />
                </div>
                <div>
                  <CardTitle className="text-lg">{credential.brokerName}</CardTitle>
                  <CardDescription>
                    Added {formatDate(credential.createdAt)}
                  </CardDescription>
                </div>
              </div>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-8 w-8">
                    <MoreVerticalIcon className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => handleVerifyCredential(credential.id)}>
                    <KeyIcon className="h-4 w-4 mr-2" />
                    Verify Connection
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => window.location.href = `/broker-credentials/${credential.id}/edit`}>
                    <PencilIcon className="h-4 w-4 mr-2" />
                    Edit
                  </DropdownMenuItem>
                  <DropdownMenuItem 
                    className="text-red-600"
                    onClick={() => handleDeleteCredential(credential.id)}
                  >
                    <TrashIcon className="h-4 w-4 mr-2" />
                    Delete
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
            <div className="flex flex-wrap gap-2 mt-2">
              <Badge
                variant={credential.isActive ? "default" : "outline"}
                className={credential.isActive ? "bg-green-500 hover:bg-green-600" : ""}
              >
                {credential.isActive ? 'Active' : 'Inactive'}
              </Badge>
              {credential.isVerified !== undefined && (
                <Badge
                  variant={credential.isVerified ? "outline" : "outline"}
                  className={credential.isVerified ? "border-green-500 text-green-700 bg-green-50" : "border-red-500 text-red-700 bg-red-50"}
                >
                  {credential.isVerified ? 'Verified' : 'Unverified'}
                </Badge>
              )}
            </div>
          </CardHeader>
          
          <CardContent>
            <div className="flex items-center mb-2">
              <div className="h-4 w-4 mr-2">
                {credential.isVerified ? (
                  <CheckCircleIcon className="h-4 w-4 text-green-500" />
                ) : (
                  <XCircleIcon className="h-4 w-4 text-red-500" />
                )}
              </div>
              <p className="text-sm">
                {credential.isVerified ? 'Credentials verified' : 'Credentials not verified'}
              </p>
            </div>
            
            {credential.lastVerified && (
              <p className="text-xs text-gray-400">
                Last verified: {new Date(credential.lastVerified).toLocaleString()}
              </p>
            )}
          </CardContent>
          
          <CardFooter className="flex justify-between border-t pt-4">
            <div className="flex items-center space-x-2">
              <Switch 
                id={`active-${credential.id}`}
                checked={credential.isActive}
                onCheckedChange={(checked) => handleToggleActive(credential.id, credential.isActive)}
              />
              <label htmlFor={`active-${credential.id}`} className="text-sm cursor-pointer">
                Active
              </label>
            </div>
            
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => handleVerifyCredential(credential.id)}
            >
              Test Connection
            </Button>
          </CardFooter>
        </Card>
      ))}
      </div>
    </>
  );
}
