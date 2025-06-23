"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import { PlusIcon, RefreshCwIcon } from 'lucide-react';
// Import components but use our local BrokerCredential type
import { CreateCredentialDialog } from '@/features/broker-credentials';
// Create a wrapper for CredentialsList to handle type conflicts
import { CredentialsList as ImportedCredentialsList } from '@/features/broker-credentials';
import { fetchWithAuth } from '@/lib/fetch-with-auth';
import { ensureDevAuthToken } from '@/lib/dev-auth';
import { toast } from 'sonner';
import { motion } from 'framer-motion';

// Define BrokerCredential type directly in this file to avoid TypeScript errors
interface BrokerCredential {
  id: number | string;
  name: string;
  brokerName: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  lastVerified?: string;
  isVerified?: boolean;
  credentials?: Record<string, string>;
}

export default function BrokerCredentialsPage() {
  const t = useTranslations('brokerCredentials');
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [credentials, setCredentials] = useState<BrokerCredential[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // No mock data - we'll use only real data from the backend API

  // Fetch credentials function with memoization to prevent unnecessary re-renders
  const fetchCredentials = useCallback(async (showRefreshingState = true) => {
    if (showRefreshingState) {
      setIsRefreshing(true);
    } else {
      setIsLoading(true);
    }
    
    try {
      console.log('[DEBUG] Fetching broker credentials');
      const response = await fetchWithAuth('/api/broker-credentials');
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || t('fetchError'));
      }
      
      const data = await response.json();
      setCredentials(data.credentials);
      return data.credentials;
    } catch (error) {
      console.error('Error fetching broker credentials:', error);
      toast.error(error instanceof Error ? error.message : t('fetchError'));
      return [];
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [t]);

  useEffect(() => {
    // In development, ensure we have an auth token for API calls
    if (process.env.NODE_ENV === 'development') {
      ensureDevAuthToken();
    }
    fetchCredentials(false);
  }, [fetchCredentials]);

  // Handler when a new credential is created
  const handleCredentialCreated = useCallback(async (newCredential?: BrokerCredential) => {
    setIsCreateDialogOpen(false);
    
    // Optimistic update - add the new credential to the list immediately
    if (newCredential) {
      setCredentials(prev => [...prev, newCredential]);
      toast.success(t('credentialCreated'));
    }
    
    // Then refresh to ensure we have the latest data
    await fetchCredentials();
  }, [fetchCredentials, t]);

  // Handle manual refresh
  const handleManualRefresh = () => {
    fetchCredentials();
  };

  return (
    <div className="container mx-auto px-4 py-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="flex justify-between items-center mb-6"
      >
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{t('title')}</h1>
          <p className="text-muted-foreground mt-1">
            {t('description')}
          </p>
        </div>
        <div className="flex gap-2">
          <Button 
            variant="outline" 
            onClick={handleManualRefresh}
            disabled={isRefreshing || isLoading}
          >
            <RefreshCwIcon className={`h-4 w-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
            {t('refresh')}
          </Button>
          <Button onClick={() => setIsCreateDialogOpen(true)}>
            <PlusIcon className="h-4 w-4 mr-2" />
            {t('newConnection')}
          </Button>
        </div>
      </motion.div>

      <ImportedCredentialsList 
        credentials={credentials as any} 
        isLoading={isLoading} 
        isRefreshing={isRefreshing}
        onRefresh={fetchCredentials} 
      />

      <CreateCredentialDialog 
        open={isCreateDialogOpen} 
        onOpenChange={setIsCreateDialogOpen}
        onCredentialCreated={handleCredentialCreated}
      />
    </div>
  );
}
