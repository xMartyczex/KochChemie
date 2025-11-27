/* ============================================= */
/*       KOCH CHEMIE DETAILING BEAST 2.0        */
/*                script.js                      */
/* ============================================= */

let timerInterval = null;
let timerSeconds = 0;
let timerCircle = null;
let totalWashTime = 0;
let washStartTime = 0;
let washCount = parseInt(localStorage.getItem('koch-washCount') || '0');

// ==================== TOGGLE PANELY ====================
function toggleSidebar() {
    document.getElementById('sidebar').classList.toggle('open');
    closeOthers('sidebar');
}
function toggleChecklist() {
    document.getElementById('checklist').classList.toggle('open');
    closeOthers('checklist');
}
function toggleTools() {
    document.getElementById('toolsPanel').classList.toggle('open');
    closeOthers('toolsPanel');
}
function closeOthers(except) {
    const panels = ['sidebar', 'checklist', 'toolsPanel'];
    panels.forEach(p => {
        if (p !== except) document.getElementById(p).classList.remove('open');
    });
}

// ==================== DARK / LIGHT MODE ====================
function toggleTheme() {
    document.body.classList.toggle('light');
    localStorage.setItem('koch-theme', document.body.classList.contains('light') ? 'light' : 'dark');
}
if (localStorage.getItem('koch-theme') === 'light') document.body.classList.add('light');

// ==================== TIMER (jednotlivé kroky) ====================
function startTimer(minutes, btn) {
    if (minutes === 0) return;
    timerSeconds = minutes * 60;
    document.getElementById('timerOverlay').style.display = 'flex';
    timerCircle = document.getElementById('timerPath');

    updateTimerDisplay();

    timerInterval = setInterval(() => {
        timerSeconds--;
        updateTimerDisplay();
        if (timerSeconds <= 0) {
            clearInterval(timerInterval);
            toast('Čas vypršel! Opláchni!');
            vibrate();
            stopTimer();
        }
    }, 1000);
}

function updateTimerDisplay() {
    const mins = String(Math.floor(timerSeconds / 60)).padStart(2, '0');
    const secs = String(timerSeconds % 60).padStart(2, '0');
    document.getElementById('timerText').textContent = `${mins}:${secs}`;

    const circumference = 283;
    const offset = circumference - (timerSeconds / (timerSeconds + 1)) * circumference;
    timerCircle.style.strokeDashoffset = offset;
}

function stopTimer() {
    clearInterval(timerInterval);
    document.getElementById('timerOverlay').style.display = 'none';
}

// ==================== TOAST + VIBRACE ====================
function toast(message) {
    const t = document.getElementById('toast');
    t.textContent = message;
    t.classList.add('show');
    setTimeout(() => t.classList.remove('show'), 3500);
    if (navigator.vibrate) navigator.vibrate([200, 100, 200]);
}
function vibrate() {
    if (navigator.vibrate) navigator.vibrate([300, 100, 300, 100, 500]);
}

// ==================== INVENTÁŘ – owned produkty ====================
function updateOwnedCount() {
    const owned = document.querySelectorAll('.product-item.owned').length;
    document.getElementById('owned-count').textContent = owned;
    const names = [...document.querySelectorAll('.product-item.owned')].map(el => el.dataset.name);
    localStorage.setItem('koch-owned', JSON.stringify(names));
}
document.querySelectorAll('.product-item').forEach(item => {
    const saved = JSON.parse(localStorage.getItem('koch-owned') || '[]');
    if (saved.includes(item.dataset.name)) item.classList.add('owned');

    let timer;
    item.addEventListener('click', e => {
        if (e.target.tagName !== 'I') {
            const ratio = item.dataset.ratio || 10;
            document.getElementById('ratio').value = ratio;
            document.getElementById('selected-product').textContent = `Zvoleno: ${item.dataset.name}`;
            recalc();
            toggleSidebar();
        }
    });
    const toggle = () => { item.classList.toggle('owned'); updateOwnedCount(); };
    item.addEventListener('mousedown', () => timer = setTimeout(toggle, 800));
    item.addEventListener('mouseup', () => clearTimeout(timer));
    item.addEventListener('mouseleave', () => clearTimeout(timer));
    item.addEventListener('touchstart', e => { timer = setTimeout(() => { toggle(); e.preventDefault(); }, 800); }, {passive: false});
    item.addEventListener('touchend', () => clearTimeout(timer));
});

