// ⚠️ Remplace cette URL par celle de ton déploiement Google Apps Script (voir apps-script/GUIDE.md)
const SCRIPT_URL = "https://script.google.com/macros/s/AKfycbyOxd_0T_glIX0kwyqr31aV6M4YCO_E_cpSRbeN32v84utWGZmc1De8LIbJ5wA9q61lcA/exec";

const MAX_FILE_SIZE = 45 * 1024 * 1024; // 45 Mo, marge sous la limite d'Apps Script

const form = document.getElementById('upload-form');
const guestNameInput = document.getElementById('guest-name');
const dropzone = document.getElementById('dropzone');
const fileInput = document.getElementById('file-input');
const fileListEl = document.getElementById('file-list');
const submitBtn = document.getElementById('submit-btn');
const statusEl = document.getElementById('status');

let queue = []; // { id, file, state: 'pending'|'sending'|'done'|'error' }

function updateSubmitState() {
  const hasFiles = queue.some(q => q.state === 'pending' || q.state === 'error');
  const hasName = guestNameInput.value.trim().length > 0;
  submitBtn.disabled = !(hasFiles && hasName);
}

function addFiles(fileArray) {
  for (const file of fileArray) {
    if (!file.type.startsWith('image/') && !file.type.startsWith('video/')) continue;
    const id = `${file.name}-${file.size}-${file.lastModified}`;
    if (queue.some(q => q.id === id)) continue;
    const item = { id, file, state: file.size > MAX_FILE_SIZE ? 'error' : 'pending' };
    queue.push(item);
    renderFileItem(item, file.size > MAX_FILE_SIZE ? 'Trop lourd (> 45 Mo)' : null);
  }
  updateSubmitState();
}

function renderFileItem(item, errorMsg) {
  const li = document.createElement('li');
  li.className = 'file-item';
  li.dataset.id = item.id;

  if (item.file.type.startsWith('image/')) {
    const img = document.createElement('img');
    img.src = URL.createObjectURL(item.file);
    li.appendChild(img);
  } else {
    const vid = document.createElement('video');
    vid.src = URL.createObjectURL(item.file);
    vid.muted = true;
    li.appendChild(vid);
  }

  const removeBtn = document.createElement('button');
  removeBtn.className = 'remove-btn';
  removeBtn.type = 'button';
  removeBtn.innerHTML = '×';
  removeBtn.addEventListener('click', () => removeFile(item.id));
  li.appendChild(removeBtn);

  const stateEl = document.createElement('span');
  stateEl.className = `file-state ${item.state}`;
  stateEl.textContent = errorMsg || labelForState(item.state);
  li.appendChild(stateEl);

  fileListEl.appendChild(li);
}

function labelForState(state) {
  switch (state) {
    case 'pending': return 'En attente';
    case 'sending': return 'Envoi...';
    case 'done': return 'Envoyé ✓';
    case 'error': return 'Échec';
    default: return '';
  }
}

function setItemState(id, state, msg) {
  const item = queue.find(q => q.id === id);
  if (item) item.state = state;
  const li = fileListEl.querySelector(`[data-id="${CSS.escape(id)}"]`);
  if (li) {
    const stateEl = li.querySelector('.file-state');
    stateEl.className = `file-state ${state}`;
    stateEl.textContent = msg || labelForState(state);
  }
  updateSubmitState();
}

function removeFile(id) {
  queue = queue.filter(q => q.id !== id);
  const li = fileListEl.querySelector(`[data-id="${CSS.escape(id)}"]`);
  if (li) li.remove();
  updateSubmitState();
}

// Dropzone interactions
dropzone.addEventListener('click', () => fileInput.click());
dropzone.addEventListener('dragover', (e) => { e.preventDefault(); dropzone.classList.add('dragover'); });
dropzone.addEventListener('dragleave', () => dropzone.classList.remove('dragover'));
dropzone.addEventListener('drop', (e) => {
  e.preventDefault();
  dropzone.classList.remove('dragover');
  addFiles(Array.from(e.dataTransfer.files));
});
fileInput.addEventListener('change', () => {
  addFiles(Array.from(fileInput.files));
  fileInput.value = '';
});
guestNameInput.addEventListener('input', updateSubmitState);

function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result.split(',')[1]);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

async function sendFile(item, guestName) {
  setItemState(item.id, 'sending');
  try {
    const base64 = await fileToBase64(item.file);
    const res = await fetch(SCRIPT_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify({
        filename: item.file.name,
        mimeType: item.file.type || 'application/octet-stream',
        guestName,
        data: base64,
      }),
    });
    const json = await res.json();
    if (!json.success) throw new Error(json.error || 'Erreur inconnue');
    setItemState(item.id, 'done');
    return true;
  } catch (err) {
    console.error(err);
    setItemState(item.id, 'error');
    return false;
  }
}

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  if (SCRIPT_URL.includes('COLLE_ICI')) {
    statusEl.textContent = "⚠️ Le lien vers Google Drive n'est pas encore configuré.";
    statusEl.className = 'status error';
    return;
  }

  const guestName = guestNameInput.value.trim();
  const toSend = queue.filter(q => q.state === 'pending' || q.state === 'error');
  if (!guestName || toSend.length === 0) return;

  submitBtn.disabled = true;
  statusEl.className = 'status';
  statusEl.textContent = `Envoi en cours... (0/${toSend.length})`;

  let successCount = 0;
  for (let i = 0; i < toSend.length; i++) {
    const ok = await sendFile(toSend[i], guestName);
    if (ok) successCount++;
    statusEl.textContent = `Envoi en cours... (${i + 1}/${toSend.length})`;
  }

  if (successCount === toSend.length) {
    statusEl.textContent = `Merci ${guestName} ! ${successCount} fichier(s) envoyé(s) 🎉`;
    statusEl.className = 'status success';
  } else {
    statusEl.textContent = `${successCount}/${toSend.length} envoyés. Réessaie pour les fichiers en échec.`;
    statusEl.className = 'status error';
  }
  updateSubmitState();
});
