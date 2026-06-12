import { redirect } from "next/navigation";

export default function RexFallback() {
  // Temporary fallback until Jules pushes feature/final-ui-polish
  redirect("/agents?agent=rex");
}
