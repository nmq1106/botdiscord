// server.js - Web quản lý cấu hình bot game (Có quản lý tỷ lệ thắng thua)
require('dotenv').config();
const express = require('express');
const fs = require('fs');
const path = require('path');
const cors = require('cors');
const session = require('express-session');
const axios = require('axios');
const app = express();
const PORT = process.env.WEB_PORT || 3000;

// ============================================================
// CẤU HÌNH DISCORD OAUTH2
// ============================================================
const DISCORD_CLIENT_ID = process.env.DISCORD_CLIENT_ID || '1532993813604339783';
const DISCORD_CLIENT_SECRET = process.env.DISCORD_CLIENT_SECRET || 'IlSQiEhHlJYuj2f-mCxL62qzyTKwXWjT';
const DISCORD_REDIRECT_URI = process.env.DISCORD_REDIRECT_URI || 'http://localhost:3000/auth/discord/callback';

// Danh sách admin (User ID Discord)
const ADMIN_USER_IDS = process.env.ADMIN_USER_IDS ? process.env.ADMIN_USER_IDS.split(',') : [
    '1366805947711881266',
];

app.use(cors({
    origin: ['http://localhost:3000', 'http://localhost:3001'],
    credentials: true
}));
app.use(express.json());
app.use(express.static('public'));

// ============================================================
// SESSION CONFIG
// ============================================================
app.use(session({
    secret: process.env.SESSION_SECRET || 'your_secret_key_here_change_this',
    resave: false,
    saveUninitialized: false,
    cookie: {
        secure: false,
        maxAge: 24 * 60 * 60 * 1000
    }
}));

// ============================================================
// FILE CẤU HÌNH
// ============================================================
const CONFIG_FILE = path.join(__dirname, 'config.json');
const DATA_FILE = path.join(__dirname, 'players_data.json');
const TRANSACTIONS_FILE = path.join(__dirname, 'transactions.json');

// ============================================================
// CẤU HÌNH TỰ ĐỘNG XÓA GIAO DỊCH
// ============================================================
const PENDING_TIMEOUT = 5 * 60 * 1000;
const CLEANUP_INTERVAL = 60 * 1000;

// ============================================================
// LOCK FILE
// ============================================================
let fileLocks = {};

function getFileLock(filePath) {
    return new Promise((resolve) => {
        const checkLock = () => {
            if (!fileLocks[filePath]) {
                fileLocks[filePath] = true;
                resolve();
            } else {
                setTimeout(checkLock, 50);
            }
        };
        checkLock();
    });
}

function releaseFileLock(filePath) {
    delete fileLocks[filePath];
}

// ============================================================
// HÀM ĐỌC/GHI CẤU HÌNH (ĐÃ THÊM banks)
// ============================================================
function loadConfig() {
    try {
        if (fs.existsSync(CONFIG_FILE)) {
            const data = fs.readFileSync(CONFIG_FILE, 'utf8');
            return JSON.parse(data);
        }
    } catch (error) {
        console.error('❌ Lỗi đọc file cấu hình:', error);
    }
    return {
        minBet: 100,
        maxBet: 10000,
        initialMoney: 1000,
        banks: [
            {
                id: 'bank_default_1',
                bankName: 'MB Bank',
                accountHolder: 'NGUYEN MINH QUOC',
                accountNumber: '0356890540',
                branch: 'Ha Noi',
                content: 'NAP [TEN] [SO TIEN]',
                active: true,
                createdAt: Date.now()
            }
        ],
        bankInfo: {
            bankName: 'MB Bank',
            bankCode: 'MB',
            accountNumber: '0356890540',
            accountName: 'NGUYEN MINH QUOC',
            branch: 'Ha Noi'
        },
        gameConfigs: {},
        playerOverrides: {},
        globalWinRate: {
            enabled: false,
            winRate: 50,
            lossRate: 50,
            drawRate: 0
        }
    };
}

async function saveConfig(config) {
    const lock = await getFileLock(CONFIG_FILE);
    try {
        fs.writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2), 'utf8');
        console.log('✅ Đã lưu cấu hình thành công!');
        return true;
    } catch (error) {
        console.error('❌ Lỗi lưu file cấu hình:', error);
        return false;
    } finally {
        releaseFileLock(CONFIG_FILE);
    }
}

// ============================================================
// HÀM ĐỌC/GHI DỮ LIỆU NGƯỜI CHƠI
// ============================================================
function loadPlayers() {
    try {
        if (fs.existsSync(DATA_FILE)) {
            const data = fs.readFileSync(DATA_FILE, 'utf8');
            return JSON.parse(data);
        }
    } catch (error) {
        console.error('❌ Lỗi đọc dữ liệu người chơi:', error);
    }
    return {};
}

async function savePlayers(players) {
    const lock = await getFileLock(DATA_FILE);
    try {
        fs.writeFileSync(DATA_FILE, JSON.stringify(players, null, 2), 'utf8');
        console.log('✅ Đã lưu dữ liệu người chơi thành công!');
        return true;
    } catch (error) {
        console.error('❌ Lỗi lưu dữ liệu người chơi:', error);
        return false;
    } finally {
        releaseFileLock(DATA_FILE);
    }
}

// ============================================================
// HÀM ĐỌC/GHI GIAO DỊCH
// ============================================================
function loadTransactions() {
    try {
        if (fs.existsSync(TRANSACTIONS_FILE)) {
            const data = fs.readFileSync(TRANSACTIONS_FILE, 'utf8');
            return JSON.parse(data);
        }
    } catch (error) {
        console.error('❌ Lỗi đọc giao dịch:', error);
    }
    return {};
}

