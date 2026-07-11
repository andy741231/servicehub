# Git & GitHub Beginner's Guide

A step-by-step guide for new users to start using **Git** (version control) and **GitHub** (online code hosting).

---

## 1. What Are Git and GitHub?

- **Git** is a tool on your computer that tracks changes to files over time. It helps you save different versions of your work and collaborate with others.
- **GitHub** is a website where you can store your Git projects online, share them, and work with a team.

---

## 2. Install Git

1. Go to [https://git-scm.com/downloads](https://git-scm.com/downloads).
2. Download the installer for your operating system.
3. Run the installer and accept the default options.
4. Open a terminal (Command Prompt, PowerShell, or Git Bash) and run:

```bash
git --version
```

If you see a version number like `git version 2.43.0`, Git is installed correctly.

---

## 3. Configure Git

Before using Git, set your name and email so your commits are labeled correctly.

```bash
git config --global user.name "Your Name"
git config --global user.email "yourname@example.com"
```

To check your settings:

```bash
git config --list
```

---

## 4. Create a GitHub Account

1. Go to [https://github.com](https://github.com) and sign up.
2. Verify your email address.
3. (Optional) Set up an SSH key or use HTTPS with a personal access token for secure access.

---

## 5. Create a Repository on GitHub

1. Click the **+** icon in the top-right corner and select **New repository**.
2. Enter a repository name, for example `my-first-project`.
3. Add a description if you want.
4. Choose **Public** (anyone can see it) or **Private** (only you and invited users).
5. (Optional) Add a `README.md` file to describe your project.
6. Click **Create repository**.

---

## 6. Clone a Repository to Your Computer

Cloning makes a copy of a repository from GitHub onto your local machine.

### Using HTTPS:

```bash
git clone https://github.com/YOUR_USERNAME/REPO_NAME.git
```

### Using SSH:

```bash
git clone git@github.com:YOUR_USERNAME/REPO_NAME.git
```

This will create a new folder with your project files.

---

## 7. Daily Workflow

### 7.1 Pull the Latest Changes

Before you start working, get the most recent version from GitHub:

```bash
git pull
```

### 7.2 Make Changes and Save Files

Edit your files like normal in your code editor.

### 7.3 Check the Current Status

See which files have changed:

```bash
git status
```

### 7.4 Stage Your Changes

Tell Git which changed files you want to save:

```bash
# Stage one file
git add filename.txt

# Stage all changes
git add .
```

### 7.5 Commit Your Changes

Save a snapshot of your staged changes with a message:

```bash
git commit -m "Add login form to the homepage"
```

Write a short, clear commit message that explains what you changed.

### 7.6 Push Your Changes to GitHub

Send your saved commits to GitHub:

```bash
git push
```

---

## 8. Working with Branches

Branches let you work on new features without changing the main project.

### Create and switch to a new branch:

```bash
git checkout -b feature/new-login-page
```

### See all branches:

```bash
git branch
```

### Switch to an existing branch:

```bash
git checkout main
```

### Merge a branch into `main`:

```bash
git checkout main
git merge feature/new-login-page
```

### Push a new branch to GitHub:

```bash
git push -u origin feature/new-login-page
```

---

## 9. Create a Pull Request (PR) on GitHub

A pull request is how you ask others to review and merge your branch.

1. Push your branch to GitHub.
2. Go to your repository on GitHub.
3. Click **Compare & pull request**.
4. Add a title and description explaining your changes.
5. Click **Create pull request**.
6. Wait for review or approval.
7. Click **Merge pull request** when ready.

---

## 10. Common Git Commands Cheat Sheet

| Command | What It Does |
|--------|--------------|
| `git status` | Shows changed files |
| `git add .` | Stages all changes |
| `git commit -m "message"` | Saves staged changes |
| `git push` | Sends commits to GitHub |
| `git pull` | Downloads changes from GitHub |
| `git log` | Shows commit history |
| `git branch` | Lists branches |
| `git checkout -b name` | Creates and switches to a new branch |
| `git checkout name` | Switches branches |
| `git merge name` | Merges a branch into the current branch |
| `git clone URL` | Copies a repository from GitHub |

---

## 11. Best Practices

1. **Commit often.** Small, focused commits are easier to understand and fix later.
2. **Write clear commit messages.** Avoid vague messages like `fix stuff`.
3. **Pull before you push.** Always update your local copy with `git pull` before starting work.
4. **Use branches for new features.** Don't work directly on `main` unless necessary.
5. **Review code with pull requests.** Let teammates check your changes before merging.

---

## 12. Troubleshooting

### Git says "not a git repository"

You are probably in the wrong folder. Use `cd` to navigate into the project folder.

### Git says "Permission denied" when pushing

- Check that you are using the correct HTTPS URL or SSH key.
- If using HTTPS, make sure you entered the right username and password or personal access token.

### Merge conflicts

If two people edit the same part of a file, Git cannot combine them automatically.

1. Open the conflicting file in your editor.
2. Look for conflict markers: `<<<<<<<`, `=======,` `>>>>>>>`.
3. Choose which changes to keep.
4. Save the file and run:

```bash
git add .
git commit -m "Resolve merge conflict"
```

---

## 13. Next Steps

- Learn about `.gitignore` to keep unwanted files out of your repository.
- Practice making branches and pull requests.
- Explore GitHub Issues and Projects for task tracking.
- Read the official [GitHub Docs](https://docs.github.com) and [Git Docs](https://git-scm.com/doc) for more details.

---

Happy coding!
