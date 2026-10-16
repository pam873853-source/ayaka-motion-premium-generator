// config.js - AYAKA MOTION CONFIGURATION & SECURITY

// Helper function untuk mengambil variabel dari .env / Vercel Environment Variables
const getEnv = (key, fallback = '') => {
    if (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env[key]) {
        return import.meta.env[key];
    }
    return fallback;
};

export const APP_ID = typeof __app_id !== 'undefined' ? __app_id : 'ayaka-motion-premium';

// ------------------------------------------------------------------
// 1. DAFTAR DOMAIN RESMI (DOMAIN LOCK / RESTRICTION)
// ------------------------------------------------------------------
export const ALLOWED_DOMAINS = [
    'ayaka-motion-am-premium.vercel.app',
    'ayaka-motion-premium-generator.vercel.app',
    'localhost',
    '127.0.0.1'
];

// ------------------------------------------------------------------
// 2. FUNGSI PENGECEKAN DOMAIN LOKAL & PRODUCTION
// ------------------------------------------------------------------
export function validateDomainAccess() {
    const currentHost = window.location.hostname;
    
    // Pengecekan apakah hostname yang mengakses ada dalam daftar domain resmi
    const isAllowed = ALLOWED_DOMAINS.some(domain => 
        currentHost === domain || currentHost.endsWith('.' + domain)
    );
    
    if (!isAllowed) {
        console.error(`[AYAKA SECURITY] Akses Ditolak! Domain '${currentHost}' tidak diizinkan menggunakan API Key ini.`);
        return false;
    }
    return true;
}

// ------------------------------------------------------------------
// 3. KONFIGURASI SUPABASE DATABASE
// ------------------------------------------------------------------
export const SUPABASE_URL = getEnv('VITE_SUPABASE_URL', 'https://xxxx.supabase.co');
export const SUPABASE_KEY = getEnv('VITE_SUPABASE_KEY', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.xxxx');

// ------------------------------------------------------------------
// 4. KONFIGURASI FIREBASE AUTH & DATABASE
// ------------------------------------------------------------------
export const FIREBASE_CONFIG = (() => {
    try {
        const raw = getEnv('VITE_FIREBASE_CONFIG');
        return raw ? JSON.parse(raw) : {
            apiKey: getEnv('VITE_AM_API_KEY', 'AIzaSyDtG1AU22ErnQD60AzBAcaknySiz9_CEq0'),
            authDomain: "ayaka-motion.firebaseapp.com",
            projectId: "ayaka-motion",
            storageBucket: "ayaka-motion.appspot.com",
            messagingSenderId: "123456789012",
            appId: "1:123456789012:web:abcdef123456"
        };
    } catch (e) {
        return {};
    }
})();

// ------------------------------------------------------------------
// 5. KONFIGURASI ALIGHT MOTION API KEY & TOKEN (TERKUNCI)
// ------------------------------------------------------------------
export const ALIGHT_MOTION_CONFIG = {
    ORDER_ID: getEnv('VITE_AM_ORDER_ID', 'GPA'),
    API_KEY: getEnv('VITE_AM_API_KEY', 'AIzaSyDtG1AU22ErnQD60AzBAcaknySiz9_CEq0'),
    TOKEN: getEnv('VITE_AM_TOKEN', 'mmgaobamlahbbeccfplmbkbb.AO-J1OzqG0or_GJJIx-ms8GrTm-jaglCRfhQSRPUZKpl2YspYS-oN7_94uv8RC5vQbvd_Ios2pPDStZ2n7F0hLE3FiOU7HS3R6Fquulv5xLXFECSv4ctElw'),
    SKU_TYPE: getEnv('VITE_AM_SKU_TYPE', 'subs'),
    FIREBASE_INSTANCE_ID_TOKEN: getEnv('VITE_AM_FIREBASE_INSTANCE_ID_TOKEN', 'cSDnCyp3T-uwp07z3tL86T:APA91bFkmvvsHw5nnqa1SBFci-99DRsKClLiETdRrVcJjS5yBx1v_FbCb1d8WhBuea_zmwnYBktyTIzcRhN4b6uNOUur9wPc0gKXmJDoZic0LhNq5V2s0xI')
};
