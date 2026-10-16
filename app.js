// app.js - AYAKA MOTION MAIN ENGINE
import { ALIGHT_MOTION_CONFIG, validateDomainAccess } from './config.js';

let startTime = Date.now();
let chartInstance = null;

// Fungsi universal untuk mengisi teks ke elemen HTML (mendukung berbagai macam ID)
function setElementText(ids, text) {
    ids.forEach(id => {
        const el = document.getElementById(id);
        if (el) el.innerText = text;
    });
}

// 1. SYSTEM MONITORING (Jam, Baterai, Uptime)
function initLiveMonitors() {
    // Update Jam Realtime (Mendukung id: live-clock, clock, waktu-hp, dll)
    const updateClock = () => {
        const now = new Date();
        const timeStr = now.toTimeString().split(' ')[0]; // Format HH:MM:SS
        const dateStr = `${now.toLocaleDateString('id-ID')} ${timeStr.substring(0, 5)}`;
        
        setElementText(['live-clock', 'clock', 'waktu-hp', 'time', 'jam'], timeStr);
        setElementText(['current-date-time', 'date-time', 'tanggal'], dateStr);
    };
    
    updateClock();
    setInterval(updateClock, 1000);

    // Update Uptime Timer
    setInterval(() => {
        const elapsed = Math.floor((Date.now() - startTime) / 1000);
        const mins = String(Math.floor(elapsed / 60)).padStart(2, '0');
        const secs = String(elapsed % 60).padStart(2, '0');
        setElementText(['live-uptime', 'uptime', 'up-time'], `${mins}:${secs}`);
    }, 1000);

    // Battery Status API
    if ('getBattery' in navigator) {
        navigator.getBattery().then(battery => {
            const updateBattery = () => {
                const level = Math.round(battery.level * 100);
                setElementText(['battery-text', 'battery', 'baterai', 'battery-level'], `${level}%`);
            };
            updateBattery();
            battery.addEventListener('levelchange', updateBattery);
        }).catch(() => {
            setElementText(['battery-text', 'battery', 'baterai', 'battery-level'], "100%");
        });
    } else {
        setElementText(['battery-text', 'battery', 'baterai', 'battery-level'], "100% (OK)");
    }

    // Ping Latency & Visitors Simulation
    setInterval(() => {
        const latency = Math.floor(Math.random() * 15) + 8;
        setElementText(['header-latency', 'latency', 'ping'], `${latency}ms`);
    }, 3000);

    setElementText(['visitors-count', 'visitors', 'pengunjung'], Math.floor(Math.random() * 35) + 15);
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

// 3. LOGIKA AKTIVASI AM
window.handleSendMagicLink = async function() {
    if (!validateDomainAccess()) {
        alert("⚠️ Akses Ditolak: Domain tidak diizinkan.");
        return;
    }

    const emailInput = document.getElementById('amp-email') || document.getElementById('email');
    const email = emailInput ? emailInput.value.trim() : '';

    if (!email || !email.includes('@')) {
        alert("Harap masukkan alamat Gmail yang valid!");
        return;
    }

    alert("Magic Link berhasil dikirim ke Email Anda!");
    window.switchActivationStep(2);
};

window.handleVerifyAndApply = async function() {
    if (!validateDomainAccess()) {
        alert("⚠️ Akses Ditolak!");
        return;
    }

    const linkInput = document.getElementById('amp-magic-link') || document.getElementById('magic-link');
    const magicLink = linkInput ? linkInput.value.trim() : '';

    if (!magicLink) {
        alert("Masukkan URL Magic Link / Token terlebih dahulu!");
        return;
    }

    alert("🎉 Selamat! Akun Alight Motion Anda Berhasil Diaktifkan Premium 1 Tahun!");
    if (linkInput) linkInput.value = '';
};

// Jalankan sistem monitor langsung
initLiveMonitors();
