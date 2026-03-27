#!/usr/bin/env node

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { ListToolsRequestSchema, CallToolRequestSchema } from '@modelcontextprotocol/sdk/types.js';

function parseArgs() {
  const args = process.argv.slice(2);
  const result = {
    manifest: null,
    token: null,
    name: null,
  };

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--manifest' && i + 1 < args.length) {
      result.manifest = args[++i];
    } else if (args[i] === '--token' && i + 1 < args.length) {
      result.token = args[++i];
    } else if (args[i] === '--name' && i + 1 < args.length) {
      result.name = args[++i];
    }
  }

  return result;
}

async function fetchManifest(url) {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to fetch manifest: ${response.status} ${response.statusText}`);
  }
  return response.json();
}

async function main() {
  const cliArgs = parseArgs();

  if (!cliArgs.manifest) {
    console.error('Usage: webmcp-bridge --manifest <url> --token <bearer_token> [--name <server_name>]');
    console.error('');
    console.error('Options:');
    console.error('  --manifest <url>        Full URL to WebMCP manifest (required)');
    console.error('  --token <bearer_token>  Bearer token for authenticated tool calls (optional)');
    console.error('  --name <server_name>    Override server name shown in Claude Desktop (optional)');
    process.exit(1);
  }

  let manifest;
  try {
    manifest = await fetchManifest(cliArgs.manifest);
  } catch (error) {
    console.error(`Error fetching manifest: ${error.message}`);
    process.exit(1);
  }

  const serverName = cliArgs.name || manifest.server?.name || 'WebMCP Server';
  const toolsEndpoint = manifest.usage?.tools_endpoint;
  const tools = manifest.usage?.tools || [];

  if (!toolsEndpoint) {
    console.error('Error: manifest.usage.tools_endpoint not found in manifest');
    process.exit(1);
  }

  const server = new Server({
    name: serverName,
    version: '1.0.0',
  }, {
    capabilities: {
      tools: {},
    },
  });

  server.setRequestHandler(ListToolsRequestSchema, async () => {
    return {
      tools: tools.map((tool) => ({
        name: tool.name,
        description: tool.description || '',
        inputSchema: tool.parameters || {
          type: 'object',
          properties: {},
        },
      })),
    };
  });

  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const toolName = request.params.name;
    const toolArgs = request.params.arguments || {};

    const toolDef = tools.find((t) => t.name === toolName);
    if (!toolDef) {
      return {
        content: [
          {
            type: 'text',
            text: `Error: Tool "${toolName}" not found`,
          },
        ],
        isError: true,
      };
    }

    try {
      const url = `${toolsEndpoint}/${toolName}`;

      const headers = {
        'Content-Type': 'application/json',
      };

      if (cliArgs.token) {
        headers['Authorization'] = cliArgs.token;
      }

      const response = await fetch(url, {
        method: 'POST',
        headers,
        body: JSON.stringify(toolArgs),
      });

      if (!response.ok) {
        const errorText = await response.text();
        return {
          content: [
            {
              type: 'text',
              text: `Error: HTTP ${response.status} - ${errorText}`,
            },
          ],
          isError: true,
        };
      }

      const result = await response.json();

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(result, null, 2),
          },
        ],
      };
    } catch (error) {
      return {
        content: [
          {
            type: 'text',
            text: `Error: ${error.message}`,
          },
        ],
        isError: true,
      };
    }
  });

  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
