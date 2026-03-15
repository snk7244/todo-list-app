// iOS Reminders-style To-Do List Application with Lists + Subtasks + Cloud Sync

import {
  doc,
  getDoc,
  setDoc,
  onSnapshot,
} from 'https://www.gstatic.com/firebasejs/9.22.0/firebase-firestore.js';

// DOM references (populated after DOMContentLoaded)
let addTaskBtn;
let addListBtn;
let taskInput;
let listContainer;
let taskListEl;
let currentListName;
let taskListTitle;
let taskCount;
let themeToggleBtn;
let searchBtn;
let searchInput;
let clearCompletedBtn;

const db = window.db; // From HTML
const STORAGE_KEY = 'todoState';
const THEME_KEY = 'themePreference';

let state = {
  lists: [],
  selectedListId: null,
};

let searchQuery = '';

let unsubscribe = null; // For real-time listener

async function init() {
  // Initialize DOM references after the DOM is loaded
  addTaskBtn = document.getElementById('addTaskBtn');
  addListBtn = document.getElementById('addListBtn');
  taskInput = document.getElementById('taskInput');
  listContainer = document.getElementById('listContainer');
  taskListEl = document.getElementById('taskList');
  currentListName = document.getElementById('currentListName');
  taskListTitle = document.getElementById('taskListTitle');
  taskCount = document.getElementById('taskCount');
  themeToggleBtn = document.getElementById('themeToggleBtn');
  searchBtn = document.getElementById('searchBtn');
  searchInput = document.getElementById('searchInput');
  clearCompletedBtn = document.getElementById('clearCompletedBtn');

  initTheme();
  attachThemeEvent();

  await loadState();

  if (state.lists.length === 0) {
    const defaultId = generateId();
    state.lists.push({ id: defaultId, name: 'Reminders', tasks: [] });
    state.selectedListId = defaultId;
    await saveState();
  }

  if (!state.selectedListId && state.lists.length > 0) {
    state.selectedListId = state.lists[0].id;
    await saveState();
  }

  renderLists();
  renderTasks();
  attachEvents();

  // Set up real-time listener
  setupRealtimeListener();
}

function attachThemeEvent() {
  if (!themeToggleBtn) return;

  themeToggleBtn.addEventListener('click', () => {
    const isDark = document.body.dataset.theme !== 'light';
    const nextTheme = isDark ? 'light' : 'dark';
    applyTheme(nextTheme);
    localStorage.setItem(THEME_KEY, nextTheme);
  });
}

function setupRealtimeListener() {
  if (!db) return;

  if (unsubscribe) unsubscribe();
  const userDoc = doc(db, 'users', 'defaultUser'); // Use a fixed user ID for simplicity
  unsubscribe = onSnapshot(userDoc, (docSnap) => {
    if (docSnap.exists()) {
      const data = docSnap.data();
      state = data.state || { lists: [], selectedListId: null };
      renderLists();
      renderTasks();
    }
  });
}

function attachEvents() {
  if (!addTaskBtn || !addListBtn || !taskInput) {
    console.warn('UI elements not found; skipping event binding.');
    return;
  }

  if (searchBtn) {
    searchBtn.addEventListener('click', () => {
      if (!searchInput) return;

      const isActive = searchInput.classList.contains('active');
      if (!isActive) {
        searchInput.classList.add('active');
        searchInput.focus();
        return;
      }

      if (searchInput.value.trim()) {
        searchInput.value = '';
        searchQuery = '';
        searchBtn.title = 'Search Reminders';
        renderTasks();
        return;
      }

      searchInput.classList.remove('active');
    });
  }

  if (searchInput) {
    searchInput.addEventListener('input', () => {
      searchQuery = searchInput.value.trim().toLowerCase();
      searchBtn.title = searchQuery ? `Searching: ${searchQuery}` : 'Search Reminders';
      renderTasks();
    });

    searchInput.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        searchInput.value = '';
        searchQuery = '';
        searchInput.classList.remove('active');
        searchBtn.title = 'Search Reminders';
        renderTasks();
      }
    });
  }

  document.addEventListener('keydown', (e) => {
    if (e.key === '/' && searchInput) {
      const targetTag = (e.target && e.target.tagName) ? e.target.tagName.toLowerCase() : '';
      if (targetTag === 'input' || targetTag === 'textarea') return;
      e.preventDefault();
      searchInput.classList.add('active');
      searchInput.focus();
    }
  });

  if (clearCompletedBtn) {
    clearCompletedBtn.addEventListener('click', clearCompletedTasks);
  }

  addTaskBtn.addEventListener('click', () => taskInput.focus());

  addListBtn.addEventListener('click', () => {
    createList(generateListName());
  });

  taskInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') addTask();
  });

  taskInput.addEventListener('blur', () => {
    if (taskInput.value.trim() !== '') addTask();
  });
}

