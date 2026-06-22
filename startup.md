# Service Hub: AI Startup Guide

Welcome to the **Service Hub** project! If you are an AI coding assistant, follow these exact instructions to set up the development environment for the user.

## Prerequisites Verification
Before modifying any code, ensure the following are installed on the user's system:
1. **Node.js** (v18 or higher)
2. **Docker Desktop** (must be running to start the database)

If they are not installed or running, pause and kindly ask the user to install/start them before continuing.

## Step-by-Step Installation

### Step 1: Install Dependencies
This project uses an NPM Workspace Monorepo (powered by Turborepo).
Run the following in the project root:
```bash
npm install
```

### Step 2: Start the Database
The project uses PostgreSQL. Start the database container in the background using Docker Compose:
```bash
docker-compose up -d db
```
Wait a few seconds to ensure the database initializes properly.

### Step 3: Setup Environment Variables
If a `.env` file does not exist in the project root, create one by copying the example file:
```bash
cp .env.example .env
```
*(Ensure the `DATABASE_URL` matches the credentials defined in `docker-compose.yml`)*.

### Step 4: Initialize the Database Schema & Data
Push the Prisma schema to the database and seed the initial roles and admin user:
```bash
npx prisma db push
npx prisma db seed
```

### Step 5: Start the Development Server
Start the Turborepo development server, which will run both the Vite frontend (`localhost:3000`) and the Express backend (`localhost:4000`) concurrently:
```bash
npm run dev
```

## Success Check
Once the server is running without errors, inform the user they can access:
- **Public Website:** `http://localhost:3000/`
- **Admin Dashboard:** `http://localhost:3000/web` (Login using the admin credentials defined in `prisma/seed.js`)

**You are now ready to begin coding and expanding the Service Hub!** Please refer to `SKILL.md` for architectural guidelines.