// ==================== KALKULAČKA ŘEDĚNÍ ====================
function recalc() {
    const vol = parseInt(document.getElementById('volume').value) || 1000;
    const ratio = parseInt(document.getElementById('ratio').value) || 10;

    // Zobraz objem a poměr
    document.getElementById('vol_label').textContent = vol.toLocaleString('cs-CZ');
    document.getElementById('ratio_label').textContent = ratio;

    // Výpočet: 1 díl chemie + ratio dílů vody
    const totalParts = ratio + 1;
    const chem = Math.round(vol / totalParts);
    const water = vol - chem;

    // Výstup
    document.getElementById('water_out').textContent = water.toLocaleString('cs-CZ');
    document.getElementById('chem_out').textContent = chem.toLocaleString('cs-CZ');

    // QR kód
    const productName = document.getElementById('selected-product').textContent.trim();
    const qrText = `${productName}\n${chem} ml chemie + ${water} ml vody\n→ ${vol} ml láhev (1:${ratio})\n${new Date().toLocaleDateString('cs-CZ')}`;

    document.getElementById('qrcode').innerHTML = '';
    new QRCode(document.getElementById('qrcode'), {
        text: qrText,
        width: 200,
        height: 200,
        colorDark: "#000000",
        colorLight: "#ffffff",
        correctLevel: QRCode.CorrectLevel.H
    });
}

function setPreset(r) { document.getElementById('ratio').value = r; recalc(); }
function setVolume(v) {
    document.getElementById('volume').value = v;
    document.querySelectorAll('.qv-btn').forEach(b => b.classList.remove('active'));
    document.querySelectorAll('.qv-btn').forEach(b => { if (parseInt(b.textContent) === v) b.classList.add('active'); });
    recalc();
}

// Režimy Jemné / Běžné / Silné
document.getElementById('jemne').onclick = () => { setPreset(20); activateMode('jemne'); };
document.getElementById('bezne').onclick = () => { setPreset(10); activateMode('bezne'); };
document.getElementById('silne').onclick = () => { setPreset(5); activateMode('silne'); };
function activateMode(id) {
    document.querySelectorAll('.mode-btn').forEach(b => b.classList.remove('active'));
    document.getElementById(id).classList.add('active');
}

// Slidery
document.getElementById('volume').oninput = recalc;
document.getElementById('ratio').oninput = recalc;

// ==================== ULOŽENÍ LÁHVE DO HISTORIE ====================
function saveCurrentMix() {
    const mix = {
        name: document.getElementById('selected-product').textContent.trim(),
        chem: document.getElementById('chem_out').textContent,
        water: document.getElementById('water_out').textContent,
        total: document.getElementById('vol_label').textContent,
        ratio: document.getElementById('ratio').value,
        date: new Date().toLocaleString('cs-CZ')
    };
    let history = JSON.parse(localStorage.getItem('koch-history') || '[]');
    history.unshift(mix);
    history = history.slice(0, 20);
    localStorage.setItem('koch-history', JSON.stringify(history));
    loadHistory();
    toast('Láhev uložena do historie!');
}
function loadHistory() {
    const list = document.getElementById('history-list');
    const history = JSON.parse(localStorage.getItem('koch-history') || '[]');
    if (history.length === 0) {
        list.innerHTML = '<p style="text-align:center;color:#666;">Zatím žádné uložené láhve</p>';
        return;
    }
    list.innerHTML = history.map(m => `
        <div class="history-item">
            <strong>${m.name}</strong><br>
            <small>${m.chem} ml chemie + ${m.water} ml vody → ${m.total} ml (1:${m.ratio})</small><br>
            <small style="color:#888;">${m.date}</small>
        </div>
    `).join('');
}

// ==================== CHECKLIST ====================
const tasks = document.querySelectorAll('.task-item');
const totalTasks = tasks.length;
document.getElementById('total-count').textContent = totalTasks;