function addTask() {
  const text = taskInput.value.trim();
  const list = getSelectedList();
  if (!list || text === '') return;

  list.tasks.push({
    id: generateId(),
    text,
    completed: false,
    parentId: null,
  });

  taskInput.value = '';
  saveState();
  renderTasks();
}

function createList(name) {
  const id = generateId();
  state.lists.push({ id, name, tasks: [] });
  state.selectedListId = id;
  saveState();
  renderLists();
  renderTasks();
}

function generateListName() {
  const base = 'New List';
  const existingNames = new Set(state.lists.map((list) => String(list.name || '').toLowerCase()));

  if (!existingNames.has(base.toLowerCase())) {
    return base;
  }

  let counter = 2;
  while (existingNames.has(`${base} ${counter}`.toLowerCase())) {
    counter += 1;
  }

  return `${base} ${counter}`;
}

function startInlineRename(listId, nameElement) {
  const originalText = nameElement.textContent;
  const input = document.createElement('input');
  input.type = 'text';
  input.value = originalText;
  input.className = 'search-input active';
  input.style.width = '100%';

  const parent = nameElement.parentElement;
  parent.replaceChild(input, nameElement);
  input.focus();
  input.select();

  const commit = () => {
    const nextName = input.value.trim() || originalText;
    renameList(listId, nextName);
  };

  input.addEventListener('blur', commit, { once: true });
  input.addEventListener('keydown', (event) => {
    if (event.key === 'Enter') {
      input.blur();
    }
    if (event.key === 'Escape') {
      input.value = originalText;
      input.blur();
    }
  });
}

function renameList(listId, nextName) {
  const list = state.lists.find((item) => item.id === listId);
  if (!list) return;
  list.name = nextName;
  saveState();
  renderLists();
  renderTasks();
}

function deleteList(listId) {
  if (state.lists.length === 1) {
    state.lists[0] = { id: generateId(), name: 'Reminders', tasks: [] };
    state.selectedListId = state.lists[0].id;
    saveState();
    renderLists();
    renderTasks();
    return;
  }

  state.lists = state.lists.filter((list) => list.id !== listId);
  if (state.selectedListId === listId) {
    state.selectedListId = state.lists[0]?.id || null;
  }
  saveState();
  renderLists();
  renderTasks();
}

function clearCompletedTasks() {
  const list = getSelectedList();
  if (!list) return;

  list.tasks = list.tasks.filter((task) => !task.completed);
  saveState();
  renderTasks();
}

function selectList(listId) {
  state.selectedListId = listId;
  saveState();
  renderLists();
  renderTasks();
}

function getSelectedList() {
  return state.lists.find((list) => list.id === state.selectedListId);
}

function renderLists() {
  listContainer.innerHTML = '';

  state.lists.forEach((list) => {
    const isSelected = list.id === state.selectedListId;
    const li = document.createElement('li');
    li.className = 'list-item' + (isSelected ? ' selected' : '');
    li.dataset.listId = list.id;

    const icon = document.createElement('div');
    icon.className = 'list-icon';
    icon.textContent = getListIcon(list.name);

    const name = document.createElement('span');
    name.className = 'list-name';
    name.textContent = list.name;
    name.title = 'Double-click to rename';

    name.addEventListener('dblclick', (event) => {
      event.stopPropagation();
      startInlineRename(list.id, name);
    });

    const deleteBtn = document.createElement('button');
    deleteBtn.className = 'list-delete-btn';
    deleteBtn.textContent = '✕';
    deleteBtn.title = 'Delete list';
    deleteBtn.addEventListener('click', (event) => {
      event.stopPropagation();
      deleteList(list.id);
    });

    li.appendChild(icon);
    li.appendChild(name);
    li.appendChild(deleteBtn);

    li.addEventListener('click', () => {
      if (state.selectedListId === list.id) return;
      selectList(list.id);
    });

    listContainer.appendChild(li);
  });
}

