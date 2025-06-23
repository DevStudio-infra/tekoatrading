"use client";

import React, { useState } from "react";
import { IconCheck, IconKey, IconMail, IconUser, IconAlertCircle } from "@tabler/icons-react";

// Define type for notification settings
type NotificationSettings = {
  email: boolean;
  app: boolean;
  trade: boolean;
};

// Define type for user settings data
type UserSettings = {
  firstName: string;
  lastName: string;
  email: string;
  timezone: string;
  theme: 'light' | 'dark' | 'system';
  notifications: NotificationSettings;
};

interface SettingsFormProps {
  className?: string;
  onSave?: (data: UserSettings) => void;
}

export function SettingsForm({ className, onSave }: SettingsFormProps) {
  const [formData, setFormData] = useState<UserSettings>({
    firstName: "John",
    lastName: "Doe",
    email: "john.doe@example.com",
    timezone: "UTC",
    theme: "system" as 'light' | 'dark' | 'system', // light, dark, system
    notifications: {
      email: true,
      app: true,
      trade: true,
    }
  });
  
  const [isSuccess, setIsSuccess] = useState(false);
  
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target as HTMLInputElement; // Type assertion
    
    if (type === 'checkbox') {
      const checked = (e.target as HTMLInputElement).checked;
      const [parent, child] = name.split('.');
      
      setFormData(prev => ({
        ...prev,
        [parent]: {
          ...prev[parent as keyof typeof prev] as Record<string, boolean>,
          [child]: checked
        }
      }));
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
  };
  
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Simulate API call
    setTimeout(() => {
      onSave?.(formData);
      setIsSuccess(true);
      
      // Hide success message after 3 seconds
      setTimeout(() => setIsSuccess(false), 3000);
    }, 500);
  };
  
  return (
    <div className={`rounded-xl bg-white/70 dark:bg-gray-900/70 backdrop-blur-md border border-blue-100/30 dark:border-blue-900/30 ${className}`}>
      <div className="p-4 border-b border-blue-100/30 dark:border-blue-900/30">
        <h2 className="text-lg font-medium text-gray-800 dark:text-gray-200">Account Settings</h2>
      </div>
      
      <form onSubmit={handleSubmit} className="p-4 space-y-6">
        {/* Success notification */}
        {isSuccess && (
          <div className="rounded-md bg-green-50 dark:bg-green-900/20 p-4 border border-green-200 dark:border-green-900/50">
            <div className="flex items-start">
              <div className="flex-shrink-0">
                <IconCheck className="h-5 w-5 text-green-600 dark:text-green-400" />
              </div>
              <div className="ml-3">
                <p className="text-sm font-medium text-green-700 dark:text-green-300">
                  Settings saved successfully
                </p>
              </div>
            </div>
          </div>
        )}
        
        {/* Personal Info Section */}
        <div>
          <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">Personal Information</h3>
          <div className="space-y-3">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label htmlFor="firstName" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  First Name
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <IconUser className="h-5 w-5 text-gray-400 dark:text-gray-500" />
                  </div>
                  <input
                    type="text"
                    id="firstName"
                    name="firstName"
                    value={formData.firstName}
                    onChange={handleChange}
                    className="block w-full pl-10 bg-white/50 dark:bg-gray-800/50 border border-gray-300 dark:border-gray-700 rounded-md py-2 px-3 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400"
                  />
                </div>
              </div>
              
              <div>
                <label htmlFor="lastName" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Last Name
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <IconUser className="h-5 w-5 text-gray-400 dark:text-gray-500" />
                  </div>
                  <input
                    type="text"
                    id="lastName"
                    name="lastName"
                    value={formData.lastName}
                    onChange={handleChange}
                    className="block w-full pl-10 bg-white/50 dark:bg-gray-800/50 border border-gray-300 dark:border-gray-700 rounded-md py-2 px-3 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400"
                  />
                </div>
              </div>
            </div>
            
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Email
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <IconMail className="h-5 w-5 text-gray-400 dark:text-gray-500" />
                </div>
                <input
                  type="email"
                  id="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  className="block w-full pl-10 bg-white/50 dark:bg-gray-800/50 border border-gray-300 dark:border-gray-700 rounded-md py-2 px-3 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400"
                />
              </div>
            </div>
          </div>
        </div>
        
        {/* Preferences Section */}
        <div>
          <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">Preferences</h3>
          <div className="space-y-3">
            <div>
              <label htmlFor="timezone" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Time Zone
              </label>
              <select
                id="timezone"
                name="timezone"
                value={formData.timezone}
                onChange={handleChange}
                className="block w-full bg-white/50 dark:bg-gray-800/50 border border-gray-300 dark:border-gray-700 rounded-md py-2 px-3 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400"
              >
                <option value="UTC">UTC (Coordinated Universal Time)</option>
                <option value="GMT">GMT (Greenwich Mean Time)</option>
                <option value="EST">EST (Eastern Standard Time)</option>
                <option value="PST">PST (Pacific Standard Time)</option>
                <option value="JST">JST (Japan Standard Time)</option>
              </select>
            </div>
            
            <div>
              <label htmlFor="theme" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Theme
              </label>
              <select
                id="theme"
                name="theme"
                value={formData.theme}
                onChange={handleChange}
                className="block w-full bg-white/50 dark:bg-gray-800/50 border border-gray-300 dark:border-gray-700 rounded-md py-2 px-3 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400"
              >
                <option value="light">Light</option>
                <option value="dark">Dark</option>
                <option value="system">System (Auto)</option>
              </select>
            </div>
          </div>
        </div>
        
        {/* Notification Settings */}
        <div>
          <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">Notifications</h3>
          <div className="space-y-2">
            <div className="flex items-center">
              <input
                id="notifications.email"
                name="notifications.email"
                type="checkbox"
                checked={formData.notifications.email}
                onChange={handleChange}
                className="h-4 w-4 text-blue-600 dark:text-blue-400 focus:ring-blue-500 dark:focus:ring-blue-400 border-gray-300 dark:border-gray-700 rounded"
              />
              <label htmlFor="notifications.email" className="ml-2 block text-sm text-gray-700 dark:text-gray-300">
                Email notifications
              </label>
            </div>
            <div className="flex items-center">
              <input
                id="notifications.app"
                name="notifications.app"
                type="checkbox"
                checked={formData.notifications.app}
                onChange={handleChange}
                className="h-4 w-4 text-blue-600 dark:text-blue-400 focus:ring-blue-500 dark:focus:ring-blue-400 border-gray-300 dark:border-gray-700 rounded"
              />
              <label htmlFor="notifications.app" className="ml-2 block text-sm text-gray-700 dark:text-gray-300">
                App notifications
              </label>
            </div>
            <div className="flex items-center">
              <input
                id="notifications.trade"
                name="notifications.trade"
                type="checkbox"
                checked={formData.notifications.trade}
                onChange={handleChange}
                className="h-4 w-4 text-blue-600 dark:text-blue-400 focus:ring-blue-500 dark:focus:ring-blue-400 border-gray-300 dark:border-gray-700 rounded"
              />
              <label htmlFor="notifications.trade" className="ml-2 block text-sm text-gray-700 dark:text-gray-300">
                Trade notifications
              </label>
            </div>
          </div>
        </div>
        
        {/* Security Section */}
        <div>
          <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">Security</h3>
          <div className="rounded-md bg-blue-50/70 dark:bg-blue-950/20 p-4 border border-blue-100/50 dark:border-blue-900/50">
            <div className="flex">
              <div className="flex-shrink-0">
                <IconKey className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-blue-700 dark:text-blue-300">Password & Authentication</h3>
                <div className="mt-2 text-sm text-blue-600 dark:text-blue-400">
                  <a href="#" className="underline hover:text-blue-800 dark:hover:text-blue-300">
                    Change password
                  </a>
                  <span className="mx-2 text-gray-500 dark:text-gray-400">•</span>
                  <a href="#" className="underline hover:text-blue-800 dark:hover:text-blue-300">
                    Enable two-factor authentication
                  </a>
                </div>
              </div>
            </div>
          </div>
        </div>
        
        {/* Save Button */}
        <div className="flex justify-end">
          <button
            type="submit"
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md text-sm font-medium transition-colors"
          >
            Save Changes
          </button>
        </div>
      </form>
    </div>
  );
}
