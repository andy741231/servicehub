# Service Hub: AI Coding Tutorial for Beginners

## Tutorial Overview

This tutorial is designed for beginners who are new to AI coding and want to learn how to work with the "Service Hub" application. Service Hub is a comprehensive web application that helps manage various business services through multiple integrated sub-applications.

**Target Audience:** Non-coders who are starting to learn AI coding  
**Prerequisites:** Basic computer literacy, willingness to learn, and curiosity about how modern web applications work

---

## Table of Contents

1. [What is Service Hub?](#what-is-service-hub)
2. [Understanding the Architecture](#understanding-the-architecture)
3. [Getting Started with Setup](#getting-started-with-setup)
4. [The Development Workflow](#the-development-workflow)
5. [Working with AI Coding Tools](#working-with-ai-coding-tools)
6. [Git and Version Control](#git-and-version-control)
7. [Deployment Process](#deployment-process)
8. [Common Tasks and Workflows](#common-tasks-and-workflows)
9. [Troubleshooting and Getting Help](#troubleshooting-and-getting-help)
10. [Next Steps in Your AI Coding Journey](#next-steps-in-your-ai-coding-journey)

---

## What is Service Hub?

Service Hub is a modern web application that serves as a central platform for managing various business services. Think of it as a digital Swiss Army knife for business operations - it contains multiple tools and applications that work together seamlessly.

### Key Features

- **User Management**: Admin dashboard for managing users and permissions
- **Authentication**: Secure login and registration system
- **Directory**: Business directory and contact management
- **Email Campaigns**: Tools for creating and managing email campaigns
- **Form Builder**: Drag-and-drop form creation and submission management
- **Web Builder**: Visual page builder similar to Squarespace
- **Portal Management**: Custom portal creation and management

### The Business Problem It Solves

Service Hub eliminates the need for multiple separate applications by providing an integrated platform where businesses can manage:
- User access and security
- Customer information and directories
- Marketing campaigns
- Data collection through forms
- Web presence and content management
- Custom client portals

---

## Understanding the Architecture

### The Big Picture

Service Hub uses a modern architecture called a "monorepo" - this means all the different parts of the application live in one organized project rather than being scattered across multiple projects.

### Technical Components (Simplified)

| Component | What It Does | Non-Technical Analogy |
|-----------|--------------|----------------------|
| **Frontend** | The visual interface users see and interact with | The display screen and controls of a car |
| **Backend** | The logic that processes requests and manages data | The engine and transmission of a car |
| **Database** | Where all information is stored permanently | The filing cabinet where documents are kept |
| **API** | The communication system between frontend and backend | The telephone system connecting departments |

### The Technology Stack

**Frontend (What Users See):**
- **React**: A popular library for building user interfaces
- **Vite**: A fast tool for running and building the frontend
- **Tailwind CSS**: A styling system for making things look good

**Backend (The Brains):**
- **Node.js**: JavaScript runtime for server-side code
- **Express**: A framework for building web servers
- **Prisma**: A tool for working with databases easily

**Database (The Memory):**
- **Azure SQL**: Microsoft's cloud database service
- **No local database needed** - everything runs in the cloud

**Development Tools:**
- **npm Workspaces**: Manages multiple packages in one project
- **Turborepo**: Optimizes building and running multiple packages
- **Git**: Version control system for tracking changes

### Project Structure

```
servicehub/
├── client/          # Frontend React application
├── server/          # Backend Express application
├── shared/          # Code shared between client and server
├── prisma/          # Database schema and migrations
├── .devin/          # AI coding skills and configurations
├── .github/         # GitHub Actions for deployment
└── startup.md       # Detailed setup guide
```

---

## Getting Started with Setup

### Before You Begin

You'll need to install these tools on your computer:

1. **Node.js (v20 or higher)** - The JavaScript runtime
   - Download from: https://nodejs.org
   - This is like installing the foundation for JavaScript applications

2. **npm (comes with Node.js)** - The package manager
   - This is like an app store for JavaScript tools

3. **Git** - Version control system
   - Download from: https://git-scm.com
   - This is like a time machine for your code

4. **Azure CLI** (optional, for advanced tasks)
   - Only needed if you'll be managing Azure infrastructure

### Verification Step

Open your terminal (Command Prompt on Windows, Terminal on Mac/Linux) and run:

```bash
node -v    # Should show v20.x or higher
npm -v     # Should show 9.x or higher
git --version
```

### Step-by-Step Setup Process

#### Step 1: Get the Code

First, you need to download the Service Hub code from GitHub:

```bash
git clone https://github.com/andy741231/servicehub.git
cd servicehub
```

**What this does:** 
- `git clone` downloads a copy of the code to your computer
- `cd servicehub` moves you into the project directory

#### Step 2: Install Dependencies

This project uses many pre-built tools and libraries. Install them all at once:

```bash
npm install
```

**What this does:**
- Downloads all the tools and libraries needed for the project
- Sets up the development environment automatically
- Takes a few minutes on first run

#### Step 3: Configure Environment Variables

Environment variables are like configuration settings that tell the application how to connect to services.

```bash
# Copy the example environment file
cp .env.example .env
```

Then open the `.env` file in a text editor and fill in the required values:

**Required Variables:**
- `DATABASE_URL`: Connection to the Azure SQL database
- `JWT_SECRET`: Secret key for security
- `JWT_REFRESH_SECRET`: Another secret key for refreshing sessions
- `CLIENT_URL`: The frontend URL (http://localhost:3000 for local development)

**Important:** The `.env` file contains sensitive information and is never shared or committed to Git.

#### Step 4: Database Setup

The database already exists in Azure SQL, but you may need to apply updates:

```bash
# Apply any pending database updates
npx prisma migrate deploy

# Add initial data if needed
npx prisma db seed
```

**What this does:**
- `migrate deploy` updates the database structure to match the code
- `db seed` adds initial data like default users and roles

#### Step 5: Start the Development Server

Now you're ready to run the application:

```bash
npm run dev
```

**What happens:**
- Both frontend and backend start automatically
- Frontend runs at: http://localhost:3000
- Backend runs at: http://localhost:4000
- You'll see logs showing both servers starting

### Login Credentials

Default admin account:
- **Email:** admin@servicehub.com
- **Password:** Admin@2024!
- **Role:** admin (full access to all features)

---

## The Development Workflow

### Understanding the Cycle

Modern software development follows a continuous cycle:

1. **Plan** → Decide what to build or change
2. **Develop** → Write or modify code (often with AI assistance)
3. **Test** → Verify the changes work correctly
4. **Commit** → Save changes to version control
5. **Deploy** → Release changes to production

### Working with AI Coding Tools

AI coding tools like Devin, GitHub Copilot, or Cursor can dramatically accelerate your development. Here's how to use them effectively:

#### Using AI for Setup

When setting up the project, you can ask AI to:
- "Help me set up the Service Hub project following the instructions in startup.md"
- "Install dependencies and configure the environment"
- "Start the development server and verify it's working"

#### Using AI for Code Changes

When making changes, provide clear context:
- "Add a new field to the user registration form"
- "Fix the bug where the save button doesn't work"
- "Update the styling on the dashboard page"

#### Best Practices for AI Coding

1. **Be Specific**: Clearly describe what you want
2. **Provide Context**: Mention relevant files or features
3. **Review Changes**: Always review AI-generated code
4. **Test Thoroughly**: Verify changes work as expected
5. **Learn from AI**: Study the code AI generates to understand patterns

### Typical Development Session

1. **Start the servers**: `npm run dev`
2. **Make changes**: Use AI tools or edit code directly
3. **Test locally**: Check changes in your browser at localhost:3000
4. **Commit changes**: Use Git to save your work
5. **Push to GitHub**: Upload changes for deployment

---

## Git and Version Control

### What is Git?

Git is a version control system that tracks every change to your code. Think of it as a time machine that lets you:
- Save snapshots of your work
- Go back to previous versions if something breaks
- Collaborate with others without conflicts
- See who made what changes and when

### Basic Git Commands

#### Checking Status
```bash
git status
```
Shows which files have been changed.

#### Viewing Changes
```bash
git diff
```
Shows exactly what changed in each file.

#### Saving Changes (Commit)
```bash
git add .
git commit -m "Describe what you changed"
```
- `git add .` stages all changes for commit
- `git commit` saves the changes with a descriptive message

#### Uploading to GitHub
```bash
git push origin main
```
Uploads your commits to GitHub for deployment.

#### Getting Latest Changes
```bash
git pull origin main
```
Downloads the latest changes from GitHub.

### Commit Message Best Practices

Good commit messages describe **why** a change was made, not just **what** changed:

**Good examples:**
- "fix(forms): resolve schema corruption issue on form save"
- "feat(auth): add password reset functionality"
- "refactor(database): optimize query performance for user list"

**Bad examples:**
- "fixed stuff"
- "update"
- "changes"

### Git Workflow with AI

When working with AI tools, the typical workflow is:

1. **AI makes changes** → Files are modified
2. **Review changes** → You check what AI did
3. **Git status** → See what files changed
4. **Git commit** → Save the changes with a descriptive message
5. **Git push** → Upload for deployment

---

## Deployment Process

### Understanding Deployment

Deployment is the process of taking your code changes and making them live on the internet for users to access. Service Hub uses an automated deployment system.

### The Deployment Architecture

Service Hub uses **Azure App Service** with **deployment slots** for zero-downtime deployments:

- **Production Slot**: The live site users access (houstonservicehub.azurewebsites.net)
- **Staging Slot**: A testing environment (houstonservicehub-staging.azurewebsites.net)

### How Deployment Works

The deployment process is fully automated through GitHub Actions:

1. **Build Stage**
   - Compiles the React frontend
   - Generates the Prisma database client
   - Creates a deployment package

2. **Staging Deployment**
   - Deploys to the staging slot first
   - Applies database migrations to staging
   - Runs automated tests

3. **Smoke Tests**
   - Tests critical endpoints on staging
   - Verifies the site is working correctly
   - Deployment stops if tests fail

4. **Production Swap**
   - If tests pass, swaps staging with production
   - Applies database migrations to production
   - New version is now live

### Triggering Deployment

Deployment happens automatically when you push to the main branch:

```bash
git add .
git commit -m "Your descriptive message"
git push origin main
```

After pushing, you can watch the deployment at:
- GitHub → Actions → "Build and Deploy to Azure"

### Manual Deployment

If you need to deploy without code changes:

1. Go to GitHub
2. Navigate to Actions tab
3. Select "Build and Deploy to Azure"
4. Click "Run workflow"

### Zero-Downtime Explained

Zero-downtime means users never experience the site being down during updates:

1. New version deploys to staging (production unaffected)
2. Tests run on staging
3. If tests pass, instant swap with production
4. If issues arise, instant rollback by swapping back

### Emergency Rollback

If something goes wrong in production, you can immediately rollback:

```bash
az webapp deployment slot swap \
  --resource-group App-Services-And-Related \
  --name houstonservicehub \
  --slot staging \
  --target-slot production
```

This requires Azure CLI and appropriate permissions.

---

## Common Tasks and Workflows

### Creating a New Feature

1. **Plan the feature**: Understand what you're building
2. **Use AI to scaffold**: Ask AI to create the basic structure
3. **Implement the logic**: Fill in the details (with AI help)
4. **Test locally**: Verify it works in development
5. **Commit and push**: Deploy to staging for testing
6. **Test on staging**: Verify in the staging environment
7. **Merge to main**: Deploy to production

### Fixing a Bug

1. **Reproduce the bug**: Understand the issue
2. **Use AI to diagnose**: Ask AI to help identify the problem
3. **Implement the fix**: Make the necessary changes
4. **Test the fix**: Verify the bug is resolved
5. **Commit with clear message**: Describe the bug fix
6. **Push and deploy**: Release the fix

### Database Schema Changes

When you need to change the database structure:

1. **Edit the schema**: Modify `prisma/schema.prisma`
2. **Create migration**: The system auto-generates migration files
3. **Test locally**: Verify changes work in development
4. **Commit both files**: Include schema and migration files
5. **Push and deploy**: Migrations run automatically during deployment

### Working with Different Sub-Apps

Service Hub contains multiple sub-applications. Each has its own directory and specialized functionality:

**Admin Sub-App:**
- Location: `client/src/pages/admin/`
- Purpose: User management and permissions
- Skill guide: `.devin/skills/admin/SKILL.md`

**Auth Sub-App:**
- Location: `client/src/pages/auth/`
- Purpose: Login and registration
- Skill guide: `.devin/skills/auth/SKILL.md`

**Directory Sub-App:**
- Location: `client/src/pages/directory/`
- Purpose: Business directory management
- Skill guide: `.devin/skills/directory/SKILL.md`

**Email Sub-App:**
- Location: `client/src/pages/email/`
- Purpose: Email campaign management
- Skill guide: `.devin/skills/email/SKILL.md`

**Forms Sub-App:**
- Location: `client/src/pages/forms/`
- Purpose: Form builder and submissions
- Skill guide: `.devin/skills/forms/SKILL.md`

**Web Sub-App:**
- Location: `client/src/pages/web/`
- Purpose: Visual page builder
- Skill guide: `.devin/skills/web/SKILL.md`

### Using Skills for Guidance

The project includes "skills" - detailed guides for working with specific sub-apps. When working on a feature:

1. **Identify the relevant skill**: Find the skill for the sub-app you're working on
2. **Read the skill guide**: Understand the patterns and conventions
3. **Follow the guidelines**: Use the recommended approaches
4. **Ask AI to follow the skill**: "Follow the forms skill guide to implement this feature"

---

## Troubleshooting and Getting Help

### Common Issues and Solutions

#### Port Already in Use

**Problem:** `Error: Port 3000 is already in use`

**Solution:** 
- Another process is using the port
- Find and stop the other process, or change the port in configuration

#### Database Connection Issues

**Problem:** `Error: Can't reach database server`

**Solution:**
- Check your `.env` file has correct `DATABASE_URL`
- Verify you have internet connection
- Check Azure SQL service status

#### Installation Errors

**Problem:** `npm install` fails with errors

**Solution:**
- Delete `node_modules` folder and `package-lock.json`
- Run `npm install` again
- Ensure Node.js version is v20 or higher

#### Build Failures

**Problem:** `npm run build` fails

**Solution:**
- Check for syntax errors in code
- Ensure all dependencies are installed
- Clear cache: `rm -rf .turbo`

### Getting Help

**Internal Resources:**
- `startup.md` - Detailed setup and deployment guide
- `.devin/skills/` - Skill guides for each sub-app
- `SKILL.md` - Main project skill guide
- `THEME.md` - Theme and styling guidelines

**External Resources:**
- React Documentation: https://react.dev
- Prisma Documentation: https://www.prisma.io/docs
- Azure Documentation: https://docs.microsoft.com/azure

**Team Communication:**
- Ask team members for `DATABASE_URL` and other secrets
- Share issues in team communication channels
- Document solutions for future reference

### When to Ask for Help

Don't hesitate to ask for help when:
- You're stuck on a problem for more than 30 minutes
- You don't understand error messages
- You're unsure about making changes to critical systems
- You need access to credentials or configurations

---

## Next Steps in Your AI Coding Journey

### Learning Path

**Beginner (Current Stage):**
- Focus on understanding the architecture
- Practice basic Git operations
- Learn to read and understand code
- Use AI for simple tasks

**Intermediate:**
- Start making small code changes
- Understand database relationships
- Learn about API endpoints
- Practice debugging

**Advanced:**
- Implement new features independently
- Optimize performance
- Contribute to architecture decisions
- Help others learn

### Recommended Learning Resources

**General Programming:**
- FreeCodeCamp (https://freecodecamp.org)
- Codecademy (https://codecademy.com)
- MDN Web Docs (https://developer.mozilla.org)

**React and Frontend:**
- React Tutorial (https://react.dev/learn)
- Tailwind CSS Documentation (https://tailwindcss.com/docs)

**Backend and Databases:**
- Express.js Guide (https://expressjs.com)
- Prisma Tutorial (https://www.prisma.io/docs/getting-started)

**AI-Assisted Development:**
- GitHub Copilot Documentation
- Devin CLI Documentation
- Cursor AI Guide

### Practice Projects

Start with these practice exercises:

1. **Hello World**: Add a simple new page to the app
2. **Style Change**: Modify colors or layout of an existing page
3. **Form Field**: Add a new field to an existing form
4. **API Endpoint**: Create a simple new API endpoint
5. **Database Query**: Add a new database query

### Building Confidence

Remember:
- Everyone starts as a beginner
- Making mistakes is part of learning
- AI tools are here to help, not replace you
- The best way to learn is by doing

---

## Conclusion

Service Hub is a sophisticated application that demonstrates modern web development practices. By following this tutorial and using AI coding tools, you can:

- Understand how modern web applications are built
- Participate in the development process
- Make meaningful contributions to the project
- Build skills that apply to any web development project

The combination of human creativity and AI assistance creates a powerful development environment. As you grow more comfortable with the tools and concepts, you'll find yourself able to tackle increasingly complex challenges.

**Key Takeaways:**
- Start with the setup process and get comfortable running the app locally
- Use Git to track your changes and understand version control
- Leverage AI tools to accelerate your learning and development
- Follow the established patterns and skill guides for consistency
- Don't be afraid to ask questions and seek help when needed

Welcome to the world of AI-assisted coding! Your journey is just beginning.

---

## Appendix: Quick Reference

### Essential Commands

```bash
# Development
npm run dev              # Start development servers
npm run build           # Build for production
npm run lint            # Check code quality

# Database
npx prisma migrate deploy    # Apply database migrations
npx prisma db seed          # Seed database with initial data
npx prisma studio           # Visual database browser

# Git
git status              # Check what changed
git add .               # Stage all changes
git commit -m "msg"     # Commit changes
git push origin main    # Push to GitHub
git pull origin main    # Pull latest changes
```

### Important Files

- `startup.md` - Complete setup and deployment guide
- `package.json` - Project dependencies and scripts
- `.env` - Environment configuration (never commit this)
- `prisma/schema.prisma` - Database schema definition
- `.github/workflows/azure-deploy.yml` - Deployment automation

### URLs

- **Local Development**: http://localhost:3000
- **Local API**: http://localhost:4000
- **Production**: https://houstonservicehub.azurewebsites.net
- **Staging**: https://houstonservicehub-staging.azurewebsites.net

### Default Credentials

- **Admin Email**: admin@servicehub.com
- **Admin Password**: Admin@2024!

---

*This tutorial is designed to evolve as you learn. Feel free to suggest additions or improvements based on your experience.*