#!/bin/bash

# Check if virtual environment exists
if [ ! -d "../venv" ]; then
    echo "Creating Python virtual environment..."
    cd ..
    python3 -m venv venv
    source venv/bin/activate
    pip install -r requirements.txt
    cd lens-react-app
else
    echo "Virtual environment already exists"
fi

# Install Node dependencies
echo "Installing Node dependencies..."
npm install

echo "Setup complete! Run 'npm run dev' to start the application."