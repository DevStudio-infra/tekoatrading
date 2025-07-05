"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/features/shared/components/ui/button";
import { Input } from "@/features/shared/components/ui/input";
import { Label } from "@/features/shared/components/ui/label";
import { Textarea } from "@/features/shared/components/ui/textarea";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/features/shared/components/ui/card";
import { toast } from "sonner";
import { Mail, MessageSquare, Send } from "lucide-react";

export default function ContactPage() {
  const t = useTranslations("contact");
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    subject: "",
    message: "",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      // TODO: Replace with actual API call
      await new Promise((resolve) => setTimeout(resolve, 1000));

      toast.success(t("success") || "Message sent successfully!");
      setFormData({ name: "", email: "", subject: "", message: "" });
    } catch (error) {
      toast.error(t("error") || "Failed to send message. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20">
      <div className="container mx-auto px-4 py-16">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="text-center mb-16">
            <h1 className="text-4xl font-bold mb-4 bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
              {t("title") || "Get in Touch"}
            </h1>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              {t("description") ||
                "Have questions about Tekoa Trading? We'd love to hear from you. Send us a message and we'll respond as soon as possible."}
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-12">
            {/* Contact Form */}
            <Card className="shadow-lg">
              <CardHeader className="space-y-1">
                <CardTitle className="text-2xl flex items-center gap-2">
                  <MessageSquare className="h-5 w-5 text-primary" />
                  {t("formTitle") || "Send us a message"}
                </CardTitle>
                <CardDescription>
                  {t("formDescription") ||
                    "Fill out the form below and we'll get back to you within 24 hours."}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmit} className="space-y-6">
                  <div className="grid md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="name">{t("name") || "Name"}</Label>
                      <Input
                        id="name"
                        name="name"
                        type="text"
                        placeholder={t("namePlaceholder") || "Your full name"}
                        value={formData.name}
                        onChange={handleChange}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="email">{t("email") || "Email"}</Label>
                      <Input
                        id="email"
                        name="email"
                        type="email"
                        placeholder={t("emailPlaceholder") || "your@email.com"}
                        value={formData.email}
                        onChange={handleChange}
                        required
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="subject">{t("subject") || "Subject"}</Label>
                    <Input
                      id="subject"
                      name="subject"
                      type="text"
                      placeholder={t("subjectPlaceholder") || "What's this about?"}
                      value={formData.subject}
                      onChange={handleChange}
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="message">{t("message") || "Message"}</Label>
                    <Textarea
                      id="message"
                      name="message"
                      rows={5}
                      placeholder={
                        t("messagePlaceholder") || "Tell us more about your question or feedback..."
                      }
                      value={formData.message}
                      onChange={handleChange}
                      required
                    />
                  </div>

                  <Button type="submit" className="w-full" disabled={isSubmitting}>
                    {isSubmitting ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current mr-2"></div>
                        {t("sending") || "Sending..."}
                      </>
                    ) : (
                      <>
                        <Send className="h-4 w-4 mr-2" />
                        {t("sendMessage") || "Send Message"}
                      </>
                    )}
                  </Button>
                </form>
              </CardContent>
            </Card>

            {/* Contact Information */}
            <div className="space-y-8">
              <Card className="shadow-lg">
                <CardHeader>
                  <CardTitle className="text-2xl flex items-center gap-2">
                    <Mail className="h-5 w-5 text-primary" />
                    {t("whyContact") || "Why Contact Us?"}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="space-y-4">
                    <div className="flex items-start gap-3">
                      <div className="mt-1">
                        <div className="h-2 w-2 rounded-full bg-primary"></div>
                      </div>
                      <div>
                        <h4 className="font-semibold text-sm">
                          {t("supportTitle") || "Technical Support"}
                        </h4>
                        <p className="text-sm text-muted-foreground">
                          {t("supportDescription") ||
                            "Get help with trading bots, API integrations, or platform issues"}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-start gap-3">
                      <div className="mt-1">
                        <div className="h-2 w-2 rounded-full bg-primary"></div>
                      </div>
                      <div>
                        <h4 className="font-semibold text-sm">
                          {t("salesTitle") || "Sales Inquiry"}
                        </h4>
                        <p className="text-sm text-muted-foreground">
                          {t("salesDescription") ||
                            "Questions about pricing, features, or custom solutions"}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-start gap-3">
                      <div className="mt-1">
                        <div className="h-2 w-2 rounded-full bg-primary"></div>
                      </div>
                      <div>
                        <h4 className="font-semibold text-sm">
                          {t("partnershipTitle") || "Partnership Opportunities"}
                        </h4>
                        <p className="text-sm text-muted-foreground">
                          {t("partnershipDescription") ||
                            "Interested in integrating with Tekoa Trading or becoming a partner"}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-start gap-3">
                      <div className="mt-1">
                        <div className="h-2 w-2 rounded-full bg-primary"></div>
                      </div>
                      <div>
                        <h4 className="font-semibold text-sm">
                          {t("feedbackTitle") || "Feedback & Suggestions"}
                        </h4>
                        <p className="text-sm text-muted-foreground">
                          {t("feedbackDescription") ||
                            "Share your ideas to help us improve the platform"}
                        </p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="shadow-lg bg-primary/5 border-primary/20">
                <CardContent className="p-6">
                  <h3 className="font-semibold mb-3 text-primary">
                    {t("responseTime") || "Response Time"}
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    {t("responseDescription") ||
                      "We typically respond to all inquiries within 24 hours during business days. For urgent technical issues, please mention 'URGENT' in your subject line."}
                  </p>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
