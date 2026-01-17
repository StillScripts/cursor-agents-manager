---
name: convex-best-practices
description: Guidelines for building with Convex including schema design, queries, mutations, actions, and function patterns. Use when working with Convex backend code, database operations, or API design.
---

# Convex Best Practices

Follow these guidelines when working with Convex projects.

## Function Syntax

### New Function Registration

Always use the new function syntax with validators:

```typescript
import { query } from "./_generated/server";
import { v } from "convex/values";

export const f = query({
  args: { name: v.string() },
  returns: v.string(),
  handler: async (ctx, args) => {
    return "Hello " + args.name;
  },
});
```

### Validators

- ALWAYS include `args` and `returns` validators for all functions
- Use `v.null()` when a function doesn't return anything
- Use `v.int64()` for signed 64-bit integers (not `v.bigint()`)
- Use `v.id(tableName)` for document IDs
- Use `v.record(keys, values)` for dynamic objects (not `v.map()` or `v.set()`)

### Function Types

**Public Functions:**
- `query` - Read-only operations exposed to clients
- `mutation` - Write operations exposed to clients
- `action` - Long-running operations with external API calls

**Internal Functions:**
- `internalQuery` - Private read-only operations
- `internalMutation` - Private write operations
- `internalAction` - Private long-running operations

Never use public functions for sensitive internal logic that should be kept private.

## Function References and Calling

### File-Based Routing

- `api.example.f` - Public function `f` in `convex/example.ts`
- `internal.example.g` - Internal function `g` in `convex/example.ts`
- `api.messages.access.h` - Public function `h` in `convex/messages/access.ts`

### Calling Functions

```typescript
// From queries, mutations, or actions
await ctx.runQuery(api.example.f, { name: "Bob" });

// From mutations or actions
await ctx.runMutation(api.example.g, { ... });

// From actions only
await ctx.runAction(internal.example.h, { ... });
```

**Important:**
- Always pass `FunctionReference` objects (from `api` or `internal`)
- Never pass function implementations directly
- For same-file calls, add type annotations to avoid TypeScript circularity
- Minimize action-to-query/mutation calls to avoid race conditions

## Schema Design

### Schema Definition

```typescript
import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  messages: defineTable({
    channelId: v.id("channels"),
    authorId: v.optional(v.id("users")),
    content: v.string(),
  })
    .index("by_channel", ["channelId"])
    .index("by_channel_and_author", ["channelId", "authorId"]),
});
```

### Index Guidelines

- Include all index fields in the index name (e.g., `by_field1_and_field2`)
- Query fields in the same order they're defined in the index
- Create separate indexes for different query orders
- System fields `_id` and `_creationTime` are added automatically

## Query Patterns

### Basic Queries

```typescript
// Use indexes, NOT filter
const messages = await ctx.db
  .query("messages")
  .withIndex("by_channel", (q) => q.eq("channelId", channelId))
  .order("desc")
  .take(10);
```

### Important Rules

- DO NOT use `.filter()` - define indexes instead
- Use `.unique()` to get a single document (throws if multiple found)
- Queries don't support `.delete()` - use `.collect()` then iterate
- Default order is ascending `_creationTime`
- Use `.order("asc")` or `.order("desc")` to specify ordering

### Full-Text Search

```typescript
const results = await ctx.db
  .query("messages")
  .withSearchIndex("search_body", (q) =>
    q.search("body", "hello hi").eq("channel", "#general")
  )
  .take(10);
```

### Pagination

```typescript
import { paginationOptsValidator } from "convex/server";

export const list = query({
  args: { paginationOpts: paginationOptsValidator, author: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("messages")
      .withIndex("by_author", (q) => q.eq("author", args.author))
      .order("desc")
      .paginate(args.paginationOpts);
  },
});
```

Returns: `{ page: Doc[], isDone: boolean, continueCursor: string }`

## Mutations

### Write Operations

```typescript
// Insert
const id = await ctx.db.insert("tasks", { name: "Buy milk" });

// Patch (shallow merge)
await ctx.db.patch(taskId, { completed: true });

// Replace (full replacement)
await ctx.db.replace(taskId, { name: "Buy milk", completed: false });

// Delete
await ctx.db.delete(taskId);
```

## Actions

### Node.js Actions

```typescript
"use node";

import { action } from "./_generated/server";

export const fetchData = action({
  args: {},
  returns: v.null(),
  handler: async (ctx, args) => {
    // Can use Node.js built-in modules
    // Cannot use ctx.db
    return null;
  },
});
```

**Important:**
- Add `"use node";` for Node.js built-in modules
- Never use `ctx.db` in actions
- Add `@types/node` to package.json when using Node modules

## TypeScript Guidelines

### Type Safety

```typescript
import { Doc, Id } from "./_generated/dataModel";

// Use Id<'tableName'> for document IDs
const getUserById = async (userId: Id<"users">) => {
  return await ctx.db.get(userId);
};

// Use Record with proper types
const record: Record<Id<"users">, string> = {};

// Use as const for discriminated unions
type Result =
  | { kind: "error" as const; message: string }
  | { kind: "success" as const; value: number };
```

## File Storage

```typescript
// Get file URL
const url = await ctx.storage.getUrl(fileId); // Returns null if not found

// Get file metadata (query _storage table)
type FileMetadata = {
  _id: Id<"_storage">;
  _creationTime: number;
  contentType?: string;
  sha256: string;
  size: number;
};

const metadata: FileMetadata | null = await ctx.db.system.get(fileId);
```

## Scheduling

### Cron Jobs

```typescript
import { cronJobs } from "convex/server";
import { internal } from "./_generated/api";

const crons = cronJobs();

// Run every 2 hours
crons.interval("cleanup", { hours: 2 }, internal.crons.cleanup, {});

export default crons;
```

Only use `crons.interval` or `crons.cron` (not hourly/daily/weekly helpers).

## HTTP Endpoints

```typescript
import { httpRouter } from "convex/server";
import { httpAction } from "./_generated/server";

const http = httpRouter();

http.route({
  path: "/api/echo",
  method: "POST",
  handler: httpAction(async (ctx, req) => {
    const body = await req.bytes();
    return new Response(body, { status: 200 });
  }),
});

export default http;
```

## Common Patterns

### AI Response Generation

```typescript
export const sendMessage = mutation({
  args: { channelId: v.id("channels"), content: v.string() },
  returns: v.null(),
  handler: async (ctx, args) => {
    await ctx.db.insert("messages", { ...args });
    // Schedule async processing
    await ctx.scheduler.runAfter(0, internal.ai.generateResponse, {
      channelId: args.channelId,
    });
    return null;
  },
});
```

### Context Loading

```typescript
export const loadContext = internalQuery({
  args: { channelId: v.id("channels") },
  returns: v.array(v.object({ role: v.string(), content: v.string() })),
  handler: async (ctx, args) => {
    const messages = await ctx.db
      .query("messages")
      .withIndex("by_channel", (q) => q.eq("channelId", args.channelId))
      .order("desc")
      .take(10);

    return messages.map(m => ({
      role: m.authorId ? "user" : "assistant",
      content: m.content
    }));
  },
});
```

## References

Built with professional engineering practices.
