# Linsenkasten Web

React-based web interface for exploring 256+ FLUX analytical lenses. Provides interactive browsing, search, and visualization of the lens knowledge graph.

**Live Site**: https://linsenkasten.com

## Features

- **Lens Explorer**: Browse all 256+ lenses with grid/table/graph views
- **Semantic Search**: Find lenses by content using AI-powered search
- **Frame Organization**: Explore lenses grouped by thematic frames
- **Tag Navigation**: Filter lenses by related concepts
- **Graph Visualization**: See relationships between lenses
- **Deep Linking**: Direct URLs for lenses, frames, and tags
- **Keyboard Navigation**: Arrow keys, j/k, Escape for quick browsing
- **Responsive Design**: Works on desktop and mobile

## Tech Stack

- **React** 18 - UI framework
- **React Router** - Client-side routing
- **D3.js** - Graph visualization
- **CSS Modules** - Component styling

## API Backend

This frontend consumes the Linsenkasten API:
- **API**: https://lens-api.up.railway.app/api/v1
- **Repo**: https://github.com/mistakeknot/linsenkasten-api

## Development

```bash
# Install dependencies
npm install

# Run development server (port 3000)
npm start

# Build for production
npm run build

# Run tests
npm test
```

### Environment Variables

The app uses the production API by default. To use a different API:

Create `.env.local`:
```
REACT_APP_API_URL=http://localhost:5002/api/v1
```

## Project Structure

```
linsenkasten-web/
├── public/               # Static assets
├── src/
│   ├── components/       # React components
│   │   ├── LensExplorerLinear.jsx   # Main explorer component
│   │   ├── LensGraphView.jsx        # Graph visualization
│   │   └── useLenses.js             # Data fetching hooks
│   ├── hooks/           # Custom React hooks
│   ├── utils/           # Utility functions
│   └── App.js           # Root component with routing
├── package.json
└── vercel.json          # Vercel deployment config
```

## Deployment

### Vercel (Production)

This repo is deployed to Vercel and served at linsenkasten.com.

**Deploy from CLI**:
```bash
npm install -g vercel
vercel
```

**Auto-deploy**: Push to `main` branch triggers automatic deployment.

### Railway (Alternative)

The repo includes `railway.toml` for Railway deployment:
```bash
railway up
```

## Related Projects

- **linsenkasten** - MCP server + CLI ([GitHub](https://github.com/mistakeknot/Linsenkasten))
- **linsenkasten-api** - Backend API ([GitHub](https://github.com/mistakeknot/linsenkasten-api))

## Routes

- `/` - Home page with lens explorer
- `/lens/:id` - Individual lens detail view
- `/frame/:id` - Frame detail view with all lenses
- `/tag/:name` - Tag detail view with filtered lenses

## Features in Detail

### Graph View

The graph visualization shows:
- **Nodes**: Lenses (sized by centrality)
- **Edges**: Relationships (colored by type)
- **Interactions**: Click to select, drag to reposition, zoom/pan

### Search

Semantic search powered by OpenAI embeddings:
- Searches lens definitions and examples
- Returns relevance-ranked results
- Updates in real-time as you type

### Keyboard Shortcuts

- `j/→` - Next lens/frame/tag
- `k/←` - Previous lens/frame/tag
- `Esc` - Close modal/return to home
- `Tab` - Switch between tabs

## Error Handling

- **Invalid tags**: Redirects to home with console warning
- **404 lenses**: Shows "not found" message
- **API errors**: Displays error state with retry button

## License

MIT License - see [LICENSE](LICENSE)

## Credits

Lens content from [FLUX Collective](https://read.fluxcollective.org/)