async function saveTransactions(transactions) {
    const lock = await getFileLock(TRANSACTIONS_FILE);
    try {
        fs.writeFileSync(TRANSACTIONS_FILE, JSON.stringify(transactions, null, 2), 'utf8');
        console.log('✅ Đã lưu giao dịch thành công!');
        return true;
    } catch (error) {
        console.error('❌ Lỗi lưu giao dịch:', error);
        return false;
    } finally {
        releaseFileLock(TRANSACTIONS_FILE);
    }
}

// ============================================================
// DISCORD AUTH ROUTES
// ============================================================

app.get('/auth/discord', (req, res) => {
    const redirectUrl = `https://discord.com/api/oauth2/authorize?client_id=${DISCORD_CLIENT_ID}&redirect_uri=${encodeURIComponent(DISCORD_REDIRECT_URI)}&response_type=code&scope=identify`;
    res.redirect(redirectUrl);
});

app.get('/auth/discord/callback', async (req, res) => {
    const { code, error } = req.query;
    
    if (error || !code) {
        return res.redirect('/?error=auth_failed');
    }

    try {
        const tokenResponse = await axios.post('https://discord.com/api/oauth2/token', 
            new URLSearchParams({
                client_id: DISCORD_CLIENT_ID,
                client_secret: DISCORD_CLIENT_SECRET,
                grant_type: 'authorization_code',
                code: code,
                redirect_uri: DISCORD_REDIRECT_URI,
            }),
            { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }
        );

        const { access_token } = tokenResponse.data;

        const userResponse = await axios.get('https://discord.com/api/users/@me', {
            headers: { Authorization: `Bearer ${access_token}` }
        });

        const userData = userResponse.data;
        const avatarUrl = userData.avatar 
            ? `https://cdn.discordapp.com/avatars/${userData.id}/${userData.avatar}.png` 
            : `https://cdn.discordapp.com/embed/avatars/${parseInt(userData.discriminator) % 5}.png`;
        
        req.session.user = {
            id: userData.id,
            username: userData.username,
            discriminator: userData.discriminator || '0',
            avatar: userData.avatar,
            avatarUrl: avatarUrl,
            isAdmin: ADMIN_USER_IDS.includes(userData.id),
            global_name: userData.global_name || userData.username
        };

        let players = loadPlayers();
        if (!players[userData.id]) {
            players[userData.id] = {
                userId: userData.id,
                username: userData.username,
                discriminator: userData.discriminator || '0',
                avatar: userData.avatar,
                avatarUrl: avatarUrl,
                money: 1000,
                level: 1,
                xp: 0,
                totalGames: 0,
                totalWins: 0,
                totalLosses: 0,
                totalDeposited: 0,
                totalSpent: 0,
                favoriteGame: 'Chưa có',
                achievements: [],
                createdAt: Date.now()
            };
        } else {
            players[userData.id].username = userData.username;
            players[userData.id].avatar = userData.avatar;
            players[userData.id].avatarUrl = avatarUrl;
        }
        await savePlayers(players);

        res.redirect('/');
    } catch (error) {
        console.error('❌ Lỗi xác thực Discord:', error);
        res.redirect('/?error=auth_failed');
    }
});

app.get('/auth/logout', (req, res) => {
    req.session.destroy();
    res.redirect('/');
});

app.get('/api/auth/user', (req, res) => {
    if (req.session.user) {
        res.json({ authenticated: true, user: req.session.user });
    } else {
        res.json({ authenticated: false });
    }
});

function requireAuth(req, res, next) {
    if (!req.session.user) {
        return res.status(401).json({ success: false, message: 'Vui lòng đăng nhập!', requireLogin: true });
    }
    next();
}

function requireAdmin(req, res, next) {
    if (!req.session.user) {
        return res.status(401).json({ success: false, message: 'Vui lòng đăng nhập!', requireLogin: true });
    }
    if (!req.session.user.isAdmin) {
        return res.status(403).json({ success: false, message: 'Bạn không có quyền truy cập!', requireAdmin: true });
    }
    next();
}

// ============================================================
// DANH SÁCH GAME VÀ SETTING HỢP LỆ
// ============================================================
const VALID_GAMES = ['luckydraw', 'crash', 'blackjack', 'taixiu', 'xocdia', 'slot', 'kbb', 'horse', 'racing', 'baucua', 'guess', 'lottery', 'poker', 'roulette', 'dice', 'coinflip'];
const VALID_SETTINGS = ['winrate', 'lossrate', 'drawrate', 'maxmultiplier', 'minmultiplier', 'crashprobability', 'jackpotrate', 'jackpotmultiplier', 'threematchmultiplier', 'twomatchmultiplier', 'maxspeed', 'minspeed', 'racerounds', 'matchmultiplier', 'maxattempts', 'bonusmultiplier', 'exactmultiplier', 'rangemultiplier', 'blackjackrate', 'dealerbustrate', 'pushrate', 'redrate', 'blackrate', 'greenrate'];

// ============================================================
// HÀM TỰ ĐỘNG XÓA GIAO DỊCH PENDING
// ============================================================
async function autoCleanupPendingTransactions() {
    try {
        const transactions = loadTransactions();
        const now = Date.now();
        let hasChanges = false;

        for (const [key, transaction] of Object.entries(transactions)) {
            if (transaction.status === 'pending' && (now - transaction.time) > PENDING_TIMEOUT) {
                delete transactions[key];
                hasChanges = true;
            }
        }

        if (hasChanges) {
            await saveTransactions(transactions);
        }
    } catch (error) {
        console.error('❌ Lỗi dọn dẹp giao dịch:', error);
    }
}

