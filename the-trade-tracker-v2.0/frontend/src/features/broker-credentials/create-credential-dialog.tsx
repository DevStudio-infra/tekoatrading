import React, { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { fetchWithAuth } from "@/lib/fetch-with-auth";
import { ensureDevAuthToken } from "@/lib/dev-auth";

import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Form, FormLabel } from "@/components/ui/form";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

// Import schemas and types
import { FlexibleCredentialFormValues, AnyCredentials, credentialFormSchema, getDefaultValues } from "./credential-schemas";

// Import sub-components
import { CapitalComForm, BinanceForm, CoinbaseForm, CustomBrokerForm, ActiveStatusField } from "./components";

import { BrokerCredential } from "./types";

interface CreateCredentialDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCredentialCreated: (newCredential?: BrokerCredential) => void;
}

export function CreateCredentialDialog({ open, onOpenChange, onCredentialCreated }: CreateCredentialDialogProps) {
  const [selectedBroker, setSelectedBroker] = useState("capital.com");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [customFields, setCustomFields] = useState<{ key: string; value: string }[]>([{ key: "apiKey", value: "" }]);

  // Ensure dev auth token on component mount
  useEffect(() => {
    if (process.env.NODE_ENV === "development") {
      ensureDevAuthToken();
    }
  }, []);

  // Using a type cast approach to handle the complex form schema
  const form = useForm<FlexibleCredentialFormValues>({
    // Type-cast the resolver to avoid complex type compatibility issues
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resolver: zodResolver(credentialFormSchema) as any,
    // Cast default values to the flexible type
    defaultValues: getDefaultValues("capital.com") as FlexibleCredentialFormValues,
  });

  // Handle broker type change
  const handleBrokerChange = (value: string) => {
    setSelectedBroker(value);
    form.reset(getDefaultValues(value));

    if (value === "custom") {
      form.setValue("brokerName", "custom", { shouldValidate: true });
      form.setValue("customBrokerName", "", { shouldValidate: true });
    } else {
      form.setValue("brokerName", value, { shouldValidate: true });
    }
  };

  // Add custom field
  const addCustomField = () => {
    setCustomFields([...customFields, { key: "", value: "" }]);
  };

  // Update custom field
  const updateCustomField = (index: number, key: string, value: string) => {
    const newFields = [...customFields];
    newFields[index] = { key, value };
    setCustomFields(newFields);

    // Update form value
    const credentials = { ...form.getValues().credentials } as AnyCredentials;
    if (key) {
      credentials[key] = value;
      form.setValue("credentials", credentials, { shouldValidate: true });
    }
  };

  // Remove custom field
  const removeCustomField = (index: number) => {
    const newFields = [...customFields];
    const removedField = newFields.splice(index, 1)[0];
    setCustomFields(newFields);

    // Update form value
    if (removedField.key) {
      const credentials = { ...form.getValues().credentials } as AnyCredentials;
      delete credentials[removedField.key];
      form.setValue("credentials", credentials, { shouldValidate: true });
    }
  };

  // Form submission
  const onSubmit = async (values: FlexibleCredentialFormValues) => {
    setIsSubmitting(true);
    try {
      // For custom broker, ensure we have the proper name
      if (selectedBroker === "custom" && !values.customBrokerName) {
        toast.error("Please enter a valid broker name for your custom connection");
        setIsSubmitting(false);
        return;
      }

      // Prepare payload
      const payload = {
        name: values.name, // Add the credential name field
        brokerName: selectedBroker === "custom" ? values.customBrokerName : selectedBroker,
        credentials: values.credentials,
        isActive: values.isActive,
      };

      console.log("[DEBUG] Sending broker credential to API:", {
        url: "/api/broker-credentials",
        method: "POST",
        payload,
      });

      // Send request
      const response = await fetchWithAuth("/api/broker-credentials", {
        method: "POST",
        body: JSON.stringify(payload),
      });

      console.log("[DEBUG] API response status:", response.status, response.statusText);

      // Log full response for debugging
      const responseText = await response.text();
      console.log("[DEBUG] Raw API response:", responseText);

      // Parse response if it's JSON
      let responseData;
      try {
        responseData = JSON.parse(responseText);
      } catch (e) {
        console.error("[DEBUG] Failed to parse response as JSON:", e);
        throw new Error("Invalid response format from server");
      }

      if (!response.ok) {
        console.error("[DEBUG] Error response:", responseData);
        throw new Error(responseData.message || "Failed to create broker credential");
      }

      toast.success("Broker credential created successfully");

      // Reset form and close dialog, passing the newly created credential back
      form.reset();

      // Return the newly created credential to the parent component for immediate display
      const newCredential: BrokerCredential = {
        id: responseData.id || Math.floor(Math.random() * 1000), // Fallback ID for optimistic UI
        name: values.name, // Include the name in the returned object
        brokerName: typeof payload.brokerName === "string" ? payload.brokerName : "Unknown Broker",
        isActive: Boolean(payload.isActive),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        isVerified: false,
      };

      onCredentialCreated(newCredential);
    } catch (error) {
      console.error("Error creating broker credential:", error);
      toast.error(error instanceof Error ? error.message : "Failed to create broker credential");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[525px]">
        <DialogHeader>
          <DialogTitle>Add Broker Connection</DialogTitle>
          <DialogDescription>Connect to your trading broker to enable automated trading</DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <div className="space-y-2">
              <FormLabel>Broker Type</FormLabel>
              <Tabs defaultValue="capital.com" value={selectedBroker} onValueChange={handleBrokerChange} className="w-full">
                <TabsList className="grid grid-cols-4 w-full">
                  <TabsTrigger value="capital.com">Capital.com</TabsTrigger>
                  <TabsTrigger value="binance">Binance</TabsTrigger>
                  <TabsTrigger value="coinbase">Coinbase</TabsTrigger>
                  <TabsTrigger value="custom">Custom</TabsTrigger>
                </TabsList>

                {/* Capital.com Form */}
                <TabsContent value="capital.com">
                  <CapitalComForm control={form.control} />
                </TabsContent>

                {/* Binance Form */}
                <TabsContent value="binance">
                  <BinanceForm control={form.control} />
                </TabsContent>

                {/* Coinbase Form */}
                <TabsContent value="coinbase">
                  <CoinbaseForm control={form.control} />
                </TabsContent>

                {/* Custom Broker Form */}
                <TabsContent value="custom">
                  <CustomBrokerForm
                    control={form.control}
                    customFields={customFields}
                    updateCustomField={updateCustomField}
                    removeCustomField={removeCustomField}
                    addCustomField={addCustomField}
                  />
                </TabsContent>
              </Tabs>
            </div>

            <ActiveStatusField control={form.control} />

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? (
                  <>
                    <span className="mr-2">Adding...</span>
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                  </>
                ) : (
                  "Add Broker"
                )}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
