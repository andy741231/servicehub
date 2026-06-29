# Service Hub: AI Coding Tutorial for Beginners

## Tutorial Overview

This tutorial is designed for beginners who are new to AI coding and want to learn how to work with the "Service Hub" application. Service Hub is a comprehensive web application that helps manage various business services through multiple integrated sub-applications.

**Target Audience:** Non-coders who are starting to learn AI coding  
**Prerequisites:** Basic computer literacy, willingness to learn, and curiosity about how modern web applications work

---

## Table of Contents

1. [What is Service Hub?](#what-is-service-hub)
2. [Understanding the Architecture](#understanding-the-architecture)
3. [AI Tools, Sub-Agents, and Markdown Guides](#ai-tools-sub-agents-and-markdown-guides)
4. [Three Methods of Working: A Practical Comparison](#three-methods-of-working-a-practical-comparison)
5. [Getting Started with Setup](#getting-started-with-setup)
6. [The Development Workflow](#the-development-workflow)
7. [Working with AI Coding Tools](#working-with-ai-coding-tools)
8. [Git and Version Control](#git-and-version-control)
9. [Deployment Process](#deployment-process)
10. [Common Tasks and Workflows](#common-tasks-and-workflows)
11. [Troubleshooting and Getting Help](#troubleshooting-and-getting-help)
12. [Next Steps in Your AI Coding Journey](#next-steps-in-your-ai-coding-journey)

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

## AI Tools, Sub-Agents, and Markdown Guides

When working with Service Hub, you will use three key types of resources that help AI understand the project:

### 1. Markdown (MD) Files

Markdown files in this project are instruction manuals written primarily for AI to read and execute. They contain project-specific guidance, conventions, and step-by-step procedures that help AI work accurately on this codebase. You can read them too, but their main purpose is to give AI the project context it needs.

**Key MD files you should know about:**
- **startup.md**: The main setup guide for installing, configuring, and running the project locally
- **SKILL.md**: The master project skill guide for overall conventions and patterns
- **THEME.md**: Visual design and styling guidelines
- **.devin/skills/*/*.md**: Skill-specific guides for each sub-app (admin, auth, forms, email, web, etc.)
- **.devin/workflows/*.md**: Reusable workflow guides for common tasks

**How to use them with AI:**
Whenever you ask AI to perform a task, you can tell it to read or "invoke" the relevant MD file. For example:
- "Read startup.md and help me set up the project"
- "Invoke the forms skill guide before building the new form feature"
- "Follow the instructions in THEME.md to style this component"

This ensures the AI follows the project's established patterns instead of inventing its own.

### 2. Sub-Agents

A sub-agent is a smaller AI assistant that can be given a focused task to work on independently, such as exploring a codebase, reading documentation, or implementing a specific feature while you focus on other things.

**Why sub-agents are useful:**
- They can research or explore parts of the project without taking over your main AI session
- They can handle tasks that would take several steps or require reading many files
- They can work on parallel tasks, such as investigating one issue while you implement another

**Common use cases for sub-agents:**
- Explore the codebase and report back on the structure of a sub-app
- Read and summarize a long skill guide or specification
- Investigate a bug across multiple files
- Verify that a feature follows the patterns in a skill guide

**How to invoke a sub-agent with AI:**
When using an AI tool that supports sub-agents (such as Devin), you can say:
- "Launch a sub-agent to explore the forms sub-app and report the key files and patterns"
- "Use a sub-agent to read the web skill guide and summarize how to add a new block"
- "Send a sub-agent to investigate why the login page is returning an error"

### 3. AI Coding Assistants

Your main AI assistant is the tool you talk to directly. It can read files, run commands, write code, and communicate with you in real time.

**How to work with it:**
- Be clear and specific about what you want
- Reference MD files and sub-apps when relevant
- Review the changes it makes
- Ask it to explain things you don't understand

**Example workflow:**
```
User: "Read startup.md and set up the Service Hub project on my local machine."
AI: (reads startup.md, runs commands, reports progress)

User: "Now use the forms skill guide to add a new export-to-CSV feature."
AI: (reads skill guide, explores code, implements feature)

User: "Launch a sub-agent to verify the feature follows the skill guide patterns."
AI: (sub-agent checks implementation and reports back)
```

By combining MD files, sub-agents, and your main AI assistant, you can work on the project without memorizing every command or reading every file yourself.

---

## Three Methods of Working: A Practical Comparison

There are three main ways to interact with the Service Hub codebase. Each has its own strengths and is best suited for different situations. Understanding when to use each will make you more efficient.

### The Three Methods

| Method | What You Do | Best For | When It's Faster |
|--------|-------------|----------|------------------|
| **Traditional (Command Line)** | Type commands directly in the terminal | Simple, repetitive tasks you already know | Running `npm run dev`, checking `git status`, making a quick commit |
| **AI Prompt** | Describe a task in natural language and let AI act | Quick, isolated tasks, unfamiliar territory, learning while doing | "Install all dependencies", "find the login component", "explain this error" |
| **Read MD** | Ask AI to read and execute the markdown guides | Project-specific procedures, setup, deployment, database changes, sub-app features | When you want AI to follow the project's documented procedure accurately |

### Two Ways to Use Read MD

The markdown files in this project are primarily written as **instructions for AI**. They tell AI how to follow the project's conventions, setup procedures, and patterns. You can read them too if you want to understand the details, but their main purpose is to give AI the project context it needs.

**Read MD with AI (Execute)**
- You ask AI to read the MD file and execute the documented procedure
- Example: "Read startup.md and set up the Service Hub project on localhost"
- Best for: Getting the consistency of the documented guide plus the convenience of AI execution

**Read MD (Self, Understand)**
- You read the MD file yourself to understand the context
- Example: You read the deployment section of startup.md to understand the Azure pipeline
- Best for: Building deep understanding, verifying AI work, or making architectural decisions

Both are Read MD methods. The difference is whether you execute manually or ask AI to execute after reading.

### The Philosophy: Use the Right Tool for the Task

**Simple commands are often faster than AI prompts.**

For example, starting the development server:
- **Traditional**: `npm run dev` in terminal (1 second to type)
- **AI Prompt**: "start app server in localhost" (AI has to process the request, then run the command)

If you already know the command, just type it. But if you're learning, it's perfectly fine to use AI to show you the command and explain what it does.

**Complex tasks are often faster with AI prompts, but Read MD files give consistency, control, and accuracy.**

For example, when setting up the app:
- **AI Prompt (Execute)**: "install all dependencies" — AI runs `npm install`, but you still need follow-up prompts for environment setup, database setup, and starting the server
- **Use MD with AI (Understand + Execute)**: "Read startup.md and execute" — AI reads the full guide, understands the complete sequence, and runs all the steps in the right order

**The difference:**
- **AI Prompt alone** is good for quick, isolated actions but may miss context or require multiple follow-up prompts
- **Read MD with AI** combines the accuracy of the documented procedure with the convenience of AI execution. You get the consistency of the written guide, the control of knowing what will happen, and the accuracy of following the project's official setup process

Use AI Prompt for simple, well-defined tasks. Use **Read MD with AI** when you need to follow a documented procedure, especially for setup, deployment, database changes, or working with a specific sub-app.

**MD files are the source of truth for this project.**

The markdown files in this project are written as instructions that AI can read and follow. They contain the project-specific procedures, conventions, and patterns that AI needs to work accurately.

You should invoke MD files when you want AI to:
- Follow the documented setup process (startup.md)
- Implement features using the right patterns (skill guides)
- Style components consistently (THEME.md)
- Understand the database structure (prisma/schema.prisma)

Think of MD files as the instruction manual, AI as the worker reading the manual, and traditional commands as your hands-on practice.

### Decision Framework: Which Method Should I Use?

Ask yourself these questions:

1. **Do I already know the exact command?**
   - Yes → Use **Traditional**
   - No → Go to question 2

2. **Is this a project-specific procedure or pattern?**
   - Yes → Use **Read MD with AI** (e.g., "Read startup.md and execute")
   - No → Go to question 3

3. **Is this a multi-step or complex task?**
   - Yes → Use **Read MD with AI** for documented procedures, or **AI Prompt** for exploratory work
   - No → Use **AI Prompt** for quick delegation, or **Traditional** after asking AI once

4. **Do I want to understand the context before acting?**
   - Yes → Use **Read MD (Self)** or ask AI to summarize the MD file for you
   - No → Use **AI Prompt** or **Traditional** depending on complexity

### Examples by Stage of the Development Cycle

| Stage | Task | Best Method | Why |
|-------|------|-------------|-----|
| **Setup** | First-time setup | **Read MD with AI** | "Read startup.md and execute" gives the complete, documented sequence |
| **Setup** | Run dev server after 10th time | **Traditional** | `npm run dev` is faster than describing it |
| **Database** | Understand migration concept | **Read MD (Self)** | startup.md and Prisma docs explain the philosophy |
| **Database** | Apply a new migration | **Read MD with AI** | Follow the documented migration process and let AI execute it |
| **Database** | Run the same migration again | **Traditional** | `npx prisma migrate deploy` is quick |
| **Develop** | Build a new feature | **Read MD with AI** | "Read the forms skill guide and add this feature" follows project patterns |
| **Develop** | Change a single line of CSS | **Traditional** | Direct edit is faster |
| **Test** | Run basic smoke tests | **Traditional** | Open the browser and check URLs |
| **Test** | Debug a complex failure | **AI Prompt** or **Read MD with AI** | AI analyzes logs; MD guides guide the debugging process |
| **Git** | Check status | **Traditional** | `git status` is instantaneous |
| **Git** | Write a good commit message | **AI Prompt** | AI can analyze changes and compose a clear message |
| **Deploy** | Push to trigger deployment | **Traditional** | `git push origin main` is straightforward |
| **Deploy** | Investigate a failed pipeline | **Read MD with AI** | AI reads startup.md deployment section and analyzes logs |

### The Recommended Learning Journey

As a beginner, you should start with AI and MD file support, then gradually shift to traditional commands as you learn:

1. **Week 1-2**: Use AI prompts for everything, referencing startup.md and skill guides
2. **Week 3-4**: Start using traditional commands for simple tasks you now know
3. **Month 2+**: Use a hybrid approach - AI for complex tasks, traditional for routine tasks, MD files for new areas

### A Note on Efficiency

A common mistake is to ask AI to do everything, even simple tasks like `npm run dev`. This is fine when learning, but it becomes inefficient once you know the command. At the same time, don't feel pressured to use traditional commands before you're ready. The goal is to be productive, not to prove you can type commands.

**Rule of thumb:**
- If you can type the command in under 5 seconds and you're confident it will work, use **Traditional**
- If you need to think about which command to use or what flags to pass, use **AI Prompt** or **Read MD**
- If you need to follow project-specific conventions, use **Read MD** (or ask AI to read it for you)

---

## Getting Started with Setup

### Before You Begin

These prerequisites are covered in the **Prerequisites** section of `startup.md`. For the full details, ask AI to read that section, or open `startup.md` directly.

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

The verification commands below are described in the **Prerequisites** section of `startup.md`. You can also ask AI to run them for you.

**Traditional Method:**
Open your terminal (Command Prompt on Windows, Terminal on Mac/Linux) and run:

```bash
node -v    # Should show v20.x or higher
npm -v     # Should show 9.x or higher
git --version
```

**AI Prompt (Simple Task):**
Ask your AI coding tool:
- "Check if Node.js, npm, and Git are installed on my system and verify their versions"
- "Verify my development environment is ready for the Service Hub project"

The AI will run these commands for you and report the results.

### Step-by-Step Setup Process

> **Note:** Each step below shows three ways to work: **Traditional** (command line), **AI Prompt** (simple task delegation), and **Read MD with AI** (AI reads and executes the documented procedure). The MD files are primarily written for AI; **Read MD with AI** is the most reliable method for first-time setup. For routine tasks later, **Traditional** is often faster. You can read the MD files yourself if you want to understand the context, but you don't need to.
>
> Every step below is covered in `startup.md`. The fastest way to follow them is to ask AI: **"Read startup.md and set up the Service Hub project on localhost."**

#### Step 1: Get the Code

This step is covered in **Step 1: Clone the repository** in `startup.md`.

**Traditional Method:**
First, you need to download the Service Hub code from GitHub:

```bash
git clone https://github.com/andy741231/servicehub.git
cd servicehub
```

**What this does:**
- `git clone` downloads a copy of the code to your computer
- `cd servicehub` moves you into the project directory

**Read MD with AI (Project Procedure):**
Ask your AI coding tool:
- "Read startup.md and clone the Service Hub repository from https://github.com/andy741231/servicehub.git, then navigate to the project directory"
- "Invoke startup.md and set up the servicehub project in my current directory"
- "Follow the startup.md guide to download the project code and prepare it for setup"

The AI reads startup.md for the correct setup context, then executes the step. This is more accurate than a bare AI prompt because it follows the project's documented procedure.

**AI Prompt (Simple Task):**
- "Clone the repository https://github.com/andy741231/servicehub.git"

This works for a simple, isolated task but does not pull in the project context from startup.md.

#### Step 2: Install Dependencies

This step is covered in **Step 2: Install dependencies** in `startup.md`.

**Traditional Method:**
This project uses many pre-built tools and libraries. Install them all at once:

```bash
npm install
```

**What this does:**
- Downloads all the tools and libraries needed for the project
- Sets up the development environment automatically
- Takes a few minutes on first run

**Read MD with AI (Project Procedure):**
Ask your AI coding tool:
- "Read startup.md and install all dependencies for the Service Hub project using npm install"
- "Invoke startup.md to set up the development environment by installing all npm packages"
- "Follow the startup.md guide to install project dependencies for this monorepo"

This is the most reliable approach for setup because the AI follows the documented dependency installation process.

**AI Prompt (Simple Task):**
- "Install all dependencies for this project"

This works, but the AI might not know it's a monorepo with workspaces unless you provide context. You may need follow-up prompts for related setup steps.

#### Step 3: Configure Environment Variables

This step is covered in **Step 3: Configure environment variables** in `startup.md`.

Environment variables are like configuration settings that tell the application how to connect to services.

**Traditional Method:**

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

**Read MD with AI (Project Procedure):**
Ask your AI coding tool:
- "Read startup.md and copy the .env.example file to .env, then help me configure the environment variables"
- "Invoke startup.md to set up the environment configuration for local development"
- "Follow the startup.md guide for environment variables and create a .env file from .env.example"

The AI reads startup.md for the correct environment variables, copies the file, and helps you understand what each variable does. You'll need to provide the actual secret values from your team.

**AI Prompt (Simple Task):**
- "Copy .env.example to .env and help me fill it in"

This works, but it may not know the exact variable names and formats required for this project unless you provide them.

#### Step 4: Database Setup

This step is covered in **Step 4: Apply migrations & seed the database** in `startup.md`.

The database already exists in Azure SQL, but you may need to apply updates:

**Traditional Method:**

```bash
# Apply any pending database updates
npx prisma migrate deploy

# Add initial data if needed
npx prisma db seed
```

**What this does:**
- `migrate deploy` updates the database structure to match the code
- `db seed` adds initial data like default users and roles

**Read MD with AI (Project Procedure):**
Ask your AI coding tool:
- "Read startup.md and apply any pending database migrations using Prisma migrate deploy"
- "Invoke startup.md to run the database seed command and add initial data"
- "Follow the startup.md guide for database setup and apply any pending migrations"

The AI reads startup.md for the correct database commands, runs them, and explains what changes are being applied to your database structure.

**AI Prompt (Simple Task):**
- "Apply pending database migrations"
- "Seed the database"

These work for isolated commands, but the AI may not know the specific Prisma setup or when to run each command for this project.

#### Step 5: Start the Development Server

This step is covered in **Step 5: Start the development server** in `startup.md`.

Now you're ready to run the application:

**Traditional Method:**

```bash
npm run dev
```

**What happens:**
- Both frontend and backend start automatically
- Frontend runs at: http://localhost:3000
- Backend runs at: http://localhost:4000
- You'll see logs showing both servers starting

**Read MD with AI (Project Procedure):**
Ask your AI coding tool:
- "Read startup.md and start the development server using npm run dev"
- "Invoke startup.md to run the development servers for both frontend and backend"
- "Follow the startup.md guide to start the application in development mode and monitor the startup logs"

The AI reads startup.md for the correct startup procedure, starts the servers, and watches the logs. Useful the first time you start the project to ensure everything is configured correctly.

**AI Prompt (Simple Task):**
- "start app server in localhost"
- "Run the dev server"

For a simple, isolated command, this is fine. But it's usually faster to type `npm run dev` directly.

### Login Credentials

These login credentials are listed in the **Login Credentials** section of `startup.md`.

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

### Three Methods Through the Development Cycle

The full development cycle from startup to deployment involves many stages. Here is how you might choose the right method at each stage.

| Stage | Traditional | AI Prompt | Read MD |
|-------|-------------|-----------|---------|
| **Setup (startup.md)** | Type the commands from startup.md once you know them | "Invoke startup.md and set up the project on localhost" | Read startup.md to learn the setup flow |
| **Database** | `npx prisma migrate deploy` after you know it | "Read startup.md and apply any pending database migrations" | Read startup.md database section for concepts |
| **Develop** | Edit code directly when you know the patterns | "Follow the forms skill guide and add a new export feature" | Read the relevant skill guide before coding |
| **Test** | Open browser and run smoke tests manually | "Start the dev server and help me test this feature" | Read testing notes in the project MD files |
| **Git** | `git status`, `git add .`, `git commit -m "msg"` | "Analyze my changes and commit with a clear message" | Read project commit conventions if any |
| **Deploy** | `git push origin main` | "Check for pending migrations and deploy to production" | Read startup.md deployment section for the full pipeline |

### When to Use Each Method

**Use Traditional (Command Line) When:**
- You know the exact command and it's faster than describing it to AI
- The task is simple and repetitive (e.g., `npm run dev`, `git status`)
- You want immediate, precise control over the output
- You need to see exact error messages in the terminal
- AI tools are unavailable or inconvenient

**Use AI Prompt When:**
- You want to execute a quick, isolated task without reading documentation
- The task is straightforward and doesn't require project-specific context
- You want AI to generate, refactor, or review code
- You want to automate tasks like writing commit messages or checking deployment status
- You need a fast answer to a specific question

**Use Read MD with AI When:**
- You need to follow a project-specific procedure (setup, deployment, database changes, sub-app features)
- You want the consistency and accuracy of the documented guide, but with AI execution
- You want to avoid multiple follow-up prompts because the MD file already contains the full sequence
- The task is complex enough that you want AI to follow the project's official guide

**Use Read MD (Self) When:**
- You want to understand what AI is doing before or after it acts
- You're learning a new sub-app or feature area for the first time
- You want to know the "why" behind the setup, database, or deployment process
- You want to verify that AI is following the correct project patterns
- You need to make architectural decisions or understand trade-offs

Remember: MD files are written primarily for AI. You can read them to understand the context, but you don't have to memorize them.

**Best Practice: Combine All Three**

The most efficient developers combine all three methods:
1. **Read MD with AI** for project-specific procedures (e.g., "Read startup.md and set up the project")
2. **AI Prompt** for quick, isolated tasks (e.g., "explain this error")
3. **Traditional** commands for simple, repetitive tasks you already know (e.g., `npm run dev`)
4. **Read MD (Self)** when you want to understand the context before acting

Example: When setting up the project, you might:
1. Ask AI: "Read startup.md and set up the project on localhost" (Read MD with AI)
2. After that, use `npm run dev` every time you want to start the server (Traditional)
3. If you need to understand why something is configured a certain way, open `startup.md` (Read MD Self)

### Example: Why `npm run dev` Is Usually Faster Than AI

For an experienced user:
```
Traditional:      npm run dev                               (1-2 seconds)
AI Prompt:        "start app server in localhost"           (5-15 seconds while AI processes)
Read MD with AI:  "Read startup.md and start the dev server"  (10-30 seconds while AI reads and acts)
Read MD (Self):   Open startup.md and read the section      (30-60 seconds)
```

Once you know the command, typing it is the fastest option. But when you're learning, or when the task requires following the documented setup procedure, Read MD with AI gives you the best balance of accuracy and convenience.

### The Real Goal: Productivity and Learning

There is no single "correct" method. The goal is to be productive while continuously learning:
- Beginners often use **Read MD with AI** because it combines the project's documentation with AI execution
- Intermediate developers use a **hybrid** approach: Read MD with AI for project procedures, Traditional for routine tasks, AI Prompt for quick questions
- Experienced developers use **Traditional** commands for routine work, but still use **Read MD with AI** for setup, deployment, and new sub-apps

As you become more comfortable with the project, you will naturally shift more tasks to Traditional methods. But keep Read MD with AI available for any project-specific procedure.

### Getting Started with AI Coding Tools

If you're new to AI coding tools, here's how to get started:

**Step 1: Choose Your AI Tool**
- **Devin**: Full-featured AI coding assistant (integrated in Windsurf)
- **GitHub Copilot**: Code completion and suggestions
- **Cursor**: AI-powered code editor
- **ChatGPT/Claude**: General AI with coding capabilities

**Step 2: Start Simple**
Begin with basic requests:
- "What does this file do?"
- "How do I start the development server?"
- "Explain this function to me"

**Step 3: Gradually Increase Complexity**
As you get comfortable:
- "Add a simple button to this page"
- "Fix this error I'm seeing"
- "Create a new component following existing patterns"

**Step 4: Learn to Prompt Effectively**
- Be specific about what you want
- Provide context about the project
- Reference relevant documentation
- Ask for explanations when you don't understand

**Step 5: Build Your AI Workflow**
Develop a routine that works for you:
- Morning: Ask AI to check for updates and summarize changes
- Development: Use AI for implementation and debugging
- End of day: Ask AI to help commit and document your work

### AI-Powered File Operations

One of the most powerful aspects of AI coding tools is their ability to read, understand, and modify files for you.

#### Reading Files with AI

Instead of opening files manually and trying to understand them:

**Traditional Method:**
```bash
# You need to know file locations and open them manually
cat client/src/pages/forms/FormBuilder.jsx
# Read through the code yourself
# Try to understand what it does
```

**AI Method:**
```
"Read the FormBuilder component at client/src/pages/forms/FormBuilder.jsx and explain how it works"
"Analyze the form submission logic in the forms sub-app"
"Review the authentication middleware and explain the security measures"
```

#### Editing Files with AI

Instead of manually editing code:

**Traditional Method:**
```bash
# Open file in editor
# Find the right place to make changes
# Write the code yourself
# Hope you don't introduce syntax errors
```

**AI Method:**
```
"Add a validation function to the form that checks if email is valid"
"Update the dashboard component to show a new statistics card"
"Refactor this function to be more readable"
```

#### Creating New Files with AI

**Traditional Method:**
```bash
# Create file manually
# Write boilerplate code
# Set up imports and exports
# Configure the file
```

**AI Method:**
```
"Create a new component for user profile management following the patterns in the admin sub-app"
"Generate a new API route for handling file uploads"
"Create a new page for the email campaign editor"
```

#### Finding Files with AI

**Traditional Method:**
```bash
# You need to know where files are located
find . -name "*.jsx"
grep -r "FormBuilder" .
# Search through file structure manually
```

**AI Method:**
```
"Find all files related to form validation"
"Search for components that use the useAuth hook"
"Locate the API endpoint for user login"
"Find where the database schema is defined"
```

### AI for Project Understanding

When you're new to a project, AI can accelerate your understanding dramatically:

**Architecture Overview:**
```
"Explain the overall architecture of this project"
"How do the frontend and backend communicate?"
"What is the role of the shared directory?"
```

**Data Flow Understanding:**
```
"Trace the data flow from user registration to database storage"
"Explain how a form submission is processed"
"Show me the authentication flow from login to API access"
```

**Pattern Recognition:**
```
"Identify the common patterns used across different sub-apps"
"Show me examples of how API calls are structured"
"What are the consistent styling patterns used in the project?"
```

**Dependency Mapping:**
```
"What external libraries does this project depend on?"
"Show me the relationship between different components"
"Explain how the Prisma ORM is used throughout the project"
```

### Working with AI Coding Tools

AI coding tools like Devin, GitHub Copilot, or Cursor can dramatically accelerate your development. Remember that there are three main methods: **Traditional** for simple commands, **AI Prompt** for quick tasks, and **Read MD with AI** for project-specific procedures. Use AI for what it does best: executing documented procedures, complex tasks, exploration, and learning.

#### Using AI for Setup: Read MD with AI

When setting up the project, the best approach is **Read MD with AI** — ask AI to read startup.md and execute the documented procedure:

- "Read startup.md and set up the Service Hub project on localhost"
- "Invoke startup.md and install dependencies, configure the environment, and start the development server"
- "Follow the instructions in startup.md to set up the project on localhost"
- "Use startup.md to verify my environment and start the application"

**Why not just a simple AI prompt?** A prompt like "install all dependencies" may work, but you will still need follow-up prompts for environment setup, database setup, and starting the server. By invoking startup.md, the AI gets the complete, documented sequence in one go.

**AI Prompt (Simple Task) alternatives for isolated setup steps:**
- "Clone the repository https://github.com/andy741231/servicehub.git"
- "Install all dependencies"
- "Start the app server in localhost"

Use these only when you know the single step is isolated and doesn't need project context.

#### Using AI to Read Documentation

Instead of reading through long documentation files yourself, you can ask AI to read and summarize them for you:

**Reading Project Documentation:**
- "Read the startup.md file and summarize the setup process in simple steps"
- "Read the forms skill guide and explain the key patterns I should follow"
- "Review the THEME.md file and tell me how to style a new component"

**Understanding Configuration:**
- "Read the package.json and explain what each script does"
- "Analyze the .github/workflows/azure-deploy.yml and explain the deployment process"
- "Review the prisma/schema.prisma and explain the database structure"

**Getting Specific Information:**
- "Read the admin skill guide and find the section about user permissions"
- "Search the project documentation for how to handle file uploads"
- "Find and explain the authentication flow in the codebase"

**Comparing Documentation:**
- "Compare the admin and auth skill guides and tell me the key differences"
- "Read both the forms and web skill guides and identify common patterns"

This approach saves time and helps you focus on implementation rather than reading extensive documentation.

#### Using AI to Explore the Codebase

When you're new to a project, understanding the code structure can be overwhelming. AI can help you explore and understand the codebase:

**Project Structure Exploration:**
- "Explore the project structure and explain how the client, server, and shared folders are organized"
- "Show me the main entry points for the frontend and backend applications"
- "Explain how the different sub-apps (admin, forms, email, etc.) are structured"

**Finding Specific Code:**
- "Find where the user authentication logic is implemented"
- "Search for the form builder component and explain how it works"
- "Locate the API endpoints for the directory sub-app"

**Understanding Code Relationships:**
- "Show me how the frontend communicates with the backend API"
- "Explain how the database models are connected to the API routes"
- "Trace the flow from a button click to database update"

**Code Pattern Recognition:**
- "Analyze the existing admin pages and identify the common patterns used"
- "Show me examples of how API calls are made in this project"
- "Find examples of form validation patterns in the codebase"

**Learning from Existing Code:**
- "Find a similar feature to what I want to build and explain how it works"
- "Show me how other components handle loading states and errors"
- "Find examples of responsive design patterns in the project"

#### Read MD with AI Development Workflow

**Step 1: Describe Your Goal**
Instead of thinking about code, think about what you want to accomplish:
- "I want users to be able to upload profile pictures"
- "I need a dashboard that shows sales statistics"
- "I want to add email notifications when forms are submitted"

**Step 2: Ask AI to Read the Relevant Guide and Implement**
Ask your AI to read the relevant MD file and then implement the feature:
- "Read the auth skill guide and implement profile picture upload functionality"
- "Read the admin skill guide and create a sales dashboard"
- "Read the email skill guide and add email notifications for form submissions"

**Step 3: Review and Refine**
- Review the code AI generated
- Ask for changes: "Update the styling to match our theme"
- Request explanations: "Explain how the authentication middleware works"

**Step 4: Test with AI**
- "Start the dev server and help me test this feature"
- "Check for any console errors or warnings"
- "Verify the feature works as expected"

**Step 5: Deploy with AI**
- "Commit these changes with an appropriate message"
- "Push to trigger deployment"
- "Monitor the deployment status"

#### Best Practices for AI Coding

1. **Be Specific**: Clearly describe what you want
2. **Provide Context**: Mention relevant files or features
3. **Reference Skills**: Ask AI to follow specific skill guides
4. **Review Changes**: Always review AI-generated code
5. **Test Thoroughly**: Verify changes work as expected
6. **Learn from AI**: Study the code AI generates to understand patterns
7. **Iterate**: Use AI for multiple refinement cycles
8. **Ask Questions**: Don't hesitate to ask AI to explain code

#### Common AI Prompts for Service Hub

**Read MD with AI (Project Procedures):**

These prompts give AI the context of the documented guide before executing:
- "Read startup.md and set up the Service Hub project on localhost"
- "Read the forms skill guide and add a new export-to-CSV feature"
- "Read startup.md and apply any pending database migrations"
- "Read startup.md deployment section and monitor the GitHub Actions pipeline"
- "Read the auth skill guide and implement social login"

**AI Prompt (Simple / Isolated Tasks):**

These prompts work for quick tasks that don't need a full project guide:
- "start app server in localhost"
- "Clone the repository https://github.com/andy741231/servicehub.git"
- "Install all dependencies"
- "Check what files I've changed"
- "Commit my changes with message 'fix: resolve login bug'"
- "Explain how the authentication system works in this project"
- "The login form isn't submitting. Help me identify the issue"

**When to use which:**
- Use **Read MD with AI** for setup, deployment, database changes, and sub-app features
- Use **AI Prompt** for quick, isolated commands and questions
- Use **Traditional** when you already know the command and it's faster to type

#### Using AI for Testing and Verification

AI can help you test your changes more effectively:

**Automated Testing:**
- "Run the development server and check for any console errors or warnings"
- "Test the login functionality and verify it works correctly"
- "Check if the new form field saves properly to the database"

**Manual Testing Guidance:**
- "Create a test plan for verifying the user profile feature"
- "Help me test the responsive design on different screen sizes"
- "Guide me through testing the email campaign creation flow"

**Error Detection:**
- "Monitor the browser console for any JavaScript errors while I test"
- "Check the network tab for failed API requests"
- "Analyze the server logs for any errors or warnings"

**Regression Testing:**
- "Test that existing features still work after my changes"
- "Verify that the authentication system still functions correctly"
- "Check that the deployment pipeline still works"

#### Using AI for Learning and Skill Development

Use AI as a learning companion to accelerate your understanding:

**Concept Explanations:**
- "Explain what React hooks are and how they're used in this project"
- "Teach me about database migrations and why they're important"
- "Explain the difference between client-side and server-side rendering"

**Code Analysis:**
- "Analyze this component and explain how it works"
- "Break down this complex function into simpler steps"
- "Explain the design pattern used in this code"

**Best Practices:**
- "Show me examples of clean code in this project"
- "Explain the security best practices used for authentication"
- "Demonstrate proper error handling patterns"

**Progressive Learning:**
- "Start with a simple example and gradually increase complexity"
- "Teach me one concept at a time with practical examples"
- "Provide exercises to reinforce what I've learned"

#### Using AI for Collaboration and Communication

AI can help you communicate more effectively with team members:

**Writing Clear Commit Messages:**
- "Analyze my changes and write a clear commit message following the project's conventions"
- "Generate a commit message that explains why these changes were made"
- "Write a commit message that follows the format: 'feat/sub-app: description'"

**Creating Documentation:**
- "Generate documentation for this new feature I just built"
- "Write a README section explaining how to use the email campaign manager"
- "Create inline code comments to explain complex logic"

**Preparing for Code Reviews:**
- "Summarize the changes I made for a code review"
- "List the potential issues or areas of improvement in my code"
- "Explain the trade-offs of different implementation approaches"

**Asking the Right Questions:**
- "Help me formulate a question to ask the team about this error"
- "Draft a message to request access to the production database"
- "Write a clear description of a bug I found for the issue tracker"

**Status Updates:**
- "Generate a status update on my current development work"
- "Summarize what I accomplished today and what I plan to do tomorrow"
- "Create a progress report for the features I'm implementing"

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
**Traditional Method:**
```bash
git status
```
Shows which files have been changed.

**AI Prompt (Simple Task):**
Ask your AI: "Check the git status to see what files have been modified"

#### Viewing Changes
**Traditional Method:**
```bash
git diff
```
Shows exactly what changed in each file.

**AI Prompt (Simple Task):**
Ask your AI: "Show me the git diff to see what changes were made to the code"

#### Saving Changes (Commit)
**Traditional Method:**
```bash
git add .
git commit -m "Describe what you changed"
```
- `git add .` stages all changes for commit
- `git commit` saves the changes with a descriptive message

**AI Prompt (Simple Task):**
Ask your AI: "Stage all changes and commit them with the message: 'fix(forms): resolve schema corruption issue'"
- The AI can also help you write better commit messages by analyzing your changes

#### Uploading to GitHub
**Traditional Method:**
```bash
git push origin main
```
Uploads your commits to GitHub for deployment.

**AI Prompt (Simple Task):**
Ask your AI: "Push my commits to the main branch on GitHub"

#### Getting Latest Changes
**Traditional Method:**
```bash
git pull origin main
```
Downloads the latest changes from GitHub.

**AI Prompt (Simple Task):**
Ask your AI: "Pull the latest changes from the main branch"

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

**Traditional Method:**
Deployment happens automatically when you push to the main branch:

```bash
git add .
git commit -m "Your descriptive message"
git push origin main
```

After pushing, you can watch the deployment at:
- GitHub → Actions → "Build and Deploy to Azure"

**AI Prompt (Simple Task):**
Ask your AI: "Commit all my changes with the message 'feat: add new feature' and push to the main branch to trigger deployment"
- The AI will handle the entire commit and push process
- You can also ask: "Check the GitHub Actions status to see if my deployment is running"

**Read MD with AI (Project Procedure):**
If you want AI to follow the documented deployment guide:
- "Read the startup.md deployment section and check the GitHub Actions status for my latest deployment"
- "Read startup.md and explain why the deployment pipeline is failing"

### Manual Deployment

**Traditional Method:**
If you need to deploy without code changes:

1. Go to GitHub
2. Navigate to Actions tab
3. Select "Build and Deploy to Azure"
4. Click "Run workflow"

**AI Prompt (Simple Task):**
Ask your AI: "Trigger a manual deployment workflow on GitHub Actions"
- The AI can guide you through the process or potentially trigger it if it has GitHub access

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

**Read MD with AI (Project Procedure):**
1. **Plan the feature**: Understand what you're building
2. **Ask AI to read the skill guide and scaffold**: "Read the admin skill guide and create a new user profile management page following its patterns"
3. **Review AI-generated code**: Check what the AI created
4. **Refine with AI**: "Update the profile page to include these specific fields and styling"
5. **Test locally**: Ask AI to "Start the dev server and check for any console errors"
6. **Commit with AI**: "Stage these changes and commit with message 'feat: add user profile management'"
7. **Push and deploy**: "Push to main to trigger deployment"

**Traditional Approach:**
1. **Plan the feature**: Understand what you're building
2. **Use AI to scaffold**: Ask AI to create the basic structure
3. **Implement the logic**: Fill in the details (with AI help)
4. **Test locally**: Verify it works in development
5. **Commit and push**: Deploy to staging for testing
6. **Test on staging**: Verify in the staging environment
7. **Merge to main**: Deploy to production

### Fixing a Bug

**AI Prompt (Simple Task):**
1. **Describe the bug to AI**: "The save button on the form builder isn't working - when I click it, nothing happens"
2. **Let AI investigate**: "Search for the save button implementation in the forms sub-app and identify the issue"
3. **Review AI's diagnosis**: Understand what the AI found
4. **Ask AI to fix**: "Fix the save button issue you identified"
5. **Test with AI help**: "Start the dev server and help me test the fix"
6. **Commit with AI**: "Commit the bug fix with an appropriate message"
7. **Deploy**: "Push the fix to trigger deployment"

**Traditional Approach:**
1. **Reproduce the bug**: Understand the issue
2. **Use AI to diagnose**: Ask AI to help identify the problem
3. **Implement the fix**: Make the necessary changes
4. **Test the fix**: Verify the bug is resolved
5. **Commit with clear message**: Describe the bug fix
6. **Push and deploy**: Release the fix

**Read MD with AI (Project Procedure):**
If the bug relates to a documented procedure or sub-app pattern:
1. **Ask AI to read the relevant skill guide**: "Read the forms skill guide and check the save button implementation"
2. **Ask AI to cross-reference startup.md**: "Read startup.md troubleshooting section for common database or deployment issues"
3. **Let AI fix with context**: "Fix the save button issue following the forms skill guide patterns"

### Database Schema Changes

**Read MD with AI (Project Procedure):**
1. **Ask AI to read startup.md and the schema**: "Read startup.md and the Prisma schema, then add a 'phoneNumber' field to the User model"
2. **Let AI modify schema**: AI updates `prisma/schema.prisma`
3. **Review the change**: Check what AI modified
4. **Let AI handle migration**: "Generate a migration for this schema change following the startup.md migration process"
5. **Test with AI**: "Apply the migration locally and verify it works"
6. **Commit with AI**: "Commit both the schema change and migration file"
7. **Deploy**: "Push to trigger automatic deployment with migration"

**Traditional Approach:**
When you need to change the database structure:
1. **Edit the schema**: Modify `prisma/schema.prisma`
2. **Create migration**: The system auto-generates migration files
3. **Test locally**: Verify changes work in development
4. **Commit both files**: Include schema and migration files
5. **Push and deploy**: Migrations run automatically during deployment

**AI Prompt (Simple Task):**
For isolated database actions:
- "Apply pending database migrations"
- "Generate a migration for adding phoneNumber to User"
- "Seed the database"

These are quick but may not follow the full project procedure unless you provide context.

### Working with Different Sub-Apps

Service Hub contains multiple sub-applications. Each has its own directory and specialized functionality:

**Admin Sub-App:**
- Location: `client/src/pages/admin/`
- Purpose: User management and permissions
- Skill guide: `.devin/skills/admin/SKILL.md`
- **AI Prompt**: "Read the admin skill guide and help me add a new user management feature"

**Auth Sub-App:**
- Location: `client/src/pages/auth/`
- Purpose: Login and registration
- Skill guide: `.devin/skills/auth/SKILL.md`
- **AI Prompt**: "Follow the auth skill guide to implement social login functionality"

**Directory Sub-App:**
- Location: `client/src/pages/directory/`
- Purpose: Business directory management
- Skill guide: `.devin/skills/directory/SKILL.md`
- **AI Prompt**: "Use the directory skill guide to add search and filter functionality"

**Email Sub-App:**
- Location: `client/src/pages/email/`
- Purpose: Email campaign management
- Skill guide: `.devin/skills/email/SKILL.md`
- **AI Prompt**: "Follow the email skill guide to create an email template editor"

**Forms Sub-App:**
- Location: `client/src/pages/forms/`
- Purpose: Form builder and submissions
- Skill guide: `.devin/skills/forms/SKILL.md`
- **AI Prompt**: "Read the forms skill guide and add conditional logic to the form builder"

**Web Sub-App:**
- Location: `client/src/pages/web/`
- Purpose: Visual page builder
- Skill guide: `.devin/skills/web/SKILL.md`
- **AI Prompt**: "Use the web skill guide to implement a new block type for the page builder"

### Using Skills for Guidance

The project includes "skills" - detailed guides for working with specific sub-apps. When working with a feature:

**Read MD with AI (Project Procedure):**
1. **Ask AI to read the skill**: "Read the forms skill guide at .devin/skills/forms/SKILL.md and summarize the key patterns"
2. **Ask AI to follow the skill**: "Implement this feature following the patterns in the forms skill guide"
3. **Let AI reference the skill**: When AI gets stuck, remind it: "Check the skill guide for the recommended approach"

---

## Troubleshooting and Getting Help

### Common Issues and Solutions

#### Port Already in Use

**Problem:** `Error: Port 3000 is already in use`

**Traditional Solution:**
- Another process is using the port
- Find and stop the other process, or change the port in configuration

**AI Prompt (Simple Task):**
Ask your AI: "Port 3000 is already in use. Find the process using it and stop it, or help me change the port configuration"
- The AI can identify the conflicting process and help you resolve it

#### Database Connection Issues

**Problem:** `Error: Can't reach database server`

**Traditional Solution:**
- Check your `.env` file has correct `DATABASE_URL`
- Verify you have internet connection
- Check Azure SQL service status

**Read MD with AI (Project Procedure):**
Ask your AI: "Read startup.md and help me troubleshoot the database connection error"
- The AI can cross-reference the startup.md environment setup with your current `.env` configuration
- The AI can verify the Azure SQL connection string format and test the connection

**AI Prompt (Simple Task):**
Ask your AI: "I'm getting a database connection error. Check my .env file and help me troubleshoot the connection"

#### Installation Errors

**Problem:** `npm install` fails with errors

**Traditional Solution:**
- Delete `node_modules` folder and `package-lock.json`
- Run `npm install` again
- Ensure Node.js version is v20 or higher

**Read MD with AI (Project Procedure):**
Ask your AI: "Read startup.md and fix the npm install failure. Clean up if needed and retry the installation following the documented steps"
- The AI uses the project setup guide to decide the correct cleanup and retry procedure

**AI Prompt (Simple Task):**
Ask your AI: "npm install is failing. Clean up the node_modules and package-lock.json, then retry the installation"

#### Build Failures

**Problem:** `npm run build` fails

**Traditional Solution:**
- Check for syntax errors in code
- Ensure all dependencies are installed
- Clear cache: `rm -rf .turbo`

**Read MD with AI (Project Procedure):**
Ask your AI: "Read startup.md and help me fix the build failure. Check for syntax errors, verify dependencies, and clear the cache if needed"
- The AI follows the project documentation while diagnosing the failure

**AI Prompt (Simple Task):**
Ask your AI: "The build is failing. Check for syntax errors, verify dependencies, and try clearing the cache"

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
- Choose the right method for each task: **Traditional** for simple commands, **AI Prompt** for complex tasks, and **Read MD** for project understanding
- Leverage AI tools to accelerate your learning and development, especially when invoking startup.md and skill guides
- Follow the established patterns and skill guides for consistency
- Don't be afraid to ask questions and seek help when needed

Welcome to the world of AI-assisted coding! Your journey is just beginning.

---

## Appendix: Quick Reference

### Essential Commands

**Traditional Commands:**

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

**AI Prompt Alternatives (Simple Tasks):**

For quick, isolated commands, you can ask your AI instead of typing:
- "start app server in localhost" → AI runs `npm run dev`
- "build the project for production" → AI runs `npm run build`
- "apply any pending database migrations" → AI runs `npx prisma migrate deploy`
- "Check what files I've changed" → AI runs `git status`
- "Commit my changes with message 'fix: resolve login bug'" → AI stages and commits
- "Push my changes to GitHub" → AI runs `git push origin main`
- "Get the latest changes from GitHub" → AI runs `git pull origin main`

**Read MD with AI Alternatives (Project Procedures):**

For setup, deployment, or database tasks, use the documented guide:
- "Read startup.md and start the development servers" → AI follows the documented startup procedure
- "Read startup.md and build the project for production" → AI follows the build and deployment guide
- "Read startup.md and apply any pending database migrations" → AI follows the database setup guide

**Read MD Alternatives:**

When you want to understand the context behind a command, read the relevant documentation:
- `startup.md` → For setup, database, and deployment commands
- `.devin/skills/[sub-app]/SKILL.md` → For understanding sub-app conventions
- `THEME.md` → For styling and design decisions
- `prisma/schema.prisma` → For understanding database structure
- `.github/workflows/azure-deploy.yml` → For understanding the deployment pipeline

**Quick Decision Guide:**
- **Just want to run a simple command you already know?** → Use **Traditional**
- **Need a quick, isolated task done?** → Use **AI Prompt**
- **Need to follow a project-specific procedure (setup, deployment, database, sub-app feature)?** → Use **Read MD with AI**
- **Want to understand the context before acting?** → Use **Read MD (Self)** or ask AI to summarize the MD file

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