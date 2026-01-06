import { describe, expect, it } from "vitest"
import {
  branchSchema,
  repositorySchema,
  settingsFormSchema,
  validateSettingsForm,
} from "@/lib/validators/settings"

// Test fixtures
const validRepository = {
  url: "https://github.com/user/repo",
  name: "My Repo",
}

const validBranch = {
  name: "main",
}

describe("repositorySchema", () => {
  it("accepts valid repository", () => {
    expect(() => repositorySchema.parse(validRepository)).not.toThrow()
  })

  it("accepts repository with database id", () => {
    const repo = { ...validRepository, id: 123 }
    expect(() => repositorySchema.parse(repo)).not.toThrow()
  })

  it("rejects empty url", () => {
    expect(() => repositorySchema.parse({ url: "", name: "My Repo" })).toThrow()
  })

  it("rejects invalid url", () => {
    expect(() =>
      repositorySchema.parse({ url: "not-a-url", name: "My Repo" })
    ).toThrow()
  })

  it("rejects non-GitHub url", () => {
    expect(() =>
      repositorySchema.parse({
        url: "https://gitlab.com/user/repo",
        name: "My Repo",
      })
    ).toThrow()
  })

  it("rejects empty name", () => {
    expect(() =>
      repositorySchema.parse({
        url: "https://github.com/user/repo",
        name: "",
      })
    ).toThrow()
  })

  it("rejects missing name", () => {
    expect(() =>
      repositorySchema.parse({ url: "https://github.com/user/repo" })
    ).toThrow()
  })
})

describe("branchSchema", () => {
  it("accepts valid branch", () => {
    expect(() => branchSchema.parse(validBranch)).not.toThrow()
  })

  it("accepts branch with database id", () => {
    const branch = { ...validBranch, id: 456 }
    expect(() => branchSchema.parse(branch)).not.toThrow()
  })

  it("accepts branch names with special characters", () => {
    const branches = [
      { name: "feature/my-feature" },
      { name: "release/v1.0.0" },
      { name: "hotfix/bug-123" },
    ]
    for (const branch of branches) {
      expect(() => branchSchema.parse(branch)).not.toThrow()
    }
  })

  it("rejects empty name", () => {
    expect(() => branchSchema.parse({ name: "" })).toThrow()
  })

  it("rejects missing name", () => {
    expect(() => branchSchema.parse({})).toThrow()
  })
})

describe("settingsFormSchema", () => {
  it("accepts valid settings with repositories and branches", () => {
    const settings = {
      repositories: [validRepository],
      branches: [validBranch],
    }
    expect(() => settingsFormSchema.parse(settings)).not.toThrow()
  })

  it("accepts empty arrays", () => {
    const settings = {
      repositories: [],
      branches: [],
    }
    expect(() => settingsFormSchema.parse(settings)).not.toThrow()
  })

  it("accepts multiple repositories and branches", () => {
    const settings = {
      repositories: [
        { url: "https://github.com/user/repo1", name: "Repo 1" },
        { url: "https://github.com/user/repo2", name: "Repo 2" },
        { url: "https://github.com/org/project", name: "Project" },
      ],
      branches: [{ name: "main" }, { name: "develop" }, { name: "staging" }],
    }
    expect(() => settingsFormSchema.parse(settings)).not.toThrow()
  })

  it("rejects invalid repository in array", () => {
    const settings = {
      repositories: [
        validRepository,
        { url: "https://gitlab.com/user/repo", name: "Bad Repo" },
      ],
      branches: [validBranch],
    }
    expect(() => settingsFormSchema.parse(settings)).toThrow()
  })

  it("rejects invalid branch in array", () => {
    const settings = {
      repositories: [validRepository],
      branches: [validBranch, { name: "" }],
    }
    expect(() => settingsFormSchema.parse(settings)).toThrow()
  })

  it("rejects missing repositories field", () => {
    expect(() =>
      settingsFormSchema.parse({ branches: [validBranch] })
    ).toThrow()
  })

  it("rejects missing branches field", () => {
    expect(() =>
      settingsFormSchema.parse({ repositories: [validRepository] })
    ).toThrow()
  })
})

describe("validateSettingsForm", () => {
  it("returns parsed data for valid input", () => {
    const input = {
      repositories: [validRepository],
      branches: [validBranch],
    }
    const result = validateSettingsForm(input)
    expect(result).toEqual(input)
  })

  it("throws for invalid input", () => {
    const input = {
      repositories: [{ url: "invalid", name: "Test" }],
      branches: [],
    }
    expect(() => validateSettingsForm(input)).toThrow()
  })
})
