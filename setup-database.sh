#!/bin/bash

echo "🚀 ClickView Database Setup"
echo "=========================="
echo ""

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Check if .env file exists
if [ ! -f ".env" ]; then
    echo -e "${YELLOW}Creating .env file from .env.example...${NC}"
    cp .env.example .env
    echo -e "${GREEN}✓ .env file created${NC}"
    echo -e "${YELLOW}Please update the DATABASE_URL in .env file${NC}"
    exit 1
fi

echo "📦 Installing dependencies..."
echo ""

# Install root dependencies
echo "Installing root dependencies..."
npm install

# Install backend dependencies
echo "Installing backend dependencies..."
cd backend
npm install

# Run database migration
echo ""
echo -e "${YELLOW}🗄️  Running database migration...${NC}"
echo "Connecting to Aiven PostgreSQL..."
npm run db:migrate

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓ Database migration completed successfully!${NC}"
else
    echo -e "${RED}✗ Database migration failed${NC}"
    echo "Please check your database connection in .env file"
    exit 1
fi

# Install frontend dependencies
echo ""
echo "Installing frontend dependencies..."
cd ../frontend
npm install

echo ""
echo -e "${GREEN}✅ Setup completed successfully!${NC}"
echo ""
echo "To start the application:"
echo "  npm run dev"
echo ""
echo "The application will be available at:"
echo "  Frontend: http://localhost:3000"
echo "  Backend:  http://localhost:3001"
echo ""