import NextAuth from "next-auth";
import Google from "next-auth/providers/google";

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    }),
  ],
  callbacks: {
    signIn({ account, profile }) {
      return (
        account?.provider === "google" &&
        profile?.email === process.env.NEXTAUTH_EMAIL
      );
    },
  },
  pages: {
    signIn: "/login",
  },
});
