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

const db = window.db; // From HTML
const STORAGE_KEY = 'todoState';

let state = {
  lists: [],
  selectedListId: null,
};

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

function setupRealtimeListener() {
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
  addTaskBtn.addEventListener('click', () => taskInput.focus());

  addListBtn.addEventListener('click', () => {
    const name = prompt('List name', 'New List');
    if (!name) return;
    createList(name.trim() || 'New List');
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

    li.appendChild(icon);
    li.appendChild(name);

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

  taskListEl.innerHTML = '';

  const items = buildTaskTree(list.tasks);
  items.forEach((item) => {
    taskListEl.appendChild(createTaskElement(item, item._depth));
  });

  updateTaskCount();
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

function updateTaskCount() {
  const list = getSelectedList();
  const total = list ? list.tasks.length : 0;
  taskCount.textContent = total;
}

async function saveState() {
  const userDoc = doc(db, 'users', 'defaultUser');
  await setDoc(userDoc, { state }, { merge: true });
}

async function loadState() {
  const userDoc = doc(db, 'users', 'defaultUser');
  const docSnap = await getDoc(userDoc);
  if (docSnap.exists()) {
    state = docSnap.data().state || { lists: [], selectedListId: null };
  }
}

function generateId() {
  return 'id-' + Math.random().toString(16).slice(2) + Date.now();
}

// Start the app
document.addEventListener('DOMContentLoaded', async () => {
  await init();
});
