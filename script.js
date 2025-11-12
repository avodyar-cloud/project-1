// Data Management
let data = {
    subjects: [],
    notes: {}
};

let currentSubject = null;
let editingNoteId = null;

// Dark Mode Management
function loadDarkModePreference() {
    const saved = localStorage.getItem('darkModeEnabled');
    return saved ? JSON.parse(saved) : false;
}

function saveDarkModePreference(isDarkMode) {
    localStorage.setItem('darkModeEnabled', JSON.stringify(isDarkMode));
}

function toggleDarkMode() {
    const isDarkMode = document.body.classList.toggle('dark-mode');
    saveDarkModePreference(isDarkMode);
    updateThemeToggleButton();
}

function updateThemeToggleButton() {
    const btn = document.getElementById('themeToggleBtn');
    if (btn) {
        btn.textContent = document.body.classList.contains('dark-mode') ? '☀️' : '🌙';
    }
}

function initDarkMode() {
    if (loadDarkModePreference()) {
        document.body.classList.add('dark-mode');
    }
    updateThemeToggleButton();
    document.getElementById('themeToggleBtn')?.addEventListener('click', toggleDarkMode);
}

// Mobile Optimizations
function handleMobileOptimizations() {
    // Prevent zoom on input focus on iOS
    const inputs = document.querySelectorAll('input, textarea');
    inputs.forEach(input => {
        input.addEventListener('focus', function() {
            if (window.innerWidth <= 768) {
                // Scroll into view smoothly
                setTimeout(() => {
                    this.scrollIntoView({ behavior: 'smooth', block: 'center' });
                }, 300);
            }
        });
    });

    // Handle mobile keyboard visibility
    let viewportHeight = window.innerHeight;
    window.visualViewport?.addEventListener('resize', () => {
        const currentHeight = window.visualViewport.height;
        if (currentHeight < viewportHeight * 0.75) {
            // Keyboard is open
            document.body.style.overflow = 'hidden';
        } else {
            // Keyboard is closed
            document.body.style.overflow = 'auto';
        }
    });

    // Prevent double-tap zoom on buttons
    const buttons = document.querySelectorAll('button, .subject-item');
    buttons.forEach(btn => {
        btn.addEventListener('touchstart', function(e) {
            if (e.touches.length > 1) {
                e.preventDefault();
            }
        }, { passive: false });
    });
}

// Load data from localStorage
function loadData() {
    const saved = localStorage.getItem('studyNotes');
    if (saved) {
        data = JSON.parse(saved);
    }
}

// Save data to localStorage
function saveData() {
    localStorage.setItem('studyNotes', JSON.stringify(data));
}

// Initialize the app
function init() {
    initDarkMode();
    loadData();
    renderSubjects();
    attachEventListeners();
    handleMobileOptimizations();

    // Load first subject if exists
    if (data.subjects.length > 0) {
        selectSubject(data.subjects[0]);
    }
}

// Event Listeners
function attachEventListeners() {
    document.getElementById('addSubjectBtn').addEventListener('click', openSubjectModal);
    document.getElementById('subjectForm').addEventListener('submit', handleAddSubject);
    document.getElementById('addNoteBtn').addEventListener('click', openNoteModal);
    document.getElementById('noteForm').addEventListener('submit', handleAddNote);
    document.getElementById('searchBar').addEventListener('input', handleSearch);
    // Also update top line numbers/result when user types in the top input
    const searchBar = document.getElementById('searchBar');
    if (searchBar) searchBar.addEventListener('input', updateTopLineResult);

    // Tool buttons
    const openChatBtn = document.getElementById('openChatBtn');
    if (openChatBtn) openChatBtn.addEventListener('click', () => { toggleToolPanel('chat'); renderChat(); });
    const openAnalyzerBtn = document.getElementById('openAnalyzerBtn'); if (openAnalyzerBtn) openAnalyzerBtn.addEventListener('click', () => toggleToolPanel('analyzer'));
    const openAssistantBtn = document.getElementById('openAssistantBtn'); if (openAssistantBtn) openAssistantBtn.addEventListener('click', () => toggleToolPanel('assistant'));
    const openCalcBtn = document.getElementById('openCalcBtn'); if (openCalcBtn) openCalcBtn.addEventListener('click', () => toggleToolPanel('calc'));

    // Chat handlers
    const sendChatBtn = document.getElementById('sendChatBtn'); if (sendChatBtn) sendChatBtn.addEventListener('click', sendChatMessage);
    const chatInput = document.getElementById('chatInput'); if (chatInput) chatInput.addEventListener('keypress', (e) => { if (e.key === 'Enter') sendChatMessage(); });

    // Analyzer handlers
    document.getElementById('csvFileInput').addEventListener('change', handleCsvUpload);

    // Assistant handlers
    document.getElementById('addTaskBtn').addEventListener('click', openAddTaskPrompt);

    // Calculator init
    initCalculator();
}

