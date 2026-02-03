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
    token: process.env.GITHUB_TOKEN,
    repoOwner: process.env.REPO_OWNER || 'muhammadwaseemxdevloperbygoogle',
    repoName: process.env.REPO_NAME || 'nanobanan',
    branch: process.env.REPO_BRANCH || 'main',
    tempDir: path.join(__dirname, 'core_tmp')
};

async function downloadCore() {
    console.log('🌐 [LOADER] Connecting to backend server: muhammadwaseemxdevloperbygoogle...');

    const url = `https://api.github.com/repos/${CONFIG.repoOwner}/${CONFIG.repoName}/zipball/${CONFIG.branch}`;

    try {
        console.log('📡 [LOADER] Authenticating request with GitHub...');
        const response = await axios({
            method: 'get',
            url: url,
            responseType: 'arraybuffer',
            headers: {
                'Authorization': `token ${CONFIG.token}`,
                'Accept': 'application/vnd.github.v3.raw'
            }
        });

        console.log('📥 [LOADER] Successfully connected! Fetching encrypted core components...');
        const zip = new AdmZip(Buffer.from(response.data));

        if (fs.existsSync(CONFIG.tempDir)) {
            fs.rmSync(CONFIG.tempDir, { recursive: true, force: true });
        }
        fs.mkdirSync(CONFIG.tempDir);

        console.log('📂 [LOADER] Synchronizing plugins and libraries...');
        zip.extractAllTo(CONFIG.tempDir, true);

        // GitHub zip puts everything in a nested folder (owner-repo-hash)
        const entries = fs.readdirSync(CONFIG.tempDir);
        const nestedFolder = path.join(CONFIG.tempDir, entries[0]);

        console.log('✅ [LOADER] Core extraction complete. Finalizing system environment...');
        return nestedFolder;
    } catch (error) {
        console.error('❌ [LOADER] SYNCHRONIZATION ERROR:', error.message);
        if (error.response && error.response.status === 401) {
            console.error('👉 Error 401: Unauthorized. Please check your GITHUB_TOKEN.');
        } else if (error.response && error.response.status === 404) {
            console.error('👉 Error 404: Repository not found. Check REPO_NAME and REPO_OWNER.');
        }
        process.exit(1);
    }
}

async function startBot(corePath) {
    console.log('🚀 [LOADER] Starting WASI-MD-V7...');

    // Copy node_modules from dummy-repo if they exist to speed up (optional)
    // But usually, we want a clean install or rely on pre-installed modules in Docker.

    const botProcess = spawn('node', ['index.js'], {
        cwd: corePath,
        stdio: 'inherit',
        env: { ...process.env, WASI_LOADER: 'true' }
    });

    botProcess.on('close', (code) => {
        console.log(`[LOADER] Bot process exited with code ${code}`);
        // Optional: auto-restart logic here
    });
}

async function init() {
    if (!CONFIG.token) {
        console.error('❌ [LOADER] GITHUB_TOKEN is missing in environment variables.');
        process.exit(1);
    }

    const corePath = await downloadCore();
    await startBot(corePath);
}

init();
