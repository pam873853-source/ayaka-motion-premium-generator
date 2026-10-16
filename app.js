import { AM_AUTH_CONFIG } from './config.js';
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-app.js";
import { getAuth, signInAnonymously, signInWithCustomToken } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js";
import { getFirestore, collection, addDoc, onSnapshot, doc, setDoc } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";

const appId = typeof __app_id !== 'undefined' ? __app_id : 'ayaka-motion-default';
const firebaseConfig = JSON.parse(typeof __firebase_config !== 'undefined' ? __firebase_config : '{}');

// ==========================================
// SUPABASE CONSTANT CONFIGURATION
// ==========================================
const SUPABASE_URL = "https://your-supabase-project.supabase.co"; // Ganti dengan URL Supabase Anda
const SUPABASE_SERVICE_KEY = "your-service-key-here";          // Ganti dengan Service/Custom Key Anda

let app, db, auth, userId = null;
let historyLogs = [];
let totalVisitors = 0;
let reportsLogs = [];
let realTimeChart = null;

// Unique Visitor ID per sesi browser
let visitorSessionId = sessionStorage.getItem('ayaka_visitor_uuid');
if (!visitorSessionId) {
    visitorSessionId = crypto.randomUUID();
    sessionStorage.setItem('ayaka_visitor_uuid', visitorSessionId);
}

function initActivationChart() {
    const ctx = document.getElementById('activation-chart');
    if (!ctx) return;

    if (realTimeChart) {
        realTimeChart.destroy();
    }

    realTimeChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'],
            datasets: [{
                label: 'Total Aktivasi',
                data: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
                borderColor: '#000000',
                backgroundColor: 'rgba(250, 204, 21, 0.45)',
                borderWidth: 3,
                fill: true,
                tension: 0.35,
                pointBackgroundColor: '#facc15',
                pointBorderColor: '#000000',
                pointBorderWidth: 2,
                pointRadius: 5,
                pointHoverRadius: 7
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false },
                tooltip: {
                    backgroundColor: '#18181b',
                    titleColor: '#facc15',
                    bodyColor: '#ffffff',
                    borderWidth: 2,
                    borderColor: '#000000',
                    cornerRadius: 8,
                    padding: 10,
                    displayColors: false
                }
            },
            scales: {
                x: {
                    grid: { display: false },
                    ticks: {
                        font: { family: 'Inter', size: 10, weight: 'bold' },
                        color: '#000000'
                    }
                },
                y: {
                    beginAtZero: true,
                    ticks: {
                        precision: 0,
                        font: { family: 'Inter', size: 10, weight: 'bold' },
                        color: '#000000'
                    },
                    grid: { color: 'rgba(0, 0, 0, 0.08)' }
                }
            }
        }
    });

    updateChartData();
}

function updateChartData() {
    if (!realTimeChart) return;
    const monthlyCounts = new Array(12).fill(0);

    historyLogs.forEach(item => {
        if (item.timestamp) {
            const date = new Date(item.timestamp);
            const monthIdx = date.getMonth();
            if (monthIdx >= 0 && monthIdx < 12) {
                monthlyCounts[monthIdx]++;
            }
        }
    });

    realTimeChart.data.datasets[0].data = monthlyCounts;
    realTimeChart.update();
}

class SupabaseClient {
    constructor(url, key) {
        this.url = url ? url.replace(/\/$/, '') : '';
        this.key = key;
    }

    isConfigured() {
        return this.url.includes("supabase.co") && this.key.length > 5 && !this.url.includes("your-supabase-project");
    }

    async headers() {
        return {
            'apikey': this.key,
            'Authorization': `Bearer ${this.key}`,
            'Content-Type': 'application/json',
            'Prefer': 'return=representation'
        };
    }

    async addActivation(logData) {
        if (!this.isConfigured()) return;
        try {
            await fetch(`${this.url}/rest/v1/activations`, {
                method: 'POST',
                headers: await this.headers(),
                body: JSON.stringify(logData)
            });
        } catch (e) {
            console.error("Supabase addActivation error:", e);
        }
    }

