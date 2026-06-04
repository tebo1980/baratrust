import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { ReactNode } from "react";

export default async function AgentsLayout({ children }: { children: ReactNode }) {
  const { userId } = await auth();

  if (userId !== "user_3DI3dFA6lrensOlg64aG6eTFoVD") {
    redirect("/dashboard");
  }

  return <>{children}</>;
}