// Parse first two numbers from the top line input and display them with the result
function updateTopLineResult(e) {
    const val = (e && e.target ? e.target.value : document.getElementById('searchBar').value) || '';
    // Find numbers (integers or floats, allow - and decimal)
    const matches = val.match(/-?\d+(?:\.\d+)?/g) || [];
    const first = matches[0] ? Number(matches[0]) : null;
    const second = matches[1] ? Number(matches[1]) : null;

    const container = document.getElementById('topLineResult');
    if (!container) return;

    if (first === null && second === null) {
        container.textContent = '';
        return;
    }

    let parts = [];
    if (first !== null) parts.push(`الرقم الأول: ${first}`);
    if (second !== null) parts.push(`الرقم الثاني: ${second}`);
    if (first !== null && second !== null) parts.push(`الناتج (جمع): ${Math.round((first + second) * 10000000) / 10000000}`);

    container.textContent = parts.join(' — ');
}

// Subject Management
function renderSubjects() {
    const subjectList = document.getElementById('subjectList');
    const noSubjects = document.getElementById('noSubjects');

    subjectList.innerHTML = '';

    if (data.subjects.length === 0) {
        noSubjects.style.display = 'block';
        return;
    }

    noSubjects.style.display = 'none';

    data.subjects.forEach(subject => {
        const li = document.createElement('li');
        li.className = 'subject-item' + (currentSubject === subject ? ' active' : '');
        
        const noteCount = (data.notes[subject] || []).length;
        li.innerHTML = `
            <span onclick="selectSubject('${subject}')" style="flex: 1; cursor: pointer;">
                <span>${subject}</span>
                <span class="subject-count">${noteCount} ${noteCount === 1 ? 'ملاحظة' : 'ملاحظات'}</span>
            </span>
            <button class="btn-delete-subject" onclick="deleteSubject('${subject}')">حذف</button>
        `;
        
        subjectList.appendChild(li);
    });
}

function openSubjectModal() {
    document.getElementById('subjectForm').reset();
    document.getElementById('subjectModal').classList.add('active');
    document.getElementById('subjectName').focus();
}

function closeSubjectModal() {
    document.getElementById('subjectModal').classList.remove('active');
}

function handleAddSubject(e) {
    e.preventDefault();
    const subjectName = document.getElementById('subjectName').value.trim();

    if (subjectName === '') {
        alert('الرجاء إدخال اسم المادة');
        return;
    }

    if (data.subjects.includes(subjectName)) {
        alert('هذه المادة موجودة بالفعل');
        return;
    }

    data.subjects.push(subjectName);
    data.notes[subjectName] = [];
    saveData();
    renderSubjects();
    closeSubjectModal();
    selectSubject(subjectName);
    showNotification(`تم إنشاء المادة "${subjectName}" بنجاح! 📚`);
}

function deleteSubject(subject) {
    if (confirm(`هل أنت متأكد من حذف المادة "${subject}" وجميع ملاحظاتها؟`)) {
        data.subjects = data.subjects.filter(s => s !== subject);
        delete data.notes[subject];
        saveData();
        renderSubjects();

        if (currentSubject === subject) {
            currentSubject = null;
            document.getElementById('contentPlaceholder').style.display = 'block';
            document.getElementById('contentArea').style.display = 'none';
            document.getElementById('searchBar').value = '';
        }

        showNotification(`تم حذف المادة بنجاح! 🗑️`);
    }
}