function updateProgress() {
    const done = document.querySelectorAll('.task-item.done').length;
    document.getElementById('done-count').textContent = done;
    document.getElementById('progress').style.width = (done / totalTasks * 100) + '%';

    localStorage.setItem('koch-checklist', JSON.stringify([...document.querySelectorAll('.task-item.done')].map(t => t.dataset.id)));

    if (done === totalTasks && done > 0) {
        const now = Date.now();
        const last = localStorage.getItem('koch-lastWash');
        const days = last ? Math.round((now - parseInt(last)) / 86400000) : 'poprvé';
        toast(`Auto umyto! (${days === 'poprvé' ? 'poprvé' : days + ' dní od minula'})`);
        localStorage.setItem('koch-lastWash', now);
        washCount++;
        localStorage.setItem('koch-washCount', washCount);
        showStats();
    }
}

function resetChecklist() {
    if (confirm('Opravdu začít nové mytí od nuly?')) {
        tasks.forEach(t => t.classList.remove('done'));
        updateProgress();
        toast('Checklist vynulován');
    }
}

// Načtení uloženého stavu
const savedTasks = JSON.parse(localStorage.getItem('koch-checklist') || '[]');
tasks.forEach(task => {
    if (savedTasks.includes(task.dataset.id)) task.classList.add('done');
    task.addEventListener('click', () => {
        task.classList.toggle('done');
        updateProgress();
    });
});

// ==================== HLASOVÉ FUNKCE ====================
function speakCurrentTask() {
    if (!('speechSynthesis' in window)) { toast('Hlas není podporován'); return; }
    const next = document.querySelector('.task-item:not(.done)');
    if (!next) { toast('Vše hotovo!'); return; }
    const text = next.querySelector('.task-text').innerText;
    const utter = new SpeechSynthesisUtterance(text);
    utter.lang = 'cs-CZ';
    utter.rate = 0.9;
    speechSynthesis.speak(utter);
    toast('Čtu aktuální krok');
}

function startFullTimer() {
    washStartTime = Date.now();
    toast('Celkový čas mytí spuštěn');
}

// ==================== STATISTIKY ====================
function showStats() {
    const last = localStorage.getItem('koch-lastWash');
    const days = last ? Math.round((Date.now() - parseInt(last)) / 86400000) : '-';
    const statsText = `Celkem umytí: ${washCount}\nPoslední mytí: ${days === '-' ? 'nikdy' : days + ' dní zpátky'}`;
    document.getElementById('stats-text').innerText = statsText.replace(/\n/g, ' • ');
}
function exportStats() {
    const data = `Koch Chemie Detailing Beast – Statistiky\n\nCelkem mytí: ${washCount}\nPoslední mytí: ${new Date(parseInt(localStorage.getItem('koch-lastWash') || 0)).toLocaleString('cs-CZ') || 'nikdy'}\n\nGenerováno: ${new Date().toLocaleString('cs-CZ')}`;
    navigator.clipboard.writeText(data);
    toast('Statistiky zkopírovány do schránky!');
}
function clearAllData() {
    if (confirm('Opravdu smazat VŠECHNA data? (včetně historie, checklistu, owned produktů)')) {
        localStorage.clear();
        location.reload();
    }
}

// ==================== ZAVŘENÍ KLIKNUTÍM MIMO ====================
document.addEventListener('click', e => {
    const sidebar = document.getElementById('sidebar');
    const checklist = document.getElementById('checklist');
    const tools = document.getElementById('toolsPanel');
    const menuBtn = document.querySelector('.menu-btn');
    const checkBtn = document.querySelector('.checklist-btn');
    const toolsBtn = document.querySelector('.tools-btn');

    if (!sidebar.contains(e.target) && !menuBtn.contains(e.target) && sidebar.classList.contains('open')) toggleSidebar();
    if (!checklist.contains(e.target) && !checkBtn.contains(e.target) && checklist.classList.contains('open')) toggleChecklist();
    if (!tools.contains(e.target) && !toolsBtn.contains(e.target) && tools.classList.contains('open')) toggleTools();
});

// ==================== INICIALIZACE ====================
recalc();
updateProgress();
updateOwnedCount();
loadHistory();
showStats();

// Hotovo! Teď máš nejlepší detailingový pomocník na světě
console.log('%c KOCH BEAST 2.0 READY ', 'background:#ffd200;color:#000;font-size:20px;padding:10px 20px;');