import { getServerSession, type NextAuthOptions } from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import { db } from "@/src/lib/db";

export const authOptions: NextAuthOptions = {
  session: {
    strategy: "jwt",
  },
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID ?? "",
      clientSecret: process.env.GOOGLE_CLIENT_SECRET ?? "",
    }),
  ],
  callbacks: {
    async signIn({ user }) {
      if (!user.email) {
        return false;
      }

      await db.user.upsert({
        where: { email: user.email },
        update: {
          name: user.name,
          image: user.image,
        },
        create: {
          email: user.email,
          name: user.name,
          image: user.image,
        },
      });

      return true;
    },
    async jwt({ token, user }) {
      const email = user?.email ?? token.email;
      if (email) {
        const dbUser = await db.user.findUnique({
          where: { email },
          select: { id: true },
        });

        if (dbUser) {
          token.userId = dbUser.id;
        }
      }

      return token;
    },
    async session({ session, token }) {
      if (session.user && typeof token.userId === "string") {
        session.user.id = token.userId;
      }

      return session;
    },
  },
  secret: process.env.NEXTAUTH_SECRET,
};

export function getAuthSession() {
  return getServerSession(authOptions);
}
