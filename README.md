# Simple To-Do List

A clean, simple to-do list application that helps you organize your tasks with lists and subtasks.

## Features

✅ **Multiple Lists** - Create and switch between different task lists  
✅ **Add Tasks** - Quickly add new tasks with the + button  
✅ **Mark Complete** - Check off completed tasks  
✅ **Delete Tasks** - Remove tasks (including all subtasks)  
✅ **Subtasks** - Indent tasks to create nested subtasks  
✅ **Move Tasks** - Move tasks between lists using the dropdown  
✅ **Persistent Storage** - Your tasks are saved locally in your browser  
✅ **Mobile Friendly** - Responsive design works on phones and tablets  

## How to Use

### Quick Start
**Easiest way:** Double-click `Start To-Do List.bat` (on Windows)

**Manual way:** Open `index.html` in your web browser

**Online access:** Visit your hosted URL (see Hosting section below)

### Adding Tasks
- Click the **+** button in the header or type in the bottom input
- Press Enter or click away to save

### Managing Tasks
- **Check the checkbox** to mark a task as complete
- **Double-click task text** to edit
- **→ button** to indent (make subtask)
- **← button** to outdent
- **Dropdown** to move task to another list
- **Delete button** to remove a task (and its subtasks)

### Creating Lists
- Click the **+** in the sidebar to add a new list
- Click a list name to switch to it

## Hosting Online (Mobile Access)

To access the app on mobile devices, host it online using GitHub Pages (free):

### Step 1: Create a GitHub Account
1. Go to [github.com](https://github.com)
2. Click "Sign up" and create a free account
3. Verify your email

### Step 2: Create a New Repository
1. Click the **+** in the top-right → "New repository"
2. Repository name: `todo-list-app` (or anything you like)
3. Make it **Public** (required for free hosting)
4. **Do NOT** check "Add a README file" (we'll upload ours)
5. Click "Create repository"

### Step 3: Upload Your Files
1. In your new repository, click **"Add file"** → **"Upload files"**
2. Drag and drop these files from your `Second Brain` folder:
   - `index.html`
   - `app.js`
   - `styles.css`
   - `README.md` (this file)
3. Click "Commit changes"

### Step 4: Enable GitHub Pages
1. In your repository, click **"Settings"** (top tab)
2. Scroll down to **"Pages"** section (left sidebar)
3. Under "Source", select **"Deploy from a branch"**
4. Branch: **main** (or master)
5. Folder: **/(root)**
6. Click "Save"

### Step 5: Get Your URL
- Wait 1-2 minutes, then refresh the Pages section
- Your site URL will appear: `https://YOUR_USERNAME.github.io/todo-list-app/`
- Open this URL on your mobile device!

### Troubleshooting
- If the URL doesn't work, wait 5-10 minutes and try again
- Ensure all files uploaded correctly (check the repository files)
- The app works offline once loaded (no internet needed for usage)

## Technical Details

- **Frontend:** HTML, CSS, JavaScript
- **Storage:** Browser localStorage (no server required)
- **Responsive:** Works on desktop, tablet, and mobile
- **No external dependencies:** Pure web technologies

## Privacy

- All data stays in your browser's localStorage
- No accounts, no tracking, no data sent anywhere
- Works completely offline after initial load
