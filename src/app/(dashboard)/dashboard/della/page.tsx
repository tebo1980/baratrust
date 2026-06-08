import { redirect } from "next/navigation";

export default function DellaFallback() {
  // Temporary fallback until Jules pushes feature/final-ui-polish
  redirect("/agents?agent=della");
}