function selectSubject(subject) {
    currentSubject = subject;
    editingNoteId = null;
    document.getElementById('searchBar').value = '';
    renderSubjects();
    renderNotes();
    document.getElementById('contentPlaceholder').style.display = 'none';
    document.getElementById('contentArea').style.display = 'block';
    document.getElementById('currentSubject').textContent = subject;
}

// Note Management
function renderNotes(notes = null) {
    const notesList = document.getElementById('notesList');
    const notesToDisplay = notes || (data.notes[currentSubject] || []);

    notesList.innerHTML = '';

    if (notesToDisplay.length === 0) {
        notesList.innerHTML = '<div class="empty-state"><p>لا توجد ملاحظات بعد. أنشئ أولى ملاحظاتك!</p></div>';
        return;
    }

    notesToDisplay.forEach((note, index) => {
        const noteCard = document.createElement('div');
        noteCard.className = 'note-card';
        noteCard.style.animationDelay = `${index * 0.1}s`;
        noteCard.innerHTML = `
            <div class="note-title">${escapeHtml(note.title)}</div>
            <div class="note-content">${escapeHtml(note.content).substring(0, 200)}${note.content.length > 200 ? '...' : ''}</div>
            <div class="note-actions">
                <button class="btn-edit" onclick="editNote('${note.id}')">تعديل</button>
                <button class="btn-delete" onclick="deleteNote('${note.id}')">حذف</button>
            </div>
        `;
        notesList.appendChild(noteCard);
    });
}

function openNoteModal() {
    editingNoteId = null;
    document.getElementById('noteForm').reset();
    document.getElementById('noteModalTitle').textContent = 'إضافة ملاحظة جديدة';
    document.getElementById('noteModal').classList.add('active');
    document.getElementById('noteTitle').focus();
}

function closeNoteModal() {
    document.getElementById('noteModal').classList.remove('active');
    editingNoteId = null;
}

function handleAddNote(e) {
    e.preventDefault();
    const title = document.getElementById('noteTitle').value.trim();
    const content = document.getElementById('noteContent').value.trim();

    if (title === '' || content === '') {
        alert('الرجاء ملء العنوان والمحتوى');
        return;
    }

    if (editingNoteId) {
        // Edit existing note
        const note = data.notes[currentSubject].find(n => n.id === editingNoteId);
        if (note) {
            note.title = title;
            note.content = content;
        }
    } else {
        // Create new note
        const newNote = {
            id: 'note_' + Date.now(),
            title: title,
            content: content,
            createdAt: new Date().toLocaleString()
        };
        data.notes[currentSubject].push(newNote);
    }

    saveData();
    renderNotes();
    closeNoteModal();
    renderSubjects(); // Update note count
    showNotification(editingNoteId ? 'تم تحديث الملاحظة بنجاح! ✓' : 'تم إنشاء الملاحظة بنجاح! ✓');
}

function editNote(noteId) {
    const note = data.notes[currentSubject].find(n => n.id === noteId);
    if (note) {
        editingNoteId = noteId;
        document.getElementById('noteTitle').value = note.title;
        document.getElementById('noteContent').value = note.content;
        document.getElementById('noteModalTitle').textContent = 'Edit Note';
        document.getElementById('noteModal').classList.add('active');
        document.getElementById('noteTitle').focus();
    }
}

function deleteNote(noteId) {
    if (confirm('هل أنت متأكد من حذف هذه الملاحظة؟')) {
        data.notes[currentSubject] = data.notes[currentSubject].filter(n => n.id !== noteId);
        saveData();
        renderNotes();
        renderSubjects(); // Update note count
        showNotification('تم حذف الملاحظة بنجاح! 🗑️');
    }
}

// Search functionality
function handleSearch(e) {
    const searchTerm = e.target.value.trim().toLowerCase();

    if (searchTerm === '') {
        renderNotes();
        return;
    }

    const filteredNotes = data.notes[currentSubject].filter(note => {
        return note.title.toLowerCase().includes(searchTerm) || 
               note.content.toLowerCase().includes(searchTerm);
    });

    renderNotes(filteredNotes);
}