// ============================================================
// HÀM GỬI TIN NHẮN RIÊNG CHO USER
// ============================================================
async function sendDirectMessageToUser(userId, message) {
    try {
        const BOT_TOKEN = process.env.BOT_TOKEN;
        if (!BOT_TOKEN) {
            console.log('⚠️ Không có BOT_TOKEN, không thể gửi DM!');
            return false;
        }

        // Tạo channel DM với user
        const channelResponse = await axios.post(
            `https://discord.com/api/v10/users/@me/channels`,
            { recipient_id: userId },
            {
                headers: {
                    'Authorization': `Bot ${BOT_TOKEN}`,
                    'Content-Type': 'application/json'
                }
            }
        );

        if (channelResponse.data && channelResponse.data.id) {
            // Gửi tin nhắn vào channel DM
            await axios.post(
                `https://discord.com/api/v10/channels/${channelResponse.data.id}/messages`,
                {
                    content: message,
                    allowed_mentions: { parse: [] }
                },
                {
                    headers: {
                        'Authorization': `Bot ${BOT_TOKEN}`,
                        'Content-Type': 'application/json'
                    }
                }
            );
            console.log(`✅ Đã gửi DM cho user ${userId}`);
            return true;
        }
        return false;
    } catch (error) {
        console.error(`❌ Lỗi gửi DM cho user ${userId}:`, error.response?.data || error.message);
        return false;
    }
}

setInterval(autoCleanupPendingTransactions, CLEANUP_INTERVAL);
setTimeout(autoCleanupPendingTransactions, 5000);

