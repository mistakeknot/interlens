# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with the Linsenkasten web frontend.

## Project Overview

Linsenkasten Web is a React-based single-page application for exploring 256+ FLUX analytical lenses. It provides interactive browsing, search, graph visualization, and deep linking.

**Live Site**: https://linsenkasten.com
**API Backend**: https://lens-api.up.railway.app/api/v1 (linsenkasten-api repo)

## Key Files

- **`src/components/LensExplorerLinear.jsx`** - Main component with all exploration features
- **`src/components/useLenses.js`** - Custom hooks for data fetching
- **`src/components/LensGraphView.jsx`** - D3-based graph visualization
- **`src/App.js`** - Root component with React Router setup
- **`vercel.json`** - Vercel deployment configuration

## Development

### Local Setup

```bash
# Install dependencies
npm install

# Run development server
npm start
# Opens http://localhost:3000

# Build for production
npm run build
```

### Environment Variables

The app uses production API by default. To override:

Create `.env.local`:
```
REACT_APP_API_URL=http://localhost:5002/api/v1
```

## Architecture

### Component Structure

```
App.js (Router)
  ├── LensExplorerLinear (Main UI)
  │   ├── useLenses() - Data fetching
  │   ├── useFrames() - Frame data
  │   ├── useBackgroundLoader() - Preloading
  │   ├── LensGraphView - D3 visualization
  │   └── Modal components (lens/frame/tag details)
```

### Data Flow

1. **API Calls**: `useLenses.js` fetches from lens-api.up.railway.app
2. **State Management**: React hooks (useState, useMemo, useEffect)
3. **Routing**: React Router with deep linking support
4. **Visualization**: D3.js for force-directed graph

### Routes

- `/` - Home with lens explorer
- `/lens/:id` - Lens detail modal
- `/frame/:id` - Frame detail modal
- `/tag/:name` - Tag detail modal (filters lenses by concept)

## Key Features

### 1. Search

Lines 119-145 in `LensExplorerLinear.jsx`:
- Debounced search (300ms)
- Calls `/api/v1/lenses/search` endpoint
- Updates filteredLenses state

### 2. Tag System

Lines 64-80:
- Computes unique tags from `lens.related_concepts`
- Generates tag counts and lens associations
- Supports multi-select filtering

### 3. Error Handling

Lines 232-243:
- **Invalid tags**: Redirects to home with console warning
- **API errors**: Displays error state in UI
- **Not found**: Shows appropriate messages

### 4. Keyboard Navigation

Lines 323-360:
- `j/→` - Next item
- `k/←` - Previous item
- `Esc` - Close modal
- Works for lenses, frames, and tags

### 5. Graph Visualization

`LensGraphView.jsx`:
- D3 force-directed layout
- Node sizes based on centrality
- Edge colors based on relationship types
- Interactive: drag, zoom, pan, click

## Common Development Tasks

### Adding a New View Mode

1. Add state: `const [viewType, setViewType] = useState('grid')`
2. Add toggle button in UI
3. Add conditional rendering based on `viewType`
4. Implement new view component

### Modifying API Calls

1. Edit `src/components/useLenses.js`
2. Add new function (e.g., `fetchNewData`)
3. Export and use in `LensExplorerLinear.jsx`

### Styling Changes

- Component styles: `LensExplorerLinear.css`
- Global styles: `src/index.css`
- Uses CSS custom properties (variables) for theming

### Adding Error Handling

Lines 238-243 show the pattern:
```javascript
if (condition) {
  // Success
} else {
  console.warn(`Error: ${details}`);
  navigate('/');
  // Optionally show toast
}
```

## Deployment

### Vercel (Production)

Connected to GitHub, auto-deploys on push to `main`:

1. Push to GitHub
2. Vercel builds and deploys
3. Live at https://linsenkasten.com

**Manual deploy**:
```bash
vercel --prod
```

### Railway (Alternative)

```bash
railway up
```

## Related Repositories

- **linsenkasten** (`~/linsenkasten`) - MCP server + CLI
  - GitHub: https://github.com/mistakeknot/Linsenkasten

- **linsenkasten-api** (`~/linsenkasten-api`) - Backend API
  - GitHub: https://github.com/mistakeknot/linsenkasten-api

- **xulfbot** (`~/xulfbot`) - Discord bot
  - GitHub: https://github.com/mistakeknot/XULFbot

## Common Issues

### Port Already in Use

```bash
# Kill process on port 3000
lsof -ti:3000 | xargs kill -9
```

### API Connection Errors

1. Check API is running: `curl https://lens-api.up.railway.app/api/v1/lenses/stats`
2. Check CORS settings in API
3. Verify `REACT_APP_API_URL` in `.env.local`

### Build Errors

1. Clear node_modules: `rm -rf node_modules && npm install`
2. Clear cache: `npm cache clean --force`
3. Check React version compatibility

### Graph Not Rendering

1. Check D3 dependency: `npm list d3`
2. Verify data structure matches expected format
3. Check browser console for errors

## Performance Notes

- **Initial load**: ~500ms (React bundle)
- **API requests**: ~200-500ms (depends on Railway latency)
- **Graph rendering**: ~1-3s for 256 nodes (D3 layout calculation)
- **Search**: Debounced 300ms, API response ~200-500ms

## Testing

```bash
# Run tests
npm test

# Run with coverage
npm test -- --coverage
```

## Future Considerations

- Add unit tests for components
- Implement React error boundaries
- Add loading skeletons for better UX
- Implement toast notifications for errors
- Add PWA support for offline use
- Optimize graph rendering for large datasets
