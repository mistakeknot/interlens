#!/bin/bash

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${BLUE}🌀 Starting FLUX Lens Explorer...${NC}"

# Check if ports are in use
check_port() {
    if lsof -Pi :$1 -sTCP:LISTEN -t >/dev/null ; then
        echo -e "${RED}Port $1 is already in use${NC}"
        return 1
    else
        echo -e "${GREEN}Port $1 is available${NC}"
        return 0
    fi
}

# Kill process on port if needed
kill_port() {
    if lsof -Pi :$1 -sTCP:LISTEN -t >/dev/null ; then
        echo -e "${BLUE}Killing process on port $1...${NC}"
        kill -9 $(lsof -t -i:$1) 2>/dev/null || true
        sleep 1
    fi
}

# Check and handle ports
echo "Checking ports..."
if ! check_port 3001; then
    read -p "Kill process on port 3001? (y/n) " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        kill_port 3001
    else
        echo "Please free up port 3001 or modify .env to use a different port"
        exit 1
    fi
fi

if ! check_port 5003; then
    read -p "Kill process on port 5003? (y/n) " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        kill_port 5003
    else
        echo "Please free up port 5003 or modify .env.development to use a different port"
        exit 1
    fi
fi

echo -e "${GREEN}✨ Starting servers...${NC}"
echo "API will run on: http://localhost:5003"
echo "React app will run on: http://localhost:3001"
echo ""

npm run dev