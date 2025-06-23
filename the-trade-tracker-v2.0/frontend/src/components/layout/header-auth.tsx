"use client";

import React from 'react';
import Link from 'next/link';
import { useUser, UserButton } from '@clerk/nextjs';

export function HeaderAuth() {
  const { isSignedIn, user } = useUser();

  if (isSignedIn && user) {
    return (
      <div className="flex items-center gap-3">
        <Link 
          href="/dashboard" 
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md text-sm font-medium transition-colors hidden sm:block"
        >
          Dashboard
        </Link>
        <UserButton afterSignOutUrl="/" />
      </div>
    );
  }

  return (
    <div className="space-x-2">
      <Link 
        href="/sign-in" 
        className="px-4 py-2 bg-white hover:bg-gray-100 text-blue-600 border border-blue-600 rounded-md text-sm font-medium transition-colors hidden sm:inline-block"
      >
        Sign In
      </Link>
      <Link 
        href="/sign-up" 
        className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md text-sm font-medium transition-colors hidden sm:inline-block"
      >
        Sign Up
      </Link>
    </div>
  );
}