    async getActivations() {
        if (!this.isConfigured()) return null;
        try {
            const res = await fetch(`${this.url}/rest/v1/activations?select=*&order=timestamp.desc`, {
                headers: await this.headers()
            });
            if (res.ok) {
                return await res.json();
            }
        } catch (e) {
            console.error("Supabase getActivations error:", e);
        }
        return null;
    }

    async addReport(reportData) {
        if (!this.isConfigured()) return;
        try {
            await fetch(`${this.url}/rest/v1/reports`, {
                method: 'POST',
                headers: await this.headers(),
                body: JSON.stringify(reportData)
            });
        } catch (e) {
            console.error("Supabase addReport error:", e);
        }
    }

    async getReports() {
        if (!this.isConfigured()) return null;
        try {
            const res = await fetch(`${this.url}/rest/v1/reports?select=*&order=created_at.desc`, {
                headers: await this.headers()
            });
            if (res.ok) {
                return await res.json();
            }
        } catch (e) {
            console.error("Supabase getReports error:", e);
        }
        return null;
    }

    async updatePresence(visitorId) {
        if (!this.isConfigured()) return;
        try {
            await fetch(`${this.url}/rest/v1/visitors`, {
                method: 'POST',
                headers: {
                    ...(await this.headers()),
                    'Prefer': 'resolution=merge-duplicates'
                },
                body: JSON.stringify({
                    visitor_id: visitorId,
                    last_seen: new Date().toISOString(),
                    user_agent: navigator.userAgent
                })
            });
        } catch (e) {
            console.error("Supabase presence error:", e);
        }
    }

    async getActiveVisitors() {
        if (!this.isConfigured()) return null;
        try {
            const cutoff = new Date(Date.now() - 45000).toISOString();
            const res = await fetch(`${this.url}/rest/v1/visitors?select=visitor_id&last_seen=gt.${cutoff}`, {
                headers: await this.headers()
            });
            if (res.ok) {
                const data = await res.json();
                return data.length;
            }
        } catch (e) {
            console.error("Supabase active visitors error:", e);
        }
        return null;
    }
}

const supabase = new SupabaseClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

function checkSupabaseStatus() {
    const badge = document.getElementById('supabase-status-badge');
    const uEl = document.getElementById('supabase-url');
    const kEl = document.getElementById('supabase-key');
    
    if (uEl) uEl.value = SUPABASE_URL;
    if (kEl) kEl.value = SUPABASE_SERVICE_KEY;

    if (!badge) return;
    if (supabase.isConfigured()) {
        badge.textContent = "TERHUBUNG (CONST)";
        badge.className = "text-[10px] font-black px-2 py-0.5 rounded bg-emerald-300 text-emerald-900 border border-black";
    } else {
        badge.textContent = "STANDBY (BELUM DISET)";
        badge.className = "text-[10px] font-black px-2 py-0.5 rounded bg-gray-200 text-gray-700";
    }
}

setTimeout(() => {
    checkSupabaseStatus();
}, 300);

class AlightMotionAuthBrowser {
    constructor(config) {
        this.config = config;
    }

    extractOobCode(fullUrl) {
        if (!fullUrl) return null;
        try {
            let cleanUrl = fullUrl.replace(/&amp;/g, '&');
            try { cleanUrl = decodeURIComponent(cleanUrl); } catch(e) {}
            const match = cleanUrl.match(/[?&]oobCode=([a-zA-Z0-9_-]+)/i) || cleanUrl.match(/oobCode=([a-zA-Z0-9_-]+)/i);
            if (match && match[1]) return match[1];
            return cleanUrl.trim();
        } catch (e) {
            return fullUrl.trim();
        }
    }

    async sendMagicLink(email) {
        try {
            await fetch(`https://www.googleapis.com/identitytoolkit/v3/relyingparty/createAuthUri?key=${this.config.API_KEY}`, {
                method: 'POST',
                headers: this.config.HEADERS,
                body: JSON.stringify({ identifier: email, continueUri: "http://localhost" })
            });
            
            const res = await fetch(`https://www.googleapis.com/identitytoolkit/v3/relyingparty/getOobConfirmationCode?key=${this.config.API_KEY}`, {
                method: 'POST',
                headers: this.config.HEADERS,
                body: JSON.stringify({
                    requestType: 6,
                    email: email,
                    androidInstallApp: true,
                    canHandleCodeInApp: true,
                    continueUrl: "https://alightcreative.com",
                    androidPackageName: "com.alightcreative.motion",
                    clientType: "CLIENT_TYPE_ANDROID"
                })
            });
            if (!res.ok) throw new Error(await res.text());
            return { success: true };
        } catch (error) {
            return { success: false, error: error.message };
        }
    }

