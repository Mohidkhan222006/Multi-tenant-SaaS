import NextAuth, { DefaultSession } from "next-auth"

declare module "next-auth" {
  interface Session {
    user: {
      id: string
      organizationId?: string | null
      role?: string | null
    } & DefaultSession["user"]
  }

  interface User {
    id: string
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string
    organizationId?: string | null
    role?: string | null
  }
}
