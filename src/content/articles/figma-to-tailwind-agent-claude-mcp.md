---
title: "Building a Figma-to-Tailwind Agent Using Claude and the MCP Protocol"
description: "How to build a Figma-to-Tailwind CSS agent using Claude and the Model Context Protocol (MCP) — giving Claude direct access to Figma design data for more accurate component generation."
slug: "/articles/figma-to-tailwind-agent-claude-mcp"
publishOrder: 31
category: "AI Agents"
date: "2025-05-05"
---

# Building a Figma-to-Tailwind Agent Using Claude and the MCP Protocol

The previous article in this series built a design-to-code pipeline using direct Figma API calls. This article takes a different approach: using the **Model Context Protocol (MCP)** to give Claude direct, tool-based access to Figma data. The result is a more natural, conversational agent that can explore a Figma file, ask clarifying questions about design intent, and generate Tailwind CSS output that more accurately reflects the design.

---

## What is MCP?

The Model Context Protocol is an open standard that allows AI assistants like Claude to use external tools and data sources in a structured way. Instead of stuffing all context into a single prompt, MCP lets Claude call tools — functions that return specific data — and compose responses from multiple tool calls.

For a Figma-to-Tailwind agent, MCP enables:
- Fetching specific Figma nodes on demand (rather than dumping the entire file)
- Iterating through a design hierarchy interactively
- Accessing component variants and styles separately
- Querying the design system tokens specifically

This is the emerging model for building agents that interact with external data: rather than building a pipeline that prepares all the data upfront, you give Claude tools and let it retrieve what it needs.

---

## Architecture

```
Claude Desktop / Claude API (with MCP)
    ↓ tool calls
MCP Server (your Node.js server)
    ↓ REST API calls
Figma API
    ↓ returns node data
MCP Server formats and returns to Claude
    ↓
Claude generates Tailwind CSS component
```

---

## Building the MCP Server

An MCP server is a Node.js process that exposes tools via the MCP protocol. The `@modelcontextprotocol/sdk` package provides the implementation:

```bash
npm install @modelcontextprotocol/sdk @anthropic-ai/sdk node-fetch
```

```typescript
// figma-mcp-server.ts
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';

const FIGMA_TOKEN = process.env.FIGMA_TOKEN!;

const server = new Server(
  { name: 'figma-server', version: '1.0.0' },
  { capabilities: { tools: {} } }
);

// Define the tools Claude can call
server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: [
    {
      name: 'get_figma_file',
      description: 'Get the top-level structure of a Figma file including pages and top-level frames',
      inputSchema: {
        type: 'object',
        properties: {
          file_key: {
            type: 'string',
            description: 'The Figma file key from the URL',
          },
        },
        required: ['file_key'],
      },
    },
    {
      name: 'get_figma_node',
      description: 'Get detailed data for a specific Figma node by ID, including its children and styles',
      inputSchema: {
        type: 'object',
        properties: {
          file_key: { type: 'string' },
          node_id: {
            type: 'string',
            description: 'The node ID (from the Figma URL or parent node children)',
          },
          depth: {
            type: 'number',
            description: 'How many levels deep to fetch children (1-5, default 3)',
          },
        },
        required: ['file_key', 'node_id'],
      },
    },
    {
      name: 'get_figma_styles',
      description: 'Get all named styles (colours, text, effects) defined in a Figma file',
      inputSchema: {
        type: 'object',
        properties: {
          file_key: { type: 'string' },
        },
        required: ['file_key'],
      },
    },
    {
      name: 'get_figma_components',
      description: 'Get all published components and component sets in a Figma file',
      inputSchema: {
        type: 'object',
        properties: {
          file_key: { type: 'string' },
        },
        required: ['file_key'],
      },
    },
    {
      name: 'export_node_image',
      description: 'Export a Figma node as a PNG image URL for visual reference',
      inputSchema: {
        type: 'object',
        properties: {
          file_key: { type: 'string' },
          node_id: { type: 'string' },
          scale: {
            type: 'number',
            description: 'Image scale (1-4, default 2)',
          },
        },
        required: ['file_key', 'node_id'],
      },
    },
  ],
}));

// Handle tool calls
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  switch (name) {
    case 'get_figma_file': {
      const data = await figmaRequest(`/files/${args.file_key}?depth=1`);
      return {
        content: [{
          type: 'text',
          text: JSON.stringify({
            name: data.name,
            pages: data.document.children.map((page: any) => ({
              id: page.id,
              name: page.name,
              childCount: page.children?.length || 0,
            })),
          }, null, 2),
        }],
      };
    }

    case 'get_figma_node': {
      const depth = args.depth || 3;
      const data = await figmaRequest(
        `/files/${args.file_key}/nodes?ids=${args.node_id}&depth=${depth}`
      );
      const node = data.nodes[args.node_id]?.document;
      
      return {
        content: [{
          type: 'text',
          text: JSON.stringify(simplifyNode(node), null, 2),
        }],
      };
    }

    case 'get_figma_styles': {
      const data = await figmaRequest(`/files/${args.file_key}/styles`);
      return {
        content: [{
          type: 'text',
          text: JSON.stringify(data.meta.styles, null, 2),
        }],
      };
    }

    case 'get_figma_components': {
      const data = await figmaRequest(`/files/${args.file_key}/components`);
      return {
        content: [{
          type: 'text',
          text: JSON.stringify(data.meta.components, null, 2),
        }],
      };
    }

    case 'export_node_image': {
      const scale = args.scale || 2;
      const data = await figmaRequest(
        `/images/${args.file_key}?ids=${args.node_id}&format=png&scale=${scale}`
      );
      return {
        content: [{
          type: 'text',
          text: JSON.stringify({ imageUrl: data.images[args.node_id] }),
        }],
      };
    }

    default:
      throw new Error(`Unknown tool: ${name}`);
  }
});

async function figmaRequest(path: string) {
  const response = await fetch(`https://api.figma.com/v1${path}`, {
    headers: { 'X-Figma-Token': FIGMA_TOKEN },
  });
  if (!response.ok) throw new Error(`Figma API error: ${response.status}`);
  return response.json();
}