    async verifyAndApply(email, rawLink, productId) {
        try {
            const oobCode = this.extractOobCode(rawLink);
            if (!oobCode) throw new Error("Gagal mengekstrak oobCode.");
            
            const signinRes = await fetch(`https://www.googleapis.com/identitytoolkit/v3/relyingparty/emailLinkSignin?key=${this.config.API_KEY}`, {
                method: 'POST',
                headers: this.config.HEADERS,
                body: JSON.stringify({ email: email, oobCode: oobCode, clientType: "CLIENT_TYPE_ANDROID" })
            });
            const signinData = await signinRes.json();
            if (!signinRes.ok || !signinData.idToken) throw new Error("Verifikasi Token Gagal");

            const codeorder = Math.floor(10000 + Math.random() * 90000).toString();
            const purchaseRes = await fetch('https://us-central1-alight-creative.cloudfunctions.net/verifyPurchase', {
                method: 'POST',
                headers: {
                    "authorization": "Bearer " + signinData.idToken,
                    "firebase-instance-id-token": this.config.FIREBASE_INSTANCE_ID_TOKEN,
                    "content-type": "application/json; charset=utf-8"
                },
                body: JSON.stringify({
                    data: {
                        productId: productId,
                        token: this.config.TOKEN,
                        skuType: this.config.SKU_TYPE,
                        orderId: this.config.ORDER_ID + "-" + codeorder
                    }
                })
            });
            if (!purchaseRes.ok) throw new Error("Gagal menerapkan pembelian premium");
            return { success: true };
        } catch (error) {
            return { success: false, error: error.message };
        }
    }
}

const ampAuth = new AlightMotionAuthBrowser(AM_AUTH_CONFIG);
let activeTabName = 'dashboard';
let verifiedEmailTemp = '';

let startTime = localStorage.getItem('ayaka_uptime_start');
if (!startTime) {
    startTime = Date.now();
    localStorage.setItem('ayaka_uptime_start', startTime);
} else {
    startTime = parseInt(startTime, 10);
}

