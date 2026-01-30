export default function handler(req, res) {
  res.status(200).send(`
<!DOCTYPE html>
<html>
<head>
  <title>Linsenkasten MCP Server</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      max-width: 800px;
      margin: 50px auto;
      padding: 20px;
      line-height: 1.6;
    }
    .status { 
      background: #10b981; 
      color: white; 
      padding: 10px 20px; 
      border-radius: 5px; 
      display: inline-block;
      margin-bottom: 20px;
    }
    pre {
      background: #f3f4f6;
      padding: 15px;
      border-radius: 5px;
      overflow-x: auto;
    }
    code {
      background: #f3f4f6;
      padding: 2px 4px;
      border-radius: 3px;
    }
    .section {
      margin: 30px 0;
    }
    h2 {
      color: #1f2937;
      border-bottom: 2px solid #e5e7eb;
      padding-bottom: 10px;
    }
    .endpoint {
      background: #eff6ff;
      border-left: 4px solid #3b82f6;
      padding: 10px 15px;
      margin: 10px 0;
    }
  </style>
</head>
<body>
  <h1>🎯 Linsenkasten MCP Server</h1>
  
  <div class="status">✅ Server is running</div>
  
  <div class="section">
    <h2>Quick Start</h2>
    <p>Add this configuration to your Claude Desktop config file:</p>
    <pre>{
  "mcpServers": {
    "linsenkasten": {
      "url": "https://mcp.linsenkasten.com/api/mcp/v1/sse"
    }
  }
}</pre>
  </div>

  <div class="section">
    <h2>Configuration Location</h2>
    <ul>
      <li><strong>macOS:</strong> <code>~/Library/Application Support/Claude/claude_desktop_config.json</code></li>
      <li><strong>Windows:</strong> <code>%APPDATA%\\Claude\\claude_desktop_config.json</code></li>
    </ul>
  </div>

  <div class="section">
    <h2>Available Endpoints</h2>
    <div class="endpoint">
      <strong>MCP SSE Endpoint:</strong> <code>/api/mcp/v1/sse</code>
    </div>
    <div class="endpoint">
      <strong>Health Check:</strong> <code>/health</code>
    </div>
  </div>

  <div class="section">
    <h2>Available Tools</h2>
    <ul>
      <li><code>search_lenses</code> - Search for FLUX lenses by query</li>
      <li><code>get_lens</code> - Get detailed information about a specific lens</li>
      <li><code>get_lenses_by_episode</code> - Get all lenses from a specific FLUX episode</li>
      <li><code>get_related_lenses</code> - Find lenses related to a given lens</li>
      <li><code>analyze_with_lens</code> - Analyze text or situation through a specific lens</li>
      <li><code>combine_lenses</code> - Combine multiple lenses for novel insights</li>
      <li><code>get_lens_frames</code> - Get thematic frames that group related lenses</li>
    </ul>
  </div>

  <div class="section">
    <h2>Available Resources</h2>
    <ul>
      <li><code>lens://all</code> - Complete list of all FLUX lenses with definitions</li>
      <li><code>lens://frames</code> - Thematic frames that group related lenses</li>
      <li><code>lens://episodes</code> - FLUX lenses organized by episode</li>
      <li><code>lens://graph</code> - Network of relationships between lenses</li>
    </ul>
  </div>

  <div class="section">
    <h2>Links</h2>
    <ul>
      <li><a href="https://github.com/mistakeknot/XULFbot">GitHub Repository</a></li>
      <li><a href="https://linsenkasten.com">Linsenkasten Web App</a></li>
      <li><a href="https://read.fluxcollective.org">FLUX Collective</a></li>
    </ul>
  </div>
</body>
</html>
  `);
}