// Utility function to escape HTML
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Notification system
function showNotification(message) {
    const notification = document.createElement('div');
    notification.className = 'success-message';
    notification.textContent = message;
    notification.style.position = 'fixed';
    notification.style.top = '20px';
    notification.style.right = '20px';
    notification.style.zIndex = '2000';
    notification.style.maxWidth = '300px';
    
    document.body.appendChild(notification);

    // Auto-remove after 3 seconds
    setTimeout(() => {
        notification.style.animation = 'slideOut 0.4s ease-out forwards';
        setTimeout(() => {
            notification.remove();
        }, 400);
    }, 3000);
}

// Close modals when clicking outside
window.addEventListener('click', (e) => {
    const subjectModal = document.getElementById('subjectModal');
    const noteModal = document.getElementById('noteModal');

    if (e.target === subjectModal) {
        closeSubjectModal();
    }
    if (e.target === noteModal) {
        closeNoteModal();
    }
});

// Initialize app on page load
document.addEventListener('DOMContentLoaded', init);

// ---------------------- Tools Implementation ----------------------
// Simple panel toggle
function toggleToolPanel(tool) {
    const panels = ['chat', 'analyzer', 'assistant', 'calc'];
    panels.forEach(p => {
        const el = document.getElementById(p + 'Panel');
        if (!el) return;
        el.style.display = (p === tool ? 'block' : 'none');
        // remove any fullscreen class when switching
        el.classList.remove('panel-fullscreen');
    });
    // Ensure content area visible
    document.getElementById('contentPlaceholder').style.display = 'none';
    document.getElementById('contentArea').style.display = 'block';

    // On small screens, open chat or calc as fullscreen panel
    if (window.innerWidth <= 480 && (tool === 'chat' || tool === 'calc')) {
        const panel = document.getElementById(tool + 'Panel');
        if (panel) {
            panel.classList.add('panel-fullscreen');
            // add a close button if not present
            if (!panel.querySelector('.close-panel-btn')) {
                const closeBtn = document.createElement('button');
                closeBtn.className = 'theme-toggle close-panel-btn';
                closeBtn.title = 'إغلاق';
                closeBtn.innerText = '✕';
                closeBtn.addEventListener('click', () => {
                    panel.style.display = 'none';
                    panel.classList.remove('panel-fullscreen');
                });
                panel.appendChild(closeBtn);
            }
        }
    }
}

// ---------------------- Gemini AI Integration ----------------------
// NOTE: embedding API keys in client-side code exposes them publicly. This is implemented per your request,
// but consider using a server-side proxy for production to keep the key secret and avoid CORS issues.
const GEMINI_API_KEY = 'AIzaSyDv-pGHRro5zQKids7Ev0SHn2LMrOTKgrU'; // provided by user

async function callGemini(promptText) {
    const url = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent';
    const body = {
        contents: [
            { parts: [ { text: promptText } ] }
        ]
    };

    try {
        const res = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-goog-api-key': GEMINI_API_KEY
            },
            body: JSON.stringify(body)
        });

        if (!res.ok) {
            const text = await res.text();
            throw new Error(`Gemini API error ${res.status}: ${text}`);
        }

        const json = await res.json();

        // Robust extraction: recursively collect text leaves (and fields named 'text')
        function collectTexts(obj, out = []) {
            if (obj == null) return out;
            if (typeof obj === 'string') { out.push(obj); return out; }
            if (Array.isArray(obj)) {
                for (const item of obj) collectTexts(item, out);
                return out;
            }
            if (typeof obj === 'object') {
                for (const key of Object.keys(obj)) {
                    try {
                        if (key === 'text' && typeof obj[key] === 'string') out.push(obj[key]);
                        else collectTexts(obj[key], out);
                    } catch (e) { /* ignore */ }
                }
                return out;
            }
            return out;
        }

        const texts = collectTexts(json).filter(t => t && t.trim().length > 0);
        if (texts.length > 0) {
            // pick the longest candidate text as the main reply
            texts.sort((a, b) => b.length - a.length);
            return texts[0];
        }

        // Fallback: try to stringify only the most relevant candidate content if present
        if (json.candidates && json.candidates[0]) {
            try {
                if (json.candidates[0].output) return JSON.stringify(json.candidates[0].output);
                if (json.candidates[0].content) return JSON.stringify(json.candidates[0].content);
            } catch (e) { /* ignore */ }
        }

        return JSON.stringify(json);
    } catch (err) {
        console.error('callGemini error:', err);
        throw err;
    }
}

