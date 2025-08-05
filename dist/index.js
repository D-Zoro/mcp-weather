#!/usr/bin/env node
"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
const index_js_1 = require("@modelcontextprotocol/sdk/server/index.js");
const stdio_js_1 = require("@modelcontextprotocol/sdk/server/stdio.js");
const types_js_1 = require("@modelcontextprotocol/sdk/types.js");
const dotenv = __importStar(require("dotenv"));
const weatherService_js_1 = require("./weatherService.js");
// Load environment variables
dotenv.config();
// Validate required environment variables
const apiKey = process.env.OPENWEATHER_API_KEY;
if (!apiKey) {
    console.error('OPENWEATHER_API_KEY is required. Please set it in your .env file.');
    process.exit(1);
}
// Initialize weather service
const weatherService = new weatherService_js_1.WeatherService(apiKey);
// Define available tools
const tools = [
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
const server = new index_js_1.Server({
    name: 'weather-mcp-server',
    version: '1.0.0',
}, {
    capabilities: {
        tools: {},
    },
});
// Handle tool listing
server.setRequestHandler(types_js_1.ListToolsRequestSchema, async () => {
    return {
        tools: tools,
    };
});
// Handle tool execution
server.setRequestHandler(types_js_1.CallToolRequestSchema, async (request) => {
    const { name, arguments: args } = request.params;
    try {
        switch (name) {
            case 'get_current_weather': {
                const { location } = args;
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
                const { location, days = 5 } = args;
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
                const { location } = args;
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
    }
    catch (error) {
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
    const transport = new stdio_js_1.StdioServerTransport();
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
//# sourceMappingURL=index.js.map