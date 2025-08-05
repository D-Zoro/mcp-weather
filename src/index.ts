#!/usr/bin/env node

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  Tool,
} from '@modelcontextprotocol/sdk/types.js';
import * as dotenv from 'dotenv';
import { WeatherService } from './weatherService.js';

// Load environment variables
dotenv.config();

// Validate required environment variables
const apiKey = process.env.OPENWEATHER_API_KEY;
if (!apiKey) {
  console.error('OPENWEATHER_API_KEY is required. Please set it in your .env file.');
  process.exit(1);
}

// Initialize weather service
const weatherService = new WeatherService(apiKey);

// Define available tools
const tools: Tool[] = [
  {
    name: 'get_current_weather',
    description: 'Get current weather conditions for a specific location',
    inputSchema: {
      type: 'object',
      properties: {
        location: {
          type: 'string',
          description: 'City name, state/country (e.g., "London, UK" or "New York, NY")',
        },
      },
      required: ['location'],
    },
  },
  {
    name: 'get_weather_forecast',
    description: 'Get weather forecast for a specific location',
    inputSchema: {
      type: 'object',
      properties: {
        location: {
          type: 'string',
          description: 'City name, state/country (e.g., "London, UK" or "New York, NY")',
        },
        days: {
          type: 'number',
          description: 'Number of days to forecast (1-5, default: 5)',
          minimum: 1,
          maximum: 5,
        },
      },
      required: ['location'],
    },
  },
  {
    name: 'get_weather_alerts',
    description: 'Get weather alerts for a specific location (requires premium API)',
    inputSchema: {
      type: 'object',
      properties: {
        location: {
          type: 'string',
          description: 'City name, state/country (e.g., "London, UK" or "New York, NY")',
        },
      },
      required: ['location'],
    },
  },
];

// Create and configure the server
const server = new Server(
  {
    name: 'weather-mcp-server',
    version: '1.0.0',
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

// Handle tool listing
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: tools,
  };
});

// Handle tool execution
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  try {
    switch (name) {
      case 'get_current_weather': {
        const { location } = args as { location: string };
        const weather = await weatherService.getCurrentWeather(location);
        
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(weather, null, 2),
            },
          ],
        };
      }

      case 'get_weather_forecast': {
        const { location, days = 5 } = args as { location: string; days?: number };
        const forecast = await weatherService.getForecast(location, days);
        
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(forecast, null, 2),
            },
          ],
        };
      }

      case 'get_weather_alerts': {
        const { location } = args as { location: string };
        const alerts = await weatherService.getWeatherAlerts(location);
        
        return {
          content: [
            {
              type: 'text',
              text: alerts,
            },
          ],
        };
      }

      default:
        throw new Error(`Unknown tool: ${name}`);
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    
    return {
      content: [
        {
          type: 'text',
          text: `Error: ${errorMessage}`,
        },
      ],
      isError: true,
    };
  }
});

// Start the server
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('Weather MCP Server running on stdio');
}

// Handle process termination gracefully
process.on('SIGINT', async () => {
  console.error('Shutting down Weather MCP Server...');
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.error('Shutting down Weather MCP Server...');
  process.exit(0);
});

main().catch((error) => {
  console.error('Server failed to start:', error);
  process.exit(1);
});