// --- Chatbot ---
function loadChatHistory() {
    const saved = localStorage.getItem('studyToolsChat');
    return saved ? JSON.parse(saved) : [];
}

function saveChatHistory(history) {
    localStorage.setItem('studyToolsChat', JSON.stringify(history));
}

function renderChat() {
    const win = document.getElementById('chatWindow');
    const history = loadChatHistory();
    win.innerHTML = '';
    history.forEach(msg => {
        const div = document.createElement('div');
        div.className = 'chat-message ' + (msg.role === 'user' ? 'user' : 'bot');
        div.textContent = (msg.role === 'user' ? 'أنت: ' : 'بوت: ') + msg.text;
        win.appendChild(div);
    });
    win.scrollTop = win.scrollHeight;
}

async function sendChatMessage() {
    const input = document.getElementById('chatInput');
    const text = input.value.trim();
    if (!text) return;

    const history = loadChatHistory();
    history.push({ role: 'user', text });
    saveChatHistory(history);
    renderChat();
    input.value = '';

    const win = document.getElementById('chatWindow');
    const loadingDiv = document.createElement('div');
    loadingDiv.className = 'chat-message bot';
    loadingDiv.textContent = '…';
    win.appendChild(loadingDiv);
    win.scrollTop = win.scrollHeight;

    try {
        const aiReply = await callGemini(text);
        loadingDiv.textContent = aiReply;
        history.push({ role: 'bot', text: aiReply });
        saveChatHistory(history);
        renderChat();
    } catch (err) {
        // fallback simple reply
        let reply = 'آسف، لا أفهم ذلك جيدًا. جرب سؤالًا آخر.';
        if (/سلام|مرحبا|أهلًا/i.test(text)) reply = 'مرحبا! كيف يمكنني مساعدتك اليوم؟';
        else if (/مساعدة|كيف|ماذا تفعل/i.test(text)) reply = 'أنا بوت تجريبي: أستطيع الإجابة بشكل بسيط، أو تحليل ملاحظاتك، أو تشغيل الآلة الحاسبة.';
        else if (/ملخص|تلخيص/i.test(text)) reply = 'أرسِل ملاحظة أو نصًا وسأعطيك ملخصًا (تجريبي).';

        loadingDiv.textContent = reply;
        history.push({ role: 'bot', text: reply });
        saveChatHistory(history);
        renderChat();
        showNotification('Gemini API call failed; showing offline fallback.');
    }
}

// --- CSV Analyzer (client-side) ---
function handleCsvUpload(e) {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = function(ev) {
        const text = ev.target.result;
        const rows = text.split(/\r?\n/).filter(r => r.trim() !== '');
        const headers = rows[0].split(',').map(h => h.trim());
        const dataRows = rows.slice(1).map(r => r.split(',').map(c => c.trim()));
        const result = {
            rows: dataRows.length,
            cols: headers.length,
            headers
        };
        const container = document.getElementById('analyzerResult');
        container.innerHTML = `<p>الأسطر: ${result.rows}, الأعمدة: ${result.cols}</p><p>العناوين: ${headers.join(', ')}</p><div id="analyzerAiResult">جاري تحليل البيانات بواسطة AI…</div>`;

        // Build a concise prompt for the AI with headers and up to 5 sample rows
        const sampleRows = dataRows.slice(0, 5).map(r => r.join(', ')).join('\n');
        const prompt = `أنت محلل بيانات مفيد. أعرض ملخصًا قصيرًا باللغة العربية يحتوي على: وصف الأعمدة، أنواع البيانات المتوقعة، وأي رؤى أو مقاييس بسيطة (مثل المتوسط والانحراف المعياري) للأعمدة الرقمية، بناء على العناوين والعينات التالية:\n\nعناوين: ${headers.join(', ')}\n\nعينة صفوف:\n${sampleRows}`;

        // Call Gemini and show the result
        callGemini(prompt).then(aiText => {
            const aiDiv = document.getElementById('analyzerAiResult');
            if (aiDiv) aiDiv.textContent = aiText;
        }).catch(err => {
            const aiDiv = document.getElementById('analyzerAiResult');
            if (aiDiv) aiDiv.textContent = 'فشل اتصال AI؛ تم إظهار الملخص المحلي فقط.';
            console.error('CSV Gemini error:', err);
        });
    };
    reader.readAsText(file);
}

