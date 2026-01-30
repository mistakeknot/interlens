export default function handler(req, res) {
  res.status(200).json({
    status: 'healthy',
    service: 'linsenkasten-mcp',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
    endpoint: 'https://mcp.linsenkasten.com/api/mcp/v1/sse'
  });
}