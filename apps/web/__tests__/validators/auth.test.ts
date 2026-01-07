import { describe, expect, it } from "vitest"
import {
  type SignInFormData,
  type SignUpFormData,
  signInFormSchema,
  signUpFormSchema,
} from "@/lib/validators/auth"

// Test fixtures
const validSignUpData = {
  name: "John Doe",
  email: "john@example.com",
  password: "password123",
  confirmPassword: "password123",
}

const validSignInData = {
  email: "john@example.com",
  password: "password123",
}

describe("signUpFormSchema", () => {
  it("accepts valid sign up data", () => {
    expect(() => signUpFormSchema.parse(validSignUpData)).not.toThrow()
  })

  it("accepts name with minimum length", () => {
    const data = { ...validSignUpData, name: "Jo" }
    expect(() => signUpFormSchema.parse(data)).not.toThrow()
  })

  it("accepts name with maximum length", () => {
    const data = { ...validSignUpData, name: "A".repeat(100) }
    expect(() => signUpFormSchema.parse(data)).not.toThrow()
  })

  it("accepts various valid email formats", () => {
    const emails = [
      "user@example.com",
      "user.name@example.com",
      "user+tag@example.co.uk",
      "user123@example-domain.com",
    ]
    for (const email of emails) {
      const data = { ...validSignUpData, email }
      expect(() => signUpFormSchema.parse(data)).not.toThrow()
    }
  })

  it("accepts password with minimum length", () => {
    const data = {
      ...validSignUpData,
      password: "12345678",
      confirmPassword: "12345678",
    }
    expect(() => signUpFormSchema.parse(data)).not.toThrow()
  })

  it("accepts password with maximum length", () => {
    const longPassword = "A".repeat(100)
    const data = {
      ...validSignUpData,
      password: longPassword,
      confirmPassword: longPassword,
    }
    expect(() => signUpFormSchema.parse(data)).not.toThrow()
  })

  it("rejects empty name", () => {
    const data = { ...validSignUpData, name: "" }
    expect(() => signUpFormSchema.parse(data)).toThrow()
  })

  it("rejects name shorter than 2 characters", () => {
    const data = { ...validSignUpData, name: "J" }
    expect(() => signUpFormSchema.parse(data)).toThrow()
  })

  it("rejects name longer than 100 characters", () => {
    const data = { ...validSignUpData, name: "A".repeat(101) }
    expect(() => signUpFormSchema.parse(data)).toThrow()
  })

  it("rejects missing name", () => {
    const { name, ...data } = validSignUpData
    expect(() => signUpFormSchema.parse(data)).toThrow()
  })

  it("rejects empty email", () => {
    const data = { ...validSignUpData, email: "" }
    expect(() => signUpFormSchema.parse(data)).toThrow()
  })

  it("rejects invalid email format", () => {
    const invalidEmails = [
      "notanemail",
      "@example.com",
      "user@",
      "user@example",
      "user @example.com",
      "user@example .com",
    ]
    for (const email of invalidEmails) {
      const data = { ...validSignUpData, email }
      expect(() => signUpFormSchema.parse(data)).toThrow()
    }
  })

  it("rejects missing email", () => {
    const { email, ...data } = validSignUpData
    expect(() => signUpFormSchema.parse(data)).toThrow()
  })

  it("rejects empty password", () => {
    const data = { ...validSignUpData, password: "", confirmPassword: "" }
    expect(() => signUpFormSchema.parse(data)).toThrow()
  })

  it("rejects password shorter than 8 characters", () => {
    const data = {
      ...validSignUpData,
      password: "short",
      confirmPassword: "short",
    }
    expect(() => signUpFormSchema.parse(data)).toThrow()
  })

  it("rejects password longer than 100 characters", () => {
    const longPassword = "A".repeat(101)
    const data = {
      ...validSignUpData,
      password: longPassword,
      confirmPassword: longPassword,
    }
    expect(() => signUpFormSchema.parse(data)).toThrow()
  })

  it("rejects missing password", () => {
    const { password, ...data } = validSignUpData
    expect(() => signUpFormSchema.parse(data)).toThrow()
  })

  it("rejects empty confirmPassword", () => {
    const data = { ...validSignUpData, confirmPassword: "" }
    expect(() => signUpFormSchema.parse(data)).toThrow()
  })

  it("rejects missing confirmPassword", () => {
    const { confirmPassword, ...data } = validSignUpData
    expect(() => signUpFormSchema.parse(data)).toThrow()
  })

  it("rejects passwords that do not match", () => {
    const data = {
      ...validSignUpData,
      password: "password123",
      confirmPassword: "different456",
    }
    expect(() => signUpFormSchema.parse(data)).toThrow()
  })

  it("rejects when confirmPassword is different case", () => {
    const data = {
      ...validSignUpData,
      password: "password123",
      confirmPassword: "PASSWORD123",
    }
    expect(() => signUpFormSchema.parse(data)).toThrow()
  })

  it("validates password matching with refine", () => {
    const data = {
      ...validSignUpData,
      password: "password123",
      confirmPassword: "password456",
    }
    const result = signUpFormSchema.safeParse(data)
    expect(result.success).toBe(false)
    if (!result.success) {
      // The refine error should have path set to ["confirmPassword"]
      const confirmPasswordError = result.error.issues.find(
        (issue) => issue.path[0] === "confirmPassword"
      )
      expect(confirmPasswordError).toBeDefined()
      expect(confirmPasswordError?.message).toContain("Passwords do not match")
    }
  })
})

describe("signInFormSchema", () => {
  it("accepts valid sign in data", () => {
    expect(() => signInFormSchema.parse(validSignInData)).not.toThrow()
  })

  it("accepts various valid email formats", () => {
    const emails = [
      "user@example.com",
      "user.name@example.com",
      "user+tag@example.co.uk",
      "user123@example-domain.com",
    ]
    for (const email of emails) {
      const data = { ...validSignInData, email }
      expect(() => signInFormSchema.parse(data)).not.toThrow()
    }
  })

  it("accepts any non-empty password", () => {
    const passwords = [
      "password123",
      "short",
      "A".repeat(100),
      "!@#$%^&*()",
      "12345678",
    ]
    for (const password of passwords) {
      const data = { ...validSignInData, password }
      expect(() => signInFormSchema.parse(data)).not.toThrow()
    }
  })

  it("rejects empty email", () => {
    const data = { ...validSignInData, email: "" }
    expect(() => signInFormSchema.parse(data)).toThrow()
  })

  it("rejects invalid email format", () => {
    const invalidEmails = [
      "notanemail",
      "@example.com",
      "user@",
      "user@example",
      "user @example.com",
      "user@example .com",
    ]
    for (const email of invalidEmails) {
      const data = { ...validSignInData, email }
      expect(() => signInFormSchema.parse(data)).toThrow()
    }
  })

  it("rejects missing email", () => {
    const { email, ...data } = validSignInData
    expect(() => signInFormSchema.parse(data)).toThrow()
  })

  it("rejects empty password", () => {
    const data = { ...validSignInData, password: "" }
    expect(() => signInFormSchema.parse(data)).toThrow()
  })

  it("rejects missing password", () => {
    const { password, ...data } = validSignInData
    expect(() => signInFormSchema.parse(data)).toThrow()
  })
})

describe("Type exports", () => {
  it("SignUpFormData type matches schema", () => {
    const data: SignUpFormData = validSignUpData
    expect(data).toEqual(validSignUpData)
  })

  it("SignInFormData type matches schema", () => {
    const data: SignInFormData = validSignInData
    expect(data).toEqual(validSignInData)
  })
})