// --- Personal Assistant (tasks) ---
function loadTasks() {
    const saved = localStorage.getItem('studyAssistantTasks');
    return saved ? JSON.parse(saved) : [];
}

function saveTasks(tasks) {
    localStorage.setItem('studyAssistantTasks', JSON.stringify(tasks));
}

function renderTasks() {
    const list = document.getElementById('taskList');
    const tasks = loadTasks();
    list.innerHTML = '';
    tasks.forEach((t, i) => {
        const li = document.createElement('li');
        li.innerHTML = `<span>${escapeHtml(t.text)}</span><div><button onclick="completeTask(${i})">✓</button> <button onclick="deleteTask(${i})">✖</button></div>`;
        list.appendChild(li);
    });
}

function openAddTaskPrompt() {
    const text = prompt('أدخل وصف المهمة أو اكتب "ai" للحصول على اقتراحات ذكية من AI:');
    if (text === null) return; // user cancelled
    const trimmed = text.trim();
    if (trimmed.toLowerCase() === 'ai') {
        // Gather context: current subject notes (first few)
        const notes = (data.notes[currentSubject] || []).slice(0, 5).map(n => `- ${n.title}: ${n.content.substring(0,200)}`).join('\n');
        const prompt = `أنت مساعد دراسي ذكي. اقترح 3 مهام دراسية قابلة للتنفيذ باللغة العربية لبناء خطة دراسة سريعة بناءً على الملاحظات التالية من مادة \"${currentSubject || 'عام'}\":\n${notes}`;
        try {
            callGemini(prompt).then(aiText => {
                // show suggestions and ask to add
                alert('اقتراحات AI:\n\n' + aiText);
                if (confirm('هل تريد إضافة هذه الاقتراحات كمهمات (كل سطر مهمة)؟')) {
                    const lines = aiText.split(/\r?\n/).map(l => l.trim()).filter(l => l.length > 0);
                    const tasks = loadTasks();
                    lines.forEach(l => tasks.push({ text: l, done: false, id: 'task_' + Date.now() + Math.random().toString(36).substr(2,4) }));
                    saveTasks(tasks);
                    renderTasks();
                }
            }).catch(err => {
                console.error('Assistant Gemini error:', err);
                alert('فشل الاتصال بـ AI. لا يمكن جلب الاقتراحات الآن.');
            });
        } catch (err) {
            console.error(err);
        }
        return;
    }

    if (!trimmed) return;
    const tasks = loadTasks();
    tasks.push({ text: trimmed, done: false, id: 'task_' + Date.now() });
    saveTasks(tasks);
    renderTasks();
}

function completeTask(index) {
    const tasks = loadTasks();
    if (tasks[index]) tasks[index].done = !tasks[index].done;
    saveTasks(tasks);
    renderTasks();
}

function deleteTask(index) {
    const tasks = loadTasks();
    tasks.splice(index, 1);
    saveTasks(tasks);
    renderTasks();
}

// Expose some functions to global for inline onclick handlers
window.completeTask = completeTask;
window.deleteTask = deleteTask;

// --- Scientific Calculator ---
let calcMemory = 0;
let calcHistory = [];
let currentOp = null;
let prevValue = 0;
let shouldResetDisplay = false;
let displayExpression = ''; // لتتبع التعبير الرياضي الكامل

