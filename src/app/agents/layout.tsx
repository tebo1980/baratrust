import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";

export default function AgentsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { userId } = auth();

  // Replace with actual admin Clerk ID
  const ADMIN_ID = "PASTE_ADMIN_ID_HERE";

  if (userId !== ADMIN_ID) {
    redirect("/dashboard");
  }

  return <>{children}</>;
}