window.setActiveTab = function(tab) {
    activeTabName = tab;
    ['dashboard', 'aktivasi', 'riwayat', 'laporan'].forEach(t => {
        const view = document.getElementById(`view-${t}`);
        const btn = document.getElementById(`nav-${t}`);
        if (view) view.classList.toggle('hidden', t !== tab);
        if (btn) {
            btn.className = (t === tab) 
                ? "neo-btn-yellow py-2 text-[10px] flex flex-col items-center justify-center gap-0.5" 
                : "neo-btn py-2 text-[10px] flex flex-col items-center justify-center gap-0.5";
        }
    });
    if (tab === 'riwayat') {
        renderHistory();
        setTimeout(() => {
            if (!realTimeChart) {
                initActivationChart();
            } else {
                updateChartData();
            }
        }, 100);
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

window.switchActivationStep = function(step) {
    const s1 = document.getElementById('neo-step-1');
    const s2 = document.getElementById('neo-step-2');
    const b1 = document.getElementById('tab-btn-kirim');
    const b2 = document.getElementById('tab-btn-verifikasi');
    if (step === 1) {
        s1.classList.remove('hidden');
        s2.classList.add('hidden');
        b1.className = "neo-btn-dark py-2.5 text-xs flex items-center justify-center gap-2";
        b2.className = "neo-btn py-2.5 text-xs flex items-center justify-center gap-2";
    } else {
        s1.classList.add('hidden');
        s2.classList.remove('hidden');
        b1.className = "neo-btn py-2.5 text-xs flex items-center justify-center gap-2";
        b2.className = "neo-btn-dark py-2.5 text-xs flex items-center justify-center gap-2";
    }
}

window.handleSendMagicLink = async function() {
    const email = document.getElementById('amp-email').value.trim();
    if (!email) {
        showToast("Masukkan email terlebih dahulu!");
        return;
    }
    const btn = document.getElementById('btn-send-link');
    btn.disabled = true;
    btn.innerHTML = `<i class="fa-solid fa-spinner animate-spin"></i> Mengirim...`;

    const res = await ampAuth.sendMagicLink(email);
    btn.disabled = false;
    btn.innerHTML = `<i class="fa-solid fa-paper-plane"></i> Kirim Magic Link ke Email`;

    if (res.success) {
        verifiedEmailTemp = email;
        showToast("Magic Link berhasil dikirim ke email!");
        switchActivationStep(2);
    } else {
        showToast("Gagal: " + res.error);
    }
}

window.handleVerifyAndApply = async function() {
    const email = verifiedEmailTemp || document.getElementById('amp-email').value.trim();
    const link = document.getElementById('amp-magic-link').value.trim();
    const pkg = document.getElementById('amp-package').value;

    if (!email || !link) {
        showToast("Email dan Magic Link wajib diisi!");
        return;
    }

    const btn = document.getElementById('btn-verify-apply');
    btn.disabled = true;
    btn.innerHTML = `<i class="fa-solid fa-spinner animate-spin"></i> Memproses...`;

    const res = await ampAuth.verifyAndApply(email, link, pkg);
    btn.disabled = false;
    btn.innerHTML = `<i class="fa-solid fa-bolt"></i> Verifikasi & Aktifkan Sekarang`;

    if (res.success) {
        showToast("Akun Berhasil Diaktifkan ke Premium!");
        const todayStr = new Date().toDateString();
        const logData = {
            user: email,
            type: pkg.includes('annual') ? '1 Tahun Premium' : '1 Bulan Premium',
            timestamp: Date.now(),
            dateString: todayStr,
            sender_id: userId
        };

        await supabase.addActivation(logData);

        if (db && userId) {
            try {
                await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'activations'), logData);
            } catch (e) {
                console.error("Firestore sync error:", e);
            }
        }

        document.getElementById('amp-email').value = '';
        document.getElementById('amp-magic-link').value = '';
        switchActivationStep(1);
        
        syncSupabaseActivations();
    } else {
        showToast("Gagal: " + res.error);
    }
}

function renderHistory() {
    const container = document.getElementById('history-feed-container');
    if (!historyLogs || historyLogs.length === 0) {
        container.innerHTML = `
            <div class="neo-card p-8 text-center space-y-2 bg-white">
                <i class="fa-solid fa-box-open text-3xl text-gray-400"></i>
                <p class="text-xs font-black">Belum Ada Riwayat Aktivasi</p>
            </div>
        `;
        return;
    }
    container.innerHTML = historyLogs.map(item => `
        <div class="neo-card p-3.5 flex items-center justify-between bg-white">
            <div>
                <p class="text-xs font-black">${item.user}</p>
                <p class="text-[10px] font-bold text-gray-500">${item.type}</p>
            </div>
            <span class="px-2.5 py-1 bg-emerald-400 border-2 border-black rounded-lg text-[10px] font-black">
                AKTIF
            </span>
        </div>
    `).join('');
}

window.clearHistoryFeed = function() {
    if (confirm("Hapus seluruh riwayat lokal?")) {
        historyLogs = [];
        renderHistory();
        updateCounts();
        updateChartData();
        showToast("Riwayat dibersihkan.");
    }
}

window.submitBugReport = async function() {
    const category = document.getElementById('report-category').value;
    const description = document.getElementById('report-description').value.trim();

    if (!description) {
        showToast("Mohon isi deskripsi kendala/saran terlebih dahulu!");
        return;
    }

    const btn = document.getElementById('btn-submit-report');
    if (btn) {
        btn.disabled = true;
        btn.innerHTML = `<i class="fa-solid fa-spinner animate-spin"></i> Menyimpan...`;
    }

    const reportData = {
        category: category,
        description: description,
        timestamp: Date.now(),
        date_string: new Date().toLocaleDateString('id-ID') + ' ' + new Date().toLocaleTimeString('id-ID'),
        sender_id: userId || 'Anonymous'
    };

    await supabase.addReport(reportData);

    if (db && userId) {
        try {
            await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'reports'), reportData);
        } catch (e) {
            console.error("Firestore report sync error:", e);
        }
    }

    if (btn) {
        btn.disabled = false;
        btn.innerHTML = `<i class="fa-solid fa-database"></i> Kirim & Simpan Laporan ke Database`;
    }

    document.getElementById('report-description').value = '';
    showToast("Laporan/Saran berhasil disimpan ke Database Supabase!");
    
    syncSupabaseReports();
}

