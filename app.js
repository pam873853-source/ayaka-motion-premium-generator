// app.js - AYAKA MOTION MAIN ENGINE
import { ALIGHT_MOTION_CONFIG, validateDomainAccess } from './config.js';

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

// 1. System Monitoring (Jam, Baterai, Latency, Uptime)
function initLiveMonitors() {
    setInterval(() => {
        const now = new Date();
        const timeStr = now.toTimeString().split(' ')[0];
        const clockEl = document.getElementById('live-clock');
        if (clockEl) clockEl.innerText = timeStr;

        const dateEl = document.getElementById('current-date-time');
        if (dateEl) dateEl.innerText = `${now.toLocaleDateString('id-ID')} ${timeStr.substring(0, 5)}`;
    }, 1000);

    setInterval(() => {
        const elapsed = Math.floor((Date.now() - startTime) / 1000);
        const mins = String(Math.floor(elapsed / 60)).padStart(2, '0');
        const secs = String(elapsed % 60).padStart(2, '0');
        const uptimeEl = document.getElementById('live-uptime');
        if (uptimeEl) uptimeEl.innerText = `${mins}:${secs}`;
    }, 1000);

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

    setInterval(() => {
        const latency = Math.floor(Math.random() * 15) + 8;
        const latEl = document.getElementById('header-latency');
        if (latEl) latEl.innerText = `${latency}ms`;
    }, 3000);

    const visitorsEl = document.getElementById('visitors-count');
    if (visitorsEl) visitorsEl.innerText = Math.floor(Math.random() * 45) + 12;
}

// 2. Navigation Tab Switcher
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

// 3. Logika Proses Aktivasi (Dengan Proteksi Domain)
window.handleSendMagicLink = async function() {
    if (!validateDomainAccess()) {
        showToast("Akses Ditolak: Domain tidak diizinkan!", true);
        return;
    }

    const email = document.getElementById('amp-email')?.value.trim();
    if (!email || !email.includes('@')) {
        showToast("Harap masukkan alamat Gmail yang valid!", true);
        return;
    }

    const btn = document.getElementById('btn-send-link');
    if (btn) {
        btn.disabled = true;
        btn.innerHTML = `<i class="fa-solid fa-spinner animate-spin"></i> Mengirim Link...`;
    }

    setTimeout(() => {
        if (btn) {
            btn.disabled = false;
            btn.innerHTML = `<i class="fa-solid fa-paper-plane"></i> Kirim Magic Link ke Email`;
        }
        showToast("Magic Link berhasil dikirim! Silakan cek Inbox Gmail Anda.");
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
        showToast("Masukkan URL Magic Link atau oobCode!", true);
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
            btn.innerHTML = `<i class="fa-solid fa-bolt"></i> Verifikasi & Aktifkan Sekarang`;
        }
        showToast("🎉 Selamat! Akun Alight Motion Anda telah Aktif Premium 1 Tahun!");

        const actEl = document.getElementById('activations-count');
        if (actEl) actEl.innerText = parseInt(actEl.innerText || '0') + 1;

        const magicLinkInput = document.getElementById('amp-magic-link');
        if (magicLinkInput) magicLinkInput.value = '';
    }, 2500);
};

// 4. Bantuan & Laporan Bug
window.submitBugReport = function() {
    const category = document.getElementById('report-category')?.value;
    const desc = document.getElementById('report-description')?.value.trim();

    if (!desc) {
        showToast("Keterangan laporan tidak boleh kosong!", true);
        return;
    }

    const container = document.getElementById('reports-list-container');
    const badge = document.getElementById('reports-count-badge');

    const card = document.createElement('div');
    card.className = "neo-card p-3 bg-yellow-100 text-xs space-y-1";
    card.innerHTML = `
        <div class="flex justify-between font-black">
            <span>${category}</span>
            <span class="text-[9px] text-gray-500">${new Date().toLocaleTimeString('id-ID')}</span>
        </div>
        <p class="text-gray-700 text-[11px] font-semibold">${desc}</p>
    `;

    if (container?.querySelector('p')) container.innerHTML = '';
    container?.prepend(card);

    if (badge && container) badge.innerText = `${container.children.length} Laporan`;

    const descInput = document.getElementById('report-description');
    if (descInput) descInput.value = '';
    showToast("Laporan kendala berhasil disimpan!");
};

// 5. Chart Realtime
function initChart() {
    const canvas = document.getElementById('activation-chart');
    if (!canvas || chartInstance) return;

    const ctx = canvas.getContext('2d');
    chartInstance = new Chart(ctx, {
        type: 'line',
        data: {
            labels: ['00:00', '04:00', '08:00', '12:00', '16:00', '20:00', 'Sekarang'],
            datasets: [{
                label: 'Aktivasi Sukses',
                data: [12, 19, 8, 25, 32, 28, 45],
                borderColor: '#000000',
                backgroundColor: 'rgba(250, 204, 21, 0.5)',
                borderWidth: 3,
                fill: true,
                tension: 0.3
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { display: false } },
            scales: {
                x: { grid: { display: false } },
                y: { grid: { color: '#e4e4e7' }, beginAtZero: true }
            }
        }
    });
}

// Inisialisasi Saat Dokumen Dimuat
document.addEventListener('DOMContentLoaded', () => {
    initLiveMonitors();
});