function getListIcon(listName) {
  const name = String(listName).toLowerCase();
  if (name.includes('shopping')) return '🛒';
  if (name.includes('work')) return '💼';
  if (name.includes('home')) return '🏠';
  if (name.includes('travel')) return '✈️';
  return '📝';
}

function renderTasks() {
  const list = getSelectedList();
  if (!list) return;

  currentListName.textContent = list.name;
  taskListTitle.textContent = list.name;

  const taskListElement = taskListEl || document.getElementById('taskList');
  if (!taskListElement) return;

  taskListElement.innerHTML = '';

  let visibleTasks = list.tasks;
  if (searchQuery) {
    visibleTasks = list.tasks.filter((task) =>
      String(task.text || '').toLowerCase().includes(searchQuery)
    );
  }

  const items = buildTaskTree(visibleTasks);
  if (items.length === 0) {
    const emptyItem = document.createElement('li');
    emptyItem.className = 'task-item empty-state';
    emptyItem.textContent = searchQuery ? 'No reminders match your search.' : 'No reminders yet. Add one below.';
    taskListElement.appendChild(emptyItem);
  }

  items.forEach((item) => {
    taskListElement.appendChild(createTaskElement(item, item._depth));
  });

  updateTaskCount(visibleTasks.length);
}

function buildTaskTree(tasks) {
  const taskMap = new Map();
  tasks.forEach((task) => {
    taskMap.set(task.id, { ...task, children: [] });
  });

  const roots = [];

  taskMap.forEach((task) => {
    if (task.parentId && taskMap.has(task.parentId)) {
      taskMap.get(task.parentId).children.push(task);
    } else {
      roots.push(task);
    }
  });

  const sortByOriginalOrder = (a, b) =>
    tasks.findIndex((t) => t.id === a.id) - tasks.findIndex((t) => t.id === b.id);

  const traverse = (node, depth, out) => {
    out.push({ ...node, _depth: depth });
    node.children
      .sort(sortByOriginalOrder)
      .forEach((child) => traverse(child, depth + 1, out));
  };

  const ordered = [];
  roots.sort(sortByOriginalOrder).forEach((root) => traverse(root, 0, ordered));
  return ordered;
}

function createTaskElement(task, depth) {
  const li = document.createElement('li');
  li.className = 'task-item' + (task.completed ? ' completed' : '');
  li.style.paddingLeft = `${20 + depth * 20}px`;

  const checkbox = document.createElement('input');
  checkbox.type = 'checkbox';
  checkbox.className = 'task-checkbox';
  checkbox.checked = task.completed;
  checkbox.addEventListener('change', () => {
    toggleTaskCompletion(task.id);
  });

  const text = document.createElement('span');
  text.className = 'task-text';
  text.textContent = task.text;
  text.addEventListener('dblclick', () => {
    const updated = prompt('Edit reminder', task.text);
    if (updated !== null) {
      updateTaskText(task.id, updated.trim());
    }
  });

  const actions = document.createElement('div');
  actions.className = 'task-actions';

  const indentBtn = createActionButton('→', 'Indent');
  indentBtn.addEventListener('click', () => {
    indentTask(task.id);
  });

  const outdentBtn = createActionButton('←', 'Outdent');
  outdentBtn.addEventListener('click', () => {
    outdentTask(task.id);
  });

  const moveSelect = document.createElement('select');
  moveSelect.className = 'move-select';
  state.lists.forEach((list) => {
    const option = document.createElement('option');
    option.value = list.id;
    option.textContent = list.name;
    if (list.id === state.selectedListId) option.selected = true;
    moveSelect.appendChild(option);
  });
  moveSelect.addEventListener('change', () => {
    moveTaskToList(task.id, moveSelect.value);
  });

  const deleteBtn = document.createElement('button');
  deleteBtn.className = 'delete-btn';
  deleteBtn.textContent = 'Delete';
  deleteBtn.addEventListener('click', () => {
    deleteTask(task.id);
  });

  actions.appendChild(indentBtn);
  actions.appendChild(outdentBtn);
  actions.appendChild(moveSelect);
  actions.appendChild(deleteBtn);

  li.appendChild(checkbox);
  li.appendChild(text);
  li.appendChild(actions);

  return li;
}

function createActionButton(label, title) {
  const btn = document.createElement('button');
  btn.className = 'action-btn';
  btn.title = title;
  btn.textContent = label;
  return btn;
}

function toggleTaskCompletion(taskId) {
  const list = getSelectedList();
  if (!list) return;
  const task = list.tasks.find((t) => t.id === taskId);
  if (!task) return;
  task.completed = !task.completed;
  saveState();
  renderTasks();
}

