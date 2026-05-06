import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";

// 1. Define the VIP area
const isProtectedRoute = createRouteMatcher(["/dashboard(.*)"]);

export default clerkMiddleware((auth, req) => {
  // 2. If they try to enter the VIP area, demand to see their ID
  if (isProtectedRoute(req)) {
    auth().protect();
  }
});

// 3. Keep the static files and API routes fast and accessible
export const config = {
  matcher: [
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    '/(api|trpc)(.*)',
  ],
};