function simplifyNode(node: any): any {
  if (!node) return null;
  
  return {
    id: node.id,
    name: node.name,
    type: node.type,
    ...(node.absoluteBoundingBox && {
      dimensions: {
        width: Math.round(node.absoluteBoundingBox.width),
        height: Math.round(node.absoluteBoundingBox.height),
      },
    }),
    ...(node.fills?.length > 0 && { fills: node.fills }),
    ...(node.layoutMode && node.layoutMode !== 'NONE' && {
      layout: {
        mode: node.layoutMode,
        spacing: node.itemSpacing,
        padding: {
          top: node.paddingTop,
          right: node.paddingRight,
          bottom: node.paddingBottom,
          left: node.paddingLeft,
        },
      },
    }),
    ...(node.cornerRadius && { cornerRadius: node.cornerRadius }),
    ...(node.characters && { text: node.characters, textStyle: node.style }),
    ...(node.children && {
      children: node.children.map(simplifyNode),
    }),
  };
}

// Start the server
const transport = new StdioServerTransport();
await server.connect(transport);
```

---

## Configuring Claude Desktop to Use the MCP Server

Add your server to Claude Desktop's configuration (`~/Library/Application Support/Claude/claude_desktop_config.json` on Mac):

```json
{
  "mcpServers": {
    "figma": {
      "command": "node",
      "args": ["/path/to/your/figma-mcp-server.js"],
      "env": {
        "FIGMA_TOKEN": "your-figma-token-here"
      }
    }
  }
}
```

Restart Claude Desktop. You should see the Figma tools available in the tool indicator.

---

## Using the Agent Conversationally

With the MCP server running, you can have a natural conversation with Claude about your Figma designs:

**You:** "I have a Figma file at key `ABC123`. Can you look at the Button component and generate a Tailwind implementation?"

**Claude:** *(calls `get_figma_file` → finds the components page → calls `get_figma_components` → finds Button → calls `get_figma_node` for the Button component)*

"I can see the Button component has three variants: Primary, Secondary, and Ghost. The Primary variant uses a solid indigo background (#6366f1) with white text, rounded corners (8px), and 12px/24px vertical/horizontal padding. Let me generate Tailwind implementations for all three variants..."

This conversational flow — where Claude fetches exactly the data it needs to answer your question — is more flexible than a rigid pipeline.

---

## The Generation Prompt for Tailwind Output

When Claude has the design data it needs, guide it toward Tailwind output specifically:

> "Now generate the React/TypeScript component using Tailwind CSS. Map Figma's spacing values to the nearest Tailwind spacing class (4px = 1, 8px = 2, 12px = 3, 16px = 4, etc.). Use Tailwind colour names where possible; use arbitrary values `[#hex]` only for colours with no close Tailwind equivalent. Include all variants as TypeScript discriminated union props."

---

## Connecting to the Claude API Programmatically

For a fully automated pipeline (rather than the interactive Claude Desktop approach), call the Claude API with MCP tool definitions directly:

```typescript
import Anthropic from '@anthropic-ai/sdk';

const client = new Anthropic();

// Use a local MCP tool runner that calls your server
async function generateFromFigma(fileKey: string, nodeId: string): Promise<string> {
  // For API usage, you'd implement the MCP tool calls directly
  // and pass tool results back to Claude in a conversation loop
  
  const messages: Anthropic.MessageParam[] = [
    {
      role: 'user',
      content: `Generate a Tailwind React component for the Figma node ${nodeId} in file ${fileKey}. 
      The component data is: ${JSON.stringify(await getFigmaNodeData(fileKey, nodeId))}
      
      Requirements: TypeScript, Tailwind CSS, accessible HTML, default export.
      Output only the tsx code block.`,
    },
  ];
  
  const response = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 4096,
    messages,
  });
  
  return response.content[0].type === 'text' ? response.content[0].text : '';
}
```

---

## Conclusion

MCP represents a shift from pipeline-based AI integrations (prepare all context upfront) to tool-based integrations (let Claude fetch what it needs). For design-to-code work, this is more flexible — Claude can explore the design file, understand the design system, and generate more contextually accurate code.

The practical path: start with Claude Desktop + MCP server for interactive exploration, then build an API-based version for automated pipeline use once you've validated the prompts and outputs.

---

## TL;DR

- **MCP:** lets Claude call external tools (Figma API, etc.) on demand rather than needing all context upfront
- **MCP server:** a Node.js process using `@modelcontextprotocol/sdk` that exposes Figma API calls as tools
- **Tools to expose:** `get_figma_file`, `get_figma_node`, `get_figma_styles`, `get_figma_components`, `export_node_image`
- **Claude Desktop config:** add your server to `claude_desktop_config.json` for conversational use
- **Tailwind mapping:** guide Claude to map Figma spacing to Tailwind scale, use named colours where possible
- **Path to production:** Claude Desktop for interactive exploration → API with tool results for automated pipeline
