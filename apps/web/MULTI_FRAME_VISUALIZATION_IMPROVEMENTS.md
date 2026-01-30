# Multi-Frame Visualization Improvements

## Overview
Improved the visualization of multi-frame associations in the Lens Graph View to better handle the fact that 92.6% of lenses have multiple frames (mostly 2 frames).

## Changes Made

### 1. **Simplified Node Visualization**
- Replaced pie chart segments with a cleaner approach
- Nodes now use the primary frame color (first frame) as their base color
- Visual indicators for frame count:
  - **Single frame**: Standard node with single border
  - **Two frames**: Double border (second border slightly larger)
  - **Three+ frames**: Dotted border with a numeric badge showing frame count

### 2. **Enhanced Frame Legend**
- Made frame legend interactive - click frames to filter nodes
- Shows lens count for each frame
- Added "Highlight shared frames" checkbox
- Selected frames are visually highlighted
- Clear selection button when frames are selected

### 3. **Frame-Based Filtering**
- Clicking frames in the legend filters nodes to show only those with selected frames
- Non-matching nodes and links are dimmed (20% opacity)
- When "Highlight shared frames" is enabled, links between nodes sharing selected frames are colored by the shared frame

### 4. **Improved Tooltips**
- Frame count displayed in tooltip header
- Primary frame has a special indicator (dot) and bolder text
- Added "Primary frame" label for multi-frame lenses
- Better visual hierarchy with improved spacing and colors

### 5. **Additional Statistics**
- Added frame distribution stats (number of lenses with 2 frames, 3+ frames)
- Node indicators legend explaining the visual encoding

## Data Insights
- **256 total lenses**
- **237 lenses (92.6%)** have multiple frames
- **Distribution**:
  - 210 lenses with 2 frames
  - 18 lenses with 3 frames
  - 7 lenses with 4 frames
  - 1 lens with 5 frames
  - 1 lens with 6 frames

## Benefits
1. **Cleaner visualization** - No more cluttered pie segments
2. **Better scalability** - Works well regardless of frame count
3. **Interactive exploration** - Users can filter by frames of interest
4. **Clear visual hierarchy** - Primary frame is emphasized
5. **Improved readability** - Frame information is more accessible

## Technical Details
- All changes made to `LensGraphViewOptimized.jsx`
- Added new control state: `selectedFrames` (Set) and `highlightSharedFrames` (boolean)
- Enhanced CSS classes in `LensGraphView.css` for interactive legend items
- Frame filtering applied to both nodes and links during rendering