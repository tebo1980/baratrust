import { SignIn } from "@clerk/nextjs";

export default function SignInPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-950">
      <SignIn 
        appearance={{
          elements: {
            card: "bg-gray-900 border border-gray-800 shadow-2xl",
            headerTitle: "text-white font-fraunces text-2xl",
            headerSubtitle: "text-gray-400",
            socialButtonsBlockButton: "bg-gray-800 border-gray-700 text-white hover:bg-gray-700",
            formFieldLabel: "text-gray-300",
            formFieldInput: "bg-gray-800 border-gray-700 text-white focus:ring-white",
            footerActionLink: "text-white hover:text-gray-300"
          }
        }}
      />
    </div>
  );
}