// ============================================================
// HÀM TẠO MÃ GIAO DỊCH
// ============================================================
function generateTransactionId() {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let result = 'NAP';
    for (let i = 0; i < 12; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
}

// ============================================================
// API CẤU HÌNH
// ============================================================
app.get('/api/config', requireAuth, (req, res) => {
    const config = loadConfig();
    res.json(config);
});

app.post('/api/config', requireAdmin, async (req, res) => {
    const newConfig = req.body;
    const currentConfig = loadConfig();
    
    const updatedConfig = {
        ...currentConfig,
        ...newConfig,
        banks: newConfig.banks || currentConfig.banks || [],
        bankInfo: { ...currentConfig.bankInfo, ...newConfig.bankInfo },
        gameConfigs: newConfig.gameConfigs || currentConfig.gameConfigs || {},
        playerOverrides: newConfig.playerOverrides || currentConfig.playerOverrides || {},
        globalWinRate: newConfig.globalWinRate || currentConfig.globalWinRate || { enabled: false, winRate: 50, lossRate: 50, drawRate: 0 }
    };
    
    if (await saveConfig(updatedConfig)) {
        res.json({ success: true, message: '✅ Đã cập nhật cấu hình thành công!', config: updatedConfig });
    } else {
        res.status(500).json({ success: false, message: '❌ Lỗi khi lưu cấu hình!' });
    }
});

app.post('/api/config/reset', requireAdmin, async (req, res) => {
    const defaultConfig = {
        minBet: 100,
        maxBet: 10000,
        initialMoney: 1000,
        banks: [
            {
                id: 'bank_default_1',
                bankName: 'MB Bank',
                accountHolder: 'NGUYEN MINH QUOC',
                accountNumber: '0356890540',
                branch: 'Ha Noi',
                content: 'NAP [TEN] [SO TIEN]',
                active: true,
                createdAt: Date.now()
            }
        ],
        bankInfo: {
            bankName: 'MB Bank',
            bankCode: 'MB',
            accountNumber: '0356890540',
            accountName: 'NGUYEN MINH QUOC',
            branch: 'Ha Noi'
        },
        gameConfigs: {},
        playerOverrides: {},
        globalWinRate: { enabled: false, winRate: 50, lossRate: 50, drawRate: 0 }
    };
    
    if (await saveConfig(defaultConfig)) {
        res.json({ success: true, message: '✅ Đã reset cấu hình về mặc định!', config: defaultConfig });
    } else {
        res.status(500).json({ success: false, message: '❌ Lỗi khi reset cấu hình!' });
    }
});

// ============================================================
// API QUẢN LÝ NGÂN HÀNG (ĐÃ THÊM ĐẦY ĐỦ)
// ============================================================

app.get('/api/banks', requireAuth, (req, res) => {
    try {
        const config = loadConfig();
        const banks = config.banks || [];
        res.json({ success: true, data: banks });
    } catch (error) {
        console.error('❌ Lỗi lấy danh sách ngân hàng:', error);
        res.status(500).json({ success: false, message: 'Lỗi server!' });
    }
});

app.get('/api/banks/:id', requireAuth, (req, res) => {
    try {
        const { id } = req.params;
        const config = loadConfig();
        const banks = config.banks || [];
        const bank = banks.find(b => b.id === id);
        if (bank) {
            res.json({ success: true, data: bank });
        } else {
            res.json({ success: false, message: 'Không tìm thấy ngân hàng!' });
        }
    } catch (error) {
        console.error('❌ Lỗi lấy ngân hàng:', error);
        res.status(500).json({ success: false, message: 'Lỗi server!' });
    }
});

app.post('/api/banks', requireAdmin, async (req, res) => {
    try {
        const { bankName, accountHolder, accountNumber, branch, content } = req.body;
        
        if (!bankName || !accountHolder || !accountNumber) {
            return res.json({ success: false, message: '❌ Vui lòng điền đầy đủ thông tin!' });
        }
        
        const config = loadConfig();
        if (!config.banks) config.banks = [];
        
        const newBank = {
            id: 'bank_' + Date.now() + '_' + Math.random().toString(36).substr(2, 6),
            bankName: bankName.trim(),
            accountHolder: accountHolder.trim(),
            accountNumber: accountNumber.trim(),
            branch: branch || '',
            content: content || '',
            active: true,
            createdAt: Date.now()
        };
        
        config.banks.push(newBank);
        
        if (await saveConfig(config)) {
            res.json({ success: true, message: '✅ Đã thêm ngân hàng thành công!', data: newBank });
        } else {
            res.json({ success: false, message: '❌ Lỗi khi lưu cấu hình!' });
        }
    } catch (error) {
        console.error('❌ Lỗi thêm ngân hàng:', error);
        res.json({ success: false, message: '❌ Lỗi server: ' + error.message });
    }
});

app.put('/api/banks/:id', requireAdmin, async (req, res) => {
    try {
        const { id } = req.params;
        const { bankName, accountHolder, accountNumber, branch, content } = req.body;
        
        if (!bankName || !accountHolder || !accountNumber) {
            return res.json({ success: false, message: '❌ Vui lòng điền đầy đủ thông tin!' });
        }
        
        const config = loadConfig();
        const banks = config.banks || [];
        const index = banks.findIndex(b => b.id === id);
        
        if (index === -1) {
            return res.json({ success: false, message: '❌ Không tìm thấy ngân hàng!' });
        }
        
        banks[index] = {
            ...banks[index],
            bankName: bankName.trim(),
            accountHolder: accountHolder.trim(),
            accountNumber: accountNumber.trim(),
            branch: branch || '',
            content: content || '',
            updatedAt: Date.now()
        };
        
        config.banks = banks;
        
        if (await saveConfig(config)) {
            res.json({ success: true, message: '✅ Đã cập nhật ngân hàng!', data: banks[index] });
        } else {
            res.json({ success: false, message: '❌ Lỗi khi lưu cấu hình!' });
        }
    } catch (error) {
        console.error('❌ Lỗi cập nhật ngân hàng:', error);
        res.json({ success: false, message: '❌ Lỗi server: ' + error.message });
    }
});

app.patch('/api/banks/:id', requireAdmin, async (req, res) => {
    try {
        const { id } = req.params;
        const { active } = req.body;
        
        const config = loadConfig();
        const banks = config.banks || [];
        const index = banks.findIndex(b => b.id === id);
        
        if (index === -1) {
            return res.json({ success: false, message: '❌ Không tìm thấy ngân hàng!' });
        }
        
        banks[index].active = active === true || active === 'true';
        banks[index].updatedAt = Date.now();
        
        config.banks = banks;
        
        if (await saveConfig(config)) {
            res.json({ success: true, message: `✅ Đã ${active ? 'kích hoạt' : 'tạm dừng'} ngân hàng!`, data: banks[index] });
        } else {
            res.json({ success: false, message: '❌ Lỗi khi lưu cấu hình!' });
        }
    } catch (error) {
        console.error('❌ Lỗi cập nhật trạng thái ngân hàng:', error);
        res.json({ success: false, message: '❌ Lỗi server: ' + error.message });
    }
});

app.delete('/api/banks/:id', requireAdmin, async (req, res) => {
    try {
        const { id } = req.params;
        
        const config = loadConfig();
        const banks = config.banks || [];
        const index = banks.findIndex(b => b.id === id);
        
        if (index === -1) {
            return res.json({ success: false, message: '❌ Không tìm thấy ngân hàng!' });
        }
        
        banks.splice(index, 1);
        config.banks = banks;
        
        if (await saveConfig(config)) {
            res.json({ success: true, message: '✅ Đã xóa ngân hàng!' });
        } else {
            res.json({ success: false, message: '❌ Lỗi khi lưu cấu hình!' });
        }
    } catch (error) {
        console.error('❌ Lỗi xóa ngân hàng:', error);
        res.json({ success: false, message: '❌ Lỗi server: ' + error.message });
    }
});

// ============================================================
// API QUẢN LÝ TỶ LỆ THẮNG THUA TOÀN SERVER
// ============================================================

app.get('/api/global-winrate', requireAuth, (req, res) => {
    try {
        const config = loadConfig();
        const globalWinRate = config.globalWinRate || { enabled: false, winRate: 50, lossRate: 50, drawRate: 0 };
        res.json({ success: true, data: globalWinRate });
    } catch (error) {
        console.error('❌ Lỗi lấy tỷ lệ toàn server:', error);
        res.status(500).json({ success: false, message: 'Lỗi server!' });
    }
});

app.post('/api/global-winrate', requireAdmin, async (req, res) => {
    try {
        const { enabled, winRate, lossRate, drawRate } = req.body;
        
        if (winRate !== undefined && (isNaN(winRate) || winRate < 0 || winRate > 100)) {
            return res.json({ success: false, message: '❌ winRate phải từ 0-100!' });
        }
        if (lossRate !== undefined && (isNaN(lossRate) || lossRate < 0 || lossRate > 100)) {
            return res.json({ success: false, message: '❌ lossRate phải từ 0-100!' });
        }
        if (drawRate !== undefined && (isNaN(drawRate) || drawRate < 0 || drawRate > 100)) {
            return res.json({ success: false, message: '❌ drawRate phải từ 0-100!' });
        }
        
        const config = loadConfig();
        if (!config.globalWinRate) config.globalWinRate = { enabled: false, winRate: 50, lossRate: 50, drawRate: 0 };
        
        if (enabled !== undefined) config.globalWinRate.enabled = enabled;
        if (winRate !== undefined) config.globalWinRate.winRate = parseFloat(winRate);
        if (lossRate !== undefined) config.globalWinRate.lossRate = parseFloat(lossRate);
        if (drawRate !== undefined) config.globalWinRate.drawRate = parseFloat(drawRate);
        
        const total = (config.globalWinRate.winRate || 0) + (config.globalWinRate.lossRate || 0) + (config.globalWinRate.drawRate || 0);
        if (total !== 100 && total > 0) {
            config.globalWinRate.lossRate = 100 - config.globalWinRate.winRate - (config.globalWinRate.drawRate || 0);
            if (config.globalWinRate.lossRate < 0) config.globalWinRate.lossRate = 0;
        }
        
        if (await saveConfig(config)) {
            res.json({ success: true, message: '✅ Đã cập nhật tỷ lệ toàn server!', data: config.globalWinRate });
        } else {
            res.json({ success: false, message: '❌ Lỗi khi lưu cấu hình!' });
        }
    } catch (error) {
        console.error('❌ Lỗi cập nhật tỷ lệ toàn server:', error);
        res.json({ success: false, message: '❌ Lỗi server: ' + error.message });
    }
});

// ============================================================
// API QUẢN LÝ TỶ LỆ GAME
// ============================================================

app.get('/api/game-rates', requireAuth, (req, res) => {
    try {
        const config = loadConfig();
        res.json({
            success: true,
            gameConfigs: config.gameConfigs || {},
            playerOverrides: config.playerOverrides || {},
            validGames: VALID_GAMES,
            validSettings: VALID_SETTINGS
        });
    } catch (error) {
        console.error('❌ Lỗi lấy cấu hình game:', error);
        res.status(500).json({ success: false, message: 'Lỗi server!' });
    }
});

app.post('/api/game-rates/server', requireAdmin, async (req, res) => {
    try {
        const { gameName, settings } = req.body;
        
        if (!gameName || !VALID_GAMES.includes(gameName)) {
            return res.json({ success: false, message: `❌ Game không hợp lệ!` });
        }
        if (!settings || typeof settings !== 'object') {
            return res.json({ success: false, message: '❌ Vui lòng gửi settings hợp lệ!' });
        }
        
        const config = loadConfig();
        if (!config.gameConfigs) config.gameConfigs = {};
        if (!config.gameConfigs[gameName]) config.gameConfigs[gameName] = {};
        
        for (const [key, value] of Object.entries(settings)) {
            if (!VALID_SETTINGS.includes(key)) {
                return res.json({ success: false, message: `❌ Setting không hợp lệ: ${key}` });
            }
            const numValue = parseFloat(value);
            if (isNaN(numValue)) {
                return res.json({ success: false, message: `❌ Giá trị ${key} phải là số!` });
            }
            config.gameConfigs[gameName][key] = numValue;
        }
        
        if (await saveConfig(config)) {
            res.json({ success: true, message: `✅ Đã cập nhật tỷ lệ cho game ${gameName}!`, gameConfig: config.gameConfigs[gameName] });
        } else {
            res.json({ success: false, message: '❌ Lỗi khi lưu cấu hình!' });
        }
    } catch (error) {
        console.error('❌ Lỗi cập nhật tỷ lệ:', error);
        res.json({ success: false, message: '❌ Lỗi server: ' + error.message });
    }
});

app.post('/api/game-rates/player-winrate', requireAdmin, async (req, res) => {
    try {
        const { userId, winRate, lossRate, drawRate } = req.body;
        
        if (!userId) {
            return res.json({ success: false, message: '❌ Vui lòng nhập User ID!' });
        }
        if (winRate !== undefined && (isNaN(winRate) || winRate < 0 || winRate > 100)) {
            return res.json({ success: false, message: '❌ winRate phải từ 0-100!' });
        }
        if (lossRate !== undefined && (isNaN(lossRate) || lossRate < 0 || lossRate > 100)) {
            return res.json({ success: false, message: '❌ lossRate phải từ 0-100!' });
        }
        if (drawRate !== undefined && (isNaN(drawRate) || drawRate < 0 || drawRate > 100)) {
            return res.json({ success: false, message: '❌ drawRate phải từ 0-100!' });
        }
        
        const config = loadConfig();
        if (!config.playerOverrides) config.playerOverrides = {};
        if (!config.playerOverrides[userId]) config.playerOverrides[userId] = {};
        if (!config.playerOverrides[userId].global) config.playerOverrides[userId].global = {};
        
        if (winRate !== undefined) config.playerOverrides[userId].global.winRate = parseFloat(winRate);
        if (lossRate !== undefined) config.playerOverrides[userId].global.lossRate = parseFloat(lossRate);
        if (drawRate !== undefined) config.playerOverrides[userId].global.drawRate = parseFloat(drawRate);
        
        if (await saveConfig(config)) {
            res.json({ success: true, message: `✅ Đã cập nhật tỷ lệ cho user ${userId}!`, data: config.playerOverrides[userId].global });
        } else {
            res.json({ success: false, message: '❌ Lỗi khi lưu cấu hình!' });
        }
    } catch (error) {
        console.error('❌ Lỗi cập nhật tỷ lệ user:', error);
        res.json({ success: false, message: '❌ Lỗi server: ' + error.message });
    }
});

app.delete('/api/game-rates/player/:userId', requireAdmin, async (req, res) => {
    try {
        const { userId } = req.params;
        const config = loadConfig();
        if (config.playerOverrides && config.playerOverrides[userId]) {
            delete config.playerOverrides[userId];
        }
        if (await saveConfig(config)) {
            res.json({ success: true, message: `✅ Đã xóa tất cả override cho user ${userId}!` });
        } else {
            res.json({ success: false, message: '❌ Lỗi khi lưu cấu hình!' });
        }
    } catch (error) {
        console.error('❌ Lỗi xóa override:', error);
        res.json({ success: false, message: '❌ Lỗi server: ' + error.message });
    }
});

// ============================================================
// API LẤY TỶ LỆ CHO BOT
// ============================================================
app.post('/api/get-player-rates', (req, res) => {
    try {
        const { userId, gameName } = req.body;
        const config = loadConfig();
        let rates = { winRate: 50, lossRate: 50, drawRate: 0 };
        
        if (userId && config.playerOverrides && config.playerOverrides[userId]) {
            if (config.playerOverrides[userId].global) {
                const global = config.playerOverrides[userId].global;
                if (global.winRate !== undefined) rates.winRate = global.winRate;
                if (global.lossRate !== undefined) rates.lossRate = global.lossRate;
                if (global.drawRate !== undefined) rates.drawRate = global.drawRate;
            }
        }
        
        if (userId && gameName && config.playerOverrides && 
            config.playerOverrides[userId] && config.playerOverrides[userId][gameName]) {
            const gameOverride = config.playerOverrides[userId][gameName];
            if (gameOverride.winrate !== undefined) rates.winRate = gameOverride.winrate;
            if (gameOverride.lossrate !== undefined) rates.lossRate = gameOverride.lossrate;
            if (gameOverride.drawrate !== undefined) rates.drawRate = gameOverride.drawrate;
        }
        
        if (config.globalWinRate && config.globalWinRate.enabled) {
            if (config.globalWinRate.winRate !== undefined) rates.winRate = config.globalWinRate.winRate;
            if (config.globalWinRate.lossRate !== undefined) rates.lossRate = config.globalWinRate.lossRate;
            if (config.globalWinRate.drawRate !== undefined) rates.drawRate = config.globalWinRate.drawRate;
        }
        
        if (gameName && config.gameConfigs && config.gameConfigs[gameName]) {
            const gameConfig = config.gameConfigs[gameName];
            if (gameConfig.winrate !== undefined) rates.winRate = gameConfig.winrate;
            if (gameConfig.lossrate !== undefined) rates.lossRate = gameConfig.lossrate;
            if (gameConfig.drawrate !== undefined) rates.drawRate = gameConfig.drawrate;
        }
        
        const total = rates.winRate + rates.lossRate + rates.drawRate;
        if (total !== 100 && total > 0) {
            rates.lossRate = 100 - rates.winRate - rates.drawRate;
            if (rates.lossRate < 0) rates.lossRate = 0;
        }
        
        rates.winRate = Math.round(rates.winRate * 100) / 100;
        rates.lossRate = Math.round(rates.lossRate * 100) / 100;
        rates.drawRate = Math.round(rates.drawRate * 100) / 100;
        
        res.json({ success: true, rates });
    } catch (error) {
        console.error('❌ Lỗi lấy tỷ lệ:', error);
        res.status(500).json({ success: false, message: 'Lỗi server: ' + error.message });
    }
});

// ============================================================
// API NGƯỜI CHƠI
// ============================================================
app.get('/api/players/stats', requireAuth, (req, res) => {
    try {
        const players = loadPlayers();
        const playerList = Object.values(players);
        
        const stats = {
            totalPlayers: playerList.length,
            totalMoney: playerList.reduce((sum, p) => sum + (p.money || 0), 0),
            totalGames: playerList.reduce((sum, p) => sum + (p.totalGames || 0), 0),
            totalWins: playerList.reduce((sum, p) => sum + (p.totalWins || 0), 0),
            totalDeposited: playerList.reduce((sum, p) => sum + (p.totalDeposited || 0), 0),
            topPlayers: playerList
                .sort((a, b) => (b.money || 0) - (a.money || 0))
                .slice(0, 10)
                .map(p => ({
                    userId: p.userId,
                    username: p.username || p.userId,
                    avatar: p.avatar || null,
                    money: p.money || 0,
                    level: p.level || 1,
                    totalWins: p.totalWins || 0,
                    totalGames: p.totalGames || 0
                }))
        };
        res.json(stats);
    } catch (error) {
        console.error('❌ Lỗi đọc dữ liệu người chơi:', error);
        res.status(500).json({ error: 'Lỗi đọc dữ liệu' });
    }
});

app.get('/api/admin/user/:userId', requireAdmin, async (req, res) => {
    try {
        const { userId } = req.params;
        const players = loadPlayers();
        
        if (!players[userId]) {
            return res.json({ success: false, message: '❌ Không tìm thấy người chơi!' });
        }
        
        const user = players[userId];
        res.json({ 
            success: true, 
            user: {
                userId: user.userId,
                username: user.username || user.userId,
                avatar: user.avatar || null,
                money: user.money || 0,
                level: user.level || 1,
                totalWins: user.totalWins || 0,
                totalGames: user.totalGames || 0,
                totalDeposited: user.totalDeposited || 0,
                totalSpent: user.totalSpent || 0
            }
        });
    } catch (error) {
        console.error('❌ Lỗi lấy user:', error);
        res.json({ success: false, message: '❌ Lỗi server!' });
    }
});

// ============================================================
// API ADMIN - QUẢN LÝ TIỀN USER
// ============================================================
app.post('/api/admin/addmoney', requireAdmin, async (req, res) => {
    try {
        const { userId, amount, reason } = req.body;
        
        if (!userId) return res.json({ success: false, message: '❌ Vui lòng nhập User ID!' });
        if (!amount || amount <= 0) return res.json({ success: false, message: '❌ Vui lòng nhập số tiền hợp lệ!' });
        if (amount > 100000000) return res.json({ success: false, message: '❌ Số tiền tối đa là 100.000.000 VND!' });
        
        let players = loadPlayers();
        if (!players[userId]) return res.json({ success: false, message: `❌ Không tìm thấy người chơi với ID: ${userId}` });
        
        const oldBalance = players[userId].money || 0;
        players[userId].money = oldBalance + amount;
        players[userId].totalDeposited = (players[userId].totalDeposited || 0) + amount;
        
        if (await savePlayers(players)) {
            res.json({ success: true, message: `✅ Đã cộng ${amount.toLocaleString('vi-VN')} VND cho ${userId}`, newBalance: players[userId].money });
        } else {
            res.json({ success: false, message: '❌ Lỗi khi lưu dữ liệu!' });
        }
    } catch (error) {
        console.error('❌ Lỗi cộng tiền:', error);
        res.json({ success: false, message: '❌ Lỗi server: ' + error.message });
    }
});

app.post('/api/admin/removemoney', requireAdmin, async (req, res) => {
    try {
        const { userId, amount, reason } = req.body;
        
        if (!userId) return res.json({ success: false, message: '❌ Vui lòng nhập User ID!' });
        if (!amount || amount <= 0) return res.json({ success: false, message: '❌ Vui lòng nhập số tiền hợp lệ!' });
        
        let players = loadPlayers();
        if (!players[userId]) return res.json({ success: false, message: `❌ Không tìm thấy người chơi với ID: ${userId}` });
        
        const oldBalance = players[userId].money || 0;
        if (oldBalance < amount) return res.json({ success: false, message: `❌ Số dư không đủ! Hiện có: ${oldBalance.toLocaleString('vi-VN')} VND` });
        
        players[userId].money = oldBalance - amount;
        players[userId].totalSpent = (players[userId].totalSpent || 0) + amount;
        
        if (await savePlayers(players)) {
            res.json({ success: true, message: `✅ Đã trừ ${amount.toLocaleString('vi-VN')} VND từ ${userId}`, newBalance: players[userId].money });
        } else {
            res.json({ success: false, message: '❌ Lỗi khi lưu dữ liệu!' });
        }
    } catch (error) {
        console.error('❌ Lỗi trừ tiền:', error);
        res.json({ success: false, message: '❌ Lỗi server: ' + error.message });
    }
});

// ============================================================
// API QUẢN LÝ NẠP TIỀN
// ============================================================

app.get('/api/deposits', requireAdmin, (req, res) => {
    try {
        const transactions = loadTransactions();
        const list = Object.values(transactions).sort((a, b) => b.time - a.time);
        res.json({ success: true, data: list });
    } catch (error) {
        console.error('❌ Lỗi lấy danh sách nạp:', error);
        res.status(500).json({ success: false, message: 'Lỗi server!' });
    }
});

app.get('/api/deposits/check/:transactionId', requireAuth, (req, res) => {
    try {
        const { transactionId } = req.params;
        const transactions = loadTransactions();
        const transaction = transactions[transactionId];
        if (transaction) {
            res.json({ success: true, data: transaction });
        } else {
            res.json({ success: false, message: `Không tìm thấy giao dịch với mã: ${transactionId}` });
        }
    } catch (error) {
        console.error('❌ Lỗi kiểm tra giao dịch:', error);
        res.status(500).json({ success: false, message: 'Lỗi server!' });
    }
});

app.post('/api/deposits/create', requireAuth, async (req, res) => {
    try {
        const { userId, amount, note } = req.body;
        
        if (userId !== req.session.user.id && !req.session.user.isAdmin) {
            return res.json({ success: false, message: '❌ Bạn chỉ có thể tạo bill cho chính mình!' });
        }
        if (!userId) return res.json({ success: false, message: '❌ Vui lòng nhập User ID!' });
        if (!amount || amount <= 0) return res.json({ success: false, message: '❌ Vui lòng nhập số tiền hợp lệ!' });
        if (amount > 100000000) return res.json({ success: false, message: '❌ Số tiền tối đa là 100.000.000 VND!' });
        
        const players = loadPlayers();
        if (!players[userId]) return res.json({ success: false, message: `❌ Không tìm thấy người chơi với ID: ${userId}` });
        
        const transactions = loadTransactions();
        const pendingTransaction = Object.values(transactions).find(t => t.userId === userId && t.status === 'pending');
        if (pendingTransaction) {
            return res.json({ success: false, message: `❌ Bạn đã có giao dịch đang chờ xác nhận!\n🔑 Mã: ${pendingTransaction.transactionId}` });
        }
        
        const transactionId = generateTransactionId();
        const newTransaction = {
            transactionId: transactionId,
            userId: userId,
            username: players[userId].username || userId,
            amount: amount,
            note: note || 'Nạp tiền vào game',
            status: 'pending',
            time: Date.now(),
            transferContent: `NAP ${players[userId].username || userId} ${amount} VND`
        };
        
        transactions[transactionId] = newTransaction;
        
        if (await saveTransactions(transactions)) {
            res.json({ success: true, message: `✅ Đã tạo bill nạp thành công!`, transactionId: transactionId, data: newTransaction });
        } else {
            res.json({ success: false, message: '❌ Lỗi khi lưu giao dịch!' });
        }
    } catch (error) {
        console.error('❌ Lỗi tạo bill nạp:', error);
        res.json({ success: false, message: '❌ Lỗi server: ' + error.message });
    }
});

app.post('/api/deposits/approve/:transactionId', requireAdmin, async (req, res) => {
    try {
        const { transactionId } = req.params;
        let transactions = loadTransactions();
        
        if (!transactions[transactionId]) return res.json({ success: false, message: `❌ Không tìm thấy giao dịch: ${transactionId}` });
        const transaction = transactions[transactionId];
        if (transaction.status !== 'pending') return res.json({ success: false, message: `❌ Giao dịch đã được xử lý!` });
        
        transaction.status = 'completed';
        transaction.processedAt = Date.now();
        transaction.processedBy = req.session.user.username;
        
        let players = loadPlayers();
        let oldBalance = 0;
        let newBalance = 0;
        
        if (players[transaction.userId]) {
            oldBalance = players[transaction.userId].money || 0;
            players[transaction.userId].money = oldBalance + transaction.amount;
            players[transaction.userId].totalDeposited = (players[transaction.userId].totalDeposited || 0) + transaction.amount;
            newBalance = players[transaction.userId].money;
            await savePlayers(players);
        }
        
        transactions[transactionId] = transaction;
        if (await saveTransactions(transactions)) {
            // ===== GỬI TIN NHẮN RIÊNG CHO USER =====
            const userMessage = `🎉 **XÁC NHẬN NẠP TIỀN THÀNH CÔNG!** 🎉\n\n` +
                              `💰 Số tiền: **${transaction.amount.toLocaleString('vi-VN')} VND**\n` +
                              `🔑 Mã giao dịch: \`${transactionId}\`\n` +
                              `💵 Số dư hiện tại: **${newBalance.toLocaleString('vi-VN')} VND**\n` +
                              `📌 Trạng thái: ✅ Đã xác nhận\n` +
                              `⏰ Thời gian: <t:${Math.floor(Date.now() / 1000)}:F>\n\n` +
                              `📝 Ghi chú: Số tiền đã được cộng vào tài khoản game của bạn. Chúc bạn may mắn! 🎉`;
            
            // Gửi DM (không chặn luồng chính)
            sendDirectMessageToUser(transaction.userId, userMessage).catch(err => {
                console.log(`⚠️ Lỗi gửi DM: ${err.message}`);
            });
            // ===== KẾT THÚC =====
            
            res.json({ 
                success: true, 
                message: `✅ Đã duyệt giao dịch ${transactionId}`,
                notified: true
            });
        } else {
            res.json({ success: false, message: '❌ Lỗi khi lưu dữ liệu!' });
        }
    } catch (error) {
        console.error('❌ Lỗi duyệt giao dịch:', error);
        res.json({ success: false, message: '❌ Lỗi server: ' + error.message });
    }
});

// ============================================================
// API TEST GỬI TIN NHẮN RIÊNG
// ============================================================
app.post('/api/admin/test-dm', requireAdmin, async (req, res) => {
    try {
        const { userId, message } = req.body;
        
        if (!userId) {
            return res.json({ success: false, message: '❌ Vui lòng nhập User ID!' });
        }
        
        const testMessage = message || '🔔 Đây là tin nhắn test từ bot! Nếu bạn nhận được tin nhắn này, hệ thống gửi DM hoạt động tốt.';
        
        const result = await sendDirectMessageToUser(userId, testMessage);
        
        if (result) {
            res.json({ success: true, message: '✅ Đã gửi tin nhắn test thành công!' });
        } else {
            res.json({ success: false, message: '❌ Không thể gửi tin nhắn. Kiểm tra bot token hoặc quyền DM.' });
        }
    } catch (error) {
        console.error('❌ Lỗi test DM:', error);
        res.json({ success: false, message: '❌ Lỗi server: ' + error.message });
    }
});

app.post('/api/deposits/reject/:transactionId', requireAdmin, async (req, res) => {
    try {
        const { transactionId } = req.params;
        let transactions = loadTransactions();
        
        if (!transactions[transactionId]) return res.json({ success: false, message: `❌ Không tìm thấy giao dịch: ${transactionId}` });
        const transaction = transactions[transactionId];
        if (transaction.status !== 'pending') return res.json({ success: false, message: `❌ Giao dịch đã được xử lý!` });
        
        transaction.status = 'rejected';
        transaction.processedAt = Date.now();
        transaction.processedBy = req.session.user.username;
        
        transactions[transactionId] = transaction;
        if (await saveTransactions(transactions)) {
            res.json({ success: true, message: `✅ Đã từ chối giao dịch ${transactionId}` });
        } else {
            res.json({ success: false, message: '❌ Lỗi khi lưu dữ liệu!' });
        }
    } catch (error) {
        console.error('❌ Lỗi từ chối giao dịch:', error);
        res.json({ success: false, message: '❌ Lỗi server: ' + error.message });
    }
});

app.get('/api/deposits/user/:userId', requireAuth, (req, res) => {
    try {
        const { userId } = req.params;
        if (userId !== req.session.user.id && !req.session.user.isAdmin) {
            return res.json({ success: false, message: '❌ Bạn chỉ có thể xem lịch sử của mình!' });
        }
        const transactions = loadTransactions();
        const userDeposits = Object.values(transactions)
            .filter(d => d.userId === userId)
            .sort((a, b) => b.time - a.time);
        res.json({ success: true, data: userDeposits });
    } catch (error) {
        console.error('❌ Lỗi lấy lịch sử nạp user:', error);
        res.status(500).json({ success: false, message: 'Lỗi server!' });
    }
});

// ============================================================
// API USER PROFILE
// ============================================================
app.get('/api/user/profile', requireAuth, (req, res) => {
    const players = loadPlayers();
    const userData = players[req.session.user.id];
    res.json({
        success: true,
        user: req.session.user,
        playerData: userData || null
    });
});

// ============================================================
// API TẠO FILE CẤU HÌNH MẪU
// ============================================================
app.post('/api/config/template', requireAdmin, async (req, res) => {
    try {
        const template = {
            minBet: 100,
            maxBet: 10000,
            initialMoney: 1000,
            banks: [
                {
                    id: 'bank_default_1',
                    bankName: 'MB Bank',
                    accountHolder: 'NGUYEN MINH QUOC',
                    accountNumber: '0356890540',
                    branch: 'Ha Noi',
                    content: 'NAP [TEN] [SO TIEN]',
                    active: true,
                    createdAt: Date.now()
                }
            ],
            bankInfo: {
                bankName: 'MB Bank',
                bankCode: 'MB',
                accountNumber: '0356890540',
                accountName: 'NGUYEN MINH QUOC',
                branch: 'Ha Noi'
            },
            gameConfigs: {},
            playerOverrides: {},
            globalWinRate: { enabled: false, winRate: 50, lossRate: 50, drawRate: 0 }
        };
        
        if (await saveConfig(template)) {
            res.json({ success: true, message: '✅ Đã tạo file cấu hình mẫu!', config: template });
        } else {
            res.json({ success: false, message: '❌ Lỗi khi tạo file mẫu!' });
        }
    } catch (error) {
        console.error('❌ Lỗi tạo file mẫu:', error);
        res.json({ success: false, message: '❌ Lỗi server: ' + error.message });
    }
});

// ============================================================
// SERVER START
// ============================================================
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
    console.log(`🌐 Web quản lý đang chạy tại: http://localhost:${PORT}`);
    console.log(`🔑 Discord OAuth2:`);
    console.log(`   Client ID: ${DISCORD_CLIENT_ID}`);
    console.log(`   Redirect URI: ${DISCORD_REDIRECT_URI}`);
    console.log(`   Admin IDs: ${ADMIN_USER_IDS.join(', ')}`);
    console.log(`🏦 Bank API: /api/banks`);
});