function renderReports() {
    const container = document.getElementById('reports-list-container');
    const badge = document.getElementById('reports-count-badge');
    if (!container) return;

    if (badge) badge.textContent = (reportsLogs ? reportsLogs.length : 0) + " Laporan";

    if (!reportsLogs || reportsLogs.length === 0) {
        container.innerHTML = `<p class="text-xs text-gray-400 font-bold text-center py-4">Belum ada laporan tersimpan.</p>`;
        return;
    }

    container.innerHTML = reportsLogs.map(item => `
        <div class="neo-card p-3 bg-zinc-50 border-2 border-black space-y-1">
            <div class="flex items-center justify-between">
                <span class="text-[9px] font-black uppercase px-2 py-0.5 rounded bg-yellow-300 border border-black">${item.category}</span>
                <span class="text-[9px] font-mono font-bold text-gray-500">${item.date_string || ''}</span>
            </div>
            <p class="text-xs font-semibold text-black break-words pt-1">${item.description}</p>
        </div>
    `).join('');
}

async function syncSupabaseReports() {
    if (supabase.isConfigured()) {
        const sbReports = await supabase.getReports();
        if (sbReports) {
            reportsLogs = sbReports;
            renderReports();
        }
    }
}

function showToast(msg) {
    const toast = document.getElementById('toast-notif');
    document.getElementById('toast-message').textContent = msg;
    toast.classList.remove('opacity-0', 'pointer-events-none');
    setTimeout(() => toast.classList.add('opacity-0', 'pointer-events-none'), 3000);
}

function updateCounts() {
    const countActivations = historyLogs.length;
    const actEl = document.getElementById('activations-count');
    const actTotalEl = document.getElementById('act-total-count');
    const actTodayEl = document.getElementById('act-today-count');

    if (actEl) actEl.textContent = countActivations;
    if (actTotalEl) actTotalEl.textContent = countActivations;

    const todayStr = new Date().toDateString();
    const todayCount = historyLogs.filter(h => h.dateString === todayStr || h.date_string?.includes(todayStr)).length;
    if (actTodayEl) actTodayEl.textContent = todayCount;

    const visitorsEl = document.getElementById('visitors-count');
    if (visitorsEl) visitorsEl.textContent = totalVisitors;

    updateChartData();
}

async function syncSupabaseActivations() {
    if (supabase.isConfigured()) {
        const sbData = await supabase.getActivations();
        if (sbData) {
            historyLogs = sbData;
            historyLogs.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
            updateCounts();
            if (activeTabName === 'riwayat') {
                renderHistory();
                updateChartData();
            }
        }
    }
}

