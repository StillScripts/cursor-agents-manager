import type { Agent, AgentConversation, AgentMessage } from "./types"

function generateMockAgents(): Agent[] {
  const statuses: Agent["status"][] = [
    "RUNNING",
    "FINISHED",
    "ERROR",
    "CREATING",
    "EXPIRED",
  ]
  const repos = [
    "acme/web-app",
    "acme/api-service",
    "acme/dashboard",
    "acme/core-lib",
    "acme/backend",
    "acme/mobile-app",
    "acme/auth-service",
    "acme/payments",
    "acme/analytics",
    "acme/docs",
  ]
  const branches = [
    "main",
    "develop",
    "staging",
    "feature/auth",
    "feature/payments",
  ]
  const tasks = [
    "Add README Documentation",
    "Fix Authentication Bug",
    "Implement Dark Mode",
    "Add Unit Tests",
    "Refactor Database Layer",
    "Update Dependencies",
    "Add API Endpoints",
    "Fix Memory Leak",
    "Implement Caching",
    "Add Logging",
    "Setup CI/CD Pipeline",
    "Add Error Handling",
    "Optimize Performance",
    "Add Search Feature",
    "Implement Webhooks",
    "Add Rate Limiting",
    "Setup Monitoring",
    "Add Input Validation",
    "Implement SSO",
    "Add Export Feature",
  ]
  const summaries = [
    "Creating comprehensive README with installation instructions...",
    "Fixed JWT token validation and added refresh token support",
    "Error: Could not access repository. Please check permissions.",
    "Setting up initial configuration...",
    "Session expired due to inactivity",
    "Implementing new feature with tests...",
    "Analyzing codebase structure...",
    "Making requested changes to the repository...",
    "Completed all requested changes successfully",
    "Waiting for user confirmation...",
  ]

  const agents: Agent[] = []

  for (let i = 0; i < 47; i++) {
    const status = statuses[i % statuses.length]
    const repo = repos[i % repos.length]
    const branch = branches[i % branches.length]
    const task = tasks[i % tasks.length]
    const summary = summaries[i % summaries.length]

    agents.push({
      id: `bc_sim${String(i + 1).padStart(3, "0")}`,
      name: `${task} #${i + 1}`,
      status,
      source: {
        repository: `https://github.com/${repo}`,
        ref: branch,
      },
      target: {
        url: `https://cursor.com/agents?id=bc_sim${String(i + 1).padStart(3, "0")}`,
        branchName: `cursor/${task.toLowerCase().replace(/\s+/g, "-")}-${1000 + i}`,
        prUrl:
          status === "FINISHED"
            ? `https://github.com/${repo}/pull/${40 + i}`
            : undefined,
        autoCreatePr: i % 2 === 0,
      },
      createdAt: new Date(Date.now() - 1000 * 60 * (i * 30 + 5)).toISOString(),
      summary,
    })
  }

  return agents
}

export const mockAgents: Agent[] = generateMockAgents()

export const mockConversations: Record<string, AgentConversation> = {
  bc_sim001: {
    id: "bc_sim001",
    messages: [
      {
        id: "msg_001",
        type: "user_message",
        text: "Add a comprehensive README.md file with installation instructions, usage examples, and contribution guidelines.",
      },
      {
        id: "msg_002",
        type: "assistant_message",
        text: "I'll create a comprehensive README.md file for your project. Let me first analyze the project structure to understand what documentation would be most helpful.",
      },
      {
        id: "msg_003",
        type: "tool_call",
        toolName: "list_directory",
        toolInput: { path: "/" },
      },
      {
        id: "msg_004",
        type: "tool_result",
        toolResult: "Found: package.json, src/, tests/, .github/",
      },
      {
        id: "msg_005",
        type: "assistant_message",
        text: "I can see this is a Node.js project. I'll create a README with sections for installation, development setup, testing, and contribution guidelines.",
      },
      {
        id: "msg_006",
        type: "tool_call",
        toolName: "create_file",
        toolInput: { path: "README.md" },
      },
    ],
  },
  bc_sim002: {
    id: "bc_sim002",
    messages: [
      {
        id: "msg_001",
        type: "user_message",
        text: "Fix the authentication bug where JWT tokens are not being validated correctly",
      },
      {
        id: "msg_002",
        type: "assistant_message",
        text: "I'll investigate the JWT token validation issue. Let me examine the authentication middleware first.",
      },
      {
        id: "msg_003",
        type: "tool_call",
        toolName: "read_file",
        toolInput: { path: "src/middleware/auth.ts" },
      },
      {
        id: "msg_004",
        type: "assistant_message",
        text: "I found the issue. The token verification is not properly handling the token expiration. I've fixed the validation logic and added refresh token support. The changes have been committed to the branch.",
      },
    ],
  },
}

let simulatedAgents = [...mockAgents]

export function getSimulatedAgents(): Agent[] {
  return simulatedAgents
}

export function getSimulatedAgentsPaginated(
  page: number,
  limit: number
): { agents: Agent[]; total: number; totalPages: number } {
  const start = page * limit
  const end = start + limit
  return {
    agents: simulatedAgents.slice(start, end),
    total: simulatedAgents.length,
    totalPages: Math.ceil(simulatedAgents.length / limit),
  }
}

export function addSimulatedAgent(agent: Agent): void {
  simulatedAgents = [agent, ...simulatedAgents]
}

export function removeSimulatedAgent(id: string): void {
  simulatedAgents = simulatedAgents.filter((a) => a.id !== id)
}

export function updateSimulatedAgentStatus(
  id: string,
  status: Agent["status"]
): void {
  simulatedAgents = simulatedAgents.map((a) =>
    a.id === id ? { ...a, status } : a
  )
}

export function getSimulatedConversation(id: string): AgentConversation | null {
  return mockConversations[id] || null
}

export function addMessageToConversation(
  id: string,
  message: AgentMessage
): void {
  if (!mockConversations[id]) {
    mockConversations[id] = { id, messages: [] }
  }
  mockConversations[id].messages.push(message)
}
