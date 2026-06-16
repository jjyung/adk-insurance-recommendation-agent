import NextAuth from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";

const handler = NextAuth({
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        username: { label: "Username", type: "text" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.username || !credentials?.password) return null;

        // Use internal Docker network URL for server-side fetching
        const baseUrl = process.env.FASTAPI_BASE_URL || process.env.NEXT_PUBLIC_FASTAPI_BASE_URL || "http://127.0.0.1:8080";
        const res = await fetch(`${baseUrl}/auth/token`, {
          method: "POST",
          body: new URLSearchParams({
            username: credentials.username,
            password: credentials.password,
          }),
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
        });

        const data = await res.json();

        if (res.ok && data.access_token) {
          return {
            id: credentials.username,
            name: credentials.username,
            accessToken: data.access_token,
          };
        }
        return null;
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.accessToken = (user as any).accessToken;
        token.username = user.name;
      }
      return token;
    },
    async session({ session, token }) {
      (session as any).accessToken = token.accessToken;
      (session as any).user.name = token.username;
      return session;
    },
  },
  pages: {
    signIn: "/login",
  },
  session: {
    strategy: "jwt",
  },
  secret: process.env.NEXTAUTH_SECRET || "change-me-nextauth-secret",
});

export { handler as GET, handler as POST };
