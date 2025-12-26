import { betterAuth } from "better-auth"
import { db } from "./db"
import * as schema from "./schema/auth-schema"
import { drizzleAdapter } from "better-auth/adapters/drizzle"

export const auth = betterAuth({
  database: drizzleAdapter(db, {
    provider: "sqlite",
    schema: {
      ...schema,
    },
  }),
  emailAndPassword: {
    enabled: true,
    requireEmailVerification: false, // Start simple, can add later
  },
  session: {
    expiresIn: 60 * 60 * 24 * 7, // 7 days
    updateAge: 60 * 60 * 24, // 1 day
  },
  socialProviders: {},
  user: {
    additionalFields: {
      name: {
        type: "string",
        required: false,
      },
    },
  },
})

export type Session = typeof auth.$Infer.Session
