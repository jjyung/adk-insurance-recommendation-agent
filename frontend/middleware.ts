export { default } from "next-auth/middleware";

export const config = {
  matcher: [
    "/",
    "/api/agent/:path*",
    // Add other protected routes here
  ],
};
