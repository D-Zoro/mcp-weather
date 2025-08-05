// Simple test client to verify your MCP server works
// Run this with: node test-client.js

const { spawn } = require('child_process');

async function testMCPServer() {
  console.log('Starting MCP server test...\n');
  
  // Start the MCP server
  const server = spawn('npm', ['run', 'dev'], {
    stdio: ['pipe', 'pipe', 'inherit'],
    shell: true
  });

  // Test: List available tools
  const listToolsRequest = {
    jsonrpc: '2.0',
    id: 1,
    method: 'tools/list',
    params: {}
  };

  server.stdin.write(JSON.stringify(listToolsRequest) + '\n');

  // Test: Get current weather
  const weatherRequest = {
    jsonrpc: '2.0',
    id: 2,
    method: 'tools/call',
    params: {
      name: 'get_current_weather',
      arguments: {
        location: 'London, UK'
      }
    }
  };

  setTimeout(() => {
    server.stdin.write(JSON.stringify(weatherRequest) + '\n');
  }, 1000);

  // Handle responses
  let responseBuffer = '';
  server.stdout.on('data', (data) => {
    responseBuffer += data.toString();
    
    // Try to parse complete JSON responses
    const lines = responseBuffer.split('\n');
    responseBuffer = lines.pop() || ''; // Keep incomplete line
    
    lines.forEach(line => {
      if (line.trim()) {
        try {
          const response = JSON.parse(line);
          console.log('Server response:', JSON.stringify(response, null, 2));
          console.log('---\n');
        } catch (e) {
          console.log('Raw output:', line);
        }
      }
    });
  });

  // Cleanup after 10 seconds
  setTimeout(() => {
    server.kill();
    console.log('Test completed!');
    process.exit(0);
  }, 10000);
}

testMCPServer().catch(console.error);