function initCalculator() {
    // Professional scientific calculator layout
    // 6 rows × 5 columns = 30 buttons
    const buttons = [
        // Row 1: Scientific functions
        { text: 'sin', type: 'func', class: 'calc-func' },
        { text: 'cos', type: 'func', class: 'calc-func' },
        { text: 'tan', type: 'func', class: 'calc-func' },
        { text: 'log', type: 'func', class: 'calc-func' },
        { text: 'ln', type: 'func', class: 'calc-func' },
        
        // Row 2: Constants and powers
        { text: 'π', type: 'const', class: 'calc-func' },
        { text: 'e', type: 'const', class: 'calc-func' },
        { text: '√', type: 'func', class: 'calc-func' },
        { text: 'x²', type: 'func', class: 'calc-func' },
        { text: 'x³', type: 'func', class: 'calc-func' },
        
        // Row 3: Numbers and operations
        { text: '7', type: 'num', class: 'calc-num' },
        { text: '8', type: 'num', class: 'calc-num' },
        { text: '9', type: 'num', class: 'calc-num' },
        { text: '÷', type: 'op', class: 'calc-operator', op: '/' },
        { text: 'DEL', type: 'del', class: 'calc-clear' },
        
        // Row 4
        { text: '4', type: 'num', class: 'calc-num' },
        { text: '5', type: 'num', class: 'calc-num' },
        { text: '6', type: 'num', class: 'calc-num' },
        { text: '×', type: 'op', class: 'calc-operator', op: '*' },
        { text: 'C', type: 'clear', class: 'calc-clear' },
        
        // Row 5
        { text: '1', type: 'num', class: 'calc-num' },
        { text: '2', type: 'num', class: 'calc-num' },
        { text: '3', type: 'num', class: 'calc-num' },
        { text: '−', type: 'op', class: 'calc-operator', op: '-' },
        { text: 'M+', type: 'mem', class: 'calc-func' },
        
        // Row 6
        { text: '0', type: 'num', class: 'calc-num' },
        { text: '.', type: 'num', class: 'calc-num' },
        { text: '+', type: 'op', class: 'calc-operator', op: '+' },
        { text: '(', type: 'paren', class: 'calc-num' },
        { text: '=', type: 'equal', class: 'calc-equal' }
    ];
    
    const container = document.getElementById('calcButtons');
    if (!container) return;
    container.innerHTML = '';
    
    buttons.forEach(b => {
        const btn = document.createElement('button');
        btn.textContent = b.text;
        btn.className = b.class;
        btn.dataset.op = b.op || '';
        btn.addEventListener('click', () => handleCalcInput(b.text, b.type, b.op));
        container.appendChild(btn);
    });
    
    renderCalcDisplay('0');
}

function renderCalcDisplay(val) {
    const display = document.getElementById('calcDisplay');
    if (display) {
        display.value = val || '0';
    }
}

function updateMemoryDisplay() {
    const memDisplay = document.getElementById('calcMemoryDisplay');
    if (memDisplay) {
        memDisplay.textContent = calcMemory !== 0 ? `M: ${calcMemory}` : '';
    }
}

function updateExpressionDisplay() {
    const exprDisplay = document.getElementById('calcExpressionDisplay');
    if (exprDisplay) {
        exprDisplay.textContent = displayExpression;
    }
}

