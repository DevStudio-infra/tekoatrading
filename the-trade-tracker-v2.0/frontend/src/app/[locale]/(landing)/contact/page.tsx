"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { motion } from "framer-motion";
import { LandingNav } from "@/components/layout/landing-nav";
import {
  IconBrandTwitter,
  IconBrandLinkedin,
  IconBrandGithub,
  IconMail,
  IconPhone,
  IconMapPin,
  IconSend,
  IconAlertCircle,
  IconCheck
} from "@tabler/icons-react";
import { toast } from 'sonner';
import { AnimatedGradientBackground } from "@/components/ui/animated-gradient-background";
import { GlassCard } from "@/components/ui/glass-card";
import { FloatingElement } from "@/components/ui/floating-element";
import { Sparkles } from "@/components/ui/sparkles";
import { fetchWithAuth } from "@/lib/fetch-with-auth";

const fadeInUpVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { 
    opacity: 1, 
    y: 0,
    transition: { duration: 0.5, ease: "easeOut" }
  }
};

export default function ContactPage() {
  const t = useTranslations('contact');
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    subject: "",
    message: ""
  });
  
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const contactDetails = [
    {
      icon: <IconMail className="h-5 w-5" />, label: t('email'), value: "support@tradetracker.com"
    },
    {
      icon: <IconPhone className="h-5 w-5" />, label: t('phone'), value: "+1 (555) 123-4567"
    },
    {
      icon: <IconMapPin className="h-5 w-5" />, label: t('address'), value: t('addressValue')
    }
  ];

  // ...rest of the component, replacing all static strings with t('...')

  return (
    <AnimatedGradientBackground>
      <LandingNav />
      <div className="relative min-h-screen flex flex-col items-center justify-center py-16 px-4 sm:px-6 lg:px-8">
        <motion.div
          initial="hidden"
          animate="visible"
          variants={fadeInUpVariants}
          className="max-w-2xl w-full space-y-8"
        >
          <h1 className="text-4xl font-extrabold text-center text-gray-900 dark:text-white">
            {t('title')}
          </h1>
          <p className="mt-2 text-lg text-center text-gray-600 dark:text-gray-300">
            {t('subtitle')}
          </p>
          <GlassCard className="p-8">
            <form
              className="space-y-6"
              onSubmit={async (e) => {
                e.preventDefault();
                setIsSubmitting(true);
                setErrors({});
                setIsSuccess(false);
                // ...form validation and submission logic, replace toasts and messages with t('...')
              }}
            >
              <div>
                <label htmlFor="name" className="block text-sm font-medium text-gray-700 dark:text-gray-200">
                  {t('name')}
                </label>
                <input
                  type="text"
                  name="name"
                  id="name"
                  autoComplete="name"
                  value={formData.name}
                  onChange={e => setFormData({ ...formData, name: e.target.value })}
                  className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-700 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                />
                {errors.name && <p className="mt-1 text-xs text-red-600">{errors.name}</p>}
              </div>
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700 dark:text-gray-200">
                  {t('email')}
                </label>
                <input
                  type="email"
                  name="email"
                  id="email"
                  autoComplete="email"
                  value={formData.email}
                  onChange={e => setFormData({ ...formData, email: e.target.value })}
                  className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-700 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                />
                {errors.email && <p className="mt-1 text-xs text-red-600">{errors.email}</p>}
              </div>
              <div>
                <label htmlFor="subject" className="block text-sm font-medium text-gray-700 dark:text-gray-200">
                  {t('subject')}
                </label>
                <input
                  type="text"
                  name="subject"
                  id="subject"
                  value={formData.subject}
                  onChange={e => setFormData({ ...formData, subject: e.target.value })}
                  className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-700 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                />
                {errors.subject && <p className="mt-1 text-xs text-red-600">{errors.subject}</p>}
              </div>
              <div>
                <label htmlFor="message" className="block text-sm font-medium text-gray-700 dark:text-gray-200">
                  {t('message')}
                </label>
                <textarea
                  name="message"
                  id="message"
                  rows={4}
                  value={formData.message}
                  onChange={e => setFormData({ ...formData, message: e.target.value })}
                  className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-700 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                />
                {errors.message && <p className="mt-1 text-xs text-red-600">{errors.message}</p>}
              </div>
              <div>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-60"
                >
                  {isSubmitting ? t('sending') : t('send')}
                  <IconSend className="h-4 w-4 ml-2" />
                </button>
                {isSuccess && (
                  <div className="mt-2 flex items-center text-green-600 dark:text-green-400">
                    <IconCheck className="h-5 w-5 mr-1" /> {t('success')}
                  </div>
                )}
              </div>
            </form>
          </GlassCard>
          <div className="mt-8 flex flex-col items-center space-y-2">
            {contactDetails.map((detail, idx) => (
              <div key={idx} className="flex items-center space-x-2">
                {detail.icon}
                <span className="font-medium">{detail.label}:</span>
                <span>{detail.value}</span>
              </div>
            ))}
          </div>
        </motion.div>
        <FloatingElement className="absolute bottom-8 right-8">
          <Sparkles />
        </FloatingElement>
      </div>
    </AnimatedGradientBackground>
  );
}
