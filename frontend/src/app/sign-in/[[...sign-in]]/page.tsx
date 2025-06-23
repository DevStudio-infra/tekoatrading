import { SignIn } from "@clerk/nextjs";

export default function SignInPage() {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <h2 className="mt-6 text-3xl font-extrabold text-gray-900">Sign in to Tekoa Trading</h2>
          <p className="mt-2 text-sm text-gray-600">Access your AI-powered trading platform</p>
        </div>
        <div className="flex justify-center">
          <SignIn
            appearance={{
              elements: {
                rootBox: "mx-auto",
                card: "shadow-lg border border-gray-200",
              },
            }}
          />
        </div>
      </div>
    </div>
  );
}