function handleCalcInput(token, type, op) {
    const display = document.getElementById('calcDisplay');
    if (!display) return;
    
    let val = display.value;
    
    // Clear button
    if (type === 'clear') {
        renderCalcDisplay('0');
        displayExpression = '';
        calcHistory = [];
        currentOp = null;
        prevValue = 0;
        shouldResetDisplay = false;
        updateExpressionDisplay();
        return;
    }
    
    // Delete last character
    if (type === 'del') {
        if (val.length > 1) {
            renderCalcDisplay(val.slice(0, -1));
        } else {
            renderCalcDisplay('0');
        }
        return;
    }
    
    // Memory functions
    if (type === 'mem') {
        try {
            const numVal = parseFloat(val);
            calcMemory += numVal;
            updateMemoryDisplay();
        } catch (err) {
            // ignore
        }
        return;
    }
    
    // Numbers
    if (type === 'num') {
        if (token === '.' && val.includes('.')) {
            return; // Prevent multiple decimals
        }
        if (shouldResetDisplay && token !== '.') {
            renderCalcDisplay(token);
            shouldResetDisplay = false;
        } else if (val === '0' && token !== '.') {
            renderCalcDisplay(token);
        } else {
            renderCalcDisplay(val + token);
        }
        updateExpressionDisplay();
        return;
    }
    
    // Operators
    if (type === 'op') {
        const currentVal = parseFloat(val);
        
        // إضافة الرقم الحالي والعملية إلى التعبير
        if (displayExpression === '') {
            displayExpression = currentVal + ' ' + token + ' ';
        } else if (!shouldResetDisplay) {
            // حساب العملية السابقة
            const result = calculate(prevValue, currentVal, currentOp);
            displayExpression = result + ' ' + token + ' ';
            renderCalcDisplay(String(Math.round(result * 10000000) / 10000000));
            prevValue = result;
        } else {
            // تغيير العملية
            displayExpression = displayExpression.slice(0, -3) + token + ' ';
        }
        
        prevValue = parseFloat(displayExpression.split(' ')[0]);
        currentOp = op;
        shouldResetDisplay = true;
        updateExpressionDisplay();
        return;
    }
    
    // Scientific functions
    if (type === 'func') {
        if (['sin', 'cos', 'tan'].includes(token)) {
            try {
                const angle = parseFloat(val);
                const result = token === 'sin' ? Math.sin(angle) :
                              token === 'cos' ? Math.cos(angle) :
                              Math.tan(angle);
                renderCalcDisplay(String(Math.round(result * 10000000) / 10000000));
                shouldResetDisplay = true;
            } catch (err) {
                renderCalcDisplay('خطأ');
            }
        } else if (token === 'log') {
            try {
                const result = Math.log10(parseFloat(val));
                renderCalcDisplay(String(Math.round(result * 10000000) / 10000000));
                shouldResetDisplay = true;
            } catch (err) {
                renderCalcDisplay('خطأ');
            }
        } else if (token === 'ln') {
            try {
                const result = Math.log(parseFloat(val));
                renderCalcDisplay(String(Math.round(result * 10000000) / 10000000));
                shouldResetDisplay = true;
            } catch (err) {
                renderCalcDisplay('خطأ');
            }
        } else if (token === '√') {
            try {
                const result = Math.sqrt(parseFloat(val));
                renderCalcDisplay(String(Math.round(result * 10000000) / 10000000));
                shouldResetDisplay = true;
            } catch (err) {
                renderCalcDisplay('خطأ');
            }
        } else if (token === 'x²') {
            try {
                const num = parseFloat(val);
                const result = num * num;
                renderCalcDisplay(String(Math.round(result * 10000000) / 10000000));
                shouldResetDisplay = true;
            } catch (err) {
                renderCalcDisplay('خطأ');
            }
        } else if (token === 'x³') {
            try {
                const num = parseFloat(val);
                const result = num * num * num;
                renderCalcDisplay(String(Math.round(result * 10000000) / 10000000));
                shouldResetDisplay = true;
            } catch (err) {
                renderCalcDisplay('خطأ');
            }
        }
        return;
    }
    
    // Constants
    if (type === 'const') {
        if (token === 'π') {
            renderCalcDisplay(String(Math.PI));
            shouldResetDisplay = true;
        } else if (token === 'e') {
            renderCalcDisplay(String(Math.E));
            shouldResetDisplay = true;
        }
        return;
    }
    
    // Parentheses
    if (type === 'paren') {
        renderCalcDisplay(val + token);
        return;
    }
    
    // Equal sign
    if (type === 'equal') {
        if (currentOp !== null) {
            const currentVal = parseFloat(val);
            const result = calculate(prevValue, currentVal, currentOp);
            const finalResult = Math.round(result * 10000000) / 10000000;
            
            // عرض التعبير الكامل + النتيجة
            displayExpression += currentVal + ' = ' + finalResult;
            updateExpressionDisplay();
            renderCalcDisplay(String(finalResult));
            
            calcHistory.push(displayExpression);
            
            currentOp = null;
            displayExpression = '';
            shouldResetDisplay = true;
        }
        return;
    }
}

function calculate(a, b, op) {
    switch(op) {
        case '+':
            return a + b;
        case '-':
            return a - b;
        case '*':
            return a * b;
        case '/':
            return b !== 0 ? a / b : 0;
        default:
            return b;
    }
}

// Render initial tool states after load
function initTools() {
    renderChat();
    renderTasks();
    initCalculator();
}

// call initTools when app initializes
const _origInit = init;
init = function() { _origInit(); initTools(); };
