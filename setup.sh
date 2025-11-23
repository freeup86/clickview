#!/bin/bash

# ClickView Local Setup Script
# This script automates the setup process for running ClickView locally

set -e  # Exit on error

echo "=================================="
echo "  ClickView Local Setup Script"
echo "=================================="
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to print colored output
print_success() {
    echo -e "${GREEN}✓ $1${NC}"
}

print_error() {
    echo -e "${RED}✗ $1${NC}"
}

print_info() {
    echo -e "${YELLOW}ℹ $1${NC}"
}

# Check if command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Step 1: Check prerequisites
echo "Step 1: Checking prerequisites..."
echo ""

if command_exists node; then
    NODE_VERSION=$(node --version)
    print_success "Node.js is installed: $NODE_VERSION"
else
    print_error "Node.js is not installed. Please install Node.js v18 or higher."
    exit 1
fi

if command_exists npm; then
    NPM_VERSION=$(npm --version)
    print_success "npm is installed: $NPM_VERSION"
else
    print_error "npm is not installed."
    exit 1
fi

if command_exists psql; then
    PSQL_VERSION=$(psql --version)
    print_success "PostgreSQL is installed: $PSQL_VERSION"
else
    print_error "PostgreSQL is not installed. Please install PostgreSQL v14 or higher."
    exit 1
fi

echo ""

# Step 2: Database setup
echo "Step 2: Setting up database..."
echo ""

DB_NAME=${DB_NAME:-clickview_dev}
DB_USER=${DB_USER:-clickview_user}
DB_PASS=${DB_PASS:-clickview123}

print_info "Database name: $DB_NAME"
print_info "Database user: $DB_USER"
echo ""

read -p "Do you want to create the database? (y/n) " -n 1 -r
echo ""
if [[ $REPLY =~ ^[Yy]$ ]]; then
    # Check if database exists
    if psql -lqt | cut -d \| -f 1 | grep -qw $DB_NAME; then
        print_info "Database $DB_NAME already exists"
    else
        createdb $DB_NAME && print_success "Database $DB_NAME created" || print_error "Failed to create database"
    fi

    # Create user if doesn't exist
    psql postgres -tAc "SELECT 1 FROM pg_roles WHERE rolname='$DB_USER'" | grep -q 1 || \
        psql postgres -c "CREATE USER $DB_USER WITH PASSWORD '$DB_PASS';" && \
        print_success "Database user created"

    # Grant privileges
    psql postgres -c "GRANT ALL PRIVILEGES ON DATABASE $DB_NAME TO $DB_USER;" && \
        print_success "Privileges granted"
fi

echo ""

# Step 3: Backend setup
echo "Step 3: Setting up backend..."
echo ""

cd backend

# Copy environment file if it doesn't exist
if [ ! -f .env ]; then
    cp .env.example .env
    print_success "Created backend/.env file"

    # Update database URL in .env
    if [[ "$OSTYPE" == "darwin"* ]]; then
        # macOS
        sed -i '' "s|DATABASE_URL=.*|DATABASE_URL=postgresql://$DB_USER:$DB_PASS@localhost:5432/$DB_NAME|" .env
    else
        # Linux
        sed -i "s|DATABASE_URL=.*|DATABASE_URL=postgresql://$DB_USER:$DB_PASS@localhost:5432/$DB_NAME|" .env
    fi

    print_info "Please review backend/.env and update if needed"
else
    print_info "backend/.env already exists, skipping..."
fi

# Install dependencies
if [ ! -d "node_modules" ]; then
    print_info "Installing backend dependencies..."
    npm install && print_success "Backend dependencies installed"
else
    print_info "Backend dependencies already installed"
fi

# Run migrations
read -p "Do you want to run database migrations? (y/n) " -n 1 -r
echo ""
if [[ $REPLY =~ ^[Yy]$ ]]; then
    if command_exists npm && npm run migrate >/dev/null 2>&1; then
        print_success "Database migrations completed"
    else
        print_info "Running migrations manually..."
        for migration in src/database/migrations/*.sql; do
            if [ -f "$migration" ]; then
                psql $DB_NAME < "$migration" && print_success "Applied $(basename $migration)"
            fi
        done
    fi
fi

cd ..
echo ""

# Step 4: Frontend setup
echo "Step 4: Setting up frontend..."
echo ""

cd frontend

# Copy environment file if it doesn't exist
if [ ! -f .env ]; then
    cp .env.example .env
    print_success "Created frontend/.env file"
    print_info "Please review frontend/.env and update if needed"
else
    print_info "frontend/.env already exists, skipping..."
fi

# Install dependencies
if [ ! -d "node_modules" ]; then
    print_info "Installing frontend dependencies..."
    npm install && print_success "Frontend dependencies installed"
else
    print_info "Frontend dependencies already installed"
fi

cd ..
echo ""

# Step 5: Create directories
echo "Step 5: Creating necessary directories..."
echo ""

mkdir -p /tmp/clickview/exports && print_success "Created export directory"
mkdir -p backend/logs && print_success "Created logs directory"

echo ""

# Final instructions
echo "=================================="
echo "  Setup Complete! 🎉"
echo "=================================="
echo ""
echo "Next steps:"
echo ""
echo "1. Start the backend (in one terminal):"
echo "   cd backend && npm run dev"
echo ""
echo "2. Start the frontend (in another terminal):"
echo "   cd frontend && npm run dev"
echo ""
echo "3. Open your browser:"
echo "   Frontend: http://localhost:3000"
echo "   Backend: http://localhost:5000"
echo "   API Docs: http://localhost:5000/api-docs"
echo ""
echo "For more details, see RUNNING_LOCALLY.md"
echo ""
print_success "Happy coding!"
