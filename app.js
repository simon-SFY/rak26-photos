const PASSWORD = "Timon-RAK26";
const DRIVE_URL = "https://drive.google.com/drive/folders/1LhqKEuEBB1VigBQqTvXKtk_qTN3x_bZx?usp=sharing";
const SESSION_KEY = "rak26-unlocked";

const card = document.querySelector('.card');
const gateView = document.getElementById('gate-view');
const unlockedView = document.getElementById('unlocked-view');
const form = document.getElementById('password-form');
const input = document.getElementById('password-input');
const errorMsg = document.getElementById('error-msg');
const driveLink = document.getElementById('drive-link');

driveLink.href = DRIVE_URL;

function unlock() {
  gateView.hidden = true;
  unlockedView.hidden = false;
}

if (sessionStorage.getItem(SESSION_KEY) === '1') {
  unlock();
}

form.addEventListener('submit', (e) => {
  e.preventDefault();
  if (input.value === PASSWORD) {
    sessionStorage.setItem(SESSION_KEY, '1');
    errorMsg.textContent = '';
    unlock();
  } else {
    errorMsg.textContent = 'Mot de passe incorrect, réessaie.';
    card.classList.remove('shake');
    void card.offsetWidth;
    card.classList.add('shake');
    input.value = '';
    input.focus();
  }
});