function updateTaskText(taskId, text) {
  if (!text) return;
  const list = getSelectedList();
  if (!list) return;
  const task = list.tasks.find((t) => t.id === taskId);
  if (!task) return;
  task.text = text;
  saveState();
  renderTasks();
}

function deleteTask(taskId) {
  const list = getSelectedList();
  if (!list) return;

  const idsToRemove = new Set([taskId]);
  const toCheck = [taskId];
  while (toCheck.length) {
    const current = toCheck.pop();
    list.tasks.forEach((t) => {
      if (t.parentId === current) {
        idsToRemove.add(t.id);
        toCheck.push(t.id);
      }
    });
  }

  list.tasks = list.tasks.filter((t) => !idsToRemove.has(t.id));
  saveState();
  renderTasks();
}

function indentTask(taskId) {
  const list = getSelectedList();
  if (!list) return;

  const tree = buildTaskTree(list.tasks);
  const index = tree.findIndex((item) => item.id === taskId);
  if (index <= 0) return;

  const current = tree[index];
  const prev = tree[index - 1];
  if (!prev) return;

  const task = list.tasks.find((t) => t.id === taskId);
  if (!task) return;

  task.parentId = prev.id;
  saveState();
  renderTasks();
}

function outdentTask(taskId) {
  const list = getSelectedList();
  if (!list) return;
  const task = list.tasks.find((t) => t.id === taskId);
  if (!task || !task.parentId) return;

  const parent = list.tasks.find((t) => t.id === task.parentId);
  task.parentId = parent ? parent.parentId || null : null;
  saveState();
  renderTasks();
}

function moveTaskToList(taskId, destinationListId) {
  const source = getSelectedList();
  const destination = state.lists.find((l) => l.id === destinationListId);
  if (!source || !destination) return;

  const taskIndex = source.tasks.findIndex((t) => t.id === taskId);
  if (taskIndex === -1) return;

  const [task] = source.tasks.splice(taskIndex, 1);
  task.parentId = null;
  destination.tasks.push(task);

  state.selectedListId = destinationListId;
  saveState();
  renderLists();
  renderTasks();
}

function updateTaskCount(totalOverride) {
  const list = getSelectedList();
  const total = Number.isInteger(totalOverride)
    ? totalOverride
    : (list ? list.tasks.length : 0);
  taskCount.textContent = total;
}

async function saveState() {
  saveLocalState();

  try {
    if (!db) return;
    const userDoc = doc(db, 'users', 'defaultUser');
    await setDoc(userDoc, { state }, { merge: true });
  } catch (error) {
    console.warn('Cloud save skipped:', error?.message || error);
  }
}

async function loadState() {
  const localLoaded = loadLocalState();

  try {
    if (!db) return;
    const userDoc = doc(db, 'users', 'defaultUser');
    const docSnap = await getDoc(userDoc);
    if (docSnap.exists()) {
      state = docSnap.data().state || { lists: [], selectedListId: null };
      saveLocalState();
    }
  } catch (error) {
    console.warn('Cloud load skipped:', error?.message || error);
    if (!localLoaded) {
      state = { lists: [], selectedListId: null };
    }
  }
}

function saveLocalState() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch (error) {
    console.warn('Local save skipped:', error?.message || error);
  }
}

function loadLocalState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return false;
    const parsed = JSON.parse(raw);
    if (parsed && Array.isArray(parsed.lists)) {
      state = {
        lists: parsed.lists,
        selectedListId: parsed.selectedListId || null,
      };
      return true;
    }
  } catch (error) {
    console.warn('Local load skipped:', error?.message || error);
  }

  return false;
}

function generateId() {
  return 'id-' + Math.random().toString(16).slice(2) + Date.now();
}

function initTheme() {
  const savedTheme = localStorage.getItem(THEME_KEY);
  const preferredTheme = savedTheme || 'dark';
  applyTheme(preferredTheme);
}

function applyTheme(theme) {
  const normalizedTheme = theme === 'light' ? 'light' : 'dark';
  document.body.dataset.theme = normalizedTheme;

  if (themeToggleBtn) {
    themeToggleBtn.textContent = normalizedTheme === 'dark' ? '☀️' : '🌙';
    themeToggleBtn.title = normalizedTheme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode';
  }
}

// Start the app
document.addEventListener('DOMContentLoaded', async () => {
  await init();
});
