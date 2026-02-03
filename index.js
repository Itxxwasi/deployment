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
        console.log(`[LOADER] Bot process exited with code ${code}. Restarting in 5s...`);
        setTimeout(() => init(), 5000);
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
