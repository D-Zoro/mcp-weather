import axios from 'axios';
import { spawn, ChildProcess } from 'child_process';
import * as dotenv from 'dotenv';
 import readline from 'readline';


dotenv.config();

interface MCPResponse {
  jsonrpc: string;
  id: number;
  result?: any;
  error?: any;
}

interface NVIDIAMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

class NVIDIAMCPClient {
  private mcpServer: ChildProcess | null = null;
  private mcpRequestId = 1;
  private nvidiaApiKey: string;
  private nvidiaModel: string;

  constructor(nvidiaApiKey: string, model: string = 'meta/llama-3.1-405b-instruct') {
    this.nvidiaApiKey = nvidiaApiKey;
    this.nvidiaModel = model;
  }

  async startMCPServer(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.mcpServer = spawn('npm', ['run', 'dev'], {
        stdio: ['pipe', 'pipe', 'pipe'],
        shell: true,
        cwd: process.cwd()
      });

      this.mcpServer.stderr?.on('data', (data) => {
        const output = data.toString();
        if (output.includes('Weather MCP Server running')) {
          resolve();
        }
      });

      setTimeout(() => reject(new Error('MCP server failed to start')), 10000);
    });
  }

  async callMCPTool(toolName: string, args: any): Promise<any> {
    if (!this.mcpServer) {
      throw new Error('MCP server not started');
    }

    const request = {
      jsonrpc: '2.0',
      id: this.mcpRequestId++,
      method: 'tools/call',
      params: {
        name: toolName,
        arguments: args
      }
    };

    return new Promise((resolve, reject) => {
      let responseBuffer = '';
      
      const onData = (data: Buffer) => {
        responseBuffer += data.toString();
        
        const lines = responseBuffer.split('\n');
        responseBuffer = lines.pop() || '';
        
        for (const line of lines) {
          if (line.trim()) {
            try {
              const response: MCPResponse = JSON.parse(line);
              if (response.id === request.id) {
                this.mcpServer?.stdout?.off('data', onData);
                if (response.error) {
                  reject(new Error(response.error.message));
                } else {
                  resolve(response.result);
                }
                return;
              }
            } catch (e) {
              // Ignore parse errors for non-JSON lines
            }
          }
        }
      };

      this.mcpServer.stdout?.on('data', onData);
      this.mcpServer.stdin?.write(JSON.stringify(request) + '\n');
      
      // Timeout after 30 seconds
      setTimeout(() => {
        this.mcpServer?.stdout?.off('data', onData);
        reject(new Error('MCP tool call timeout'));
      }, 30000);
    });
  }

  async chatWithNVIDIA(messages: NVIDIAMessage[]): Promise<string> {
    try {
      const response = await axios.post(
        'https://integrate.api.nvidia.com/v1/chat/completions',
        {
          model: this.nvidiaModel,
          messages: messages,
          temperature: 0.7,
          max_tokens: 1024,
          stream: false
        },
        {
          headers: {
            'Authorization': `Bearer ${this.nvidiaApiKey}`,
            'Content-Type': 'application/json'
          }
        }
      );

      return response.data.choices[0].message.content;
    }catch (error: any) {
      if (error.response) {
        console.error('❌ NVIDIA API error:', error.response.status, error.response.data);
      } else {
      console.error('❌ Unexpected error:', error.message);
    }
    throw error;
    }
  }

  async enhancedChat(userMessage: string): Promise<string> {
    // Check if the user is asking about weather
    const weatherKeywords = ['weather', 'temperature', 'forecast', 'rain', 'sunny', 'cloudy', 'wind'];
    const isWeatherQuery = weatherKeywords.some(keyword => 
      userMessage.toLowerCase().includes(keyword)
    );

    let context = '';
    
    if (isWeatherQuery) {
      // Extract location from user message (simple approach)
      const locationMatch = userMessage.match(/in ([A-Za-z\s,]+)/);
      const location = locationMatch ? locationMatch[1].trim() : 'New York'; // Default location
      
      try {
        const weatherResult = await this.callMCPTool('get_current_weather', { location });
        const weatherData = JSON.parse(weatherResult.content[0].text);
        
        context = `\n\nCurrent weather context for ${location}:
Temperature: ${weatherData.temperature}°C (feels like ${weatherData.feels_like}°C)
Conditions: ${weatherData.description}
Humidity: ${weatherData.humidity}%
Wind: ${weatherData.wind_speed} m/s
Pressure: ${weatherData.pressure} hPa
Last updated: ${weatherData.timestamp}`;
      } catch (error) {
        context = `\n\nNote: Could not fetch weather data - ${error}`;
      }
    }

    const messages: NVIDIAMessage[] = [
      {
        role: 'system',
        content: `You are a helpful assistant with access to real-time weather data. 
When users ask about weather, use the provided weather context to give accurate, current information.
Be conversational and helpful.${context}`
      },
      {
        role: 'user',
        content: userMessage
      }
    ];

    return await this.chatWithNVIDIA(messages);
  }

  async shutdown(): Promise<void> {
    if (this.mcpServer) {
      this.mcpServer.kill();
      this.mcpServer = null;
    }
  }
}

// Example usage
async function main() {
  const nvidiaApiKey = process.env.NVIDIA_API_KEY;
  if (!nvidiaApiKey) {
    console.error('NVIDIA_API_KEY is required in your .env file');
    process.exit(1);
  }

  const client = new NVIDIAMCPClient(nvidiaApiKey);
  
  try {
    console.log('Starting MCP server...');
    await client.startMCPServer();
    console.log('MCP server started successfully!');

    // Interactive chat loop
       const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });

    console.log('\n🤖 NVIDIA AI + Weather MCP Server Ready!');
    console.log('Try asking: "What\'s the weather like in London?"');
    console.log('Type "quit" to exit\n');

    const askQuestion = () => {
      rl.question('You: ', async (input: string) => {
        if (input.toLowerCase() === 'quit') {
          await client.shutdown();
          rl.close();
          process.exit(0);
        }

        try {
          console.log('🤔 Thinking...');
          const response = await client.enhancedChat(input);
          console.log(`\n🤖 AI: ${response}\n`);
        } catch (error) {
          console.log(`❌ Error: ${error}\n`);
        }

        askQuestion();
      });
    };

    askQuestion();

  } catch (error) {
    console.error('Failed to start:', error);
    await client.shutdown();
    process.exit(1);
  }
}



if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(console.error);
}

export { NVIDIAMCPClient };
