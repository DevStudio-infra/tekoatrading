"use client";

import React, { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "../../shared/components/ui/card";
import { Button } from "../../shared/components/ui/button";
import { Input } from "../../shared/components/ui/input";
import { Label } from "../../shared/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../../shared/components/ui/tabs";
import { Checkbox } from "../../shared/components/ui/checkbox";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";

// Simplified form schema that handles all broker types
const credentialsSchema = z.object({
  name: z.string().min(1, "Credential name is required"),
  brokerName: z.string().min(1, "Broker name is required"),
  isDemo: z.boolean(),
  isActive: z.boolean(),
  // Common fields
  apiKey: z.string().min(1, "API key is required"),
  // Capital.com specific fields
  identifier: z.string().optional(),
  password: z.string().optional(),
  // Binance specific fields
  secretKey: z.string().optional(),
});

type CredentialsFormData = z.infer<typeof credentialsSchema>;

interface BrokerCredential {
  id: string;
  name: string;
  brokerName: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  isVerified: boolean;
}

interface BrokerCredentialsFormProps {
  userId: string;
  mode: "create" | "edit" | "both";
  showExisting?: boolean;
  onCredentialCreated?: (credential: BrokerCredential) => void;
}

export function BrokerCredentialsForm({
  userId,
  mode,
  showExisting = false,
  onCredentialCreated,
}: BrokerCredentialsFormProps) {
  const [selectedBroker, setSelectedBroker] = useState<"capital.com" | "binance">("capital.com");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // TRPC mutations and queries
  const createCredentialMutation = trpc.bots.createBrokerCredential.useMutation();
  const { data: existingCredentials = [], refetch: refetchCredentials } =
    trpc.bots.getBrokerCredentials.useQuery(undefined, { enabled: showExisting });

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
    setValue,
    watch,
    clearErrors,
  } = useForm<CredentialsFormData>({
    resolver: zodResolver(credentialsSchema),
    defaultValues: {
      name: "",
      brokerName: "capital.com",
      isDemo: false,
      isActive: true,
      apiKey: "",
      identifier: "",
      password: "",
      secretKey: "",
    },
  });

  const watchedBroker = watch("brokerName");

  React.useEffect(() => {
    setValue("brokerName", selectedBroker);
    // Clear all field errors when switching brokers
    clearErrors();
  }, [selectedBroker, setValue, clearErrors]);

  const validateForm = (data: CredentialsFormData): string | null => {
    if (data.brokerName === "capital.com") {
      if (!data.identifier) return "Identifier is required for Capital.com";
      if (!data.password) return "Password is required for Capital.com";
    } else if (data.brokerName === "binance") {
      if (!data.secretKey) return "Secret key is required for Binance";
    }
    return null;
  };

  const onSubmit = async (data: CredentialsFormData) => {
    // Custom validation for broker-specific fields
    const validationError = validateForm(data);
    if (validationError) {
      toast.error(validationError);
      return;
    }

    setIsSubmitting(true);
    try {
      // Prepare credentials object for Capital.com (only supported broker currently)
      if (data.brokerName !== "capital.com") {
        throw new Error("Only Capital.com is currently supported");
      }

      const credentials = {
        apiKey: data.apiKey,
        identifier: data.identifier!,
        password: data.password!,
      };

      // Call the actual API to create broker credential
      const result = await createCredentialMutation.mutateAsync({
        name: data.name,
        broker: data.brokerName,
        isDemo: data.isDemo,
        credentials,
      });

      // Create the credential object for callback
      const newCredential: BrokerCredential = {
        id: result.id,
        name: result.name,
        brokerName: result.broker,
        isActive: result.isActive ?? true,
        createdAt:
          typeof result.createdAt === "string"
            ? result.createdAt
            : new Date(result.createdAt).toISOString(),
        updatedAt: result.updatedAt
          ? typeof result.updatedAt === "string"
            ? result.updatedAt
            : new Date(result.updatedAt).toISOString()
          : typeof result.createdAt === "string"
            ? result.createdAt
            : new Date(result.createdAt).toISOString(),
        isVerified: true, // Successful creation means it's verified
      };

      // Refresh the credentials list if showing existing
      if (showExisting) {
        refetchCredentials();
      }

      onCredentialCreated?.(newCredential);
      reset({
        name: "",
        brokerName: selectedBroker,
        isDemo: false,
        isActive: true,
        apiKey: "",
        identifier: "",
        password: "",
        secretKey: "",
      });

      toast.success(
        `Broker credential "${data.name}" created successfully and connection verified!`,
      );
    } catch (error) {
      console.error("Error saving credentials:", error);
      const errorMessage = error instanceof Error ? error.message : "Failed to save credentials";
      toast.error(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderCapitalComForm = () => (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="capitalApiKey">API Key *</Label>
        <Input
          id="capitalApiKey"
          placeholder="Enter your Capital.com API key"
          {...register("apiKey")}
        />
        {errors.apiKey && <p className="text-sm text-red-500">{errors.apiKey.message}</p>}
      </div>

      <div className="space-y-2">
        <Label htmlFor="capitalIdentifier">Identifier *</Label>
        <Input
          id="capitalIdentifier"
          placeholder="Enter your Capital.com identifier"
          {...register("identifier")}
        />
        {errors.identifier && <p className="text-sm text-red-500">{errors.identifier.message}</p>}
      </div>

      <div className="space-y-2">
        <Label htmlFor="capitalPassword">Password *</Label>
        <Input
          id="capitalPassword"
          type="password"
          placeholder="Enter your Capital.com password"
          {...register("password")}
        />
        {errors.password && <p className="text-sm text-red-500">{errors.password.message}</p>}
      </div>

      <div className="flex items-center space-x-2">
        <Checkbox id="capitalDemo" {...register("isDemo")} />
        <Label htmlFor="capitalDemo">Use Demo Account</Label>
      </div>
    </div>
  );

  const renderBinanceForm = () => (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="binanceApiKey">API Key *</Label>
        <Input
          id="binanceApiKey"
          placeholder="Enter your Binance API key"
          {...register("apiKey")}
        />
        {errors.apiKey && <p className="text-sm text-red-500">{errors.apiKey.message}</p>}
      </div>

      <div className="space-y-2">
        <Label htmlFor="binanceSecretKey">Secret Key *</Label>
        <Input
          id="binanceSecretKey"
          type="password"
          placeholder="Enter your Binance secret key"
          {...register("secretKey")}
        />
        {errors.secretKey && <p className="text-sm text-red-500">{errors.secretKey.message}</p>}
      </div>

      <div className="flex items-center space-x-2">
        <Checkbox id="binanceTestnet" {...register("isDemo")} />
        <Label htmlFor="binanceTestnet">Use Testnet</Label>
      </div>
    </div>
  );

  const handleBrokerChange = (broker: string) => {
    const typedBroker = broker as "capital.com" | "binance";
    setSelectedBroker(typedBroker);
  };

  return (
    <div className="space-y-6">
      {mode === "create" || mode === "both" ? (
        <Card>
          <CardHeader>
            <CardTitle>Add New Broker Credentials</CardTitle>
            <CardDescription>
              Connect your trading account to enable automated trading. Your credentials will be
              tested and securely encrypted.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="credentialName">Credential Name *</Label>
                <Input
                  id="credentialName"
                  placeholder="Enter a name for this credential"
                  {...register("name")}
                />
                {errors.name && <p className="text-sm text-red-500">{errors.name.message}</p>}
              </div>

              <div className="space-y-2">
                <Label>Broker Type</Label>
                <Tabs value={selectedBroker} onValueChange={handleBrokerChange} className="w-full">
                  <TabsList className="grid grid-cols-2 w-full">
                    <TabsTrigger value="capital.com">Capital.com</TabsTrigger>
                    <TabsTrigger value="binance" disabled>
                      Binance (Coming Soon)
                    </TabsTrigger>
                  </TabsList>

                  <TabsContent value="capital.com">{renderCapitalComForm()}</TabsContent>

                  <TabsContent value="binance">{renderBinanceForm()}</TabsContent>
                </Tabs>
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox id="credentialActive" defaultChecked {...register("isActive")} />
                <Label htmlFor="credentialActive">Enable this credential</Label>
              </div>

              <Button type="submit" disabled={isSubmitting} className="w-full">
                {isSubmitting ? "Testing connection and saving..." : "Save and Test Credentials"}
              </Button>
            </form>
          </CardContent>
        </Card>
      ) : null}

      {showExisting && (mode === "edit" || mode === "both") ? (
        <Card>
          <CardHeader>
            <CardTitle>Existing Credentials</CardTitle>
            <CardDescription>Manage your existing broker connections</CardDescription>
          </CardHeader>
          <CardContent>
            {existingCredentials.length === 0 ? (
              <p className="text-muted-foreground text-center py-4">
                No broker credentials configured yet.
              </p>
            ) : (
              <div className="space-y-2">
                {existingCredentials.map((credential) => (
                  <div
                    key={credential.id}
                    className="flex items-center justify-between p-3 border rounded-lg"
                  >
                    <div>
                      <h4 className="font-medium">{credential.name}</h4>
                      <p className="text-sm text-muted-foreground">
                        {credential.broker} • {credential.isActive ? "Active" : "Inactive"} •{" "}
                        {credential.isDemo ? "Demo" : "Live"}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Created: {new Date(credential.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="flex space-x-2">
                      <Button variant="outline" size="sm">
                        Test
                      </Button>
                      <Button variant="outline" size="sm">
                        Edit
                      </Button>
                      <Button variant="destructive" size="sm">
                        Delete
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
