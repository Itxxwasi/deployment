require('dotenv').config();
const axios = require('axios');
const AdmZip = require('adm-zip');
const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

/**
 * WASI-MD-V7 DYNAMIC LOADER
 * This script fetches the core code from a private repository and executes it.
 */

const CONFIG = {
    proxyUrl: process.env.PROXY_URL, // e.g., https://your-proxy.com/get-core
    accessKey: process.env.ACCESS_KEY || 'wasi-v7-secret',
    tempDir: path.join(__dirname, 'core_tmp')
};

async function downloadCore() {
    console.log('🌐 [LOADER] Initializing secure connection to core server...');

    if (!CONFIG.proxyUrl) {
        throw new Error('PROXY_URL is missing in environment variables.');
    }

    try {
        console.log('📡 [LOADER] Verifying access credentials...');
        const response = await axios({
            method: 'get',
            url: `${CONFIG.proxyUrl.replace(/\/$/, '')}/get-core`,
            params: { key: CONFIG.accessKey },
            responseType: 'arraybuffer'
        });

        console.log('📥 [LOADER] Core synchronization in progress...');
        const zip = new AdmZip(Buffer.from(response.data));

        if (fs.existsSync(CONFIG.tempDir)) {
            fs.rmSync(CONFIG.tempDir, { recursive: true, force: true });
        }
        fs.mkdirSync(CONFIG.tempDir);

        console.log('📂 [LOADER] Reconfiguring system modules...');
        zip.extractAllTo(CONFIG.tempDir, true);

        // The proxy sends the GitHub ZIP which has a nested folder
        const entries = fs.readdirSync(CONFIG.tempDir);
        const nestedFolder = path.join(CONFIG.tempDir, entries[0]);

        console.log('✅ [LOADER] System ready. Launching core environment...');
        return nestedFolder;
    } catch (error) {
        console.error('❌ [LOADER] SYNCHRONIZATION FAILED!');
        if (error.response && error.response.status === 403) {
            console.error('👉 Internal Error: Access Key mismatch or Proxy blocked.');
        } else {
            console.error('👉 Error:', error.message);
        }
        process.exit(1);
    }
}

const express = require('express');
const app = express();
const PORT = process.env.PORT || 3000;

app.get('/', (req, res) => res.send('WASI-MD-V7 Loader is running! 🤖'));
app.get('/health', (req, res) => res.status(200).json({ status: 'ok' }));

async function startBot(corePath) {
    console.log('🚀 [LOADER] Finalizing system environment...');

    // Fix Python path for yt-dlp at runtime
    // We create a local .bin folder and link python3 to python inside the writable /app space
    const binDir = path.join(corePath, '.bin');
    if (!fs.existsSync(binDir)) fs.mkdirSync(binDir);

    try {
        const pythonPath = '/usr/bin/python3';
        const linkPath = path.join(binDir, 'python');
        if (fs.existsSync(pythonPath) && !fs.existsSync(linkPath)) {
            fs.linkSync(pythonPath, linkPath);
            console.log('🔗 [LOADER] Python path linked successfully.');
        }
    } catch (e) {
        console.log('⚠️ [LOADER] Python linking skipped (might already exist or non-linux).');
    }

    console.log('🚀 [LOADER] Booting WASI-MD-V7 core...');

    const botProcess = spawn('node', ['index.js'], {
        cwd: corePath,
        stdio: 'inherit',
        env: {
            ...process.env,
            WASI_LOADER: 'true',
            PATH: `${binDir}:${process.env.PATH}` // Inject our fake python into PATH
        }
    });

    botProcess.on('close', (code) => {
        console.log(`[LOADER] Bot process exited with code ${code}. Restarting in 10s...`);
        setTimeout(() => downloadAndStart(), 10000);
    });
}

async function downloadAndStart() {
    try {
        const corePath = await downloadCore();
        await startBot(corePath);
    } catch (err) {
        console.error('❌ [LOADER] Fatal error during startup:', err.message);
    }
}

async function init() {
    // 1. Start Web Server first for Heroku
    app.listen(PORT, () => {
        console.log(`🌐 [LOADER] Web server active on port ${PORT}`);
    });

    if (!CONFIG.token) {
        console.error('❌ [LOADER] GITHUB_TOKEN is missing!');
        return;
    }

    // 2. Begin Download/Startup
    await downloadAndStart();
}

init();
