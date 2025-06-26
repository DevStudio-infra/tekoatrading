"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { trpc } from "@/lib/trpc";
import { Button } from "@/features/shared/components/ui/button";
import { Input } from "@/features/shared/components/ui/input";
import { Label } from "@/features/shared/components/ui/label";
import { Card } from "@/features/shared/components/ui/card";
import { Badge } from "@/features/shared/components/ui/badge";
import { Switch } from "@/features/shared/components/ui/switch";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/features/shared/components/ui/form";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/features/shared/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/features/shared/components/ui/select";
import { Plus, Shield, Trash2, CheckCircle, XCircle, Loader2, TestTube } from "lucide-react";
import { toast } from "sonner";

const credentialSchema = z.object({
  name: z.string().min(1, "Name is required"),
  broker: z.string().min(1, "Broker is required"),
  isDemo: z.boolean(),
  credentials: z.object({
    apiKey: z.string().min(1, "API Key is required"),
    identifier: z.string().min(1, "Identifier is required"),
    password: z.string().min(1, "Password is required"),
  }),
});

type CredentialFormData = z.infer<typeof credentialSchema>;

interface BrokerCredentialsFormProps {
  userId: string;
  mode?: "create" | "view" | "both";
  showExisting?: boolean;
  onCredentialCreated?: (credential: any) => void;
  onCredentialSelected?: (credentialId: string) => void;
  selectedCredentialId?: string;
}

