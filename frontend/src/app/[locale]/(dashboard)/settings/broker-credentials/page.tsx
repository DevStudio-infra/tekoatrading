"use client";

import { BrokerCredentialsForm } from "@/features/bots/components/broker-credentials-form";
import { Card } from "@/features/shared/components/ui/card";
import { Shield, Settings } from "lucide-react";
import { AuthWrapper } from "@/features/auth/components/auth-wrapper";

export default function BrokerCredentialsPage() {
  return (
    <AuthWrapper>
      <div className="container mx-auto py-8 space-y-8">
        <div className="flex items-center space-x-3">
          <Shield className="h-8 w-8 text-primary" />
          <div>
            <h1 className="text-3xl font-bold">Broker Credentials</h1>
            <p className="text-muted-foreground">
              Manage your broker API credentials for automated trading
            </p>
          </div>
        </div>

        <Card className="p-6 bg-blue-50 border-blue-200">
          <div className="flex items-start space-x-3">
            <Settings className="h-5 w-5 text-blue-600 mt-1" />
            <div>
              <h3 className="font-semibold text-blue-900 mb-2">Security Notice</h3>
              <p className="text-blue-800 text-sm">
                Your broker credentials are encrypted and stored securely. Never share these
                credentials with anyone. Each trading bot uses individual credentials, ensuring
                proper isolation and security.
              </p>
            </div>
          </div>
        </Card>

        <BrokerCredentialsForm
          userId="" // This parameter is now ignored since we use protectedProcedure
          mode="both"
          showExisting={true}
          onCredentialCreated={(credential) => {
            console.log("Credential created:", credential);
          }}
        />
      </div>
    </AuthWrapper>
  );
}
