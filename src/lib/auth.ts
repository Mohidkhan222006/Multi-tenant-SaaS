import { NextAuthOptions } from 'next-auth';
import { PrismaAdapter } from '@next-auth/prisma-adapter';
import CredentialsProvider from 'next-auth/providers/credentials';
import GithubProvider from 'next-auth/providers/github';
import GoogleProvider from 'next-auth/providers/google';
import bcrypt from 'bcrypt';
import { db } from './db';

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(db),
  session: {
    strategy: 'jwt', // Using JWT sessions for speed; we can load tenant membership dynamically
  },
  pages: {
    signIn: '/login',
    error: '/login',
  },
  providers: [
    GithubProvider({
      clientId: process.env.GITHUB_CLIENT_ID || 'mock-github-id',
      clientSecret: process.env.GITHUB_CLIENT_SECRET || 'mock-github-secret',
    }),
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID || 'mock-google-id',
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || 'mock-google-secret',
    }),
    CredentialsProvider({
      name: 'Credentials',
      credentials: {
        email: { label: 'Email', type: 'email', placeholder: 'user@example.com' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          throw new Error('Please enter an email and password');
        }

        const user = await db.user.findUnique({
          where: { email: credentials.email },
        });

        if (!user || !user.passwordHash) {
          throw new Error('No user found with this email');
        }

        const passwordMatch = await bcrypt.compare(
          credentials.password,
          user.passwordHash
        );

        if (!passwordMatch) {
          throw new Error('Incorrect password');
        }

        return {
          id: user.id,
          name: user.name,
          email: user.email,
          image: user.image,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user, trigger, session }) {
      if (user) {
        token.id = user.id;
      }

      // If switching organization, update session token organizationId
      if (trigger === 'update' && session?.organizationId) {
        token.organizationId = session.organizationId;
        token.role = session.role;
      }

      // If organizationId is not set, resolve the default organization for this user
      if (!token.organizationId && token.id) {
        const membership = await db.organizationMember.findFirst({
          where: { userId: token.id as string },
          select: { organizationId: true, role: true },
        });

        if (membership) {
          token.organizationId = membership.organizationId;
          token.role = membership.role;
        }
      }

      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        session.user.organizationId = token.organizationId as string | null;
        session.user.role = token.role as string | null;
      }
      return session;
    },
  },
};
