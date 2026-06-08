import { redirect } from "next/navigation";

export default function MaxFallback() {
  // Temporary fallback until Jules pushes feature/final-ui-polish
  redirect("/agents?agent=max");
}