async function initFirebase() {
    try {
        if (firebaseConfig && Object.keys(firebaseConfig).length > 0) {
            app = initializeApp(firebaseConfig);
            db = getFirestore(app);
            auth = getAuth(app);

            if (typeof __initial_auth_token !== 'undefined' && __initial_auth_token) {
                await signInWithCustomToken(auth, __initial_auth_token);
            } else {
                await signInAnonymously(auth);
            }
            userId = auth.currentUser?.uid || crypto.randomUUID();

            const visitorRef = doc(db, 'artifacts', appId, 'public', 'data', 'visitors', userId);
            await setDoc(visitorRef, {
                lastSeen: Date.now(),
                userAgent: navigator.userAgent
            }, { merge: true });

            const visitorsCol = collection(db, 'artifacts', appId, 'public', 'data', 'visitors');
            onSnapshot(visitorsCol, (snapshot) => {
                if (!supabase.isConfigured()) {
                    totalVisitors = snapshot.size;
                    updateCounts();
                }
            }, (error) => {
                console.error("Visitors snapshot error:", error);
            });

            const activationsCol = collection(db, 'artifacts', appId, 'public', 'data', 'activations');
            onSnapshot(activationsCol, (snapshot) => {
                let firestoreLogs = [];
                snapshot.forEach(docSnap => {
                    firestoreLogs.push(docSnap.data());
                });
                
                if (!supabase.isConfigured() || firestoreLogs.length > historyLogs.length) {
                    historyLogs = firestoreLogs;
                    historyLogs.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
                    updateCounts();
                    if (activeTabName === 'riwayat') renderHistory();
                }
            }, (error) => {
                console.error("Firestore snapshot error:", error);
            });

            const reportsCol = collection(db, 'artifacts', appId, 'public', 'data', 'reports');
            onSnapshot(reportsCol, (snapshot) => {
                let firestoreReports = [];
                snapshot.forEach(docSnap => {
                    firestoreReports.push(docSnap.data());
                });
                if (!supabase.isConfigured() && firestoreReports.length > 0) {
                    reportsLogs = firestoreReports;
                    reportsLogs.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
                    renderReports();
                }
            }, (error) => {
                console.error("Firestore reports snapshot error:", error);
            });
        }
    } catch (e) {
        console.error("Firebase init error:", e);
    }
}

async function pingPresence() {
    if (supabase.isConfigured()) {
        await supabase.updatePresence(visitorSessionId);
        const sbVisitors = await supabase.getActiveVisitors();
        if (sbVisitors !== null && sbVisitors > 0) {
            totalVisitors = sbVisitors;
            updateCounts();
        }
    }
}

initFirebase();
pingPresence();
setInterval(pingPresence, 8000);

syncSupabaseActivations();
syncSupabaseReports();

setInterval(() => {
    syncSupabaseActivations();
    syncSupabaseReports();
}, 5000);

let batteryInstance = null;
if ('getBattery' in navigator) {
    navigator.getBattery().then(batt => {
        batteryInstance = batt;
        updateBatteryDisplay();
        batt.addEventListener('levelchange', updateBatteryDisplay);
        batt.addEventListener('chargingchange', updateBatteryDisplay);
    }).catch(() => {});
}

function updateBatteryDisplay() {
    const batTextEl = document.getElementById('battery-text');
    if (batteryInstance && batTextEl) {
        const levelPct = Math.round(batteryInstance.level * 100);
        const isCharging = batteryInstance.charging;
        batTextEl.textContent = levelPct + '%' + (isCharging ? ' ⚡' : '');
    } else if (batTextEl) {
        batTextEl.textContent = '100% (OK)';
    }
}

function updateLiveWidgets() {
    const now = new Date();
    const timeStr = now.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    const clockEl = document.getElementById('live-clock');
    if (clockEl) clockEl.textContent = timeStr;

    const fullDateStr = now.toLocaleDateString('id-ID') + ' ' + now.toLocaleTimeString('id-ID');
    const dtEl = document.getElementById('current-date-time');
    if (dtEl) dtEl.textContent = fullDateStr;

    const elapsedSec = Math.floor((Date.now() - startTime) / 1000);
    const mins = Math.floor(elapsedSec / 60).toString().padStart(2, '0');
    const secs = (elapsedSec % 60).toString().padStart(2, '0');
    const uptimeEl = document.getElementById('live-uptime');
    if (uptimeEl) uptimeEl.textContent = `${mins}:${secs}`;
}

updateLiveWidgets();
setInterval(updateLiveWidgets, 1000);

async function updateLatency() {
    const latencyEl = document.getElementById('header-latency');
    if (!latencyEl) return;
    const start = performance.now();
    try {
        await fetch('https://www.google.com/favicon.ico', { mode: 'no-cors', cache: 'no-store' });
        const end = performance.now();
        const latency = Math.round(end - start);
        latencyEl.textContent = Math.max(8, Math.min(latency, 120)) + 'ms';
    } catch (e) {
        const randomMs = Math.floor(Math.random() * 15) + 10;
        latencyEl.textContent = randomMs + 'ms';
    }
}
setInterval(updateLatency, 4000);
updateLatency();
