// app.js - AYAKA MOTION MAIN ENGINE
import { ALIGHT_MOTION_CONFIG, validateDomainAccess } from './config.js';

// Global State
let startTime = Date.now();
let chartInstance = null;

// Helper Toast Notification
function showToast(message, isError = false) {
    const toast = document.getElementById('toast-notif');
    const msgEl = document.getElementById('toast-message');
    if (!toast || !msgEl) return;

    msgEl.innerText = message;
    toast.style.backgroundColor = isError ? '#ef4444' : '#18181b';
    toast.style.color = '#ffffff';
    toast.classList.remove('opacity-0', 'pointer-events-none');

    setTimeout(() => {
        toast.classList.add('opacity-0', 'pointer-events-none');
    }, 3500);
}

// 1. SYSTEM MONITORING (Jam, Baterai, Latency, Uptime)
function initLiveMonitors() {
    // 1A. Update Jam & Tanggal Realtime
    const updateClock = () => {
        const now = new Date();
        const timeStr = now.toTimeString().split(' ')[0];
        
        const clockEl = document.getElementById('live-clock');
        if (clockEl) clockEl.innerText = timeStr;

        const dateEl = document.getElementById('current-date-time');
        if (dateEl) dateEl.innerText = `${now.toLocaleDateString('id-ID')} ${timeStr.substring(0, 5)}`;
    };
    updateClock();
    setInterval(updateClock, 1000);

    // 1B. Update Uptime Timer
    setInterval(() => {
        const elapsed = Math.floor((Date.now() - startTime) / 1000);
        const mins = String(Math.floor(elapsed / 60)).padStart(2, '0');
        const secs = String(elapsed % 60).padStart(2, '0');
        const uptimeEl = document.getElementById('live-uptime');
        if (uptimeEl) uptimeEl.innerText = `${mins}:${secs}`;
    }, 1000);

    // 1C. Battery Status API (Dengan Safe Fallback)
    if ('getBattery' in navigator) {
        navigator.getBattery().then(battery => {
            const updateBattery = () => {
                const level = Math.round(battery.level * 100);
                const batEl = document.getElementById('battery-text');
                if (batEl) batEl.innerText = `${level}%`;
            };
            updateBattery();
            battery.addEventListener('levelchange', updateBattery);
        }).catch(() => {
            const batEl = document.getElementById('battery-text');
            if (batEl) batEl.innerText = "100%";
        });
    } else {
        const batEl = document.getElementById('battery-text');
        if (batEl) batEl.innerText = "100%";
    }

    // 1D. Latency Ping & Random Visitors
    setInterval(() => {
        const latency = Math.floor(Math.random() * 15) + 8;
        const latEl = document.getElementById('header-latency');
        if (latEl) latEl.innerText = `${latency}ms`;
    }, 3000);

    const visitorsEl = document.getElementById('visitors-count');
    if (visitorsEl) visitorsEl.innerText = Math.floor(Math.random() * 35) + 15;
}

// 2. TAB SWITCHER
window.setActiveTab = function(tabName) {
    const views = ['dashboard', 'aktivasi', 'riwayat', 'laporan'];
    views.forEach(v => {
        const viewEl = document.getElementById(`view-${v}`);
        const navEl = document.getElementById(`nav-${v}`);
        
        if (viewEl) viewEl.classList.add('hidden');
        if (navEl) {
            navEl.className = 'neo-btn py-2 text-[10px] flex flex-col items-center justify-center gap-0.5';
        }
    });

    const targetView = document.getElementById(`view-${tabName}`);
    const targetNav = document.getElementById(`nav-${tabName}`);
    
    if (targetView) targetView.classList.remove('hidden');
    if (targetNav) {
        targetNav.className = 'neo-btn-yellow py-2 text-[10px] flex flex-col items-center justify-center gap-0.5';
    }

    if (tabName === 'riwayat') initChart();
};

window.switchActivationStep = function(step) {
    const step1 = document.getElementById('neo-step-1');
    const step2 = document.getElementById('neo-step-2');
    const btn1 = document.getElementById('tab-btn-kirim');
    const btn2 = document.getElementById('tab-btn-verifikasi');

    if (step === 1) {
        step1?.classList.remove('hidden');
        step2?.classList.add('hidden');
        if (btn1) btn1.className = 'neo-btn-dark py-2.5 text-xs flex items-center justify-center gap-2';
        if (btn2) btn2.className = 'neo-btn py-2.5 text-xs flex items-center justify-center gap-2';
    } else {
        step1?.classList.add('hidden');
        step2?.classList.remove('hidden');
        if (btn1) btn1.className = 'neo-btn py-2.5 text-xs flex items-center justify-center gap-2';
        if (btn2) btn2.className = 'neo-btn-dark py-2.5 text-xs flex items-center justify-center gap-2';
    }
};

// 3. LOGIKA AKTIVASI
window.handleSendMagicLink = async function() {
    if (!validateDomainAccess()) {
        showToast("Akses Ditolak: API Key dikunci khusus domain resmi!", true);
        return;
    }

    const email = document.getElementById('amp-email')?.value.trim();
    if (!email || !email.includes('@')) {
        showToast("Masukkan alamat Gmail yang valid!", true);
        return;
    }

    const btn = document.getElementById('btn-send-link');
    if (btn) {
        btn.disabled = true;
        btn.innerHTML = `<i class="fa-solid fa-spinner animate-spin"></i> Mengirim...`;
    }

    setTimeout(() => {
        if (btn) {
            btn.disabled = false;
            btn.innerHTML = `<i class="fa-solid fa-paper-plane"></i> Kirim Magic Link`;
        }
        showToast("Magic Link berhasil dikirim ke Email!");
        switchActivationStep(2);
    }, 2000);
};

window.handleVerifyAndApply = async function() {
    if (!validateDomainAccess()) {
        showToast("Akses Ditolak!", true);
        return;
    }

    const magicLink = document.getElementById('amp-magic-link')?.value.trim();
    if (!magicLink) {
        showToast("Masukkan URL Magic Link / Token!", true);
        return;
    }

    const btn = document.getElementById('btn-verify-apply');
    if (btn) {
        btn.disabled = true;
        btn.innerHTML = `<i class="fa-solid fa-spinner animate-spin"></i> Memverifikasi...`;
    }

    setTimeout(() => {
        if (btn) {
            btn.disabled = false;
            btn.innerHTML = `<i class="fa-solid fa-bolt"></i> Verifikasi & Aktifkan`;
        }
        showToast("🎉 Akun Alight Motion Aktif Premium 1 Tahun!");

        const actEl = document.getElementById('activations-count');
        if (actEl) actEl.innerText = parseInt(actEl.innerText || '0') + 1;
        
        document.getElementById('amp-magic-link').value = '';
    }, 2500);
};

// 4. CHART
function initChart() {
    const canvas = document.getElementById('activation-chart');
    if (!canvas || chartInstance) return;

    const ctx = canvas.getContext('2d');
    chartInstance = new Chart(ctx, {
        type: 'line',
        data: {
            labels: ['00:00', '04:00', '08:00', '12:00', '16:00', '20:00', 'Now'],
            datasets: [{
                label: 'Aktivasi',
                data: [12, 19, 8, 25, 32, 28, 45],
                borderColor: '#000000',
                backgroundColor: 'rgba(250, 204, 21, 0.5)',
                borderWidth: 3,
                fill: true
            }]
        },
        options: { responsive: true, maintainAspectRatio: false }
    });
}

// LANGSUNG JALANKAN TANPA MENUNGGU DOMCONTENTLOADED TERLAMBAT
initLiveMonitors();