export function BrokerCredentialsForm({
  userId,
  mode = "both",
  showExisting = true,
  onCredentialCreated,
  onCredentialSelected,
  selectedCredentialId,
}: BrokerCredentialsFormProps) {
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [testingConnection, setTestingConnection] = useState<string | null>(null);

  const form = useForm<CredentialFormData>({
    resolver: zodResolver(credentialSchema),
    defaultValues: {
      name: "",
      broker: "capital.com",
      isDemo: true,
      credentials: {
        apiKey: "",
        identifier: "",
        password: "",
      },
    },
  });

  // Queries
  const { data: credentials, refetch: refetchCredentials } =
    trpc.bots.getBrokerCredentials.useQuery({
      userId,
    });

  // Mutations
  const createCredential = trpc.bots.createBrokerCredential.useMutation({
    onSuccess: (data) => {
      toast.success("Broker credentials created successfully!");
      form.reset();
      setIsCreateDialogOpen(false);
      refetchCredentials();
      onCredentialCreated?.(data);
    },
    onError: (error) => {
      toast.error(`Failed to create credentials: ${error.message}`);
    },
  });

  const testConnection = trpc.bots.testBrokerConnection.useMutation({
    onSuccess: (result) => {
      if (result.success) {
        toast.success("Connection test successful!");
      } else {
        toast.error(`Connection failed: ${result.error}`);
      }
      setTestingConnection(null);
    },
    onError: (error) => {
      toast.error(`Connection test failed: ${error.message}`);
      setTestingConnection(null);
    },
  });

  const handleCreateCredential = (data: CredentialFormData) => {
    createCredential.mutate({
      userId,
      ...data,
    });
  };

  const handleTestConnection = (credentialId: string) => {
    setTestingConnection(credentialId);
    testConnection.mutate({
      credentialId,
      userId,
    });
  };

  const formatDate = (date: string | Date) => {
    return new Date(date).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <div className="space-y-6">
      {/* Existing Credentials */}
      {showExisting && mode !== "create" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold">Existing Credentials</h3>
            {mode === "both" && (
              <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
                <DialogTrigger asChild>
                  <Button size="sm">
                    <Plus className="h-4 w-4 mr-2" />
                    Add Credentials
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-md">
                  <DialogHeader>
                    <DialogTitle>Add Broker Credentials</DialogTitle>
                  </DialogHeader>
                  <Form {...form}>
                    <form
                      onSubmit={form.handleSubmit(handleCreateCredential)}
                      className="space-y-4"
                    >
                      <FormField
                        control={form.control}
                        name="name"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Credential Name</FormLabel>
                            <FormControl>
                              <Input placeholder="My Trading Account" {...field} />
                            </FormControl>
                            <FormDescription>
                              A friendly name to identify this broker connection
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="broker"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Broker</FormLabel>
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Select a broker" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="capital.com">Capital.com</SelectItem>
                                <SelectItem value="binance">Binance</SelectItem>
                                <SelectItem value="coinbase">Coinbase</SelectItem>
                                <SelectItem value="other">Other</SelectItem>
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="credentials.apiKey"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>API Key</FormLabel>
                            <FormControl>
                              <Input type="password" placeholder="Enter API Key" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="credentials.identifier"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Identifier</FormLabel>
                            <FormControl>
                              <Input placeholder="Enter Identifier" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="credentials.password"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Password</FormLabel>
                            <FormControl>
                              <Input type="password" placeholder="Enter Password" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="isDemo"
                        render={({ field }) => (
                          <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
                            <div className="space-y-0.5">
                              <FormLabel>Demo Account</FormLabel>
                              <FormDescription>
                                Enable demo mode for testing purposes
                              </FormDescription>
                            </div>
                            <FormControl>
                              <Switch checked={field.value} onCheckedChange={field.onChange} />
                            </FormControl>
                          </FormItem>
                        )}
                      />

                      <div className="flex space-x-2">
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => setIsCreateDialogOpen(false)}
                          className="flex-1"
                        >
                          Cancel
                        </Button>
                        <Button
                          type="submit"
                          disabled={createCredential.isLoading}
                          className="flex-1"
                        >
                          {createCredential.isLoading ? (
                            <>
                              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                              Creating...
                            </>
                          ) : (
                            "Create"
                          )}
                        </Button>
                      </div>
                    </form>
                  </Form>
                </DialogContent>
              </Dialog>
            )}
          </div>

          {credentials && credentials.length > 0 ? (
            <div className="grid gap-4">
              {credentials.map((credential) => (
                <Card
                  key={credential.id}
                  className={`p-4 cursor-pointer transition-colors ${
                    selectedCredentialId === credential.id
                      ? "ring-2 ring-primary bg-primary/5"
                      : "hover:bg-accent"
                  }`}
                  onClick={() => onCredentialSelected?.(credential.id)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <Shield className="h-5 w-5 text-primary" />
                      <div>
                        <h4 className="font-medium">{credential.name}</h4>
                        <p className="text-sm text-muted-foreground">
                          {credential.broker} • {credential.isDemo ? "Demo" : "Live"}
                        </p>
                        {credential.lastUsed && (
                          <p className="text-xs text-muted-foreground">
                            Last used: {formatDate(credential.lastUsed)}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Badge variant={credential.isActive ? "default" : "secondary"}>
                        {credential.isActive ? "Active" : "Inactive"}
                      </Badge>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleTestConnection(credential.id);
                        }}
                        disabled={testingConnection === credential.id}
                      >
                        {testingConnection === credential.id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <TestTube className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          ) : (
            <Card className="p-8 text-center">
              <Shield className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium mb-2">No Broker Credentials</h3>
              <p className="text-muted-foreground mb-4">
                Add your broker credentials to enable automated trading
              </p>
              {mode === "both" && (
                <Button onClick={() => setIsCreateDialogOpen(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add First Credentials
                </Button>
              )}
            </Card>
          )}
        </div>
      )}

      {/* Create Only Mode */}
      {mode === "create" && (
        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-4">Add Broker Credentials</h3>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleCreateCredential)} className="space-y-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Credential Name</FormLabel>
                    <FormControl>
                      <Input placeholder="My Trading Account" {...field} />
                    </FormControl>
                    <FormDescription>
                      A friendly name to identify this broker connection
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="broker"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Broker</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select a broker" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="capital.com">Capital.com</SelectItem>
                        <SelectItem value="binance">Binance</SelectItem>
                        <SelectItem value="coinbase">Coinbase</SelectItem>
                        <SelectItem value="other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="credentials.apiKey"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>API Key</FormLabel>
                    <FormControl>
                      <Input type="password" placeholder="Enter API Key" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="credentials.identifier"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Identifier</FormLabel>
                    <FormControl>
                      <Input placeholder="Enter Identifier" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="credentials.password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Password</FormLabel>
                    <FormControl>
                      <Input type="password" placeholder="Enter Password" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="isDemo"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
                    <div className="space-y-0.5">
                      <FormLabel>Demo Account</FormLabel>
                      <FormDescription>Enable demo mode for testing purposes</FormDescription>
                    </div>
                    <FormControl>
                      <Switch checked={field.value} onCheckedChange={field.onChange} />
                    </FormControl>
                  </FormItem>
                )}
              />

              <Button type="submit" disabled={createCredential.isLoading} className="w-full">
                {createCredential.isLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Creating Credentials...
                  </>
                ) : (
                  <>
                    <Shield className="h-4 w-4 mr-2" />
                    Create Credentials
                  </>
                )}
              </Button>
            </form>
          </Form>
        </Card>
      )}
    </div>
  );
}
