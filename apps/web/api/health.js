export default function handler(req, res) {
  res.status(200).json({
    status: 'healthy',
    service: 'interlens-mcp',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
    endpoint: 'https://mcp.interlens.com/api/mcp/v1/sse'
  });
}