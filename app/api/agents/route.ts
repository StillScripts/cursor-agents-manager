import { type NextRequest, NextResponse } from "next/server";
import {
  getSimulatedAgentsPaginated,
  addSimulatedAgent,
  updateSimulatedAgentStatus,
} from "@/lib/mock-data";
import {
  isSimulationMode,
  getUserApiKey,
  CURSOR_API_URL,
} from "@/lib/api-utils";
import type { Agent } from "@/lib/types";
import { 
  validateLaunchAgentRequest,
  type LaunchAgentRequest 
} from "@/lib/schemas/cursor/launch-agent";

async function simulateDelay() {
  await new Promise((resolve) => setTimeout(resolve, 2000));
}

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const page = Number.parseInt(searchParams.get("page") || "0", 10);
  const limit = Number.parseInt(searchParams.get("limit") || "20", 10);

  const simMode = await isSimulationMode(request);

  if (simMode) {
    await simulateDelay();

    const { agents, total, totalPages } = getSimulatedAgentsPaginated(
      page,
      limit
    );
    return NextResponse.json({
      agents,
      page,
      limit,
      total,
      totalPages,
      simulation: true,
    });
  }

  try {
    const apiKey = await getUserApiKey(request);
    if (!apiKey) {
      return NextResponse.json(
        { error: "API key not configured" },
        { status: 401 }
      );
    }

    const url = new URL(CURSOR_API_URL);
    url.searchParams.set("limit", String(limit));

    const response = await fetch(url.toString(), {
      headers: {
        Authorization: `Bearer ${apiKey}`,
      },
    });

    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }

    const data = await response.json();
    return NextResponse.json({ ...data, simulation: false });
  } catch (error) {
    console.error("Error fetching agents:", error);
    return NextResponse.json(
      { error: "Failed to fetch agents" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    console.log(
      "[API /agents POST] Request body:",
      JSON.stringify(body, null, 2)
    );

    // Validate the request body using our schema
    let validatedRequest: LaunchAgentRequest;
    try {
      validatedRequest = validateLaunchAgentRequest(body);
    } catch (validationError) {
      console.error("[API /agents POST] Validation error:", validationError);
      return NextResponse.json(
        { 
          error: "Invalid request data", 
          details: validationError instanceof Error ? validationError.message : "Validation failed" 
        },
        { status: 400 }
      );
    }

    const simMode = await isSimulationMode(request);
    console.log("[API /agents POST] Simulation mode:", simMode);

    if (simMode) {
      console.log("[API /agents POST] Running in SIMULATION mode");
      await simulateDelay();

      const newAgent: Agent = {
        id: `bc_${Math.random().toString(36).substr(2, 9)}`,
        name: validatedRequest.prompt.text.substring(0, 50) + "...",
        status: "CREATING",
        source: validatedRequest.source,
        target: {
          url: `https://cursor.com/agents?id=bc_sim_new`,
          branchName: validatedRequest.target?.branchName || `cursor/task-${Date.now()}`,
          autoCreatePr: validatedRequest.target?.autoCreatePr ?? false,
        },
        createdAt: new Date().toISOString(),
      };

      addSimulatedAgent(newAgent);
      console.log("[API /agents POST] Created simulated agent:", newAgent.id);

      setTimeout(() => {
        updateSimulatedAgentStatus(newAgent.id, "RUNNING");
      }, 2000);

      return NextResponse.json(
        { ...newAgent, simulation: true },
        { status: 201 }
      );
    }

    // Live mode
    console.log("[API /agents POST] Running in LIVE mode");

    const apiKey = await getUserApiKey(request);
    if (!apiKey) {
      console.error("[API /agents POST] No API key found for user");
      return NextResponse.json(
        { error: "API key not configured" },
        { status: 401 }
      );
    }

    console.log("[API /agents POST] API key found, length:", apiKey.length);
    console.log(
      "[API /agents POST] Sending request to Cursor API:",
      CURSOR_API_URL
    );

    const response = await fetch(CURSOR_API_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(validatedRequest),
    });

    console.log(
      "[API /agents POST] Cursor API response status:",
      response.status,
      response.statusText
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error("[API /agents POST] Cursor API error:", {
        status: response.status,
        statusText: response.statusText,
        body: errorText,
      });
      throw new Error(`Cursor API error: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    console.log("[API /agents POST] Cursor API success:", data);
    return NextResponse.json({ ...data, simulation: false }, { status: 201 });
  } catch (error) {
    console.error("[API /agents POST] Error launching agent:", {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    });
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Failed to launch agent",
      },
      { status: 500 }
    );
  }
}
