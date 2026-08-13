// Tải cấu hình từ file .env lên đầu tiên để bảo mật token
require('dotenv').config(); 
const { Client, GatewayIntentBits, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const fs = require('fs');
const path = require('path');
const QRCode = require('qrcode');

// === ĐỌC CẤU HÌNH TỪ FILE ===
const CONFIG_FILE = path.join(__dirname, 'config.json');
// === FILE LƯU GIAO DỊCH ===
const TRANSACTIONS_FILE = path.join(__dirname, 'transactions.json');

function getDefaultConfig(gameName) {
    const defaults = {
        'luckydraw': {
            winRate: 35,
            lossRate: 40,
            drawRate: 25,
            multipliers: { '2x': 25, '3x': 18, '5x': 10, '10x': 5, '20x': 2 }
        },
        'crash': {
            winRate: 45,
            crashProbability: 55,
            maxMultiplier: 10,
            minMultiplier: 1.1
        },
        'blackjack': {
            winRate: 45,
            lossRate: 55,
            blackjackRate: 5,      // Tỷ lệ Blackjack (5%)
            dealerBustRate: 20,    // Tỷ lệ nhà cái bust (20%)
            pushRate: 10          // Tỷ lệ hòa (10%)
        },
        'taixiu': {
            winRate: 48,
            lossRate: 52
        },
        'xocdia': {
            winRate: 48,
            lossRate: 52
        },
        'slot': {
            winRate: 30,
            jackpotRate: 5
        },
        'kbb': {
            winRate: 33,
            drawRate: 33,
            lossRate: 34
        },
        'poker': {
            winRate: 45,
            lossRate: 55
        },
        'roulette': {
            winRate: 48,
            lossRate: 52
        },
        'dice': {
            winRate: 50,
            lossRate: 50
        },
        'coinflip': {
            winRate: 50,
            lossRate: 50
        },
        'guess': {
            winRate: 40,
            lossRate: 60
        },
        'lottery': {
            winRate: 30,
            lossRate: 70
        },
        'horse': {
            winRate: 40,
            lossRate: 60
        },
        'racing': {
            winRate: 40,
            lossRate: 60
        },
        'baucua': {
            winRate: 30,
            lossRate: 70
        }
    };
    return defaults[gameName] || {};
}

// === HÀM ĐỌC GIAO DỊCH ===
function loadTransactions() {
    try {
        if (fs.existsSync(TRANSACTIONS_FILE)) {
            const data = fs.readFileSync(TRANSACTIONS_FILE, 'utf8');
            return JSON.parse(data);
        }
    } catch (error) {
        console.error('❌ Lỗi đọc file giao dịch:', error);
    }
    return {};
}

// === HÀM LƯU GIAO DỊCH ===
function saveTransactions(transactions) {
    try {
        fs.writeFileSync(TRANSACTIONS_FILE, JSON.stringify(transactions, null, 2), 'utf8');
        console.log('✅ Đã lưu giao dịch thành công!');
        return true;
    } catch (error) {
        console.error('❌ Lỗi lưu file giao dịch:', error);
        return false;
    }
}

// === BIẾN TOÀN CỤC (KHAI BÁO DUY NHẤT 1 LẦN) ===
let PREFIX = '!';
let MIN_BET = 100;
let MAX_BET = 10000;
let INITIAL_MONEY = 1000;

// === BIẾN NGÂN HÀNG ===
let BANKS = [];  // <-- THÊM DÒNG NÀY
let BANK_INFO = {
    bankName: 'MB Bank',
    bankCode: 'MB',
    accountNumber: '0356890540',
    accountName: 'NGUYEN MINH QUOC',
    branch: 'Ha Noi'
};

// === BIẾN CẤU HÌNH (KHAI BÁO DUY NHẤT 1 LẦN) ===
let GAME_CONFIGS = {};
let PLAYER_OVERRIDES = {};
let GLOBAL_WIN_RATE = { enabled: false, winRate: 50, lossRate: 50 };

function loadBotConfig() {
    try {
        if (fs.existsSync(CONFIG_FILE)) {
            const data = fs.readFileSync(CONFIG_FILE, 'utf8');
            const config = JSON.parse(data);
            
            MIN_BET = config.minBet || 100;
            MAX_BET = config.maxBet || 10000;
            INITIAL_MONEY = config.initialMoney || 1000;
            
            // === ĐỌC DANH SÁCH NGÂN HÀNG ===
            if (config.banks && Array.isArray(config.banks)) {
                BANKS = config.banks;
                console.log(`🏦 Đã tải ${BANKS.length} ngân hàng`);
                BANKS.forEach((bank, i) => {
                    console.log(`   ${i+1}. ${bank.bankName} - ${bank.accountNumber} (${bank.active !== false ? '✅' : '❌'})`);
                });
            }
            
            if (config.bankInfo) {
                BANK_INFO.bankName = config.bankInfo.bankName || BANK_INFO.bankName;
                BANK_INFO.bankCode = config.bankInfo.bankCode || BANK_INFO.bankCode;
                BANK_INFO.accountNumber = config.bankInfo.accountNumber || BANK_INFO.accountNumber;
                BANK_INFO.accountName = config.bankInfo.accountName || BANK_INFO.accountName;
                BANK_INFO.branch = config.bankInfo.branch || BANK_INFO.branch;
            }
            
            GAME_CONFIGS = config.gameConfigs || {};
            PLAYER_OVERRIDES = config.playerOverrides || {};
            
            // === QUAN TRỌNG: CẬP NHẬT GLOBAL_WIN_RATE ===
            if (config.globalWinRate) {
                GLOBAL_WIN_RATE = {
                    enabled: config.globalWinRate.enabled || false,
                    winRate: config.globalWinRate.winRate || 50,
                    lossRate: config.globalWinRate.lossRate || 50,
                    drawRate: config.globalWinRate.drawRate || 0
                };
            } else {
                GLOBAL_WIN_RATE = { enabled: false, winRate: 50, lossRate: 50 };
            }
            
            console.log(`✅ Đã tải cấu hình: Global Win Rate = ${GLOBAL_WIN_RATE.enabled ? 'BẬT' : 'TẮT'}`);
            console.log(`📊 GLOBAL_WIN_RATE: Win=${GLOBAL_WIN_RATE.winRate}%, Loss=${GLOBAL_WIN_RATE.lossRate}%`);
            
            return config;
        }
    } catch (error) {
        console.error('❌ Lỗi đọc file cấu hình:', error);
    }
    return null;
}

// === HÀM LẤY NGÂN HÀNG ĐANG HOẠT ĐỘNG ===
function getActiveBanks() {
    if (!BANKS || !Array.isArray(BANKS)) return [];
    return BANKS.filter(b => b.active !== false);
}

// === HÀM LẤY NGÂN HÀNG THEO ID ===
function getBankById(id) {
    if (!BANKS || !Array.isArray(BANKS)) return null;
    return BANKS.find(b => b.id === id) || null;
}

// === HÀM LẤY NGÂN HÀNG MẶC ĐỊNH ===
function getDefaultBank() {
    const activeBanks = getActiveBanks();
    if (activeBanks.length > 0) {
        return activeBanks[0];
    }
    return {
        bankName: BANK_INFO.bankName || 'MB Bank',
        bankCode: BANK_INFO.bankCode || 'MB',
        accountNumber: BANK_INFO.accountNumber || '0356890540',
        accountName: BANK_INFO.accountName || 'NGUYEN MINH QUOC',
        branch: BANK_INFO.branch || 'Ha Noi'
    };
}

// === HÀM LẤY CẤU HÌNH CHO GAME ===
function getGameConfig(playerId, gameName) {
    // === QUAN TRỌNG: TẢI LẠI CONFIG MỚI NHẤT ===
    loadBotConfig();
    
    let config = null;
    
    // === BƯỚC 1: KIỂM TRA PLAYER OVERRIDE (CAO NHẤT) ===
    if (PLAYER_OVERRIDES && PLAYER_OVERRIDES[playerId]) {
        const playerConfig = PLAYER_OVERRIDES[playerId];
        
        // 1A: ƯU TIÊN GLOBAL CỦA PLAYER TRƯỚC
        if (playerConfig.global) {
            console.log(`📊 Sử dụng cấu hình GLOBAL riêng cho ${playerId}`);
            config = {
                winRate: playerConfig.global.winRate || 50,
                lossRate: playerConfig.global.lossRate || 50,
                drawRate: playerConfig.global.drawRate || 0
            };
            return normalizeRates(config);
        }
        
        // 1B: Kiểm tra game cụ thể của player
        if (playerConfig[gameName]) {
            console.log(`📊 Sử dụng cấu hình ${gameName} riêng cho ${playerId}`);
            config = playerConfig[gameName];
            return normalizeRates(config);
        }
    }
    
    // === BƯỚC 2: KIỂM TRA GLOBAL WIN RATE CỦA SERVER ===
    if (GLOBAL_WIN_RATE && GLOBAL_WIN_RATE.enabled) {
        console.log(`📊 Sử dụng GLOBAL WIN RATE server: ${GLOBAL_WIN_RATE.winRate}%`);
        config = {
            winRate: GLOBAL_WIN_RATE.winRate || 50,
            lossRate: GLOBAL_WIN_RATE.lossRate || 50,
            drawRate: GLOBAL_WIN_RATE.drawRate || 0
        };
        return normalizeRates(config);
    }
    
    // === BƯỚC 3: KIỂM TRA CẤU HÌNH GAME CỦA SERVER ===
    if (GAME_CONFIGS && GAME_CONFIGS[gameName]) {
        console.log(`📊 Sử dụng cấu hình ${gameName} của server`);
        config = GAME_CONFIGS[gameName];
        return normalizeRates(config);
    }
    
    // === BƯỚC 4: CẤU HÌNH MẶC ĐỊNH ===
    console.log(`📊 Sử dụng cấu hình ${gameName} mặc định`);
    config = getDefaultConfig(gameName);
    return normalizeRates(config);
}

// === HÀM CÂN BẰNG TỶ LỆ ===
function normalizeRates(config) {
    if (!config) return { winRate: 50, lossRate: 50, drawRate: 0 };
    
    // Clone config để không ảnh hưởng config gốc
    const normalized = {
        winRate: parseFloat(config.winRate) || 0,
        lossRate: parseFloat(config.lossRate) || 0,
        drawRate: parseFloat(config.drawRate) || 0
    };
    
    // Nếu tất cả = 0, set mặc định
    if (normalized.winRate === 0 && normalized.lossRate === 0 && normalized.drawRate === 0) {
        return { winRate: 50, lossRate: 50, drawRate: 0 };
    }
    
    // Tính tổng
    let total = normalized.winRate + normalized.lossRate + normalized.drawRate;
    
    // Nếu tổng không bằng 100, cân bằng lại
    if (total !== 100) {
        // Ưu tiên giữ nguyên winRate
        if (normalized.winRate > 100) normalized.winRate = 100;
        if (normalized.winRate < 0) normalized.winRate = 0;
        
        // Nếu winRate đã là 100, set lossRate = 0, drawRate = 0
        if (normalized.winRate === 100) {
            normalized.lossRate = 0;
            normalized.drawRate = 0;
        } else {
            // Cân bằng lossRate + drawRate = 100 - winRate
            const remaining = 100 - normalized.winRate;
            
            // Ưu tiên giữ drawRate nếu có
            if (normalized.drawRate > 0) {
                normalized.drawRate = Math.min(normalized.drawRate, remaining);
                normalized.lossRate = remaining - normalized.drawRate;
            } else {
                normalized.lossRate = remaining;
                normalized.drawRate = 0;
            }
        }
        
        console.log(`⚖️ Đã cân bằng tỷ lệ: Win=${normalized.winRate}%, Loss=${normalized.lossRate}%, Draw=${normalized.drawRate}%`);
    }
    
    return normalized;
}

// Tải cấu hình khi bot khởi động
loadBotConfig();

// Theo dõi thay đổi cấu hình (mỗi 10 giây)
setInterval(() => {
    loadBotConfig();
}, 10000);

// === DANH SÁCH MÀU NGỰA ===
const HORSE_COLORS = ['🏇 Den', '🏇 Trang', '🏇 Nau', '🏇 Xam', '🏇 Vang'];

// === DANH SÁCH CON VẬT BẦU CUA ===
const BAU_CUA_ANIMALS = [
    { name: 'cua', emoji: '🦀', display: '🦀 Cua' },
    { name: 'tom', emoji: '🦐', display: '🦐 Tom' },
    { name: 'ca', emoji: '🐟', display: '🐟 Ca' },
    { name: 'ga', emoji: '🐔', display: '🐔 Ga' },
    { name: 'rong', emoji: '🐉', display: '🐉 Rong' },
    { name: 'heo', emoji: '🐷', display: '🐷 Heo' }
];

// === DANH SÁCH QUÀ TẶNG ===
const DAILY_REWARDS = [
    { name: '🪙 500 VND', amount: 500, chance: 30 },
    { name: '🪙 1000 VND', amount: 1000, chance: 25 },
    { name: '🪙 2000 VND', amount: 2000, chance: 20 },
    { name: '🪙 5000 VND', amount: 5000, chance: 15 },
    { name: '🪙 10000 VND', amount: 10000, chance: 8 },
    { name: '🌟 20000 VND', amount: 20000, chance: 2 }
];

// === DANH SÁCH HIỆU ỨNG ===
const EFFECTS = {
    WIN: ['🎉', '✨', '🌟', '💫', '🎊', '🏆', '👑', '💎'],
    LOSE: ['💔', '😢', '😭', '💀', '🌧️', '⚡'],
    SLOT: ['🍒', '🍋', '🍊', '🍇', '💎', '7️⃣', '⭐', '🎰'],
    DICE: ['⚀', '⚁', '⚂', '⚃', '⚄', '⚅']
};

// === LỚP QUẢN LÝ NGƯỜI CHƠI ===
class Player {
    constructor(userId) {
        this.userId = userId;
        this.money = INITIAL_MONEY;
        this.totalWins = 0;
        this.totalLosses = 0;
        this.totalGames = 0;
        this.inventory = [];
        this.lastDaily = 0;
        this.xocdiaWins = 0;
        this.taixiuWins = 0;
        this.blackjackWins = 0;
        this.horseWins = 0;
        this.baucuaWins = 0;
        this.slotWins = 0;
        this.luckydrawWins = 0;
        this.kbbWins = 0;
        this.guessWins = 0;
        this.favoriteGame = 'Chua co';
        this.gameHistory = [];
        this.xocdiaLosses = 0;
        this.taixiuLosses = 0;
        this.blackjackLosses = 0;
        this.horseLosses = 0;
        this.baucuaLosses = 0;
        this.slotLosses = 0;
        this.luckydrawLosses = 0;
        this.kbbLosses = 0;
        this.guessLosses = 0;
        this.totalBets = 0;
        this.totalWonAmount = 0;
        this.totalLostAmount = 0;
        this.achievements = [];
        this.xp = 0;
        this.level = 1;
        this.comboWins = 0;
        this.maxComboWins = 0;
        this.lastGameTime = 0;
        this.streak = 0;
        this.winRate = 0;
        this.averageBet = 0;
        this.totalBetAmount = 0;
        this.gamePatterns = {
            favoriteGame: 'Chua co',
            bestGame: 'Chua co',
            worstGame: 'Chua co',
            riskyGames: [],
            safeGames: []
        };
        this.riskLevel = 'medium';
        this.lastGamesResult = [];
        this.consecutiveLosses = 0;
        this.consecutiveWins = 0;
        this.betPatterns = {
            increasing: false,
            decreasing: false,
            random: true
        };
        this.playTime = 0;
        this.lastActive = Date.now();
        this.totalReferred = 0;
        this.referralCode = this.generateReferralCode();
        this.friends = [];
        this.dailyStreak = 0;
        this.lastDailyClaim = 0;
        this.totalGamesPlayedToday = 0;
        this.lastGameDate = 0;
        this.mostPlayedGame = 'Chua co';
        this.totalEarnings = 0;
        this.totalSpent = 0;
        this.totalDeposited = 0;
        this.totalWithdrawn = 0;
        this.pendingDeposits = [];
        this.depositHistory = [];
        this.pokerWins = 0;
        this.pokerLosses = 0;
        this.rouletteWins = 0;
        this.rouletteLosses = 0;
        this.crashWins = 0;
        this.crashLosses = 0;
        this.diceWins = 0;
        this.diceLosses = 0;
        this.coinflipWins = 0;
        this.coinflipLosses = 0;
    }

    generateReferralCode() {
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
        let code = '';
        for (let i = 0; i < 6; i++) {
            code += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        return code;
    }

    addMoney(amount) {
        if (typeof amount !== 'number' || isNaN(amount)) {
            console.error(`❌ Loi: amount khong hop le - ${amount}`);
            return false;
        }

        this.money += amount;
        this.totalGames++;
        
        this.xp += Math.abs(amount) / 10;
        this.checkLevelUp();
        
        if (amount > 0) {
            this.totalWins++;
            this.totalWonAmount += amount;
            this.totalEarnings += amount;
            this.comboWins++;
            this.consecutiveWins++;
            this.consecutiveLosses = 0;
            if (this.comboWins > this.maxComboWins) {
                this.maxComboWins = this.comboWins;
            }
            this.streak = Math.max(0, this.streak + 1);
            console.log(`✅ ${this.userId} thang: +${amount} VND`);
            return true;
        } else if (amount < 0) {
            this.totalLosses++;
            this.totalLostAmount += Math.abs(amount);
            this.totalSpent += Math.abs(amount);
            this.comboWins = 0;
            this.consecutiveLosses++;
            this.consecutiveWins = 0;
            this.streak = Math.min(0, this.streak - 1);
            console.log(`❌ ${this.userId} thua: ${amount} VND`);
            return false;
        }
        console.log(`⚖️ ${this.userId} hoa: khong thay doi tien`);
        return null;
    }

// Thay thế hàm depositMoney hiện tại bằng code này
depositMoney(amount, transactionId) {
    if (typeof amount !== 'number' || isNaN(amount) || amount <= 0) {
        return { success: false, message: 'So tien khong hop le!' };
    }

    // Cộng tiền vào số dư
    this.money += amount;
    this.totalDeposited += amount;
    
    // Cập nhật lịch sử nạp - đánh dấu là completed
    this.depositHistory.push({
        amount: amount,
        transactionId: transactionId,
        time: Date.now(),
        status: 'completed'
    });
    
    // Xóa pending nếu có
    this.pendingDeposits = this.pendingDeposits.filter(d => d.transactionId !== transactionId);
    
    // Cộng XP
    this.xp += amount / 10;
    this.checkLevelUp();
    
    console.log(`💰 ${this.userId} da nap ${amount} VND, giao dich: ${transactionId}`);
    console.log(`💰 So du hien tai: ${this.money.toLocaleString()} VND`);
    
    // Lưu ngay lập tức
    savePlayers(players);
    
    return { success: true, message: `Da nap thanh cong ${amount.toLocaleString()} VND!` };
}

    calculateLossMultiplier() {
        let multiplier = 1.0;
        
        if (this.totalWins > this.totalLosses * 1.5) {
            multiplier += 0.1;
        }
        
        if (this.money > 10000) {
            multiplier += 0.05;
        }
        
        if (this.averageBet > 5000) {
            multiplier += 0.1;
        }
        
        if (this.favoriteGame === 'Tai xiu' || this.favoriteGame === 'Xoc dia') {
            multiplier += 0.05;
        }
        
        if (this.dailyStreak >= 7) {
            multiplier += 0.05;
        }
        
        return Math.min(multiplier, 1.5);
    }

    checkLevelUp() {
        const xpNeeded = this.level * 100;
        while (this.xp >= xpNeeded) {
            this.xp -= xpNeeded;
            this.level++;
            this.checkAchievements('level_up');
        }
    }

canBet(amount) {
    // Kiểm tra số tiền hợp lệ
    if (typeof amount !== 'number' || isNaN(amount) || amount <= 0) {
        return false;
    }
    
    // Kiểm tra từng điều kiện
    if (amount < MIN_BET) {
        return false;
    }
    
    if (amount > MAX_BET) {
        return false;
    }
    
    if (amount > this.money) {
        return false;
    }
    
    return true;
}

    addGameHistory(gameName, amount, win) {
        this.gameHistory.push({
            game: gameName,
            amount: amount,
            win: win,
            time: Date.now()
        });
        if (this.gameHistory.length > 50) {
            this.gameHistory.shift();
        }
        
        this.updateGameAnalysis(gameName, win, amount);
        
        const today = new Date().setHours(0, 0, 0, 0);
        if (this.lastGameDate !== today) {
            this.totalGamesPlayedToday = 0;
            this.lastGameDate = today;
        }
        this.totalGamesPlayedToday++;
        
        const gameCount = {};
        for (const g of this.gameHistory) {
            gameCount[g.game] = (gameCount[g.game] || 0) + 1;
        }
        let maxCount = 0;
        let mostPlayed = 'Chua co';
        for (const [game, count] of Object.entries(gameCount)) {
            if (count > maxCount) {
                maxCount = count;
                mostPlayed = game;
            }
        }
        this.mostPlayedGame = mostPlayed;
    }

    updateGameAnalysis(gameName, win, amount) {
        this.lastGamesResult.push({ game: gameName, win, amount });
        if (this.lastGamesResult.length > 20) {
            this.lastGamesResult.shift();
        }
        
        this.totalBetAmount += amount;
        this.averageBet = this.totalBetAmount / this.totalGames;
        
        if (this.totalGames > 0) {
            this.winRate = (this.totalWins / this.totalGames) * 100;
        }
        
        this.analyzeBetPatterns();
        this.analyzeRiskLevel();
    }

    analyzeBetPatterns() {
        if (this.gameHistory.length < 5) return;
        
        const recentBets = this.gameHistory.slice(-10);
        let increasing = true;
        let decreasing = true;
        
        for (let i = 1; i < recentBets.length; i++) {
            if (recentBets[i].amount <= recentBets[i-1].amount) increasing = false;
            if (recentBets[i].amount >= recentBets[i-1].amount) decreasing = false;
        }
        
        this.betPatterns.increasing = increasing;
        this.betPatterns.decreasing = decreasing;
        this.betPatterns.random = !increasing && !decreasing;
    }

    analyzeRiskLevel() {
        let riskScore = 0;
        
        if (this.averageBet > 5000) riskScore += 2;
        else if (this.averageBet > 2000) riskScore += 1;
        
        if (this.winRate > 60) riskScore += 1;
        else if (this.winRate < 30) riskScore += 2;
        
        if (this.consecutiveLosses > 3) riskScore += 1;
        if (this.consecutiveWins > 3) riskScore += 1;
        
        if (this.betPatterns.increasing) riskScore += 1;
        
        if (riskScore >= 4) this.riskLevel = 'high';
        else if (riskScore >= 2) this.riskLevel = 'medium';
        else this.riskLevel = 'low';
        
        this.updateFavoriteGame();
    }

    updateFavoriteGame() {
        const games = {
            'xocdia': this.xocdiaWins,
            'taixiu': this.taixiuWins,
            'blackjack': this.blackjackWins,
            'horse': this.horseWins,
            'baucua': this.baucuaWins,
            'slot': this.slotWins,
            'luckydraw': this.luckydrawWins,
            'kbb': this.kbbWins,
            'guess': this.guessWins,
            'poker': this.pokerWins,
            'roulette': this.rouletteWins,
            'crash': this.crashWins,
            'dice': this.diceWins,
            'coinflip': this.coinflipWins
        };
        
        let maxWins = 0;
        let favorite = 'Chua co';
        let bestGame = 'Chua co';
        let worstGame = 'Chua co';
        
        for (const [game, wins] of Object.entries(games)) {
            if (wins > maxWins) {
                maxWins = wins;
                favorite = this.getGameName(game);
                bestGame = favorite;
            }
        }
        
        const losses = {
            'xocdia': this.xocdiaLosses,
            'taixiu': this.taixiuLosses,
            'blackjack': this.blackjackLosses,
            'horse': this.horseLosses,
            'baucua': this.baucuaLosses,
            'slot': this.slotLosses,
            'luckydraw': this.luckydrawLosses,
            'kbb': this.kbbLosses,
            'guess': this.guessLosses,
            'poker': this.pokerLosses,
            'roulette': this.rouletteLosses,
            'crash': this.crashLosses,
            'dice': this.diceLosses,
            'coinflip': this.coinflipLosses
        };
        
        let maxLosses = 0;
        for (const [game, loss] of Object.entries(losses)) {
            if (loss > maxLosses) {
                maxLosses = loss;
                worstGame = this.getGameName(game);
            }
        }
        
        this.favoriteGame = favorite;
        this.gamePatterns.favoriteGame = favorite;
        this.gamePatterns.bestGame = bestGame;
        this.gamePatterns.worstGame = worstGame;
    }

    getGameName(key) {
        const names = {
            'xocdia': 'Xoc dia',
            'taixiu': 'Tai xiu',
            'blackjack': 'Xi rach',
            'horse': 'Dua ngua',
            'baucua': 'Bau cua',
            'slot': 'Mini Slot',
            'luckydraw': 'Rut tham',
            'kbb': 'Keo bua bao',
            'guess': 'Doan so',
            'poker': 'Poker',
            'roulette': 'Roulette',
            'crash': 'Crash',
            'dice': 'Dice',
            'coinflip': 'Coinflip'
        };
        return names[key] || key;
    }

    checkAchievements(type) {
        const achievements = [];
        
        if (this.totalGames >= 10) achievements.push('🎮 Game thu nghiep du');
        if (this.totalGames >= 50) achievements.push('🎮 Game thu chuyen nghiep');
        if (this.totalGames >= 100) achievements.push('🎮 Bac thay game thu');
        if (this.totalGames >= 500) achievements.push('🎮 Huyen thoai game thu');
        
        if (this.totalWonAmount >= 10000) achievements.push('💰 Trieu phu tap su');
        if (this.totalWonAmount >= 100000) achievements.push('💰 Trieu phu');
        if (this.totalWonAmount >= 1000000) achievements.push('💰 Ty phu');
        if (this.totalWonAmount >= 10000000) achievements.push('💰 Dai gia');
        
        if (this.level >= 5) achievements.push('⭐ Cap do 5');
        if (this.level >= 10) achievements.push('⭐ Cap do 10');
        if (this.level >= 20) achievements.push('⭐ Cap do 20');
        if (this.level >= 50) achievements.push('⭐ Cap do 50');
        
        if (this.totalWins >= 10) achievements.push('🏆 Chien thang dau tien');
        if (this.totalWins >= 50) achievements.push('🏆 Bach chien bach thang');
        if (this.totalWins >= 100) achievements.push('🏆 Huyen thoai');
        if (this.totalWins >= 500) achievements.push('🏆 Bat bai');
        
        if (this.maxComboWins >= 5) achievements.push('🔥 Combo 5 chien thang');
        if (this.maxComboWins >= 10) achievements.push('🔥 Combo 10 chien thang');
        if (this.maxComboWins >= 20) achievements.push('🔥 Combo 20 chien thang');
        
        if (this.consecutiveLosses >= 5) achievements.push('💔 Chuoi thua 5');
        if (this.consecutiveLosses >= 10) achievements.push('💔 Chuoi thua 10');
        
        if (this.dailyStreak >= 7) achievements.push('📅 Cham chi 7 ngay');
        if (this.dailyStreak >= 30) achievements.push('📅 Cham chi 30 ngay');
        
        if (this.totalDeposited >= 100000) achievements.push('💰 Nha dau tu');
        if (this.totalDeposited >= 500000) achievements.push('💰 Dai gia nap tien');
        if (this.totalDeposited >= 1000000) achievements.push('💰 Ty phu nap tien');
        
        for (const achievement of achievements) {
            if (!this.achievements.includes(achievement)) {
                this.achievements.push(achievement);
            }
        }
    }

    getPlayerAnalysis() {
        return {
            riskLevel: this.riskLevel,
            winRate: this.winRate.toFixed(1),
            averageBet: this.averageBet,
            favoriteGame: this.favoriteGame,
            bestGame: this.gamePatterns.bestGame,
            worstGame: this.gamePatterns.worstGame,
            consecutiveWins: this.consecutiveWins,
            consecutiveLosses: this.consecutiveLosses,
            betPattern: this.betPatterns.increasing ? 'Tang dan' : 
                       this.betPatterns.decreasing ? 'Giam dan' : 'Ngau nhien',
            totalGames: this.totalGames,
            totalWins: this.totalWins,
            totalLosses: this.totalLosses,
            recentResults: this.lastGamesResult.slice(-5).map(g => 
                `${g.game}: ${g.win ? '✅' : '❌'}`
            ),
            dailyStreak: this.dailyStreak,
            mostPlayedGame: this.mostPlayedGame,
            totalEarnings: this.totalEarnings,
            totalSpent: this.totalSpent,
            totalDeposited: this.totalDeposited,
            totalWithdrawn: this.totalWithdrawn
        };
    }

toJSON() {
    return {
        userId: this.userId,
        money: this.money,
        totalWins: this.totalWins,
        totalLosses: this.totalLosses,
        totalGames: this.totalGames,
        inventory: this.inventory,
        lastDaily: this.lastDaily,
        xocdiaWins: this.xocdiaWins,
        taixiuWins: this.taixiuWins,
        blackjackWins: this.blackjackWins,
        horseWins: this.horseWins,
        baucuaWins: this.baucuaWins,
        slotWins: this.slotWins,
        luckydrawWins: this.luckydrawWins,
        kbbWins: this.kbbWins,
        guessWins: this.guessWins,
        favoriteGame: this.favoriteGame,
        gameHistory: this.gameHistory.slice(-10),
        xocdiaLosses: this.xocdiaLosses,
        taixiuLosses: this.taixiuLosses,
        blackjackLosses: this.blackjackLosses,
        horseLosses: this.horseLosses,
        baucuaLosses: this.baucuaLosses,
        slotLosses: this.slotLosses,
        luckydrawLosses: this.luckydrawLosses,
        kbbLosses: this.kbbLosses,
        guessLosses: this.guessLosses,
        totalBets: this.totalBets,
        totalWonAmount: this.totalWonAmount,
        totalLostAmount: this.totalLostAmount,
        achievements: this.achievements,
        xp: this.xp,
        level: this.level,
        comboWins: this.comboWins,
        maxComboWins: this.maxComboWins,
        streak: this.streak,
        winRate: this.winRate,
        averageBet: this.averageBet,
        totalBetAmount: this.totalBetAmount,
        gamePatterns: this.gamePatterns,
        riskLevel: this.riskLevel,
        consecutiveWins: this.consecutiveWins,
        consecutiveLosses: this.consecutiveLosses,
        betPatterns: this.betPatterns,
        referralCode: this.referralCode,
        totalReferred: this.totalReferred,
        friends: this.friends,
        dailyStreak: this.dailyStreak,
        mostPlayedGame: this.mostPlayedGame,
        totalEarnings: this.totalEarnings,
        totalSpent: this.totalSpent,
        totalDeposited: this.totalDeposited,
        totalWithdrawn: this.totalWithdrawn,
        depositHistory: this.depositHistory.slice(-10),
        pokerWins: this.pokerWins,
        pokerLosses: this.pokerLosses,
        rouletteWins: this.rouletteWins,
        rouletteLosses: this.rouletteLosses,
        crashWins: this.crashWins,
        crashLosses: this.crashLosses,
        diceWins: this.diceWins,
        diceLosses: this.diceLosses,
        coinflipWins: this.coinflipWins,
        coinflipLosses: this.coinflipLosses
    };
}
}

// === HỆ THỐNG LƯU TRỮ JSON ===
const DATA_FILE = path.join(__dirname, 'players_data.json');

// Biến lưu dữ liệu người chơi - CHỈ KHAI BÁO 1 LẦN
let players = new Map();
let playersLastLoaded = 0;
const PLAYER_RELOAD_INTERVAL = 5000; // 5 giây

function loadPlayers() {
    try {
        if (fs.existsSync(DATA_FILE)) {
            const data = fs.readFileSync(DATA_FILE, 'utf8');
            // Kiểm tra nếu file rỗng
            if (!data || data.trim() === '') {
                console.log('⚠️ File players_data.json rỗng, tạo mới...');
                return new Map();
            }
            const parsed = JSON.parse(data);
            const playersMap = new Map();
            for (const [key, value] of Object.entries(parsed)) {
                const player = new Player(value.userId);
                Object.assign(player, value);
                playersMap.set(key, player);
            }
            return playersMap;
        }
    } catch (error) {
        console.error('❌ Lỗi đọc file dữ liệu:', error.message);
        // Nếu lỗi JSON, tạo file mới
        if (error instanceof SyntaxError) {
            console.log('🔄 File JSON bị hỏng, tạo file mới...');
            // Backup file cũ
            if (fs.existsSync(DATA_FILE)) {
                const backupFile = DATA_FILE + '.backup.' + Date.now();
                fs.copyFileSync(DATA_FILE, backupFile);
                console.log(`💾 Đã backup file cũ: ${backupFile}`);
            }
            // Tạo file mới với dữ liệu rỗng
            fs.writeFileSync(DATA_FILE, JSON.stringify({}, null, 2), 'utf8');
            console.log('✅ Đã tạo file players_data.json mới!');
        }
        return new Map();
    }
}

function reloadPlayers() {
    try {
        const newPlayers = loadPlayers();
        if (newPlayers && newPlayers.size > 0) {
            let updatedCount = 0;
            for (const [key, value] of newPlayers) {
                if (players.has(key)) {
                    const existing = players.get(key);
                    if (existing.money !== value.money) {
                        existing.money = value.money;
                        updatedCount++;
                    }
                    existing.totalDeposited = value.totalDeposited;
                    existing.totalSpent = value.totalSpent;
                    existing.totalWins = value.totalWins;
                    existing.totalLosses = value.totalLosses;
                    existing.totalGames = value.totalGames;
                    existing.level = value.level;
                    existing.xp = value.xp;
                    existing.achievements = value.achievements;
                    existing.depositHistory = value.depositHistory;
                    existing.pendingDeposits = value.pendingDeposits;
                } else {
                    players.set(key, value);
                    updatedCount++;
                }
            }
            playersLastLoaded = Date.now();
            if (updatedCount > 0) {
                console.log(`🔄 Đã reload dữ liệu người chơi từ file! (${updatedCount} thay đổi)`);
            }
        } else if (newPlayers && newPlayers.size === 0) {
            // File rỗng, không có dữ liệu
            console.log('📭 File dữ liệu trống, chưa có người chơi nào.');
        }
    } catch (error) {
        console.error('❌ Lỗi reload dữ liệu:', error.message);
    }
}

// Load dữ liệu ban đầu
try {
    players = loadPlayers();
    playersLastLoaded = Date.now();
    console.log(`📂 Đã load ${players.size} người chơi từ file`);
} catch (error) {
    console.error('❌ Lỗi load dữ liệu ban đầu:', error.message);
    players = new Map();
}

// Reload dữ liệu định kỳ
setInterval(() => {
    reloadPlayers();
}, PLAYER_RELOAD_INTERVAL);

function savePlayers(playersMap) {
    try {
        const data = {};
        for (const [key, value] of playersMap) {
            data[key] = value.toJSON();
        }
        fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2), 'utf8');
        console.log(`✅ Da luu du lieu nguoi choi thanh cong! (${playersMap.size} players)`);
    } catch (error) {
        console.error('Loi khi luu file du lieu:', error);
    }
}

// === KIỂM TRA BIẾN MÔI TRƯỜNG ===
const BOT_TOKEN = process.env.BOT_TOKEN;
const OWNER_ID = process.env.OWNER_ID;
const ADMIN_CHANNEL_ID = process.env.ADMIN_CHANNEL_ID;

if (!BOT_TOKEN) {
    console.error('❌ LỖI: Không tìm thấy BOT_TOKEN trong file .env!');
    console.error('💡 Vui lòng tạo file .env với nội dung: BOT_TOKEN=your_token_here');
    process.exit(1);
}

if (!OWNER_ID) {
    console.warn('⚠️ Cảnh báo: OWNER_ID không được set trong .env');
    console.warn('💡 Các lệnh admin sẽ không hoạt động!');
}

// === KHỞI TẠO CLIENT ===
const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent 
    ]
});

// XÓA DÒNG NÀY: const players = loadPlayers();
const games = new Map();

// === HÀM TẠO EMBED ĐẸP ===
function createGameEmbed(title, description = ' ', color = '#0099ff', fields = [], footer = null) {
    const embed = new EmbedBuilder()
        .setColor(color)
        .setTitle(title)
        .setDescription(description)
        .setTimestamp()
        .setFooter({ 
            text: footer || '🎮 Bot Game | Su dung !help de xem huong dan'
        });
    
    if (fields && fields.length > 0) {
        // Giới hạn tối đa 25 fields (Discord limit)
        const maxFields = Math.min(fields.length, 25);
        for (let i = 0; i < maxFields; i++) {
            const field = fields[i];
            if (field.name && field.value) {
                embed.addFields({ name: field.name, value: field.value, inline: field.inline || false });
            }
        }
        // Nếu có fields bị cắt, thêm field thông báo
        if (fields.length > 25) {
            embed.addFields({ 
                name: '⚠️ Lưu ý', 
                value: `Hiển thị ${25}/${fields.length} trường. Vui lòng xem chi tiết bằng lệnh khác.`, 
                inline: false 
            });
        }
    }
    
    return embed;
}

// === HÀM TẠO VIETQR CODE ===
async function generateVietQR(bankCode, accountNumber, accountName, amount, description) {
    try {
        const vietQRUrl = `https://img.vietqr.io/image/${bankCode}-${accountNumber}-compact2.png?amount=${amount}&addInfo=${encodeURIComponent(description)}&accountName=${encodeURIComponent(accountName)}`;
        
        console.log('🔗 URL VietQR đã tạo:', vietQRUrl);
        
        const response = await fetch(vietQRUrl);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const buffer = await response.arrayBuffer();
        const base64 = Buffer.from(buffer).toString('base64');
        const dataUrl = `data:image/png;base64,${base64}`;
        
        return dataUrl;
    } catch (error) {
        console.error('❌ Lỗi tải VietQR Code:', error);
        return null;
    }
}

// === HÀM TẠO VIETQR CODE CÁCH 2 (Sử dụng API VietQR) ===
async function generateVietQRFromAPI(bankCode, accountNumber, accountName, amount, description) {
    try {
        const apiUrl = 'https://api.vietqr.io/v2/generate';
        const requestData = {
            bankCode: bankCode,
            accountNumber: accountNumber,
            accountName: accountName,
            amount: amount,
            description: description,
            template: 'compact2'
        };
        
        console.log('📤 Gửi request đến VietQR API:', JSON.stringify(requestData, null, 2));
        
        const response = await fetch(apiUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            },
            body: JSON.stringify(requestData)
        });
        
        if (!response.ok) {
            throw new Error(`API error! status: ${response.status}`);
        }
        
        const data = await response.json();
        console.log('📥 Response từ VietQR API:', JSON.stringify(data, null, 2));
        
        if (data.code === '00' && data.data && data.data.qrDataURL) {
            const qrDataURL = data.data.qrDataURL;
            console.log('✅ Lấy QR thành công từ API');
            return qrDataURL;
        } else {
            throw new Error('API response không hợp lệ');
        }
    } catch (error) {
        console.error('❌ Lỗi gọi VietQR API:', error);
        return null;
    }
}

// === HÀM TẠO MÃ GIAO DỊCH ===
function generateTransactionId(userId) {
    const timestamp = Date.now().toString(36).toUpperCase();
    const random = Math.random().toString(36).substring(2, 6).toUpperCase();
    const userPart = userId.slice(-4).toUpperCase();
    return `NAP${userPart}${timestamp.slice(-4)}${random}`;
}

// === HÀM TẠO NỘI DUNG CHUYỂN KHOẢN ===
function generateTransferContent(username, amount) {
    return `NAP ${username} ${amount} VND`;
}

// === HÀM TẠO HIỆU ỨNG ===
function getRandomEffect(type) {
    const effects = EFFECTS[type] || ['✨'];
    return effects[Math.floor(Math.random() * effects.length)];
}

function createWinEffect() {
    const effects = ['🎉', '✨', '🌟', '💫', '🎊', '🏆'];
    let result = '';
    for (let i = 0; i < 3; i++) {
        result += effects[Math.floor(Math.random() * effects.length)];
    }
    return result;
}

function createLoseEffect() {
    const effects = ['💔', '😢', '💀', '🌧️'];
    return effects[Math.floor(Math.random() * effects.length)];
}

// ============================================
// === CÁC CLASS GAME (TIẾP TỤC TỪ ĐÂY) ===
// ============================================

// === GAME ĐUA NGỰA ===
class HorseRacing {
    constructor(player, betAmount, horseIndex) {
        this.player = player;
        this.betAmount = betAmount;
        this.horseIndex = horseIndex;
        this.gameName = 'horse';
        this.horses = HORSE_COLORS.map((name, index) => ({
            id: index,
            name: name,
            position: 0
        }));
        this.raceLength = 25;
        this.isFinished = false;
        this.winner = null;
    }

    // Lấy cấu hình cho game đua ngựa
    getHorseConfig() {
        const config = getGameConfig(this.player.userId, this.gameName);
        return {
            winRate: config.winRate || 40,
            lossRate: config.lossRate || 60,
            maxSpeed: config.maxSpeed || 12,
            minSpeed: config.minSpeed || 1,
            raceRounds: config.raceRounds || 15
        };
    }

    startRace() {
        let raceLog = [];
        let winnerFound = false;

        const config = this.getHorseConfig();
        const lossMultiplier = this.player.calculateLossMultiplier();
        
        // Tính số vòng đua dựa trên cấu hình và lossMultiplier
        let raceRounds = Math.floor(config.raceRounds / lossMultiplier);
        raceRounds = Math.max(10, Math.min(25, raceRounds));
        
        // Điều chỉnh tỷ lệ thắng dựa trên cấu hình
        let winRate = config.winRate / 100;
        let lossRate = config.lossRate / 100;
        
        // Điều chỉnh dựa trên lossMultiplier (người chơi càng thua thì càng khó thắng)
        winRate = Math.max(0.05, winRate - (lossMultiplier - 1) * 0.08);
        lossRate = Math.min(0.95, lossRate + (lossMultiplier - 1) * 0.08);
        
        // Quyết định ngựa của người chơi có thắng không
        const playerWin = Math.random() < winRate;
        
        console.log(`🏇 Horse: ${this.player.userId} - PlayerWin: ${playerWin} - WinRate: ${winRate}`);

        for (let round = 0; round < raceRounds; round++) {
            let roundText = `🏁 Vòng ${round + 1}:\n`;
            
            this.horses.forEach((horse, index) => {
                let speed = Math.floor(Math.random() * (config.maxSpeed || 12)) + (config.minSpeed || 1);
                
                if (index === this.horseIndex) {
                    // Điều chỉnh tốc độ của ngựa người chơi dựa trên kết quả đã định
                    if (playerWin) {
                        // Nếu sẽ thắng, ngựa chạy nhanh hơn
                        speed = Math.floor(speed * (0.9 + Math.random() * 0.3));
                    } else {
                        // Nếu sẽ thua, ngựa chạy chậm hơn
                        speed = Math.floor(speed * (0.6 + Math.random() * 0.3));
                    }
                } else {
                    // Các ngựa khác chạy ngẫu nhiên
                    speed = Math.floor(speed * (0.8 + Math.random() * 0.4));
                }
                
                horse.position += Math.max(1, speed);
                
                let track = '';
                const pos = Math.min(horse.position, this.raceLength);
                for (let i = 0; i < pos; i++) {
                    track += '▬';
                }
                track += '🐎';
                
                if (horse.position >= this.raceLength && !winnerFound) {
                    winnerFound = true;
                    this.winner = horse;
                    this.isFinished = true;
                }
                roundText += `${horse.name}: ${track}\n`;
            });
            
            raceLog.push(roundText);
            if (winnerFound) break;
        }

        // Nếu chưa có người thắng, xác định người thắng dựa trên tỷ lệ đã tính
        if (!this.winner) {
            if (playerWin) {
                // Đảm bảo ngựa của người chơi thắng
                this.winner = this.horses[this.horseIndex];
                // Đặt vị trí của ngựa người chơi lên đích
                this.horses[this.horseIndex].position = this.raceLength;
            } else {
                // Chọn ngựa khác thắng
                let randomWinner = Math.floor(Math.random() * this.horses.length);
                while (randomWinner === this.horseIndex) {
                    randomWinner = Math.floor(Math.random() * this.horses.length);
                }
                this.winner = this.horses[randomWinner];
                // Đặt vị trí của ngựa thắng lên đích
                this.horses[randomWinner].position = this.raceLength;
            }
            this.isFinished = true;
        }

        console.log(`🏇 Horse Result: ${this.winner.name} - Player Horse: ${this.horses[this.horseIndex].name}`);
        return raceLog;
    }

    getResult() {
        const win = this.winner.id === this.horseIndex;
        
        // Tính multiplier dựa trên vị trí của ngựa thắng
        // Ngựa càng yếu (id càng lớn) thì multiplier càng cao
        const baseMultiplier = 2;
        const bonusMultiplier = (this.horses.length - this.winner.id - 1) * 0.5;
        const multiplier = baseMultiplier + bonusMultiplier;
        
        const winAmount = win ? Math.floor(this.betAmount * multiplier) : -this.betAmount;
        
        console.log(`🏇 Horse Result: ${win ? 'WIN' : 'LOSE'} - Multiplier: ${multiplier}x - Amount: ${winAmount}`);
        
        return { 
            win, 
            winAmount, 
            winner: this.winner,
            multiplier: multiplier
        };
    }
}

// === CLASS GAME XÌ RÁCH (ĐÃ SỬA - KHÔNG TỰ ĐỘNG KẾT THÚC) ===
class Blackjack {
    constructor(player, betAmount) {
        this.player = player;
        this.betAmount = betAmount;
        this.gameName = 'blackjack';
        this.deck = this.createDeck();
        this.playerHand = [];
        this.dealerHand = [];
        this.isFinished = false;
        this.result = null;
        this.betMultiplier = 1;
    }

    createDeck() {
        const suits = ['♥', '♦', '♣', '♠'];
        const values = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A'];
        const deck = [];
        for (let suit of suits) {
            for (let value of values) {
                deck.push({ suit, value });
            }
        }
        for (let i = deck.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [deck[i], deck[j]] = [deck[j], deck[i]];
        }
        return deck;
    }

    drawCard() {
        return this.deck.pop();
    }

    calculateHandValue(hand) {
        let value = 0;
        let aces = 0;
        for (let card of hand) {
            if (card.value === 'A') {
                aces++;
                value += 11;
            } else if (['K', 'Q', 'J'].includes(card.value)) {
                value += 10;
            } else {
                value += parseInt(card.value);
            }
        }
        while (value > 21 && aces > 0) {
            value -= 10;
            aces--;
        }
        return value;
    }

    // Lấy cấu hình Blackjack từ hệ thống
    getBlackjackConfig() {
        const config = getGameConfig(this.player.userId, this.gameName);
        return {
            winRate: config.winRate || 45,
            lossRate: config.lossRate || 55,
            blackjackRate: config.blackjackRate || 5,
            dealerBustRate: config.dealerBustRate || 20,
            pushRate: config.pushRate || 10
        };
    }

    // === CHỈ CHIA BÀI BAN ĐẦU, KHÔNG TỰ ĐỘNG KẾT THÚC ===
    startGame() {
        // Chia bài ban đầu
        this.playerHand.push(this.drawCard());
        this.dealerHand.push(this.drawCard());
        this.playerHand.push(this.drawCard());
        this.dealerHand.push(this.drawCard());
        
        const playerValue = this.calculateHandValue(this.playerHand);
        const dealerValue = this.calculateHandValue(this.dealerHand);
        
        // Kiểm tra Blackjack tự nhiên (cả 2 bên)
        if (playerValue === 21 && dealerValue !== 21) {
            this.isFinished = true;
            this.result = 'blackjack';
            this.betMultiplier = 2.5;
            console.log(`🃏 Blackjack: ${this.player.userId} - Natural Blackjack!`);
            return;
        }
        
        if (dealerValue === 21 && playerValue !== 21) {
            this.isFinished = true;
            this.result = 'loss';
            this.betMultiplier = 0;
            console.log(`🃏 Blackjack: ${this.player.userId} - Dealer Blackjack!`);
            return;
        }
        
        if (playerValue === 21 && dealerValue === 21) {
            this.isFinished = true;
            this.result = 'push';
            this.betMultiplier = 1;
            console.log(`🃏 Blackjack: ${this.player.userId} - Push!`);
            return;
        }
        
        // Nếu không có Blackjack tự nhiên, game tiếp tục
        // KHÔNG tự động tạo kết quả thắng/thua
        this.isFinished = false;
        console.log(`🃏 Blackjack: ${this.player.userId} - Game bắt đầu. Player: ${playerValue}, Dealer: ${dealerValue}`);
    }

    // Người chơi rút bài
    playerHit() {
        if (this.isFinished) return;
        this.playerHand.push(this.drawCard());
        const playerValue = this.calculateHandValue(this.playerHand);
        if (playerValue > 21) {
            this.isFinished = true;
            this.result = 'bust';
            this.betMultiplier = 0;
            console.log(`🃏 Blackjack: ${this.player.userId} - Player Bust!`);
        }
    }

    // Người chơi dừng - Nhà cái rút bài
    playerStand() {
        if (this.isFinished) return;
        
        // Nhà cái rút bài đến khi >= 17
        let dealerValue = this.calculateHandValue(this.dealerHand);
        while (dealerValue < 17) {
            this.dealerHand.push(this.drawCard());
            dealerValue = this.calculateHandValue(this.dealerHand);
        }
        
        this.isFinished = true;
        const playerValue = this.calculateHandValue(this.playerHand);
        
        // Xác định kết quả
        if (dealerValue > 21) {
            this.result = 'win';
            this.betMultiplier = 2;
        } else if (playerValue > dealerValue) {
            this.result = 'win';
            this.betMultiplier = 2;
        } else if (playerValue === dealerValue) {
            this.result = 'push';
            this.betMultiplier = 1;
        } else {
            this.result = 'loss';
            this.betMultiplier = 0;
        }
        
        console.log(`🃏 Blackjack Stand: ${this.player.userId} - Result: ${this.result}`);
    }

    getResult() {
        if (!this.isFinished) return null;
        
        let winAmount = 0;
        let message = '';
        
        switch(this.result) {
            case 'blackjack':
                winAmount = this.betAmount * this.betMultiplier;
                message = '🎉 BLACKJACK! Bạn thắng!';
                break;
            case 'win':
                winAmount = this.betAmount * this.betMultiplier;
                message = '🎉 Bạn thắng!';
                break;
            case 'push':
                winAmount = this.betAmount * this.betMultiplier;
                message = '🤝 Hòa! Nhận lại tiền cược.';
                break;
            case 'bust':
                winAmount = 0;
                message = '💔 Bạn quá 21 điểm! Thua cược.';
                break;
            case 'loss':
                winAmount = 0;
                message = '💔 Nhà cái thắng! Thua cược.';
                break;
            default:
                winAmount = 0;
                message = 'Kết thúc game.';
        }
        
        console.log(`🃏 Blackjack Result: ${this.player.userId} - ${this.result} - WinAmount: ${winAmount}`);
        
        return {
            winAmount: winAmount,
            message: message,
            result: this.result,
            playerHand: this.playerHand.map(c => `${c.value}${c.suit}`),
            dealerHand: this.dealerHand.map(c => `${c.value}${c.suit}`),
            playerValue: this.calculateHandValue(this.playerHand),
            dealerValue: this.calculateHandValue(this.dealerHand),
            betMultiplier: this.betMultiplier
        };
    }
}

// === CLASS GAME TÀI XỈU ===
class TaiXiu {
    constructor(player, betAmount, choice) {
        this.player = player;
        this.betAmount = betAmount;
        this.choice = choice;
        this.gameName = 'taixiu';
        this.diceResults = [];
        this.isFinished = false;
        this.result = null;
    }

    // Lấy cấu hình với ưu tiên override
    getTaiXiuConfig() {
        // Lấy cấu hình từ hệ thống
        const config = getGameConfig(this.player.userId, this.gameName);
        
        // Kiểm tra player override TRƯỚC
        if (PLAYER_OVERRIDES && PLAYER_OVERRIDES[this.player.userId]) {
            const playerConfig = PLAYER_OVERRIDES[this.player.userId];
            
            // Ưu tiên game cụ thể
            if (playerConfig[this.gameName]) {
                const gameOverride = playerConfig[this.gameName];
                console.log(`🎯 Dùng override game ${this.gameName} cho ${this.player.userId}`);
                return {
                    winRate: gameOverride.winRate || config.winRate || 48,
                    lossRate: gameOverride.lossRate || config.lossRate || 52
                };
            }
            
            // Ưu tiên global của player
            if (playerConfig.global) {
                console.log(`🎯 Dùng global override cho ${this.player.userId}`);
                return {
                    winRate: playerConfig.global.winRate || config.winRate || 48,
                    lossRate: playerConfig.global.lossRate || config.lossRate || 52
                };
            }
        }
        
        // Fallback về config server
        return {
            winRate: config.winRate || 48,
            lossRate: config.lossRate || 52
        };
    }

    roll() {
        const config = this.getTaiXiuConfig();
        const lossMultiplier = this.player.calculateLossMultiplier();
        
        // Tính toán tỷ lệ từ cấu hình
        let winRate = config.winRate / 100;
        let lossRate = config.lossRate / 100;
        
        // Điều chỉnh dựa trên lossMultiplier
        winRate = Math.max(0.1, winRate - (lossMultiplier - 1) * 0.08);
        lossRate = Math.min(0.9, lossRate + (lossMultiplier - 1) * 0.08);
        
        // Đảm bảo tổng = 1
        const total = winRate + lossRate;
        winRate = winRate / total;
        lossRate = lossRate / total;
        
        // LOG DEBUG
        console.log(`🎲 TaiXiu Config: Win=${config.winRate}%, Loss=${config.lossRate}%`);
        console.log(`🎲 TaiXiu Adjusted: Win=${(winRate*100).toFixed(1)}%, Loss=${(lossRate*100).toFixed(1)}%`);
        
        let isTai;
        let totalDice;
        
        // Quyết định kết quả
        const random = Math.random();
        
        if (this.choice === 'tai') {
            isTai = random < winRate;
        } else {
            isTai = random >= winRate;
        }
        
        // Tạo kết quả xúc xắc
        if (isTai) {
            totalDice = 11 + Math.floor(Math.random() * 7);
        } else {
            totalDice = 3 + Math.floor(Math.random() * 8);
        }
        
        // Tạo 3 viên xúc xắc
        let dice1 = Math.floor(Math.random() * 6) + 1;
        let dice2 = Math.floor(Math.random() * 6) + 1;
        let dice3 = totalDice - dice1 - dice2;
        
        let attempts = 0;
        while ((dice3 < 1 || dice3 > 6) && attempts < 100) {
            dice1 = Math.floor(Math.random() * 6) + 1;
            dice2 = Math.floor(Math.random() * 6) + 1;
            dice3 = totalDice - dice1 - dice2;
            attempts++;
        }
        
        if (dice3 < 1 || dice3 > 6) {
            const validCombos = [];
            for (let d1 = 1; d1 <= 6; d1++) {
                for (let d2 = 1; d2 <= 6; d2++) {
                    const d3 = totalDice - d1 - d2;
                    if (d3 >= 1 && d3 <= 6) {
                        validCombos.push([d1, d2, d3]);
                    }
                }
            }
            if (validCombos.length > 0) {
                const combo = validCombos[Math.floor(Math.random() * validCombos.length)];
                dice1 = combo[0];
                dice2 = combo[1];
                dice3 = combo[2];
            } else {
                dice1 = Math.floor(Math.random() * 6) + 1;
                dice2 = Math.floor(Math.random() * 6) + 1;
                dice3 = Math.floor(Math.random() * 6) + 1;
                totalDice = dice1 + dice2 + dice3;
                isTai = totalDice >= 11;
            }
        }
        
        this.diceResults = [dice1, dice2, dice3];
        this.isFinished = true;
        this.result = isTai ? 'tai' : 'xiu';
        
        console.log(`🎲 TaiXiu Result: ${this.player.userId} - Choice: ${this.choice} - Result: ${this.result} - Dice: ${dice1},${dice2},${dice3} - Total: ${totalDice}`);
        
        return { total: totalDice, isTai };
    }

    getResult() {
        if (!this.isFinished) return null;
        const isWin = this.choice === this.result;
        const winAmount = isWin ? this.betAmount : -this.betAmount;
        
        const total = this.diceResults.reduce((a, b) => a + b, 0);
        
        return {
            winAmount: winAmount,
            message: isWin ? '🎉 Bạn thắng!' : '💔 Bạn thua!',
            total: total,
            dice: this.diceResults,
            isWin: isWin,
            result: this.result
        };
    }
}

// === CLASS GAME XÓC ĐĨA ===
class XocDia {
    constructor(player, betAmount, choice) {
        this.player = player;
        this.betAmount = betAmount;
        this.choice = choice;
        this.gameName = 'xocdia';
        this.coins = [];
        this.coinsDisplay = '';
        this.isFinished = false;
        this.result = null;
        this.isEven = false;
        this.total = 0;
    }

    // Lấy cấu hình cho game xóc đĩa
    getXocDiaConfig() {
        const config = getGameConfig(this.player.userId, this.gameName);
        return {
            winRate: config.winRate || 48,
            lossRate: config.lossRate || 52
        };
    }

    spin() {
        const config = this.getXocDiaConfig();
        const lossMultiplier = this.player.calculateLossMultiplier();
        
        // Tính toán tỷ lệ từ cấu hình
        let winRate = config.winRate / 100;
        let lossRate = config.lossRate / 100;
        
        // Điều chỉnh dựa trên lossMultiplier (người chơi càng thua thì càng khó thắng)
        winRate = Math.max(0.1, winRate - (lossMultiplier - 1) * 0.08);
        lossRate = Math.min(0.9, lossRate + (lossMultiplier - 1) * 0.08);
        
        // Đảm bảo tổng = 1
        const total = winRate + lossRate;
        winRate = winRate / total;
        lossRate = lossRate / total;
        
        // Quyết định kết quả dựa trên tỷ lệ đã tính
        const random = Math.random();
        
        if (this.choice === 'chan') {
            // Nếu chọn Chẵn, tỷ lệ thắng = winRate
            this.isEven = random < winRate;
        } else {
            // Nếu chọn Lẻ, tỷ lệ thắng = winRate
            this.isEven = random >= winRate;
        }
        
        // Tạo kết quả đồng xu dựa trên kết quả đã định
        let attempts = 0;
        let found = false;
        
        while (!found && attempts < 100) {
            this.coins = [
                Math.floor(Math.random() * 2),
                Math.floor(Math.random() * 2),
                Math.floor(Math.random() * 2),
                Math.floor(Math.random() * 2)
            ];
            const newTotal = this.coins.reduce((a, b) => a + b, 0);
            const isEvenResult = (newTotal % 2 === 0);
            
            if (isEvenResult === this.isEven) {
                this.total = newTotal;
                found = true;
                break;
            }
            attempts++;
        }
        
        // Nếu không tìm thấy sau 100 lần, tạo kết quả ngẫu nhiên
        if (!found) {
            // Tạo kết quả theo ý muốn
            if (this.isEven) {
                // Tạo số chẵn: 0, 2, 4
                const evenValues = [0, 2, 4];
                this.total = evenValues[Math.floor(Math.random() * evenValues.length)];
            } else {
                // Tạo số lẻ: 1, 3
                const oddValues = [1, 3];
                this.total = oddValues[Math.floor(Math.random() * oddValues.length)];
            }
            
            // Tạo mảng coins từ total
            this.coins = [];
            let remaining = this.total;
            for (let i = 0; i < 4; i++) {
                if (remaining > 0 && (i < 3 || remaining === 1)) {
                    const val = Math.min(1, remaining);
                    this.coins.push(val);
                    remaining -= val;
                } else {
                    this.coins.push(0);
                }
            }
            // Trộn mảng coins
            for (let i = this.coins.length - 1; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1));
                [this.coins[i], this.coins[j]] = [this.coins[j], this.coins[i]];
            }
        }
        
        this.coinsDisplay = this.coins.map(c => c === 1 ? '🪙' : '⚫').join(' ');
        this.isFinished = true;
        this.result = this.isEven ? 'chan' : 'le';
        
        console.log(`🪙 XocDia: ${this.player.userId} - Choice: ${this.choice} - Result: ${this.result} - Coins: ${this.coinsDisplay} - Total: ${this.total}`);
        
        return { 
            total: this.total, 
            isEven: this.isEven, 
            coins: this.coinsDisplay 
        };
    }

    getResult() {
        if (!this.isFinished) return null;
        const isWin = this.choice === this.result;
        const winAmount = isWin ? this.betAmount : -this.betAmount;
        
        return {
            winAmount: winAmount,
            message: isWin ? '🎉 Bạn thắng!' : '💔 Bạn thua!',
            coins: this.coinsDisplay,
            isWin: isWin,
            result: this.result,
            total: this.total
        };
    }
}

// === CLASS GAME BẦU CUA ===
class BauCua {
    constructor(player, betAmount, choices) {
        this.player = player;
        this.betAmount = betAmount;
        this.choices = choices;
        this.gameName = 'baucua';
        this.results = [];
        this.resultNames = [];
        this.isFinished = false;
    }

    // Lấy cấu hình cho game bầu cua
    getBauCuaConfig() {
        const config = getGameConfig(this.player.userId, this.gameName);
        return {
            winRate: config.winRate || 30,
            lossRate: config.lossRate || 70,
            matchMultiplier: config.matchMultiplier || 2 // Hệ số nhân khi trúng 1 con
        };
    }

    roll() {
        const config = this.getBauCuaConfig();
        const animals = BAU_CUA_ANIMALS;
        const lossMultiplier = this.player.calculateLossMultiplier();
        
        // Tính toán tỷ lệ từ cấu hình
        let winRate = config.winRate / 100;
        let lossRate = config.lossRate / 100;
        
        // Điều chỉnh dựa trên lossMultiplier
        winRate = Math.max(0.05, winRate - (lossMultiplier - 1) * 0.08);
        lossRate = Math.min(0.95, lossRate + (lossMultiplier - 1) * 0.08);
        
        // Đảm bảo tổng = 1
        const total = winRate + lossRate;
        winRate = winRate / total;
        lossRate = lossRate / total;
        
        // Quyết định người chơi có trúng ít nhất 1 con không
        const willWin = Math.random() < winRate;
        
        const selected = [];
        const selectedNames = [];
        
        // Lọc các con vật không được chọn (để có thể thua)
        const availableAnimals = animals.filter(a => !this.choices.includes(a.name));
        // Các con vật được chọn
        const chosenAnimals = animals.filter(a => this.choices.includes(a.name));
        
        if (willWin) {
            // Người chơi sẽ thắng - đảm bảo có ít nhất 1 con trùng
            const numMatches = Math.floor(Math.random() * 3) + 1; // 1-3 con trùng
            
            // Chọn ngẫu nhiên các con vật trùng
            const matchedAnimals = [];
            for (let i = 0; i < numMatches; i++) {
                const randomAnimal = chosenAnimals[Math.floor(Math.random() * chosenAnimals.length)];
                matchedAnimals.push(randomAnimal);
            }
            
            // Thêm các con vật khác để đủ 3 con
            const remaining = 3 - matchedAnimals.length;
            for (let i = 0; i < remaining; i++) {
                let randomAnimal;
                // 70% chọn từ danh sách đã chọn, 30% chọn từ danh sách còn lại
                if (Math.random() < 0.7 && chosenAnimals.length > 0) {
                    randomAnimal = chosenAnimals[Math.floor(Math.random() * chosenAnimals.length)];
                } else {
                    randomAnimal = availableAnimals[Math.floor(Math.random() * availableAnimals.length)] || 
                                  animals[Math.floor(Math.random() * animals.length)];
                }
                matchedAnimals.push(randomAnimal);
            }
            
            // Trộn kết quả
            for (let i = matchedAnimals.length - 1; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1));
                [matchedAnimals[i], matchedAnimals[j]] = [matchedAnimals[j], matchedAnimals[i]];
            }
            
            matchedAnimals.forEach(animal => {
                selected.push(animal);
                selectedNames.push(animal.name);
            });
            
        } else {
            // Người chơi sẽ thua - không có con nào trùng
            for (let i = 0; i < 3; i++) {
                let randomAnimal;
                // Chỉ chọn từ danh sách không được chọn
                if (availableAnimals.length > 0) {
                    randomAnimal = availableAnimals[Math.floor(Math.random() * availableAnimals.length)];
                } else {
                    // Nếu đã chọn tất cả con vật, tạo kết quả ngẫu nhiên
                    randomAnimal = animals[Math.floor(Math.random() * animals.length)];
                    // Đảm bảo không trùng với choice
                    while (this.choices.includes(randomAnimal.name)) {
                        randomAnimal = animals[Math.floor(Math.random() * animals.length)];
                    }
                }
                selected.push(randomAnimal);
                selectedNames.push(randomAnimal.name);
            }
        }
        
        this.results = selected;
        this.resultNames = selectedNames;
        this.isFinished = true;
        
        // Tính số con trùng để log
        let matches = 0;
        for (const choice of this.choices) {
            for (const resultName of this.resultNames) {
                if (resultName === choice) {
                    matches++;
                }
            }
        }
        
        console.log(`🦀 BauCua: ${this.player.userId} - Choices: ${this.choices.join(',')} - Results: ${this.resultNames.join(',')} - Matches: ${matches}`);
        
        return {
            results: this.results,
            resultNames: this.resultNames,
            matches: matches
        };
    }

    getResult() {
        if (!this.isFinished) return null;
        
        let matches = 0;
        const matchedItems = [];
        for (const choice of this.choices) {
            for (const resultName of this.resultNames) {
                if (resultName === choice) {
                    matches++;
                    matchedItems.push(choice);
                }
            }
        }

        const config = this.getBauCuaConfig();
        const matchMultiplier = config.matchMultiplier || 2;
        
        let winAmount = -this.betAmount;
        let message = '';
        
        if (matches > 0) {
            // Công thức: betAmount * (1 + matches * matchMultiplier)
            winAmount = this.betAmount * (1 + matches * matchMultiplier);
            message = `🎉 Trúng ${matches} con! Thưởng x${1 + matches * matchMultiplier}`;
        } else {
            message = '💔 Không trúng con nào!';
        }
        
        return {
            winAmount: winAmount,
            message: message,
            results: this.results.map(r => r.display),
            resultNames: this.resultNames,
            matchedItems: matchedItems,
            matches: matches,
            isWin: winAmount > 0,
            matchMultiplier: matchMultiplier
        };
    }
}

// === CLASS GAME MINI SLOT ===
class MiniSlot {
    constructor(player, betAmount) {
        this.player = player;
        this.betAmount = betAmount;
        this.gameName = 'slot';
        this.reels = [];
        this.isFinished = false;
        this.winCount = 0;
        this.winSymbol = '';
        this.multiplier = 0;
    }

    // Lấy cấu hình cho game slot
    getSlotConfig() {
        const config = getGameConfig(this.player.userId, this.gameName);
        return {
            winRate: config.winRate || 30,
            lossRate: config.lossRate || 70,
            jackpotRate: config.jackpotRate || 5,
            jackpotMultiplier: config.jackpotMultiplier || 15,
            threeMatchMultiplier: config.threeMatchMultiplier || 5,
            twoMatchMultiplier: config.twoMatchMultiplier || 2
        };
    }

    spin() {
        const config = this.getSlotConfig();
        const symbols = ['🍒', '🍋', '🍊', '🍇', '💎', '7️⃣', '⭐', '🎰'];
        const lossMultiplier = this.player.calculateLossMultiplier();
        
        // Tính toán tỷ lệ từ cấu hình
        let winRate = config.winRate / 100;
        let lossRate = config.lossRate / 100;
        let jackpotRate = config.jackpotRate / 100;
        
        // Điều chỉnh dựa trên lossMultiplier
        winRate = Math.max(0.05, winRate - (lossMultiplier - 1) * 0.08);
        lossRate = Math.min(0.95, lossRate + (lossMultiplier - 1) * 0.08);
        jackpotRate = Math.max(0.01, jackpotRate - (lossMultiplier - 1) * 0.01);
        
        // Đảm bảo tổng = 1
        const total = winRate + lossRate;
        winRate = winRate / total;
        lossRate = lossRate / total;
        
        // Quyết định kết quả
        const random = Math.random();
        const isWin = random < winRate;
        const isJackpot = random < jackpotRate && isWin;
        
        // Tạo kết quả
        if (isJackpot) {
            // JACKPOT - 4 biểu tượng giống nhau
            const symbol = symbols[Math.floor(Math.random() * symbols.length)];
            this.reels = [symbol, symbol, symbol, symbol];
            this.winCount = 4;
            this.winSymbol = symbol;
            this.multiplier = config.jackpotMultiplier || 15;
            
        } else if (isWin) {
            // Thắng - có 2-3 biểu tượng giống nhau
            const symbol = symbols[Math.floor(Math.random() * symbols.length)];
            // Chọn số lượng trùng: 2 hoặc 3
            const sameCount = Math.random() < 0.4 ? 3 : 2;
            
            this.reels = [];
            for (let i = 0; i < 4; i++) {
                if (i < sameCount) {
                    this.reels.push(symbol);
                } else {
                    // Chọn biểu tượng khác
                    let otherSymbol;
                    do {
                        otherSymbol = symbols[Math.floor(Math.random() * symbols.length)];
                    } while (otherSymbol === symbol);
                    this.reels.push(otherSymbol);
                }
            }
            
            // Trộn vị trí
            for (let i = this.reels.length - 1; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1));
                [this.reels[i], this.reels[j]] = [this.reels[j], this.reels[i]];
            }
            
            // Đếm số lượng trùng
            const counts = {};
            for (const s of this.reels) {
                counts[s] = (counts[s] || 0) + 1;
            }
            
            let maxCount = 0;
            let maxSymbol = '';
            for (const [s, count] of Object.entries(counts)) {
                if (count > maxCount) {
                    maxCount = count;
                    maxSymbol = s;
                }
            }
            
            this.winCount = maxCount;
            this.winSymbol = maxSymbol;
            
            if (maxCount === 3) {
                this.multiplier = config.threeMatchMultiplier || 5;
            } else if (maxCount === 2) {
                this.multiplier = config.twoMatchMultiplier || 2;
            } else {
                this.multiplier = 1;
            }
            
        } else {
            // Thua - không có cặp trùng hoặc chỉ có 1 cặp
            this.reels = [];
            let attempts = 0;
            let hasPair = true;
            
            while (hasPair && attempts < 100) {
                this.reels = [];
                for (let i = 0; i < 4; i++) {
                    this.reels.push(symbols[Math.floor(Math.random() * symbols.length)]);
                }
                
                // Kiểm tra có cặp trùng không
                const counts = {};
                for (const s of this.reels) {
                    counts[s] = (counts[s] || 0) + 1;
                }
                
                let maxCount = 0;
                for (const count of Object.values(counts)) {
                    if (count > maxCount) maxCount = count;
                }
                
                hasPair = maxCount >= 2;
                attempts++;
            }
            
            this.winCount = 0;
            this.winSymbol = '';
            this.multiplier = 0;
        }
        
        this.isFinished = true;
        
        console.log(`🎰 MiniSlot: ${this.player.userId} - WinCount: ${this.winCount} - Multiplier: ${this.multiplier}x - Reels: ${this.reels.join(' ')}`);
        
        return {
            reels: this.reels,
            winCount: this.winCount,
            winSymbol: this.winSymbol,
            multiplier: this.multiplier
        };
    }

    getResult() {
        if (!this.isFinished) return null;
        
        let winAmount = -this.betAmount;
        let message = '💔 Không trúng!';
        
        if (this.winCount === 4) {
            winAmount = this.betAmount * this.multiplier;
            message = `🎉🎉 JACKPOT! ${this.winSymbol} x${this.multiplier}`;
        } else if (this.winCount === 3) {
            winAmount = this.betAmount * this.multiplier;
            message = `🎉 Trúng 3 ${this.winSymbol}! x${this.multiplier}`;
        } else if (this.winCount === 2) {
            winAmount = this.betAmount * this.multiplier;
            message = `🎉 Trúng 2 ${this.winSymbol}! x${this.multiplier}`;
        }

        return {
            winAmount: winAmount,
            message: message,
            symbols: this.reels,
            multiplier: this.multiplier,
            winCount: this.winCount,
            winSymbol: this.winSymbol,
            isWin: winAmount > 0
        };
    }
}

// === GAME RÚT THĂM ===
class LuckyDraw {
    constructor(player, betAmount) {
        this.player = player;
        this.betAmount = betAmount;
        this.isFinished = false;
        this.result = null;
        this.gameName = 'luckydraw';
    }

    draw() {
        // Sử dụng hàm toàn cục để lấy cấu hình
        const config = getGameConfig(this.player.userId, this.gameName);
        const lossMultiplier = this.player.calculateLossMultiplier();
        
        // Tính toán tỷ lệ dựa trên cấu hình
        let winRate = (config.winRate || 35) / 100;
        let lossRate = (config.lossRate || 40) / 100;
        let drawRate = (config.drawRate || 25) / 100;
        
        // Điều chỉnh dựa trên lossMultiplier (người chơi càng thua nhiều thì càng khó thắng)
        winRate = Math.max(0.05, winRate - (lossMultiplier - 1) * 0.05);
        lossRate = Math.min(0.85, lossRate + (lossMultiplier - 1) * 0.05);
        drawRate = 1 - winRate - lossRate;
        
        // Đảm bảo tổng = 1
        const total = winRate + lossRate + drawRate;
        winRate = winRate / total;
        lossRate = lossRate / total;
        drawRate = drawRate / total;
        
        // Xây dựng danh sách giải thưởng
        const prizes = [];
        
        // Thêm các giải thưởng từ config
        const multipliers = config.multipliers || {
            '2x': 25,
            '3x': 18,
            '5x': 10,
            '10x': 5,
            '20x': 2
        };
        
        // Tính tổng chance của các giải thưởng
        let totalMultiplierChance = 0;
        for (const [multiplier, chance] of Object.entries(multipliers)) {
            totalMultiplierChance += chance;
        }
        
        // Điều chỉnh để tổng chance = winRate * 100
        const scaleFactor = totalMultiplierChance > 0 ? (winRate * 100) / totalMultiplierChance : 1;
        
        for (const [multiplier, chance] of Object.entries(multipliers)) {
            const adjustedChance = chance * scaleFactor;
            const mult = parseInt(multiplier);
            prizes.push({
                name: `💰 X${multiplier} Tiền`,
                multiplier: mult,
                chance: adjustedChance,
                emoji: mult >= 10 ? '🌟' : '💎'
            });
        }
        
        // Thêm giải thua
        prizes.push({
            name: '💔 Mất cược',
            multiplier: -1,
            chance: lossRate * 100,
            emoji: '💔'
        });
        
        // Thêm giải hòa
        prizes.push({
            name: '🔄 Hòa',
            multiplier: 0,
            chance: drawRate * 100,
            emoji: '🔄'
        });

        // Chọn giải thưởng
        const totalChance = prizes.reduce((sum, p) => sum + p.chance, 0);
        let random = Math.random() * totalChance;
        
        let selectedPrize = prizes[0];
        for (const prize of prizes) {
            random -= prize.chance;
            if (random <= 0) {
                selectedPrize = prize;
                break;
            }
        }

        if (!selectedPrize) {
            selectedPrize = prizes[prizes.length - 1];
        }

        this.result = selectedPrize;
        this.isFinished = true;
        
        let winAmount = 0;
        if (this.result.multiplier < 0) {
            winAmount = -this.betAmount;
        } else if (this.result.multiplier === 0) {
            winAmount = 0;
        } else {
            winAmount = this.betAmount * this.result.multiplier;
        }
        
        // Log để debug
        console.log(`🎯 LuckyDraw: ${this.player.userId} - ${this.result.name} - Multiplier: ${this.result.multiplier}x - WinAmount: ${winAmount}`);
        
        return {
            winAmount: winAmount,
            prize: this.result,
            isWin: this.result.multiplier > 0
        };
    }
}

// === GAME KÉO BÚA BAO ===
class RockPaperScissors {
    constructor(player, betAmount, choice) {
        this.player = player;
        this.betAmount = betAmount;
        this.choice = choice;
        this.gameName = 'kbb';
        this.botChoice = null;
        this.isFinished = false;
        this.result = null;
    }

    // Lấy cấu hình cho game kéo búa bao
    getKBBConfig() {
        const config = getGameConfig(this.player.userId, this.gameName);
        return {
            winRate: config.winRate || 33,
            lossRate: config.lossRate || 34,
            drawRate: config.drawRate || 33
        };
    }

    play() {
        const choices = ['keo', 'bua', 'bao'];
        const config = this.getKBBConfig();
        const lossMultiplier = this.player.calculateLossMultiplier();
        
        // Tính toán tỷ lệ từ cấu hình
        let winRate = config.winRate / 100;
        let lossRate = config.lossRate / 100;
        let drawRate = config.drawRate / 100;
        
        // Điều chỉnh dựa trên lossMultiplier
        winRate = Math.max(0.05, winRate - (lossMultiplier - 1) * 0.08);
        lossRate = Math.min(0.85, lossRate + (lossMultiplier - 1) * 0.08);
        drawRate = 1 - winRate - lossRate;
        
        // Đảm bảo tổng = 1
        const total = winRate + lossRate + drawRate;
        winRate = winRate / total;
        lossRate = lossRate / total;
        drawRate = drawRate / total;
        
        // Quyết định kết quả dựa trên tỷ lệ
        const random = Math.random();
        let resultType;
        
        if (random < winRate) {
            resultType = 'win';
        } else if (random < winRate + lossRate) {
            resultType = 'loss';
        } else {
            resultType = 'draw';
        }
        
        const playerIndex = choices.indexOf(this.choice);
        
        // Xác định bot choice dựa trên kết quả đã định
        if (resultType === 'win') {
            // Bot chọn thua trước người chơi
            // Nếu người chơi chọn kéo, bot chọn bao
            // Nếu người chơi chọn búa, bot chọn kéo
            // Nếu người chơi chọn bao, bot chọn búa
            const botIndex = (playerIndex + 2) % 3;
            this.botChoice = choices[botIndex];
        } else if (resultType === 'loss') {
            // Bot chọn thắng trước người chơi
            const botIndex = (playerIndex + 1) % 3;
            this.botChoice = choices[botIndex];
        } else {
            // Hòa - bot chọn giống người chơi
            this.botChoice = this.choice;
        }
        
        this.isFinished = true;
        this.result = resultType;
        
        // Log để debug
        console.log(`✊ KBB: ${this.player.userId} - Player: ${this.choice} - Bot: ${this.botChoice} - Result: ${this.result}`);
    }

    getResult() {
        if (!this.isFinished) return null;
        
        let winAmount = this.result === 'win' ? this.betAmount : 
                       this.result === 'draw' ? 0 : -this.betAmount;
        
        // Tạo emoji cho lựa chọn
        const choiceEmojis = {
            'keo': '✊',
            'bua': '✋',
            'bao': '✌️'
        };
        
        const playerEmoji = choiceEmojis[this.choice] || this.choice;
        const botEmoji = choiceEmojis[this.botChoice] || this.botChoice;
        
        return {
            winAmount: winAmount,
            message: this.result === 'win' ? '🎉 Bạn thắng!' :
                    this.result === 'draw' ? '🤝 Hòa!' : '💔 Bạn thua!',
            botChoice: this.botChoice,
            result: this.result,
            isWin: this.result === 'win',
            playerEmoji: playerEmoji,
            botEmoji: botEmoji,
            choice: this.choice
        };
    }
}

// === GAME ĐOÁN SỐ ===
class GuessNumber {
    constructor(player, betAmount) {
        this.player = player;
        this.betAmount = betAmount;
        this.gameName = 'guess';
        this.secretNumber = Math.floor(Math.random() * 100) + 1;
        this.attempts = 0;
        this.maxAttempts = 10;
        this.isFinished = false;
        this.result = null;
        this.guesses = [];
        this.hints = [];
    }

    // Lấy cấu hình cho game đoán số
    getGuessConfig() {
        const config = getGameConfig(this.player.userId, this.gameName);
        return {
            winRate: config.winRate || 40,
            lossRate: config.lossRate || 60,
            maxAttempts: config.maxAttempts || 10,
            bonusMultiplier: config.bonusMultiplier || 1
        };
    }

    guess(number) {
        if (this.isFinished) return null;
        
        this.attempts++;
        this.guesses.push(number);
        
        const config = this.getGuessConfig();
        const lossMultiplier = this.player.calculateLossMultiplier();
        
        // Điều chỉnh số bí mật dựa trên tỷ lệ thắng
        let winRate = config.winRate / 100;
        let lossRate = config.lossRate / 100;
        
        // Điều chỉnh dựa trên lossMultiplier
        winRate = Math.max(0.05, winRate - (lossMultiplier - 1) * 0.08);
        lossRate = Math.min(0.95, lossRate + (lossMultiplier - 1) * 0.08);
        
        // Đảm bảo tổng = 1
        const total = winRate + lossRate;
        winRate = winRate / total;
        lossRate = lossRate / total;
        
        // Quyết định người chơi có thắng không
        const willWin = Math.random() < winRate;
        
        // Điều chỉnh số bí mật dựa trên kết quả đã định
        let adjustedSecret = this.secretNumber;
        
        if (willWin) {
            // Nếu sẽ thắng, điều chỉnh số để người chơi dễ đoán hơn
            // Giảm khoảng cách với số đã đoán
            const diff = Math.abs(number - adjustedSecret);
            if (diff > 10) {
                // Đưa số bí mật gần hơn với số đã đoán
                const direction = number > adjustedSecret ? 1 : -1;
                adjustedSecret += direction * Math.floor(diff * 0.3);
            }
        } else {
            // Nếu sẽ thua, điều chỉnh số để người chơi khó đoán hơn
            const diff = Math.abs(number - adjustedSecret);
            if (diff < 20 && this.attempts < 3) {
                // Đưa số bí mật xa hơn với số đã đoán
                const direction = number > adjustedSecret ? -1 : 1;
                adjustedSecret += direction * Math.floor(20 + Math.random() * 30);
            }
        }
        
        // Giới hạn trong khoảng 1-100
        adjustedSecret = Math.max(1, Math.min(100, adjustedSecret));
        this.secretNumber = Math.round(adjustedSecret);
        
        // Kiểm tra kết quả
        if (number === this.secretNumber) {
            this.isFinished = true;
            this.result = 'win';
            return 'correct';
        } else if (this.attempts >= this.maxAttempts) {
            this.isFinished = true;
            this.result = 'loss';
            return 'out_of_attempts';
        } else if (number < this.secretNumber) {
            this.hints.push(`📈 Số ${number} quá thấp! (Lần ${this.attempts}/${this.maxAttempts})`);
            return 'too_low';
        } else {
            this.hints.push(`📉 Số ${number} quá cao! (Lần ${this.attempts}/${this.maxAttempts})`);
            return 'too_high';
        }
    }

    getResult() {
        if (!this.isFinished) return null;
        
        const config = this.getGuessConfig();
        const bonusMultiplier = config.bonusMultiplier || 1;
        
        if (this.result === 'win') {
            // Thưởng dựa trên số lần đoán
            const remainingAttempts = this.maxAttempts - this.attempts;
            const bonus = Math.floor(this.betAmount * (1 + (remainingAttempts / this.maxAttempts) * bonusMultiplier));
            return {
                winAmount: Math.max(bonus, 0),
                message: `🎉 Đoán đúng số ${this.secretNumber}! Thắng ${Math.max(bonus, 0).toLocaleString()} VND!`,
                attempts: this.attempts,
                isWin: true,
                secretNumber: this.secretNumber,
                guesses: this.guesses
            };
        } else {
            return {
                winAmount: -this.betAmount,
                message: `💔 Hết lượt! Số đúng là ${this.secretNumber}.`,
                attempts: this.attempts,
                isWin: false,
                secretNumber: this.secretNumber,
                guesses: this.guesses
            };
        }
    }
}

// === GAME ĐUA XE ===
class Racing {
    constructor(player, betAmount, carIndex) {
        this.player = player;
        this.betAmount = betAmount;
        this.carIndex = carIndex;
        this.gameName = 'racing';
        this.cars = ['🏎️ Do', '🏎️ Xanh', '🏎️ Vang', '🏎️ Trang', '🏎️ Den'];
        this.raceLength = 30;
        this.isFinished = false;
        this.winner = null;
    }

    // Lấy cấu hình cho game đua xe
    getRacingConfig() {
        const config = getGameConfig(this.player.userId, this.gameName);
        return {
            winRate: config.winRate || 40,
            lossRate: config.lossRate || 60,
            maxSpeed: config.maxSpeed || 14,
            minSpeed: config.minSpeed || 1,
            raceRounds: config.raceRounds || 18
        };
    }

    startRace() {
        let raceLog = [];
        let winnerFound = false;
        const positions = new Array(this.cars.length).fill(0);

        const config = this.getRacingConfig();
        const lossMultiplier = this.player.calculateLossMultiplier();
        
        let raceRounds = Math.floor(config.raceRounds / lossMultiplier);
        raceRounds = Math.max(15, Math.min(25, raceRounds));
        
        // Điều chỉnh tỷ lệ thắng
        let winRate = config.winRate / 100;
        let lossRate = config.lossRate / 100;
        
        winRate = Math.max(0.05, winRate - (lossMultiplier - 1) * 0.08);
        lossRate = Math.min(0.95, lossRate + (lossMultiplier - 1) * 0.08);
        
        const playerWin = Math.random() < winRate;

        for (let round = 0; round < raceRounds; round++) {
            let roundText = `🏁 Vòng ${round + 1}:\n`;
            
            for (let i = 0; i < this.cars.length; i++) {
                let speed = Math.floor(Math.random() * (config.maxSpeed || 14)) + (config.minSpeed || 1);
                
                if (i === this.carIndex) {
                    if (playerWin) {
                        speed = Math.floor(speed * (0.9 + Math.random() * 0.3));
                    } else {
                        speed = Math.floor(speed * (0.6 + Math.random() * 0.3));
                    }
                } else {
                    speed = Math.floor(speed * (0.8 + Math.random() * 0.4));
                }
                positions[i] += Math.max(1, speed);
                
                let track = '';
                const pos = Math.min(positions[i], this.raceLength);
                for (let j = 0; j < pos; j++) {
                    track += '▬';
                }
                track += '🚗';
                if (positions[i] >= this.raceLength && !winnerFound) {
                    winnerFound = true;
                    this.winner = i;
                    this.isFinished = true;
                }
                roundText += `${this.cars[i]}: ${track}\n`;
            }
            
            raceLog.push(roundText);
            if (winnerFound) break;
        }

        if (!this.winner && this.winner !== 0) {
            if (playerWin) {
                this.winner = this.carIndex;
                positions[this.carIndex] = this.raceLength;
            } else {
                let randomWinner = Math.floor(Math.random() * this.cars.length);
                while (randomWinner === this.carIndex) {
                    randomWinner = Math.floor(Math.random() * this.cars.length);
                }
                this.winner = randomWinner;
                positions[randomWinner] = this.raceLength;
            }
            this.isFinished = true;
        }

        return raceLog;
    }

    getResult() {
        const win = this.winner === this.carIndex;
        const multiplier = 2 + (this.cars.length - this.winner - 1) * 0.5;
        const winAmount = win ? Math.floor(this.betAmount * multiplier) : -this.betAmount;
        return { win, winAmount, winner: this.cars[this.winner], multiplier };
    }
}

// === GAME XỔ SỐ ===
class Lottery {
    constructor(player, betAmount) {
        this.player = player;
        this.betAmount = betAmount;
        this.gameName = 'lottery';
        this.playerNumbers = [];
        this.winningNumbers = [];
        this.isFinished = false;
    }

    // Lấy cấu hình cho game xổ số
    getLotteryConfig() {
        const config = getGameConfig(this.player.userId, this.gameName);
        return {
            winRate: config.winRate || 30,
            lossRate: config.lossRate || 70,
            matchMultipliers: config.matchMultipliers || {
                '1': 2,
                '2': 10,
                '3': 100
            }
        };
    }

    generateNumbers() {
        const config = this.getLotteryConfig();
        const lossMultiplier = this.player.calculateLossMultiplier();
        
        // Tính toán tỷ lệ từ cấu hình
        let winRate = config.winRate / 100;
        let lossRate = config.lossRate / 100;
        
        // Điều chỉnh dựa trên lossMultiplier
        winRate = Math.max(0.05, winRate - (lossMultiplier - 1) * 0.08);
        lossRate = Math.min(0.95, lossRate + (lossMultiplier - 1) * 0.08);
        
        // Đảm bảo tổng = 1
        const total = winRate + lossRate;
        winRate = winRate / total;
        lossRate = lossRate / total;
        
        // Tạo số người chơi
        this.playerNumbers = [
            Math.floor(Math.random() * 10),
            Math.floor(Math.random() * 10),
            Math.floor(Math.random() * 10)
        ];
        
        // Quyết định số lượng số trùng dựa trên tỷ lệ
        const random = Math.random();
        let targetMatches;
        
        if (random < winRate * 0.3) {
            // 3 số trùng (giải đặc biệt)
            targetMatches = 3;
        } else if (random < winRate * 0.7) {
            // 2 số trùng
            targetMatches = 2;
        } else if (random < winRate) {
            // 1 số trùng
            targetMatches = 1;
        } else {
            // 0 số trùng
            targetMatches = 0;
        }
        
        // Tạo số trúng thưởng dựa trên targetMatches
        if (targetMatches === 3) {
            // 3 số trùng - tất cả giống nhau
            this.winningNumbers = [...this.playerNumbers];
        } else if (targetMatches === 2) {
            // 2 số trùng
            this.winningNumbers = [...this.playerNumbers];
            // Thay đổi 1 vị trí
            const changeIndex = Math.floor(Math.random() * 3);
            let newNumber;
            do {
                newNumber = Math.floor(Math.random() * 10);
            } while (newNumber === this.winningNumbers[changeIndex]);
            this.winningNumbers[changeIndex] = newNumber;
        } else if (targetMatches === 1) {
            // 1 số trùng
            this.winningNumbers = [...this.playerNumbers];
            // Thay đổi 2 vị trí
            const indices = [0, 1, 2];
            const shuffled = indices.sort(() => Math.random() - 0.5);
            const changeIndices = shuffled.slice(0, 2);
            for (const idx of changeIndices) {
                let newNumber;
                do {
                    newNumber = Math.floor(Math.random() * 10);
                } while (newNumber === this.winningNumbers[idx]);
                this.winningNumbers[idx] = newNumber;
            }
        } else {
            // 0 số trùng
            this.winningNumbers = [];
            for (let i = 0; i < 3; i++) {
                let newNumber;
                do {
                    newNumber = Math.floor(Math.random() * 10);
                } while (newNumber === this.playerNumbers[i]);
                this.winningNumbers.push(newNumber);
            }
        }
        
        this.isFinished = true;
        
        // Đếm số trùng để log
        let matches = 0;
        for (let i = 0; i < 3; i++) {
            if (this.playerNumbers[i] === this.winningNumbers[i]) {
                matches++;
            }
        }
        
        console.log(`🎰 Lottery: ${this.player.userId} - Numbers: ${this.playerNumbers.join(',')} - Winning: ${this.winningNumbers.join(',')} - Matches: ${matches}`);
        
        return {
            playerNumbers: this.playerNumbers,
            winningNumbers: this.winningNumbers,
            matches: matches
        };
    }

    getResult() {
        if (!this.isFinished) return null;
        
        let matches = 0;
        for (let i = 0; i < 3; i++) {
            if (this.playerNumbers[i] === this.winningNumbers[i]) {
                matches++;
            }
        }

        const config = this.getLotteryConfig();
        const multipliers = config.matchMultipliers || {
            '1': 2,
            '2': 10,
            '3': 100
        };
        
        let winAmount = -this.betAmount;
        let message = '💔 Không trúng số nào!';
        let multiplier = 0;
        
        if (matches === 3) {
            multiplier = multipliers['3'] || 100;
            winAmount = this.betAmount * multiplier;
            message = `🎉🎉 TRÚNG ĐẶC BIỆT! x${multiplier}`;
        } else if (matches === 2) {
            multiplier = multipliers['2'] || 10;
            winAmount = this.betAmount * multiplier;
            message = `🎉 Trúng 2 số! x${multiplier}`;
        } else if (matches === 1) {
            multiplier = multipliers['1'] || 2;
            winAmount = this.betAmount * multiplier;
            message = `🎉 Trúng 1 số! x${multiplier}`;
        }

        return {
            winAmount: winAmount,
            message: message,
            playerNumbers: this.playerNumbers,
            winningNumbers: this.winningNumbers,
            matches: matches,
            isWin: winAmount > 0,
            multiplier: multiplier
        };
    }
}

// === GAME POKER ===
class Poker {
    constructor(player, betAmount) {
        this.player = player;
        this.betAmount = betAmount;
        this.gameName = 'poker';
        this.deck = this.createDeck();
        this.playerHand = [];
        this.botHand = [];
        this.isFinished = false;
        this.result = null;
    }

    createDeck() {
        const suits = ['♥', '♦', '♣', '♠'];
        const values = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A'];
        const deck = [];
        for (let suit of suits) {
            for (let value of values) {
                deck.push({ suit, value });
            }
        }
        for (let i = deck.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [deck[i], deck[j]] = [deck[j], deck[i]];
        }
        return deck;
    }

    drawCard() {
        return this.deck.pop();
    }

    getHandValue(hand) {
        const values = hand.map(c => c.value);
        const valueCounts = {};
        for (const v of values) {
            valueCounts[v] = (valueCounts[v] || 0) + 1;
        }
        
        const counts = Object.values(valueCounts);
        if (counts.includes(4)) return 8; // Tứ quý
        if (counts.includes(3) && counts.includes(2)) return 7; // Cù lũ
        if (counts.includes(3)) return 6; // Sám cô
        if (counts.filter(c => c === 2).length === 2) return 5; // Hai đôi
        if (counts.includes(2)) return 4; // Một đôi
        return 0; // Bài rác
    }

    // Lấy cấu hình cho game Poker
    getPokerConfig() {
        const config = getGameConfig(this.player.userId, this.gameName);
        return {
            winRate: config.winRate || 45,
            lossRate: config.lossRate || 55,
            drawRate: config.drawRate || 10
        };
    }

    play() {
        const config = this.getPokerConfig();
        const lossMultiplier = this.player.calculateLossMultiplier();
        
        // Tính toán tỷ lệ từ cấu hình
        let winRate = config.winRate / 100;
        let lossRate = config.lossRate / 100;
        let drawRate = config.drawRate / 100;
        
        // Điều chỉnh dựa trên lossMultiplier
        winRate = Math.max(0.05, winRate - (lossMultiplier - 1) * 0.08);
        lossRate = Math.min(0.85, lossRate + (lossMultiplier - 1) * 0.08);
        drawRate = 1 - winRate - lossRate;
        
        // Đảm bảo tổng = 1
        const total = winRate + lossRate + drawRate;
        winRate = winRate / total;
        lossRate = lossRate / total;
        drawRate = drawRate / total;
        
        // Quyết định kết quả dựa trên tỷ lệ
        const random = Math.random();
        let resultType;
        
        if (random < winRate) {
            resultType = 'win';
        } else if (random < winRate + lossRate) {
            resultType = 'loss';
        } else {
            resultType = 'draw';
        }
        
        // Tạo bài dựa trên kết quả đã định
        if (resultType === 'win') {
            this.generateWinHand();
        } else if (resultType === 'loss') {
            this.generateLossHand();
        } else {
            this.generateDrawHand();
        }
        
        this.isFinished = true;
        
        console.log(`🃏 Poker: ${this.player.userId} - Result: ${this.result}`);
    }

    generateWinHand() {
        // Tạo hand cho player thắng
        let attempts = 0;
        let playerValue = 0;
        let botValue = 0;
        
        // Các loại bài mạnh (từ 4-8)
        const strongHands = [4, 5, 6, 7, 8];
        
        do {
            // Reset hands
            this.playerHand = [];
            this.botHand = [];
            
            // Chia bài ngẫu nhiên
            for (let i = 0; i < 5; i++) {
                this.playerHand.push(this.drawCard());
                this.botHand.push(this.drawCard());
            }
            
            playerValue = this.getHandValue(this.playerHand);
            botValue = this.getHandValue(this.botHand);
            attempts++;
            
        } while ((playerValue <= botValue || !strongHands.includes(playerValue)) && attempts < 50);
        
        // Nếu vẫn chưa có kết quả, ép kết quả
        if (playerValue <= botValue || !strongHands.includes(playerValue)) {
            // Tạo bài mạnh cho player
            this.playerHand = [];
            this.botHand = [];
            
            // Tạo một đôi cho player
            const rank = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A'][Math.floor(Math.random() * 13)];
            this.playerHand.push({ suit: '♥', value: rank });
            this.playerHand.push({ suit: '♦', value: rank });
            
            // Thêm 3 lá bài rác
            for (let i = 0; i < 3; i++) {
                let newCard;
                do {
                    newCard = this.drawCard();
                } while (newCard.value === rank);
                this.playerHand.push(newCard);
            }
            
            // Tạo bài rác cho bot
            for (let i = 0; i < 5; i++) {
                let newCard;
                do {
                    newCard = this.drawCard();
                } while (newCard.value === rank);
                this.botHand.push(newCard);
            }
            
            playerValue = this.getHandValue(this.playerHand);
            botValue = this.getHandValue(this.botHand);
        }
        
        this.result = 'win';
    }

    generateLossHand() {
        // Tạo hand cho player thua
        let attempts = 0;
        let playerValue = 0;
        let botValue = 0;
        
        do {
            // Reset hands
            this.playerHand = [];
            this.botHand = [];
            
            // Chia bài ngẫu nhiên
            for (let i = 0; i < 5; i++) {
                this.playerHand.push(this.drawCard());
                this.botHand.push(this.drawCard());
            }
            
            playerValue = this.getHandValue(this.playerHand);
            botValue = this.getHandValue(this.botHand);
            attempts++;
            
        } while (playerValue >= botValue && attempts < 50);
        
        // Nếu vẫn chưa có kết quả, ép kết quả
        if (playerValue >= botValue) {
            // Tạo bài rác cho player
            this.playerHand = [];
            for (let i = 0; i < 5; i++) {
                let newCard;
                let unique = true;
                do {
                    newCard = this.drawCard();
                    unique = !this.playerHand.some(c => c.value === newCard.value);
                } while (!unique);
                this.playerHand.push(newCard);
            }
            
            // Tạo một đôi cho bot
            const rank = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A'][Math.floor(Math.random() * 13)];
            this.botHand = [];
            this.botHand.push({ suit: '♥', value: rank });
            this.botHand.push({ suit: '♦', value: rank });
            
            // Thêm 3 lá bài rác
            for (let i = 0; i < 3; i++) {
                let newCard;
                do {
                    newCard = this.drawCard();
                } while (newCard.value === rank);
                this.botHand.push(newCard);
            }
            
            playerValue = this.getHandValue(this.playerHand);
            botValue = this.getHandValue(this.botHand);
        }
        
        this.result = 'loss';
    }

    generateDrawHand() {
        // Tạo hand cho hòa
        let attempts = 0;
        let playerValue = 0;
        let botValue = 0;
        
        do {
            // Reset hands
            this.playerHand = [];
            this.botHand = [];
            
            // Chia bài ngẫu nhiên
            for (let i = 0; i < 5; i++) {
                this.playerHand.push(this.drawCard());
                this.botHand.push(this.drawCard());
            }
            
            playerValue = this.getHandValue(this.playerHand);
            botValue = this.getHandValue(this.botHand);
            attempts++;
            
        } while (playerValue !== botValue && attempts < 50);
        
        // Nếu vẫn chưa có kết quả, ép kết quả
        if (playerValue !== botValue) {
            // Tạo cùng một loại bài cho cả 2
            const handTypes = [0, 4, 5, 6]; // 0: rác, 4: đôi, 5: hai đôi, 6: sám cô
            const handType = handTypes[Math.floor(Math.random() * handTypes.length)];
            
            this.playerHand = [];
            this.botHand = [];
            
            if (handType === 0) {
                // Bài rác
                const values = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A'];
                const shuffled = values.sort(() => Math.random() - 0.5);
                const selected = shuffled.slice(0, 5);
                for (let i = 0; i < 5; i++) {
                    this.playerHand.push({ suit: ['♥', '♦', '♣', '♠'][i % 4], value: selected[i] });
                    this.botHand.push({ suit: ['♥', '♦', '♣', '♠'][(i + 2) % 4], value: selected[i] });
                }
            } else if (handType === 4) {
                // Một đôi
                const rank = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A'][Math.floor(Math.random() * 13)];
                const suits = ['♥', '♦', '♣', '♠'];
                for (let i = 0; i < 2; i++) {
                    this.playerHand.push({ suit: suits[i], value: rank });
                    this.botHand.push({ suit: suits[i + 2], value: rank });
                }
                // Thêm 3 lá rác
                const otherRanks = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A'].filter(v => v !== rank);
                const shuffled = otherRanks.sort(() => Math.random() - 0.5);
                for (let i = 0; i < 3; i++) {
                    this.playerHand.push({ suit: suits[i % 4], value: shuffled[i] });
                    this.botHand.push({ suit: suits[(i + 1) % 4], value: shuffled[i] });
                }
            } else if (handType === 5) {
                // Hai đôi
                const ranks = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A'];
                const shuffled = ranks.sort(() => Math.random() - 0.5);
                const pair1 = shuffled[0];
                const pair2 = shuffled[1];
                const suits = ['♥', '♦', '♣', '♠'];
                // Đôi 1
                this.playerHand.push({ suit: suits[0], value: pair1 });
                this.playerHand.push({ suit: suits[1], value: pair1 });
                this.botHand.push({ suit: suits[2], value: pair1 });
                this.botHand.push({ suit: suits[3], value: pair1 });
                // Đôi 2
                this.playerHand.push({ suit: suits[0], value: pair2 });
                this.playerHand.push({ suit: suits[1], value: pair2 });
                this.botHand.push({ suit: suits[2], value: pair2 });
                this.botHand.push({ suit: suits[3], value: pair2 });
                // Lá rác
                const kicker = shuffled[2];
                this.playerHand.push({ suit: suits[0], value: kicker });
                this.botHand.push({ suit: suits[2], value: kicker });
            } else if (handType === 6) {
                // Sám cô
                const rank = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A'][Math.floor(Math.random() * 13)];
                const suits = ['♥', '♦', '♣', '♠'];
                for (let i = 0; i < 3; i++) {
                    this.playerHand.push({ suit: suits[i], value: rank });
                    this.botHand.push({ suit: suits[i], value: rank });
                }
                // Thêm 2 lá rác
                const otherRanks = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A'].filter(v => v !== rank);
                const shuffled = otherRanks.sort(() => Math.random() - 0.5);
                for (let i = 0; i < 2; i++) {
                    this.playerHand.push({ suit: suits[i % 4], value: shuffled[i] });
                    this.botHand.push({ suit: suits[(i + 1) % 4], value: shuffled[i] });
                }
            }
            
            playerValue = this.getHandValue(this.playerHand);
            botValue = this.getHandValue(this.botHand);
            
            // Đảm bảo giá trị bằng nhau
            if (playerValue !== botValue) {
                // Ép cả 2 thành bài rác
                this.playerHand = [];
                this.botHand = [];
                const values = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A'];
                const shuffled = values.sort(() => Math.random() - 0.5);
                const selected = shuffled.slice(0, 5);
                for (let i = 0; i < 5; i++) {
                    this.playerHand.push({ suit: ['♥', '♦', '♣', '♠'][i % 4], value: selected[i] });
                    this.botHand.push({ suit: ['♥', '♦', '♣', '♠'][(i + 2) % 4], value: selected[i] });
                }
                playerValue = 0;
                botValue = 0;
            }
        }
        
        this.result = 'draw';
    }

    getResult() {
        if (!this.isFinished) return null;
        
        let winAmount = 0;
        let message = '';
        let emoji = '';
        
        if (this.result === 'win') {
            winAmount = this.betAmount * 2;
            message = '🎉 Bạn thắng!';
            emoji = '🎉';
        } else if (this.result === 'draw') {
            winAmount = this.betAmount;
            message = '🤝 Hòa! Nhận lại tiền cược.';
            emoji = '🤝';
        } else {
            winAmount = 0;
            message = '💔 Bạn thua!';
            emoji = '💔';
        }
        
        return {
            winAmount: winAmount,
            message: message,
            emoji: emoji,
            playerHand: this.playerHand.map(c => `${c.value}${c.suit}`),
            botHand: this.botHand.map(c => `${c.value}${c.suit}`),
            playerValue: this.getHandValue(this.playerHand),
            botValue: this.getHandValue(this.botHand),
            isWin: this.result === 'win',
            result: this.result
        };
    }

    // Hàm lấy tên loại bài
    getHandTypeName(value) {
        const types = {
            0: 'Bài rác',
            4: 'Một đôi',
            5: 'Hai đôi',
            6: 'Sám cô',
            7: 'Cù lũ',
            8: 'Tứ quý'
        };
        return types[value] || 'Không xác định';
    }
}

// === GAME ROULETTE ===
class Roulette {
    constructor(player, betAmount, choice) {
        this.player = player;
        this.betAmount = betAmount;
        this.choice = choice;
        this.gameName = 'roulette';
        this.resultNumber = 0;
        this.resultColor = '';
        this.isFinished = false;
    }

    // Lấy cấu hình cho game Roulette
    getRouletteConfig() {
        const config = getGameConfig(this.player.userId, this.gameName);
        return {
            winRate: config.winRate || 48,
            lossRate: config.lossRate || 52,
            redRate: config.redRate || 48,
            blackRate: config.blackRate || 48,
            greenRate: config.greenRate || 4
        };
    }

    spin() {
        const config = this.getRouletteConfig();
        const lossMultiplier = this.player.calculateLossMultiplier();
        
        // Tính toán tỷ lệ từ cấu hình
        let redRate = config.redRate / 100;
        let blackRate = config.blackRate / 100;
        let greenRate = config.greenRate / 100;
        
        // Điều chỉnh dựa trên lossMultiplier
        redRate = Math.max(0.1, redRate - (lossMultiplier - 1) * 0.05);
        blackRate = Math.max(0.1, blackRate - (lossMultiplier - 1) * 0.05);
        greenRate = Math.min(0.1, greenRate + (lossMultiplier - 1) * 0.02);
        
        // Đảm bảo tổng = 1
        const total = redRate + blackRate + greenRate;
        redRate = redRate / total;
        blackRate = blackRate / total;
        greenRate = greenRate / total;
        
        // Quyết định kết quả dựa trên tỷ lệ
        const random = Math.random();
        let resultColor;
        
        if (random < redRate) {
            resultColor = 'red';
        } else if (random < redRate + blackRate) {
            resultColor = 'black';
        } else {
            resultColor = 'green';
        }
        
        // Nếu người chơi đặt cửa cụ thể, điều chỉnh tỷ lệ thắng
        let winRate = config.winRate / 100;
        let lossRate = config.lossRate / 100;
        
        // Điều chỉnh dựa trên lossMultiplier
        winRate = Math.max(0.1, winRate - (lossMultiplier - 1) * 0.08);
        lossRate = Math.min(0.9, lossRate + (lossMultiplier - 1) * 0.08);
        
        // Đảm bảo tổng = 1
        const totalWL = winRate + lossRate;
        winRate = winRate / totalWL;
        lossRate = lossRate / totalWL;
        
        let isWin = Math.random() < winRate;
        
        // Xác định số kết quả
        let number;
        let color;
        
        if (isWin) {
            // Người chơi thắng - đảm bảo kết quả đúng với choice
            if (this.choice === 'red') {
                color = 'red';
                // Chọn số đỏ ngẫu nhiên
                const redNumbers = [1, 3, 5, 7, 9, 12, 14, 16, 18, 19, 21, 23, 25, 27, 30, 32, 34, 36];
                number = redNumbers[Math.floor(Math.random() * redNumbers.length)];
            } else if (this.choice === 'black') {
                color = 'black';
                // Chọn số đen ngẫu nhiên
                const blackNumbers = [2, 4, 6, 8, 10, 11, 13, 15, 17, 20, 22, 24, 26, 28, 29, 31, 33, 35];
                number = blackNumbers[Math.floor(Math.random() * blackNumbers.length)];
            } else if (this.choice === 'green') {
                color = 'green';
                number = 0;
            } else if (!isNaN(this.choice)) {
                // Đặt số cụ thể
                const num = parseInt(this.choice);
                if (num >= 0 && num <= 36) {
                    number = num;
                    if (num === 0) color = 'green';
                    else if (num % 2 === 0) color = 'black';
                    else color = 'red';
                } else {
                    // Fallback
                    number = Math.floor(Math.random() * 37);
                    if (number === 0) color = 'green';
                    else if (number % 2 === 0) color = 'black';
                    else color = 'red';
                }
            } else {
                // Mặc định
                number = Math.floor(Math.random() * 37);
                if (number === 0) color = 'green';
                else if (number % 2 === 0) color = 'black';
                else color = 'red';
            }
        } else {
            // Người chơi thua - chọn kết quả ngược lại
            if (this.choice === 'red') {
                color = 'black';
                const blackNumbers = [2, 4, 6, 8, 10, 11, 13, 15, 17, 20, 22, 24, 26, 28, 29, 31, 33, 35];
                number = blackNumbers[Math.floor(Math.random() * blackNumbers.length)];
            } else if (this.choice === 'black') {
                color = 'red';
                const redNumbers = [1, 3, 5, 7, 9, 12, 14, 16, 18, 19, 21, 23, 25, 27, 30, 32, 34, 36];
                number = redNumbers[Math.floor(Math.random() * redNumbers.length)];
            } else if (this.choice === 'green') {
                color = 'red';
                const redNumbers = [1, 3, 5, 7, 9, 12, 14, 16, 18, 19, 21, 23, 25, 27, 30, 32, 34, 36];
                number = redNumbers[Math.floor(Math.random() * redNumbers.length)];
            } else if (!isNaN(this.choice)) {
                // Đặt số cụ thể - chọn số khác
                let num;
                do {
                    num = Math.floor(Math.random() * 37);
                } while (num === parseInt(this.choice));
                number = num;
                if (number === 0) color = 'green';
                else if (number % 2 === 0) color = 'black';
                else color = 'red';
            } else {
                // Mặc định
                number = Math.floor(Math.random() * 37);
                if (number === 0) color = 'green';
                else if (number % 2 === 0) color = 'black';
                else color = 'red';
            }
        }
        
        this.resultNumber = number;
        this.resultColor = color;
        this.isFinished = true;
        
        console.log(`🎰 Roulette: ${this.player.userId} - Choice: ${this.choice} - Result: ${number} (${color}) - IsWin: ${isWin}`);
    }

    getResult() {
        if (!this.isFinished) return null;
        
        let isWin = false;
        let winAmount = -this.betAmount;
        let multiplier = 1;
        
        if (this.choice === 'red' && this.resultColor === 'red') {
            isWin = true;
            multiplier = 2;
            winAmount = this.betAmount * multiplier;
        } else if (this.choice === 'black' && this.resultColor === 'black') {
            isWin = true;
            multiplier = 2;
            winAmount = this.betAmount * multiplier;
        } else if (this.choice === 'green' && this.resultColor === 'green') {
            isWin = true;
            multiplier = 35;
            winAmount = this.betAmount * multiplier;
        } else if (!isNaN(this.choice) && parseInt(this.choice) === this.resultNumber) {
            isWin = true;
            multiplier = 36;
            winAmount = this.betAmount * multiplier;
        }
        
        return {
            winAmount: winAmount,
            message: isWin ? '🎉 Bạn thắng!' : '💔 Bạn thua!',
            number: this.resultNumber,
            color: this.resultColor,
            isWin: isWin,
            multiplier: multiplier,
            profit: winAmount - this.betAmount
        };
    }
}

// === GAME CRASH ===
class Crash {
    constructor(player, betAmount) {
        this.player = player;
        this.betAmount = betAmount;
        this.multiplier = 1;
        this.crashPoint = 0;
        this.isFinished = false;
        this.crashed = false;
        this.gameName = 'crash';
    }

    calculateCrashPoint() {
        // Sử dụng hàm toàn cục để lấy cấu hình
        const config = getGameConfig(this.player.userId, this.gameName);
        const lossMultiplier = this.player.calculateLossMultiplier();
        
        // Lấy tỷ lệ từ config
        let winRate = (config.winRate || 45) / 100;
        let crashProbability = (config.crashProbability || 55) / 100;
        
        // Điều chỉnh dựa trên lossMultiplier (người chơi càng thua thì càng dễ crash)
        winRate = Math.max(0.05, winRate - (lossMultiplier - 1) * 0.08);
        crashProbability = Math.min(0.95, crashProbability + (lossMultiplier - 1) * 0.08);
        
        // Quyết định xem có crash không (dựa trên winRate)
        // Nếu random > winRate thì sẽ crash
        const willCrash = Math.random() > winRate;
        
        let crashPoint;
        if (willCrash) {
            // Crash sớm - multiplier thấp
            const minMultiplier = config.minMultiplier || 1.1;
            const maxCrash = Math.min((config.maxMultiplier || 10) * 0.4, (config.maxMultiplier || 10) * 0.6);
            crashPoint = minMultiplier + Math.random() * (maxCrash - minMultiplier);
        } else {
            // Không crash - multiplier cao
            const minHigh = (config.maxMultiplier || 10) * 0.5;
            const maxHigh = (config.maxMultiplier || 10) * 0.95;
            crashPoint = minHigh + Math.random() * (maxHigh - minHigh);
        }
        
        // Điều chỉnh dựa trên lossMultiplier (càng thua thì crash point càng thấp)
        crashPoint = crashPoint / (1 + (lossMultiplier - 1) * 0.15);
        
        // Giới hạn trong khoảng cho phép
        crashPoint = Math.max(config.minMultiplier || 1.1, crashPoint);
        crashPoint = Math.min(config.maxMultiplier || 10, crashPoint);
        
        // Làm tròn 2 số thập phân
        this.crashPoint = Math.round(crashPoint * 100) / 100;
        console.log(`📈 Crash point: ${this.crashPoint}x - Will crash: ${willCrash}`);
        
        return this.crashPoint;
    }

    play() {
        // Tính crash point
        this.crashPoint = this.calculateCrashPoint();
        
        // Xác định multiplier cuối cùng
        // Người chơi sẽ rút ở một điểm ngẫu nhiên trước khi crash
        const rng = Math.random();
        
        if (rng < 0.3) {
            // Rút rất sớm - an toàn
            this.multiplier = 1 + Math.random() * 0.5;
        } else if (rng < 0.6) {
            // Rút ở mức trung bình
            this.multiplier = this.crashPoint * 0.5 + Math.random() * (this.crashPoint * 0.3);
        } else if (rng < 0.85) {
            // Rút gần sát crash point
            this.multiplier = this.crashPoint * 0.8 + Math.random() * (this.crashPoint * 0.15);
        } else {
            // Rút đúng lúc crash (cực kỳ may mắn)
            this.multiplier = this.crashPoint;
        }
        
        // Đảm bảo không vượt quá crash point và không thấp hơn 1
        this.multiplier = Math.min(this.multiplier, this.crashPoint - 0.01);
        this.multiplier = Math.max(1, this.multiplier);
        this.multiplier = Math.round(this.multiplier * 100) / 100;
        
        this.isFinished = true;
        
        console.log(`📊 Crash result: ${this.multiplier}x - Crash point: ${this.crashPoint}x`);
    }

    getResult() {
        if (!this.isFinished) return null;
        
        const winAmount = this.betAmount * this.multiplier;
        const isWin = winAmount > this.betAmount;
        
        // Kiểm tra nếu multiplier gần bằng crash point thì coi như thắng lớn
        const isNearCrash = Math.abs(this.multiplier - this.crashPoint) < 0.1;
        
        let message = '';
        if (isNearCrash && isWin) {
            message = `🔥 Rút đúng lúc! Crash tại x${this.crashPoint.toFixed(2)}!`;
        } else if (isWin) {
            message = `✅ Rút thành công tại x${this.multiplier.toFixed(2)}!`;
        } else {
            message = `💔 Crash tại x${this.crashPoint.toFixed(2)}!`;
        }
        
        return {
            winAmount: winAmount,
            message: message,
            multiplier: this.multiplier,
            crashPoint: this.crashPoint,
            isWin: isWin,
            profit: winAmount - this.betAmount
        };
    }
}

// === GAME DICE ===
class Dice {
    constructor(player, betAmount, choice) {
        this.player = player;
        this.betAmount = betAmount;
        this.choice = choice;
        this.gameName = 'dice';
        this.result = 0;
        this.isFinished = false;
    }

    // Lấy cấu hình cho game Dice
    getDiceConfig() {
        const config = getGameConfig(this.player.userId, this.gameName);
        return {
            winRate: config.winRate || 50,
            lossRate: config.lossRate || 50,
            exactMultiplier: config.exactMultiplier || 6,
            rangeMultiplier: config.rangeMultiplier || 2
        };
    }

    roll() {
        const config = this.getDiceConfig();
        const lossMultiplier = this.player.calculateLossMultiplier();
        
        // Tính toán tỷ lệ từ cấu hình
        let winRate = config.winRate / 100;
        let lossRate = config.lossRate / 100;
        
        // Điều chỉnh dựa trên lossMultiplier
        winRate = Math.max(0.1, winRate - (lossMultiplier - 1) * 0.08);
        lossRate = Math.min(0.9, lossRate + (lossMultiplier - 1) * 0.08);
        
        // Đảm bảo tổng = 1
        const total = winRate + lossRate;
        winRate = winRate / total;
        lossRate = lossRate / total;
        
        // Quyết định người chơi có thắng không
        const isWin = Math.random() < winRate;
        
        let result;
        
        if (isWin) {
            // Người chơi thắng - chọn kết quả phù hợp với choice
            if (this.choice === '1-3') {
                result = Math.floor(Math.random() * 3) + 1; // 1-3
            } else if (this.choice === '4-6') {
                result = Math.floor(Math.random() * 3) + 4; // 4-6
            } else if (this.choice === 'even') {
                const evenNumbers = [2, 4, 6];
                result = evenNumbers[Math.floor(Math.random() * evenNumbers.length)];
            } else if (this.choice === 'odd') {
                const oddNumbers = [1, 3, 5];
                result = oddNumbers[Math.floor(Math.random() * oddNumbers.length)];
            } else if (!isNaN(this.choice)) {
                // Đặt số cụ thể
                const num = parseInt(this.choice);
                if (num >= 1 && num <= 6) {
                    result = num;
                } else {
                    result = Math.floor(Math.random() * 6) + 1;
                }
            } else {
                // Fallback
                result = Math.floor(Math.random() * 6) + 1;
            }
        } else {
            // Người chơi thua - chọn kết quả ngược lại
            if (this.choice === '1-3') {
                result = Math.floor(Math.random() * 3) + 4; // 4-6
            } else if (this.choice === '4-6') {
                result = Math.floor(Math.random() * 3) + 1; // 1-3
            } else if (this.choice === 'even') {
                const oddNumbers = [1, 3, 5];
                result = oddNumbers[Math.floor(Math.random() * oddNumbers.length)];
            } else if (this.choice === 'odd') {
                const evenNumbers = [2, 4, 6];
                result = evenNumbers[Math.floor(Math.random() * evenNumbers.length)];
            } else if (!isNaN(this.choice)) {
                // Đặt số cụ thể - chọn số khác
                const num = parseInt(this.choice);
                let randomNum;
                do {
                    randomNum = Math.floor(Math.random() * 6) + 1;
                } while (randomNum === num);
                result = randomNum;
            } else {
                // Fallback
                result = Math.floor(Math.random() * 6) + 1;
            }
        }
        
        this.result = result;
        this.isFinished = true;
        
        // Kiểm tra kết quả để log
        let isWinResult = false;
        if (this.choice === '1-3' && this.result <= 3) isWinResult = true;
        else if (this.choice === '4-6' && this.result >= 4) isWinResult = true;
        else if (this.choice === 'even' && this.result % 2 === 0) isWinResult = true;
        else if (this.choice === 'odd' && this.result % 2 === 1) isWinResult = true;
        else if (!isNaN(this.choice) && parseInt(this.choice) === this.result) isWinResult = true;
        
        console.log(`🎲 Dice: ${this.player.userId} - Choice: ${this.choice} - Result: ${this.result} - IsWin: ${isWinResult}`);
    }

    getResult() {
        if (!this.isFinished) return null;
        
        let isWin = false;
        let winAmount = -this.betAmount;
        let multiplier = 1;
        
        const config = this.getDiceConfig();
        const rangeMultiplier = config.rangeMultiplier || 2;
        const exactMultiplier = config.exactMultiplier || 6;
        
        if (this.choice === '1-3' && this.result <= 3) {
            isWin = true;
            multiplier = rangeMultiplier;
            winAmount = this.betAmount * multiplier;
        } else if (this.choice === '4-6' && this.result >= 4) {
            isWin = true;
            multiplier = rangeMultiplier;
            winAmount = this.betAmount * multiplier;
        } else if (this.choice === 'even' && this.result % 2 === 0) {
            isWin = true;
            multiplier = rangeMultiplier;
            winAmount = this.betAmount * multiplier;
        } else if (this.choice === 'odd' && this.result % 2 === 1) {
            isWin = true;
            multiplier = rangeMultiplier;
            winAmount = this.betAmount * multiplier;
        } else if (!isNaN(this.choice) && parseInt(this.choice) === this.result) {
            isWin = true;
            multiplier = exactMultiplier;
            winAmount = this.betAmount * multiplier;
        }
        
        return {
            winAmount: winAmount,
            message: isWin ? '🎉 Bạn thắng!' : '💔 Bạn thua!',
            result: this.result,
            isWin: isWin,
            multiplier: multiplier,
            profit: winAmount - this.betAmount
        };
    }
}

// === GAME COINFLIP ===
class CoinFlip {
    constructor(player, betAmount, choice) {
        this.player = player;
        this.betAmount = betAmount;
        this.choice = choice;
        this.gameName = 'coinflip';
        this.result = '';
        this.isFinished = false;
    }

    // Lấy cấu hình cho game CoinFlip
    getCoinFlipConfig() {
        const config = getGameConfig(this.player.userId, this.gameName);
        return {
            winRate: config.winRate || 50,
            lossRate: config.lossRate || 50
        };
    }

    flip() {
        const config = this.getCoinFlipConfig();
        const lossMultiplier = this.player.calculateLossMultiplier();
        
        // Tính toán tỷ lệ từ cấu hình
        let winRate = config.winRate / 100;
        let lossRate = config.lossRate / 100;
        
        // Điều chỉnh dựa trên lossMultiplier
        winRate = Math.max(0.1, winRate - (lossMultiplier - 1) * 0.08);
        lossRate = Math.min(0.9, lossRate + (lossMultiplier - 1) * 0.08);
        
        // Đảm bảo tổng = 1
        const total = winRate + lossRate;
        winRate = winRate / total;
        lossRate = lossRate / total;
        
        // Quyết định người chơi có thắng không
        const isWin = Math.random() < winRate;
        
        let result;
        
        if (isWin) {
            // Người chơi thắng - trả về đúng choice
            result = this.choice;
        } else {
            // Người chơi thua - trả về ngược lại
            result = this.choice === 'heads' ? 'tails' : 'heads';
        }
        
        this.result = result;
        this.isFinished = true;
        
        console.log(`🪙 CoinFlip: ${this.player.userId} - Choice: ${this.choice} - Result: ${this.result} - IsWin: ${isWin}`);
    }

    getResult() {
        if (!this.isFinished) return null;
        
        const isWin = this.choice === this.result;
        const winAmount = isWin ? this.betAmount * 2 : -this.betAmount;
        
        // Tạo emoji cho kết quả
        const resultEmojis = {
            'heads': '🪙 Mặt Ngửa',
            'tails': '🪙 Mặt Sấp'
        };
        
        const choiceEmojis = {
            'heads': '🪙 Ngửa',
            'tails': '🪙 Sấp'
        };
        
        // Tạo hiệu ứng tung đồng xu
        const flipAnimation = ['🪙', '🔄', '🪙', '🔄', '🪙'];
        const resultDisplay = resultEmojis[this.result] || this.result;
        const choiceDisplay = choiceEmojis[this.choice] || this.choice;
        
        return {
            winAmount: winAmount,
            message: isWin ? '🎉 Bạn thắng!' : '💔 Bạn thua!',
            result: this.result,
            resultDisplay: resultDisplay,
            choiceDisplay: choiceDisplay,
            isWin: isWin,
            profit: winAmount - this.betAmount,
            flipAnimation: flipAnimation
        };
    }
}

client.once('ready', () => {
    console.log(`✅ Bot da san sang hoat dong voi ten: ${client.user.tag}`);
    
    // === HIỂN THỊ DANH SÁCH SERVER BOT ĐANG Ở ===
    console.log(`📊 Bot dang o ${client.guilds.cache.size} server:`);
    client.guilds.cache.forEach(guild => {
        console.log(`   - ${guild.name} (${guild.id})`);
    });
    
    // === KIỂM TRA QUYỀN GỬI DM ===
    console.log('📨 Kiem tra quyen gui tin nhan rieng...');
    console.log('💡 Dam bao bot co quyen gui DM den user!');
    
    // === KIỂM TRA ADMIN CHANNEL ===
    if (ADMIN_CHANNEL_ID) {
        try {
            const channel = client.channels.cache.get(ADMIN_CHANNEL_ID);
            if (channel) {
                console.log(`✅ Tim thay admin channel: #${channel.name} (${channel.id})`);
                console.log(`📌 Kênh này sẽ nhận thông báo nạp tiền`);
            } else {
                console.log(`❌ KHONG TIM THAY ADMIN CHANNEL: ${ADMIN_CHANNEL_ID}`);
                console.log(`💡 Kiem tra ADMIN_CHANNEL_ID trong file .env`);
                console.log(`💡 Dam bao bot da duoc them vao server va co quyen xem kenh nay`);
            }
        } catch (error) {
            console.log(`❌ Loi kiem tra admin channel: ${error.message}`);
        }
    } else {
        console.log('⚠️ ADMIN_CHANNEL_ID chua duoc cau hinh trong file .env');
        console.log('💡 Them dong: ADMIN_CHANNEL_ID=1366805947711881266 vao file .env');
    }
});

// Lưu dữ liệu định kỳ
setInterval(() => {
    savePlayers(players);
    console.log('💾 Da tu dong luu du lieu nguoi choi!');
}, 5 * 60 * 1000);

process.on('SIGINT', () => {
    savePlayers(players);
    console.log('💾 Da luu du lieu truoc khi tat bot!');
    process.exit(0);
});

client.on('messageCreate', async message => {
    if (message.author.bot || !message.content.startsWith(PREFIX)) return;

    const args = message.content.slice(PREFIX.length).trim().split(/ +/);
    const command = args.shift().toLowerCase();
    const userId = message.author.id;

    if (!players.has(userId)) {
        players.set(userId, new Player(userId));
        savePlayers(players);
    }
    const player = players.get(userId);

// === LỆNH ADMIN ===
if (command === 'admin') {
    // Kiểm tra owner
    if (!OWNER_ID) {
        return message.reply('❌ OWNER_ID chưa được cấu hình trong file .env!');
    }
    
    if (message.author.id !== OWNER_ID) {
        return message.reply('❌ Bạn không có quyền sử dụng lệnh này!');
    }
    
    const subCommand = args.shift()?.toLowerCase();
    
    // === LỆNH QUẢN LÝ GLOBAL WIN RATE ===
    if (subCommand === 'setglobalrate') {
        const winRate = parseFloat(args.shift());
        const lossRate = args.length > 0 ? parseFloat(args.shift()) : 100 - winRate;
        
        if (isNaN(winRate) || winRate < 0 || winRate > 100) {
            return message.reply('⚠️ Vui lòng nhập tỷ lệ thắng từ 0-100!');
        }
        
        if (isNaN(lossRate) || lossRate < 0 || lossRate > 100) {
            return message.reply('⚠️ Vui lòng nhập tỷ lệ thua từ 0-100!');
        }
        
        if (winRate + lossRate !== 100) {
            return message.reply(`⚠️ Tổng tỷ lệ thắng + thua phải = 100%! Hiện tại: ${winRate + lossRate}%`);
        }
        
        // Đọc config hiện tại
        let config = loadBotConfig() || {};
        if (!config.globalWinRate) config.globalWinRate = {};
        
        config.globalWinRate.enabled = true;
        config.globalWinRate.winRate = winRate;
        config.globalWinRate.lossRate = lossRate;
        config.globalWinRate.drawRate = 0;
        
        // Xóa tất cả player override để đảm bảo global được áp dụng
        if (config.playerOverrides) {
            for (const [userId, playerConfig] of Object.entries(config.playerOverrides)) {
                if (playerConfig.global) {
                    delete playerConfig.global;
                }
                if (Object.keys(playerConfig).length === 0) {
                    delete config.playerOverrides[userId];
                }
            }
        }
        
        // Lưu config
        fs.writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2));
        
        // Reload config
        loadBotConfig();
        GLOBAL_WIN_RATE = config.globalWinRate || { enabled: false, winRate: 50, lossRate: 50 };
        PLAYER_OVERRIDES = config.playerOverrides || {};
        
        return message.reply(`✅ Đã cập nhật GLOBAL WIN RATE:
📊 Tỷ lệ thắng: **${winRate}%**
📊 Tỷ lệ thua: **${lossRate}%**
📌 Áp dụng cho TẤT CẢ người chơi và game!
🗑️ Đã xóa tất cả override cũ để áp dụng global mới!`);
    }
    
    // === LỆNH XÓA OVERRIDE ===
    if (subCommand === 'clearoverride') {
        const targetId = args.shift();
        
        if (!targetId) {
            return message.reply('⚠️ Cách dùng: !admin clearoverride [userID]\nVí dụ: !admin clearoverride 1366805947711881266');
        }
        
        let config = loadBotConfig() || {};
        if (!config.playerOverrides) config.playerOverrides = {};
        
        if (config.playerOverrides[targetId]) {
            delete config.playerOverrides[targetId];
            fs.writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2));
            loadBotConfig();
            PLAYER_OVERRIDES = config.playerOverrides || {};
            
            return message.reply(`✅ Đã xóa tất cả override của <@${targetId}>
📌 Người chơi này sẽ sử dụng cấu hình mặc định của server!`);
        } else {
            return message.reply(`❌ Không tìm thấy override cho <@${targetId}>`);
        }
    }
    
    // === LỆNH TẮT GLOBAL WIN RATE ===
    if (subCommand === 'disableglobalrate') {
        let config = loadBotConfig() || {};
        if (config.globalWinRate) {
            config.globalWinRate.enabled = false;
            fs.writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2));
            loadBotConfig();
            GLOBAL_WIN_RATE = config.globalWinRate || { enabled: false, winRate: 50, lossRate: 50 };
            return message.reply('✅ Đã TẮT Global Win Rate. Bot sẽ sử dụng cấu hình từng game riêng.');
        }
        return message.reply('❌ Không tìm thấy cấu hình Global Win Rate!');
    }
    
    // === LỆNH XEM CẤU HÌNH CỦA 1 PLAYER ===
    if (subCommand === 'showplayer') {
        const targetId = args.shift();
        
        if (!targetId) {
            return message.reply('⚠️ Cách dùng: !admin showplayer [userID]\nVí dụ: !admin showplayer 1366805947711881266');
        }
        
        const config = loadBotConfig() || {};
        const playerConfig = config.playerOverrides ? config.playerOverrides[targetId] : null;
        
        if (!playerConfig) {
            return message.reply(`❌ Không tìm thấy cấu hình cho <@${targetId}>`);
        }
        
        let response = `📊 **CẤU HÌNH CỦA <@${targetId}>**\n\n`;
        
        // Kiểm tra global của player
        if (playerConfig.global) {
            response += `**🌍 GLOBAL:**\n`;
            response += `  - winRate: ${playerConfig.global.winRate || 50}%\n`;
            response += `  - lossRate: ${playerConfig.global.lossRate || 50}%\n`;
            response += `  - drawRate: ${playerConfig.global.drawRate || 0}%\n\n`;
        }
        
        // Kiểm tra các game cụ thể
        let hasGames = false;
        for (const [game, settings] of Object.entries(playerConfig)) {
            if (game === 'global') continue;
            hasGames = true;
            response += `**🎮 ${game.toUpperCase()}:**\n`;
            for (const [key, value] of Object.entries(settings)) {
                if (typeof value === 'object') {
                    response += `  - ${key}: ${JSON.stringify(value)}\n`;
                } else {
                    response += `  - ${key}: ${value}%\n`;
                }
            }
            response += '\n';
        }
        
        if (!hasGames && !playerConfig.global) {
            response += '❌ Không có cấu hình nào cho user này.\n';
        }
        
        // Kiểm tra độ dài
        if (response.length > 2000) {
            const parts = response.match(/.{1,1900}/g) || [];
            for (let i = 0; i < parts.length; i++) {
                const embed = createGameEmbed(
                    `📊 CẤU HÌNH PLAYER (${i + 1}/${parts.length})`,
                    parts[i],
                    '#ff66ff'
                );
                await message.reply({ embeds: [embed] });
            }
        } else {
            const embed = createGameEmbed('📊 CẤU HÌNH PLAYER', response, '#ff66ff');
            await message.reply({ embeds: [embed] });
        }
        
        return;
    }
    
    // === LỆNH XEM GLOBAL WIN RATE ===
    if (subCommand === 'showglobalrate') {
        const config = loadBotConfig() || {};
        const global = config.globalWinRate || { enabled: false, winRate: 50, lossRate: 50 };
        
        let status = global.enabled ? '🟢 ĐANG BẬT' : '🔴 ĐANG TẮT';
        let response = `📊 **GLOBAL WIN RATE**\n\n`;
        response += `📌 Trạng thái: ${status}\n`;
        response += `📈 Tỷ lệ thắng: **${global.winRate || 50}%**\n`;
        response += `📉 Tỷ lệ thua: **${global.lossRate || 50}%**\n`;
        
        if (global.enabled) {
            response += `\n💡 Áp dụng cho TẤT CẢ các game và người chơi.`;
            response += `\n📝 Dùng \`!admin disableglobalrate\` để tắt.`;
        } else {
            response += `\n💡 Hiện đang sử dụng cấu hình từng game riêng.`;
            response += `\n📝 Dùng \`!admin setglobalrate [win%] [loss%]\` để bật.`;
        }
        
        return message.reply(response);
    }
    
    // === LỆNH SET PLAYER GLOBAL RATE ===
    if (subCommand === 'setplayerglobal') {
        const targetId = args.shift();
        const winRate = parseFloat(args.shift());
        const lossRate = args.length > 0 ? parseFloat(args.shift()) : 100 - winRate;
        
        if (!targetId) {
            return message.reply('⚠️ Cách dùng: !admin setplayerglobal [userID] [win%] [loss%]');
        }
        
        if (isNaN(winRate) || winRate < 0 || winRate > 100) {
            return message.reply('⚠️ Tỷ lệ thắng phải từ 0-100!');
        }
        
        if (isNaN(lossRate) || lossRate < 0 || lossRate > 100) {
            return message.reply('⚠️ Tỷ lệ thua phải từ 0-100!');
        }
        
        if (winRate + lossRate !== 100) {
            return message.reply(`⚠️ Tổng tỷ lệ phải = 100%! Hiện tại: ${winRate + lossRate}%`);
        }
        
        // Đọc config
        let config = loadBotConfig() || {};
        if (!config.playerOverrides) config.playerOverrides = {};
        if (!config.playerOverrides[targetId]) config.playerOverrides[targetId] = {};
        
        config.playerOverrides[targetId].global = {
            winRate: winRate,
            lossRate: lossRate,
            drawRate: 0
        };
        
        fs.writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2));
        loadBotConfig();
        GLOBAL_WIN_RATE = config.globalWinRate || { enabled: false, winRate: 50, lossRate: 50 };
        PLAYER_OVERRIDES = config.playerOverrides || {};
        
        return message.reply(`✅ Đã set Global Rate cho <@${targetId}>:
📊 Thắng: **${winRate}%** | Thua: **${lossRate}%**
📌 Áp dụng cho TẤT CẢ game của người chơi này!`);
    }
    
    // === LỆNH ĐIỀU CHỈNH TỶ LỆ GAME ===
    if (subCommand === 'setgamerate') {
        const gameName = args.shift()?.toLowerCase();
        const setting = args.shift()?.toLowerCase();
        const value = args.shift();
        
        if (!gameName || !setting || value === undefined) {
            return message.reply(`⚠️ Cách dùng: !admin setgamerate [game] [setting] [value]
            
📌 **Game:** luckydraw, crash, blackjack, taixiu, xocdia, slot, kbb, horse, racing, baucua, guess, lottery, poker, roulette, dice, coinflip
📌 **Setting:** winrate, lossrate, drawrate, maxmultiplier, minmultiplier, crashprobability, jackpotrate, jackpotmultiplier, threematchmultiplier, twomatchmultiplier, maxspeed, minspeed, racerounds, matchmultiplier, maxattempts, bonusmultiplier
📌 **Value:** số từ 0-100
        
Ví dụ: !admin setgamerate taixiu winrate 50`);
        }
        
        // Danh sách game hợp lệ
        const validGames = ['luckydraw', 'crash', 'blackjack', 'taixiu', 'xocdia', 'slot', 'kbb', 'horse', 'racing', 'baucua', 'guess', 'lottery', 'poker', 'roulette', 'dice', 'coinflip'];
        
        if (!validGames.includes(gameName)) {
            return message.reply(`❌ Game không hợp lệ! Các game: ${validGames.join(', ')}`);
        }
        
        // Đọc config hiện tại
        let config = loadBotConfig() || {};
        if (!config.gameConfigs) config.gameConfigs = {};
        if (!config.gameConfigs[gameName]) config.gameConfigs[gameName] = {};
        
        const gameConfig = config.gameConfigs[gameName];
        const validSettings = ['winrate', 'lossrate', 'drawrate', 'maxmultiplier', 'minmultiplier', 'crashprobability', 'jackpotrate', 'jackpotmultiplier', 'threematchmultiplier', 'twomatchmultiplier', 'maxspeed', 'minspeed', 'racerounds', 'matchmultiplier', 'maxattempts', 'bonusmultiplier'];
        
        if (!validSettings.includes(setting)) {
            return message.reply(`❌ Setting không hợp lệ! Các setting: ${validSettings.join(', ')}`);
        }
        
        const numValue = parseFloat(value);
        if (isNaN(numValue)) {
            return message.reply('❌ Giá trị phải là số!');
        }
        
        // Validate giá trị
        if (['winrate', 'lossrate', 'drawrate', 'crashprobability', 'jackpotrate'].includes(setting)) {
            if (numValue < 0 || numValue > 100) {
                return message.reply('❌ Giá trị phải từ 0-100!');
            }
            gameConfig[setting] = numValue;
        } else if (['maxmultiplier', 'minmultiplier', 'jackpotmultiplier', 'threematchmultiplier', 'twomatchmultiplier', 'matchmultiplier', 'bonusmultiplier'].includes(setting)) {
            if (numValue < 1 || numValue > 100) {
                return message.reply('❌ Giá trị phải từ 1-100!');
            }
            gameConfig[setting] = numValue;
        } else if (['maxspeed', 'minspeed', 'racerounds', 'maxattempts'].includes(setting)) {
            if (numValue < 1 || numValue > 100) {
                return message.reply('❌ Giá trị phải từ 1-100!');
            }
            gameConfig[setting] = numValue;
        }
        
        // Lưu config
        fs.writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2));
        
        // Reload config
        loadBotConfig();
        GAME_CONFIGS = config.gameConfigs || {};
        PLAYER_OVERRIDES = config.playerOverrides || {};
        
        return message.reply(`✅ Đã cập nhật **${setting}** cho game **${gameName}** thành **${numValue}**!
📌 Cấu hình mới sẽ áp dụng ngay lập tức.`);
    }
    
    // === LỆNH ĐIỀU CHỈNH TỶ LỆ CHO NGƯỜI CHƠI CỤ THỂ ===
    if (subCommand === 'setplayerrate') {
        const targetId = args.shift();
        const gameName = args.shift()?.toLowerCase();
        const setting = args.shift()?.toLowerCase();
        const value = args.shift();
        
        if (!targetId || !gameName || !setting || value === undefined) {
            return message.reply(`⚠️ Cách dùng: !admin setplayerrate [userID] [game] [setting] [value]
        
📌 **Ví dụ:** !admin setplayerrate 123456789 taixiu winrate 80`);
        }
        
        const validGames = ['luckydraw', 'crash', 'blackjack', 'taixiu', 'xocdia', 'slot', 'kbb', 'horse', 'racing', 'baucua', 'guess', 'lottery', 'poker', 'roulette', 'dice', 'coinflip'];
        
        if (!validGames.includes(gameName)) {
            return message.reply(`❌ Game không hợp lệ! Các game: ${validGames.join(', ')}`);
        }
        
        // Đọc config hiện tại
        let config = loadBotConfig() || {};
        if (!config.playerOverrides) config.playerOverrides = {};
        if (!config.playerOverrides[targetId]) config.playerOverrides[targetId] = {};
        if (!config.playerOverrides[targetId][gameName]) config.playerOverrides[targetId][gameName] = {};
        
        const playerConfig = config.playerOverrides[targetId][gameName];
        const validSettings = ['winrate', 'lossrate', 'drawrate', 'maxmultiplier', 'minmultiplier', 'crashprobability', 'jackpotrate', 'jackpotmultiplier', 'threematchmultiplier', 'twomatchmultiplier', 'maxspeed', 'minspeed', 'racerounds', 'matchmultiplier', 'maxattempts', 'bonusmultiplier'];
        
        if (!validSettings.includes(setting)) {
            return message.reply(`❌ Setting không hợp lệ! Các setting: ${validSettings.join(', ')}`);
        }
        
        const numValue = parseFloat(value);
        if (isNaN(numValue)) {
            return message.reply('❌ Giá trị phải là số!');
        }
        
        // Validate giá trị
        if (['winrate', 'lossrate', 'drawrate', 'crashprobability', 'jackpotrate'].includes(setting)) {
            if (numValue < 0 || numValue > 100) {
                return message.reply('❌ Giá trị phải từ 0-100!');
            }
            playerConfig[setting] = numValue;
        } else if (['maxmultiplier', 'minmultiplier', 'jackpotmultiplier', 'threematchmultiplier', 'twomatchmultiplier', 'matchmultiplier', 'bonusmultiplier'].includes(setting)) {
            if (numValue < 1 || numValue > 100) {
                return message.reply('❌ Giá trị phải từ 1-100!');
            }
            playerConfig[setting] = numValue;
        } else if (['maxspeed', 'minspeed', 'racerounds', 'maxattempts'].includes(setting)) {
            if (numValue < 1 || numValue > 100) {
                return message.reply('❌ Giá trị phải từ 1-100!');
            }
            playerConfig[setting] = numValue;
        }
        
        // Lưu config
        fs.writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2));
        
        // Reload config
        loadBotConfig();
        GAME_CONFIGS = config.gameConfigs || {};
        PLAYER_OVERRIDES = config.playerOverrides || {};
        
        return message.reply(`✅ Đã cập nhật **${setting}** cho game **${gameName}** của <@${targetId}> thành **${numValue}**!
📌 Cấu hình riêng này chỉ áp dụng cho người chơi này.`);
    }
    
    // === LỆNH XEM CẤU HÌNH GAME HIỆN TẠI ===
    if (subCommand === 'showgamerates') {
        const config = loadBotConfig() || {};
        
        let serverConfig = '📊 **CẤU HÌNH SERVER:**\n';
        let playerConfig = '📌 **CẤU HÌNH NGƯỜI CHƠI RIÊNG:**\n';
        let globalConfig = '🌍 **GLOBAL WIN RATE:**\n';
        
        // 1. Global Win Rate
        if (config.globalWinRate) {
            globalConfig += `Trạng thái: ${config.globalWinRate.enabled ? '🟢 BẬT' : '🔴 TẮT'}\n`;
            globalConfig += `Win Rate: ${config.globalWinRate.winRate || 50}%\n`;
            globalConfig += `Loss Rate: ${config.globalWinRate.lossRate || 50}%\n`;
            globalConfig += `Draw Rate: ${config.globalWinRate.drawRate || 0}%\n\n`;
        } else {
            globalConfig += '❌ Chưa có cấu hình Global\n\n';
        }
        
        // 2. Server Configs
        if (config.gameConfigs && Object.keys(config.gameConfigs).length > 0) {
            let count = 0;
            for (const [game, settings] of Object.entries(config.gameConfigs)) {
                if (count > 0) serverConfig += '\n';
                serverConfig += `**${game.toUpperCase()}:**\n`;
                const settingsStr = Object.entries(settings)
                    .filter(([key]) => !['multipliers', 'matchMultipliers'].includes(key))
                    .map(([key, value]) => `  - ${key}: ${value}`)
                    .join('\n');
                serverConfig += settingsStr + '\n';
                count++;
            }
        } else {
            serverConfig += '📌 Chưa có cấu hình server nào.\n';
        }
        
        // 3. Player Overrides
        if (config.playerOverrides && Object.keys(config.playerOverrides).length > 0) {
            let count = 0;
            for (const [userId, games] of Object.entries(config.playerOverrides)) {
                if (count > 0) playerConfig += '\n';
                playerConfig += `<@${userId}>:\n`;
                
                if (games.global) {
                    playerConfig += `  **GLOBAL:**\n`;
                    playerConfig += `    - winRate: ${games.global.winRate || 50}\n`;
                    playerConfig += `    - lossRate: ${games.global.lossRate || 50}\n`;
                    playerConfig += `    - drawRate: ${games.global.drawRate || 0}\n`;
                }
                
                for (const [game, settings] of Object.entries(games)) {
                    if (game === 'global') continue;
                    playerConfig += `  **${game.toUpperCase()}:**\n`;
                    const settingsStr = Object.entries(settings)
                        .filter(([key]) => !['multipliers', 'matchMultipliers'].includes(key))
                        .map(([key, value]) => `    - ${key}: ${value}`)
                        .join('\n');
                    playerConfig += settingsStr + '\n';
                }
                count++;
            }
        } else {
            playerConfig += '📌 Chưa có cấu hình riêng cho người chơi nào.\n';
        }
        
        // Gửi các embed
        const embeds = [];
        if (globalConfig.length > 0) {
            embeds.push(createGameEmbed('🌍 GLOBAL WIN RATE', globalConfig, '#ff9900'));
        }
        if (serverConfig.length > 0) {
            embeds.push(createGameEmbed('📊 CẤU HÌNH SERVER', serverConfig, '#0099ff'));
        }
        if (playerConfig.length > 0) {
            embeds.push(createGameEmbed('👤 CẤU HÌNH PLAYER', playerConfig, '#ff66ff'));
        }
        
        for (const embed of embeds) {
            await message.reply({ embeds: [embed] });
        }
        return;
    }
    
    // === LỆNH ADD MONEY ===
    if (subCommand === 'addmoney') {
        const targetId = args.shift();
        const amount = parseInt(args.shift());
        if (!targetId || isNaN(amount)) {
            return message.reply('⚠️ Cach dung: !admin addmoney [userID] [so tien]');
        }
        if (players.has(targetId)) {
            const targetPlayer = players.get(targetId);
            targetPlayer.addMoney(amount);
            savePlayers(players);
            return message.reply(`✅ Da them ${amount.toLocaleString()} VND cho <@${targetId}>.`);
        }
        return message.reply('❌ Khong tim thay nguoi choi!');
    }
    
    // === LỆNH SET MONEY ===
    if (subCommand === 'setmoney') {
        const targetId = args.shift();
        const amount = parseInt(args.shift());
        if (!targetId || isNaN(amount) || amount < 0) {
            return message.reply('⚠️ Cach dung: !admin setmoney [userID] [so tien]');
        }
        if (players.has(targetId)) {
            const targetPlayer = players.get(targetId);
            targetPlayer.money = amount;
            savePlayers(players);
            return message.reply(`✅ Da set ${amount.toLocaleString()} VND cho <@${targetId}>.`);
        }
        return message.reply('❌ Khong tim thay nguoi choi!');
    }
    
    // === LỆNH RESET PLAYER ===
    if (subCommand === 'reset') {
        const targetId = args.shift();
        if (!targetId) {
            return message.reply('⚠️ Cach dung: !admin reset [userID]');
        }
        if (players.has(targetId)) {
            const targetPlayer = players.get(targetId);
            targetPlayer.money = INITIAL_MONEY;
            targetPlayer.totalWins = 0;
            targetPlayer.totalLosses = 0;
            targetPlayer.totalGames = 0;
            targetPlayer.xp = 0;
            targetPlayer.level = 1;
            targetPlayer.achievements = [];
            targetPlayer.comboWins = 0;
            targetPlayer.maxComboWins = 0;
            targetPlayer.consecutiveWins = 0;
            targetPlayer.consecutiveLosses = 0;
            savePlayers(players);
            return message.reply(`✅ Da reset du lieu cho <@${targetId}>.`);
        }
        return message.reply('❌ Khong tim thay nguoi choi!');
    }
    
    // === LỆNH CONFIRM DEPOSIT ===
    if (subCommand === 'confirmdeposit') {
        const transactionId = args.shift();
        
        if (!transactionId) {
            return message.reply('⚠️ Cach dung: !admin confirmdeposit [ma giao dich]\nVi du: !admin confirmdeposit NAP1266ZTXRK21T');
        }
        
        let transactions = loadTransactions();
        
        if (!transactions[transactionId]) {
            return message.reply(`❌ Khong tim thay giao dich voi ma: **${transactionId}**\n💡 Kiem tra lai ma giao dich!`);
        }
        
        const transaction = transactions[transactionId];
        
        if (transaction.status === 'completed') {
            return message.reply(`✅ Giao dich **${transactionId}** da duoc xac nhan truoc do!\n💰 So tien: ${transaction.amount.toLocaleString()} VND`);
        }
        
        if (transaction.status === 'cancelled') {
            return message.reply(`❌ Giao dich **${transactionId}** da bi huy!`);
        }
        
        // Cập nhật trạng thái
        transaction.status = 'completed';
        transactions[transactionId] = transaction;
        saveTransactions(transactions);
        
        // Cộng tiền cho user
        const targetId = transaction.userId;
        if (players.has(targetId)) {
            const targetPlayer = players.get(targetId);
            const amount = transaction.amount;
            
            // Cập nhật pendingDeposits
            targetPlayer.pendingDeposits = targetPlayer.pendingDeposits.filter(d => d.transactionId !== transactionId);
            
            // Cập nhật depositHistory
            let found = false;
            for (const deposit of targetPlayer.depositHistory) {
                if (deposit.transactionId === transactionId) {
                    deposit.status = 'completed';
                    found = true;
                    break;
                }
            }
            if (!found) {
                targetPlayer.depositHistory.push({
                    amount: amount,
                    transactionId: transactionId,
                    time: Date.now(),
                    status: 'completed'
                });
            }
            
            // Cộng tiền
            targetPlayer.money += amount;
            targetPlayer.totalDeposited += amount;
            targetPlayer.xp += amount / 10;
            targetPlayer.checkLevelUp();
            savePlayers(players);
            
            // Gửi thông báo riêng cho user
            try {
                const user = await client.users.fetch(targetId);
                if (user) {
                    const userEmbed = new EmbedBuilder()
                        .setColor('#00ff88')
                        .setTitle('💰 NẠP TIỀN THÀNH CÔNG!')
                        .setDescription(`**${user.username}**, giao dịch nạp tiền của bạn đã được xác nhận!`)
                        .addFields(
                            { name: '💰 Số tiền nạp', value: `**${amount.toLocaleString()} VND**`, inline: true },
                            { name: '🔑 Mã giao dịch', value: `\`${transactionId}\``, inline: true },
                            { name: '💵 Số dư hiện tại', value: `**${targetPlayer.money.toLocaleString()} VND**`, inline: true },
                            { name: '📌 Trạng thái', value: '✅ **Đã xác nhận**', inline: true },
                            { name: '⏰ Thời gian', value: `<t:${Math.floor(Date.now() / 1000)}:F>`, inline: false },
                            { name: '📝 Ghi chú', value: 'Số tiền đã được cộng vào tài khoản game của bạn. Chúc bạn may mắn! 🎉', inline: false }
                        )
                        .setTimestamp()
                        .setFooter({ text: '🎮 Bot Game | Cảm ơn bạn đã sử dụng dịch vụ!' });
                    
                    await user.send({ embeds: [userEmbed] });
                    console.log(`✅ Da gui thong bao rieng cho user ${targetId}`);
                }
            } catch (error) {
                console.log(`⚠️ Khong the gui DM cho user ${targetId}: ${error.message}`);
            }
            
            const embed = createGameEmbed(
                '✅ XAC NHAN NAP TIEN',
                `Da xac nhan nap tien cho <@${targetId}>`,
                '#00ff00',
                [
                    { name: '💰 So tien', value: `${amount.toLocaleString()} VND`, inline: true },
                    { name: '🔑 Ma giao dich', value: transactionId, inline: true },
                    { name: '💵 So du hien tai', value: `${targetPlayer.money.toLocaleString()} VND`, inline: true },
                    { name: '📌 Trang thai', value: '✅ Da xac nhan', inline: true },
                    { name: '📨 Thong bao', value: 'Da gui thong bao rieng den user!', inline: false }
                ]
            );
            
            return message.reply({ embeds: [embed] });
        } else {
            return message.reply(`❌ Khong tim thay nguoi choi voi ID: ${targetId}`);
        }
    }
    
    // === LỆNH XEM DANH SÁCH GIAO DỊCH ĐANG CHỜ ===
    if (subCommand === 'pendingdeposits') {
        const transactions = loadTransactions();
        const pendingList = Object.values(transactions).filter(t => t.status === 'pending');
        
        if (pendingList.length === 0) {
            return message.reply('📭 Khong co giao dich nao dang cho xac nhan!');
        }
        
        let listText = '📋 **DANH SACH GIAO DICH DANG CHO:**\n\n';
        pendingList.forEach((item, index) => {
            listText += `${index + 1}. <@${item.userId}>\n`;
            listText += `   💰 ${item.amount.toLocaleString()} VND\n`;
            listText += `   🔑 \`${item.transactionId}\`\n`;
            listText += `   ⏰ <t:${Math.floor(item.time / 1000)}:F>\n\n`;
        });
        
        listText += '\n📌 **Huong dan xac nhan:**\n';
        listText += '`!admin confirmdeposit [ma_giao_dich]`\n';
        listText += 'Vi du: `!admin confirmdeposit NAP1266ZTXRK21T`';
        
        return message.reply(listText);
    }
    
    // === LỆNH SET MAX BET ===
    if (subCommand === 'setmaxbet') {
        const newMaxBet = parseInt(args.shift());
        if (isNaN(newMaxBet) || newMaxBet < MIN_BET) {
            return message.reply(`⚠️ Vui long nhap so tien hop le! (toi thieu: ${MIN_BET})`);
        }
        MAX_BET = newMaxBet;
        const config = loadBotConfig();
        if (config) {
            config.maxBet = newMaxBet;
            fs.writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2));
        }
        return message.reply(`✅ Da cap nhat MAX_BET thanh ${newMaxBet.toLocaleString()} VND!`);
    }
    
    // === LỆNH SET MIN BET ===
    if (subCommand === 'setminbet') {
        const newMinBet = parseInt(args.shift());
        if (isNaN(newMinBet) || newMinBet < 1 || newMinBet >= MAX_BET) {
            return message.reply(`⚠️ Vui long nhap so tien hop le! (nho hon MAX_BET: ${MAX_BET})`);
        }
        MIN_BET = newMinBet;
        const config = loadBotConfig();
        if (config) {
            config.minBet = newMinBet;
            fs.writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2));
        }
        return message.reply(`✅ Da cap nhat MIN_BET thanh ${newMinBet.toLocaleString()} VND!`);
    }
    
    // === LỆNH SET INITIAL MONEY ===
    if (subCommand === 'setinitialmoney') {
        const newInitial = parseInt(args.shift());
        if (isNaN(newInitial) || newInitial < 0) {
            return message.reply('⚠️ Vui long nhap so tien hop le!');
        }
        INITIAL_MONEY = newInitial;
        const config = loadBotConfig();
        if (config) {
            config.initialMoney = newInitial;
            fs.writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2));
        }
        return message.reply(`✅ Da cap nhat INITIAL_MONEY thanh ${newInitial.toLocaleString()} VND!`);
    }
    
    // === LỆNH HỦY GIAO DỊCH ===
    if (subCommand === 'canceldeposit') {
        const transactionId = args.shift();
        
        if (!transactionId) {
            return message.reply('⚠️ Cach dung: !admin canceldeposit [ma giao dich]');
        }
        
        let transactions = loadTransactions();
        
        if (!transactions[transactionId]) {
            return message.reply(`❌ Khong tim thay giao dich voi ma: **${transactionId}**`);
        }
        
        if (transactions[transactionId].status === 'completed') {
            return message.reply(`❌ Giao dich **${transactionId}** da duoc xac nhan, khong the huy!`);
        }
        
        if (transactions[transactionId].status === 'cancelled') {
            return message.reply(`❌ Giao dich **${transactionId}** da bi huy truoc do!`);
        }
        
        // Cập nhật trạng thái
        transactions[transactionId].status = 'cancelled';
        saveTransactions(transactions);
        
        // Cập nhật trong player
        const targetId = transactions[transactionId].userId;
        if (players.has(targetId)) {
            const targetPlayer = players.get(targetId);
            for (const deposit of targetPlayer.pendingDeposits) {
                if (deposit.transactionId === transactionId && deposit.status === 'pending') {
                    deposit.status = 'cancelled';
                    break;
                }
            }
            for (const deposit of targetPlayer.depositHistory) {
                if (deposit.transactionId === transactionId && deposit.status === 'pending') {
                    deposit.status = 'cancelled';
                    break;
                }
            }
            savePlayers(players);
        }
        
        return message.reply(`❌ Da huy giao dich **${transactionId}**!`);
    }
    
    // === LỆNH XEM CẤU HÌNH HIỆN TẠI ===
    if (subCommand === 'showconfig') {
        return message.reply(`
📋 **Cau hinh hien tai:**
💰 MIN_BET: ${MIN_BET.toLocaleString()} VND
💰 MAX_BET: ${MAX_BET.toLocaleString()} VND
💰 INITIAL_MONEY: ${INITIAL_MONEY.toLocaleString()} VND
🏦 Bank: ${BANK_INFO.bankName} - ${BANK_INFO.accountNumber}
        `);
    }
    
    // === LỆNH XEM DANH SÁCH NGƯỜI CHƠI ===
    if (subCommand === 'list') {
        const topPlayers = Array.from(players.values())
            .sort((a, b) => b.money - a.money)
            .slice(0, 10);
        
        let listText = '🏆 Bang xep hang tien:\n';
        topPlayers.forEach((p, index) => {
            listText += `${index + 1}. <@${p.userId}>: ${p.money.toLocaleString()} VND (Level ${p.level} - ${p.totalWins} wins)\n`;
        });
        
        return message.reply(listText);
    }
    
    // === LỆNH XEM BẢNG XẾP HẠNG LEVEL ===
    if (subCommand === 'rank') {
        const topPlayers = Array.from(players.values())
            .sort((a, b) => b.level - a.level || b.totalWins - a.totalWins)
            .slice(0, 10);
        
        let listText = '⭐ Bang xep hang cap do:\n';
        topPlayers.forEach((p, index) => {
            listText += `${index + 1}. <@${p.userId}>: Level ${p.level} (${p.totalWins} wins)\n`;
        });
        
        return message.reply(listText);
    }
    
    // === LỆNH XEM BẢNG XẾP HẠNG COMBO ===
    if (subCommand === 'combo') {
        const topPlayers = Array.from(players.values())
            .sort((a, b) => b.maxComboWins - a.maxComboWins)
            .slice(0, 10);
        
        let listText = '🔥 Bang xep hang combo:\n';
        topPlayers.forEach((p, index) => {
            listText += `${index + 1}. <@${p.userId}>: ${p.maxComboWins} combo (${p.totalWins} wins)\n`;
        });
        
        return message.reply(listText);
    }
    
    // === LỆNH PHÂN TÍCH NGƯỜI CHƠI ===
    if (subCommand === 'analyze') {
        const targetId = args.shift();
        if (!targetId) {
            return message.reply('⚠️ Cach dung: !admin analyze [userID]');
        }
        if (players.has(targetId)) {
            const targetPlayer = players.get(targetId);
            const analysis = targetPlayer.getPlayerAnalysis();
            const embed = createGameEmbed(
                `📊 Phan tich nguoi choi: <@${targetId}>`,
                'Thong tin chi tiet ve nguoi choi',
                '#ff66ff',
                [
                    { name: '🎯 Ty le thang', value: `${analysis.winRate}%`, inline: true },
                    { name: '💰 Cuoc trung binh', value: `${analysis.averageBet.toLocaleString()} VND`, inline: true },
                    { name: '📊 Tong so game', value: `${analysis.totalGames}`, inline: true },
                    { name: '🏆 Game yeu thich', value: analysis.favoriteGame, inline: true },
                    { name: '✅ Game thang nhieu nhat', value: analysis.bestGame, inline: true },
                    { name: '❌ Game thua nhieu nhat', value: analysis.worstGame, inline: true },
                    { name: '🔥 Chuoi thang', value: `${analysis.consecutiveWins}`, inline: true },
                    { name: '💔 Chuoi thua', value: `${analysis.consecutiveLosses}`, inline: true },
                    { name: '⚠️ Muc do rui ro', value: analysis.riskLevel.toUpperCase(), inline: true },
                    { name: '📈 Pattern cuoc', value: analysis.betPattern, inline: true },
                    { name: '💰 Tong nap', value: `${analysis.totalDeposited.toLocaleString()} VND`, inline: true },
                    { name: '📝 Ket qua gan day', value: analysis.recentResults.join('\n') || 'Chua co du lieu', inline: false }
                ]
            );
            return message.reply({ embeds: [embed] });
        }
        return message.reply('❌ Khong tim thay nguoi choi!');
    }
    
    // === LỆNH KIỂM TRA ADMIN CHANNEL ===
    if (subCommand === 'testadmin') {
        if (!ADMIN_CHANNEL_ID) {
            return message.reply('❌ ADMIN_CHANNEL_ID chua duoc cau hinh trong file .env!');
        }
        
        try {
            const adminChannel = await client.channels.fetch(ADMIN_CHANNEL_ID);
            if (adminChannel) {
                await adminChannel.send('🔔 **TEST:** Day la tin nhan test tu bot! Neu ban thay tin nhan nay, admin channel da hoat dong tot!');
                return message.reply('✅ Da gui tin nhan test thanh cong den admin channel!');
            } else {
                return message.reply(`❌ Khong tim thay admin channel voi ID: ${ADMIN_CHANNEL_ID}`);
            }
        } catch (error) {
            return message.reply(`❌ Loi gui tin nhan test: ${error.message}`);
        }
    }
    
    // === LỆNH TEST NOTIFY ===
    if (subCommand === 'testnotify') {
        if (message.author.id !== OWNER_ID) {
            return message.reply('❌ Ban khong co quyen su dung lenh nay!');
        }
        
        try {
            const testEmbed = new EmbedBuilder()
                .setColor('#00ff88')
                .setTitle('💰 NẠP TIỀN THÀNH CÔNG! (TEST)')
                .setDescription(`**${message.author.username}**, đây là tin nhắn test thông báo nạp tiền!`)
                .addFields(
                    { name: '💰 Số tiền nạp', value: `**100,000 VND**`, inline: true },
                    { name: '🔑 Mã giao dịch', value: `\`TEST123456\``, inline: true },
                    { name: '💵 Số dư hiện tại', value: `**1,000,000 VND**`, inline: true },
                    { name: '📌 Trạng thái', value: '✅ **Đã xác nhận**', inline: true },
                    { name: '⏰ Thời gian', value: `<t:${Math.floor(Date.now() / 1000)}:F>`, inline: false },
                    { name: '📝 Ghi chú', value: 'Đây là tin nhắn test. Nếu bạn thấy tin nhắn này, hệ thống thông báo hoạt động tốt! 🎉', inline: false }
                )
                .setTimestamp()
                .setFooter({ text: '🎮 Bot Game | Test Notification System' });
            
            await message.author.send({ embeds: [testEmbed] });
            return message.reply('✅ Da gui tin nhan test thanh cong! Vui long kiem tra DM.');
        } catch (error) {
            return message.reply(`❌ Loi gui tin nhan test: ${error.message}\n💡 Vui long kiem tra ban da mo DM cho bot chua?`);
        }
    }
    
    // === HELP ADMIN ===
    return message.reply(`⚠️ Cac lenh admin: 
📌 **Quản lý tỷ lệ:**
  • setgamerate - Cập nhật tỷ lệ game server
  • setplayerrate - Cập nhật tỷ lệ cho user
  • showgamerates - Xem cấu hình tỷ lệ hiện tại
  • setglobalrate [win%] [loss%] - Bật Global Win Rate
  • disableglobalrate - Tắt Global Win Rate
  • showglobalrate - Xem trạng thái Global Win Rate
  • setplayerglobal [userID] [win%] [loss%] - Set Global Rate cho user

📌 **Quản lý tiền:**
  • addmoney - Cộng tiền user
  • setmoney - Set tiền user
  • reset - Reset dữ liệu user

📌 **Quản lý giao dịch:**
  • confirmdeposit - Xác nhận nạp tiền
  • canceldeposit - Hủy giao dịch
  • pendingdeposits - Xem giao dịch đang chờ

📌 **Cấu hình:**
  • setmaxbet - Set cược tối đa
  • setminbet - Set cược tối thiểu
  • setinitialmoney - Set tiền khởi tạo
  • showconfig - Xem cấu hình hiện tại

📌 **Thông tin:**
  • list - Top người chơi
  • rank - Top level
  • combo - Top combo
  • analyze - Phân tích người chơi
  • testadmin - Kiểm tra admin channel
  • testnotify - Test thông báo nạp tiền`);
    
} // Kết thúc if (command === 'admin')

// === LỆNH NẠP TIỀN (VietQR) ===
if (command === 'nap' || command === 'deposit') {
    const amount = parseInt(args[0]);
    
    if (isNaN(amount) || amount < 10000) {
        return message.reply('⚠️ So tien nap toi thieu la 10.000 VND!');
    }

    if (amount > 100000000) {
        return message.reply('⚠️ So tien nap toi da la 100.000.000 VND!');
    }

    const transactionId = generateTransactionId(userId);
    const transferContent = generateTransferContent(message.author.username, amount);
    
    // === LẤY NGÂN HÀNG ===
    let bankInfo = getDefaultBank();
    let bankName = bankInfo.bankName || BANK_INFO.bankName;
    let bankCode = bankInfo.bankCode || BANK_INFO.bankCode;
    let accountNumber = bankInfo.accountNumber || BANK_INFO.accountNumber;
    let accountName = bankInfo.accountName || BANK_INFO.accountName;
    
    console.log(`🏦 Sử dụng ngân hàng: ${bankName} - ${accountNumber}`);
    
    // === TẠO QR CODE ===
    let vietQRDataUrl = await generateVietQR(
        bankCode,
        accountNumber,
        accountName,
        amount,
        transferContent
    );
    
    if (!vietQRDataUrl) {
        console.log('⚠️ Tạo QR fallback...');
        const fallbackText = `NGAN HANG: ${bankName}\nSO TK: ${accountNumber}\nCHU TK: ${accountName}\nSO TIEN: ${amount.toLocaleString()} VND\nNOI DUNG: ${transferContent}`;
        vietQRDataUrl = await QRCode.toDataURL(fallbackText, {
            width: 400,
            margin: 2,
            color: {
                dark: '#000000',
                light: '#ffffff'
            }
        });
    }
    
    if (!vietQRDataUrl) {
        return message.reply('❌ Loi tao QR Code, vui long thu lai sau!');
    }

    // === LƯU VÀO TRANSACTIONS.JSON ===
    let transactions = loadTransactions();
    transactions[transactionId] = {
        userId: userId,
        username: message.author.username,
        amount: amount,
        transactionId: transactionId,
        transferContent: transferContent,
        time: Date.now(),
        status: 'pending',
        bankInfo: {
            bankName: bankName,
            bankCode: bankCode,
            accountNumber: accountNumber,
            accountName: accountName
        }
    };
    saveTransactions(transactions);

    // === LƯU VÀO PLAYER ===
    player.pendingDeposits.push({
        amount: amount,
        transactionId: transactionId,
        time: Date.now(),
        status: 'pending'
    });
    
    player.depositHistory.push({
        amount: amount,
        transactionId: transactionId,
        time: Date.now(),
        status: 'pending'
    });
    savePlayers(players);

    // === TẠO EMBED ===
    const embed = new EmbedBuilder()
        .setColor('#00ff88')
        .setTitle('💰 HUONG DAN NAP TIEN - VIETQR')
        .setDescription(`**${message.author.username}**, quet ma QR ben duoi de chuyen khoan:`)
        .addFields(
            { name: '🏦 Ngan hang', value: bankName, inline: true },
            { name: '💳 So tai khoan', value: accountNumber, inline: true },
            { name: '👤 Chu tai khoan', value: accountName, inline: true },
            { name: '💰 So tien', value: `${amount.toLocaleString()} VND`, inline: true },
            { name: '📝 Noi dung chuyen khoan', value: `\`${transferContent}\``, inline: false },
            { name: '🔑 Ma giao dich', value: `\`${transactionId}\``, inline: false },
            { name: '⏰ Thoi gian', value: `Cho xac nhan trong vong 30 phut`, inline: false },
            { name: '📌 Trang thai', value: `⏳ Dang cho xac nhan`, inline: false }
        )
        .setImage('attachment://vietqr.png')
        .setTimestamp()
        .setFooter({ text: '💡 Quet ma QR bang app ngan hang de chuyen tien nhanh chong!' });

    // === XỬ LÝ ẢNH QR ===
    let imageBuffer;
    if (vietQRDataUrl.startsWith('data:image/png;base64,')) {
        imageBuffer = Buffer.from(vietQRDataUrl.split(',')[1], 'base64');
    } else if (vietQRDataUrl.startsWith('data:image/png;base64')) {
        imageBuffer = Buffer.from(vietQRDataUrl.split(';base64,')[1], 'base64');
    } else {
        try {
            const response = await fetch(vietQRDataUrl);
            const arrayBuffer = await response.arrayBuffer();
            imageBuffer = Buffer.from(arrayBuffer);
        } catch (error) {
            console.error('❌ Lỗi tải ảnh QR:', error);
            return message.reply('❌ Loi tai anh QR Code!');
        }
    }

    // === GỬI TIN NHẮN ===
    await message.reply({
        embeds: [embed],
        files: [{ attachment: imageBuffer, name: 'vietqr.png' }]
    });

    // === GỬI THÔNG BÁO ADMIN ===
    const adminEmbed = createGameEmbed(
        '🔔 YEU CAU NAP TIEN',
        `Nguoi choi <@${userId}> yeu cau nap tien`,
        '#ff9900',
        [
            { name: '👤 Nguoi choi', value: `${message.author.username} (${userId})`, inline: true },
            { name: '💰 So tien', value: `${amount.toLocaleString()} VND`, inline: true },
            { name: '🏦 Ngan hang', value: bankName, inline: true },
            { name: '📝 Noi dung', value: `\`${transferContent}\``, inline: false },
            { name: '🔑 Ma giao dich', value: `\`${transactionId}\``, inline: false },
            { name: '📌 Trang thai', value: `⏳ Dang cho xac nhan`, inline: false }
        ]
    );
    
    if (ADMIN_CHANNEL_ID) {
        try {
            const adminChannel = await client.channels.fetch(ADMIN_CHANNEL_ID);
            if (adminChannel) {
                await adminChannel.send({ embeds: [adminEmbed] });
            }
        } catch (error) {
            console.log('⚠️ Khong gui duoc thong bao cho admin channel');
        }
    }

    return;
}

// === LỆNH KIỂM TRA TRẠNG THÁI GIAO DỊCH ===
if (command === 'kiemtra') {
    const transactionId = args[0];
    
    if (!transactionId) {
        return message.reply('⚠️ Vui long nhap ma giao dich can kiem tra!\nVi du: !kiemtra NAP1266EIW0TX1V');
    }
    
    // Đọc từ transactions.json
    const transactions = loadTransactions();
    
    if (!transactions[transactionId]) {
        return message.reply(`❌ Khong tim thay giao dich voi ma: **${transactionId}**\n\n💡 Vui long kiem tra lai ma giao dich!`);
    }
    
    const transaction = transactions[transactionId];
    
    // Kiểm tra quyền: chỉ user tạo hoặc admin mới xem được
    if (transaction.userId !== userId && message.author.id !== OWNER_ID) {
        return message.reply('❌ Ban khong co quyen xem giao dich nay!');
    }
    
    const statusMap = {
        'pending': '⏳ Dang cho xac nhan',
        'completed': '✅ Da xac nhan',
        'cancelled': '❌ Da huy'
    };
    
    const statusColors = {
        'pending': '#ff9900',
        'completed': '#00ff00',
        'cancelled': '#ff0000'
    };
    
    const embed = new EmbedBuilder()
        .setColor(statusColors[transaction.status] || '#0099ff')
        .setTitle('🔍 KIEM TRA TRANG THAI GIAO DICH')
        .setDescription(`Thong tin chi tiet ve giao dich cua ban`)
        .addFields(
            { name: '🔑 Ma giao dich', value: `\`${transaction.transactionId}\``, inline: false },
            { name: '💰 So tien', value: `${transaction.amount.toLocaleString()} VND`, inline: true },
            { name: '📌 Trang thai', value: statusMap[transaction.status] || '❓ Khong xac dinh', inline: true },
            { name: '⏰ Thoi gian tao', value: `<t:${Math.floor(transaction.time / 1000)}:F>`, inline: false },
            { name: '👤 Nguoi yeu cau', value: `<@${transaction.userId}>`, inline: true }
        )
        .setTimestamp()
        .setFooter({ text: '💡 Neu giao dich da hoan tat, tien se duoc cong vao tai khoan cua ban!' });
    
    if (transaction.status === 'pending') {
        embed.addFields({
            name: '📝 Huong dan',
            value: 'Giao dich dang cho admin xac nhan. Vui long cho trong giay lat hoac lien he admin de duoc ho tro!',
            inline: false
        });
    }
    
    if (transaction.status === 'completed') {
        embed.addFields({
            name: '🎉 Thong bao',
            value: `Giao dich da duoc xac nhan thanh cong! So du cua ban hien tai: **${player.money.toLocaleString()} VND**`,
            inline: false
        });
    }
    
    return message.reply({ embeds: [embed] });
}

    // === CÁC LỆNH GAME ===
    
// === GAME POKER ===
if (command === 'poker') {
    if (args.length < 1) {
        const embed = createGameEmbed(
            '🃏 POKER',
            '**Hướng dẫn chơi:**\nSo bài với bot trong game Poker!\n\n**🎯 Cách dùng:**\n`!poker [số tiền]`\n\n**📊 Cách chơi:**\n• Mỗi người được chia 5 lá bài\n• So sánh tay bài với bot\n• Bài mạnh hơn sẽ thắng\n• Thắng: x2 tiền cược\n• Hòa: nhận lại tiền\n• Thua: mất tiền cược\n\n**📊 Xếp hạng bài:**\n• Tứ quý > Cù lũ > Sám cô > Hai đôi > Một đôi > Bài rác\n\n**📊 Ví dụ:**\n`!poker 1000`',
            '#ff9900'
        );
        return message.reply({ embeds: [embed] });
    }

    const betAmount = parseInt(args[0]);
    
    // KIỂM TRA CHI TIẾT
    if (isNaN(betAmount) || betAmount <= 0) {
        return message.reply(`⚠️ Số tiền không hợp lệ! Vui lòng nhập số dương.`);
    }
    
    if (betAmount < MIN_BET) {
        return message.reply(`⚠️ Số tiền cược tối thiểu là **${MIN_BET.toLocaleString()} VND**!`);
    }
    
    if (betAmount > MAX_BET) {
        return message.reply(`⚠️ Số tiền cược tối đa là **${MAX_BET.toLocaleString()} VND**!`);
    }
    
    if (betAmount > player.money) {
        return message.reply(`❌ Bạn không đủ tiền để cược!\n💰 Số dư hiện tại: **${player.money.toLocaleString()} VND**\n🎯 Số tiền muốn cược: **${betAmount.toLocaleString()} VND**\n💡 Cần thêm: **${(betAmount - player.money).toLocaleString()} VND**`);
    }

    // Tạo game và chạy
    const game = new Poker(player, betAmount);
    game.play();
    const result = game.getResult();
    const isWin = result.isWin;
    const winAmount = result.winAmount;
    const profit = winAmount - betAmount;
    
    // Cập nhật thống kê
    player.addMoney(profit);
    if (isWin) {
        player.pokerWins++;
    } else if (result.result === 'draw') {
        // Hòa - không tính thắng/thua
    } else {
        player.pokerLosses++;
    }
    if (result.result !== 'draw') {
        player.totalGames++;
    }
    player.totalBets += betAmount;
    player.addGameHistory('Poker', betAmount, isWin);
    player.updateFavoriteGame();
    player.checkAchievements('poker');
    savePlayers(players);

    // Tạo hiệu ứng
    const effect = isWin ? createWinEffect() : (result.result === 'draw' ? '🤝' : createLoseEffect());
    
    // Tạo thanh tiến trình
    const progressBarLength = 20;
    const progress = isWin ? 1 : (result.result === 'draw' ? 0.5 : 0);
    const filledLength = Math.floor(progress * progressBarLength);
    const emptyLength = progressBarLength - filledLength;
    const progressBar = '🟩'.repeat(Math.max(0, filledLength)) + '⬜'.repeat(Math.max(0, emptyLength));
    
    // Tạo embed kết quả
    const fields = [
        { 
            name: '🎴 Bài của bạn', 
            value: `\`${result.playerHand.join(' | ')}\``, 
            inline: false 
        },
        { 
            name: '📊 Bài của bạn', 
            value: game.getHandTypeName(result.playerValue), 
            inline: true 
        },
        { 
            name: '🎴 Bài của bot', 
            value: `\`${result.botHand.join(' | ')}\``, 
            inline: false 
        },
        { 
            name: '📊 Bài của bot', 
            value: game.getHandTypeName(result.botValue), 
            inline: true 
        },
        { 
            name: '🏆 Kết quả', 
            value: result.message, 
            inline: true 
        },
        { 
            name: '📈 Tiến trình', 
            value: `\`${progressBar}\` ${Math.round(progress * 100)}%`, 
            inline: false 
        },
        { 
            name: '💰 Số tiền nhận được', 
            value: `${profit > 0 ? '+' : ''}${profit.toLocaleString()} VND`, 
            inline: true 
        },
        { 
            name: '💵 Số dư hiện tại', 
            value: `${player.money.toLocaleString()} VND`, 
            inline: true 
        }
    ];
    
    // Thêm thông tin debug cho admin
    if (message.author.id === OWNER_ID) {
        const config = game.getPokerConfig();
        fields.push({
            name: '📊 Thông tin debug (Admin)',
            value: `Win Rate: ${config.winRate}% | Loss Rate: ${config.lossRate}% | Draw Rate: ${config.drawRate}%`,
            inline: false
        });
    }
    
    const embed = createGameEmbed(
        `🃏 POKER ${effect}`,
        result.message,
        isWin ? '#00ff00' : (result.result === 'draw' ? '#ff9900' : '#ff0000'),
        fields
    );

    games.delete(message.id);
    return message.reply({ embeds: [embed] });
}

// === GAME ROULETTE ===
if (command === 'roulette' || command === 'rl') {
    if (args.length < 2) {
        const embed = createGameEmbed(
            '🎰 ROULETTE',
            '**Hướng dẫn chơi:**\nDự đoán kết quả của vòng quay Roulette!\n\n**🎯 Cách dùng:**\n`!roulette [số tiền] [red/black/green/số]`\n\n**📊 Cách chơi:**\n• **Đỏ (red):** Thắng x2 nếu ra số đỏ\n• **Đen (black):** Thắng x2 nếu ra số đen\n• **Xanh (green):** Thắng x35 nếu ra số 0\n• **Số cụ thể:** Thắng x36 nếu ra đúng số\n\n**📊 Ví dụ:**\n`!roulette 1000 red`\n`!roulette 500 black`\n`!roulette 100 green`\n`!roulette 200 7`',
            '#ff9900'
        );
        return message.reply({ embeds: [embed] });
    }

    const betAmount = parseInt(args[0]);
    const choice = args.slice(1).join(' ');
    
    // KIỂM TRA CHI TIẾT
    if (isNaN(betAmount) || betAmount <= 0) {
        return message.reply(`⚠️ Số tiền không hợp lệ! Vui lòng nhập số dương.`);
    }
    
    if (betAmount < MIN_BET) {
        return message.reply(`⚠️ Số tiền cược tối thiểu là **${MIN_BET.toLocaleString()} VND**!`);
    }
    
    if (betAmount > MAX_BET) {
        return message.reply(`⚠️ Số tiền cược tối đa là **${MAX_BET.toLocaleString()} VND**!`);
    }
    
    if (betAmount > player.money) {
        return message.reply(`❌ Bạn không đủ tiền để cược!\n💰 Số dư hiện tại: **${player.money.toLocaleString()} VND**\n🎯 Số tiền muốn cược: **${betAmount.toLocaleString()} VND**\n💡 Cần thêm: **${(betAmount - player.money).toLocaleString()} VND**`);
    }

    // Kiểm tra choice hợp lệ
    const validChoices = ['red', 'black', 'green'];
    const isNumber = !isNaN(choice) && parseInt(choice) >= 0 && parseInt(choice) <= 36;
    
    if (!validChoices.includes(choice.toLowerCase()) && !isNumber) {
        return message.reply(`⚠️ Vui lòng chọn "red", "black", "green" hoặc một số từ 0-36!`);
    }

    const finalChoice = isNumber ? parseInt(choice) : choice.toLowerCase();

    // Tạo game và chạy
    const game = new Roulette(player, betAmount, finalChoice);
    game.spin();
    const result = game.getResult();
    const isWin = result.isWin;
    const profit = result.profit || (result.winAmount - betAmount);
    const multiplier = result.multiplier || 1;
    
    // Cập nhật thống kê
    player.addMoney(profit);
    if (isWin) {
        player.rouletteWins++;
    } else {
        player.rouletteLosses++;
    }
    player.totalBets += betAmount;
    player.addGameHistory('Roulette', betAmount, isWin);
    player.updateFavoriteGame();
    player.checkAchievements('roulette');
    savePlayers(players);

    // Tạo hiệu ứng
    const effect = isWin ? createWinEffect() : createLoseEffect();
    
    // Emoji cho màu sắc
    const colorEmojis = {
        'red': '🔴',
        'black': '⚫',
        'green': '🟢'
    };
    
    const colorEmoji = colorEmojis[result.color] || '🎯';
    const choiceDisplay = typeof finalChoice === 'number' ? `Số ${finalChoice}` : finalChoice.toUpperCase();
    
    // Tạo thanh tiến trình
    const progressBarLength = 20;
    const progress = isWin ? 1 : 0;
    const filledLength = Math.floor(progress * progressBarLength);
    const emptyLength = progressBarLength - filledLength;
    const progressBar = '🟩'.repeat(Math.max(0, filledLength)) + '⬜'.repeat(Math.max(0, emptyLength));
    
    // Tạo embed kết quả
    const fields = [
        { 
            name: '🎯 Kết quả', 
            value: `${colorEmoji} **${result.number}** (${result.color.toUpperCase()})`, 
            inline: false 
        },
        { 
            name: '🎯 Bạn chọn', 
            value: choiceDisplay, 
            inline: true 
        },
        { 
            name: '📊 Hệ số nhân', 
            value: `${multiplier}x`, 
            inline: true 
        },
        { 
            name: '📈 Tiến trình', 
            value: `\`${progressBar}\` ${Math.round(progress * 100)}%`, 
            inline: false 
        },
        { 
            name: '💰 Số tiền nhận được', 
            value: `${profit > 0 ? '+' : ''}${profit.toLocaleString()} VND`, 
            inline: true 
        },
        { 
            name: '💵 Số dư hiện tại', 
            value: `${player.money.toLocaleString()} VND`, 
            inline: true 
        }
    ];
    
    // Thêm thông tin debug cho admin
    if (message.author.id === OWNER_ID) {
        const config = game.getRouletteConfig();
        fields.push({
            name: '📊 Thông tin debug (Admin)',
            value: `Win Rate: ${config.winRate}% | Loss Rate: ${config.lossRate}% | Red: ${config.redRate}% | Black: ${config.blackRate}% | Green: ${config.greenRate}%`,
            inline: false
        });
    }
    
    const embed = createGameEmbed(
        `🎰 ROULETTE ${effect}`,
        result.message,
        isWin ? '#00ff00' : '#ff0000',
        fields
    );

    games.delete(message.id);
    return message.reply({ embeds: [embed] });
}

// === GAME CRASH ===
if (command === 'crash') {
    if (args.length < 1) {
        const embed = createGameEmbed(
            '📈 CRASH - GAME CHỜ THỜI ĐIỂM RÚT',
            '**Hướng dẫn chơi:**\nĐặt cược và chờ multiplier tăng lên!\nRút trước khi crash để nhân đôi tiền thưởng.\n\n**🎯 Cách dùng:**\n`!crash [số tiền]`\n\n**📊 Cách chơi:**\n• Multiplier tăng dần từ 1.00x\n• Rút càng muộn, thưởng càng cao\n• Nếu crash trước khi rút, mất tiền cược\n• Rút đúng lúc crash: thưởng cực cao!\n\n**📊 Ví dụ:**\n`!crash 1000`',
            '#ff6600'
        );
        return message.reply({ embeds: [embed] });
    }

    const betAmount = parseInt(args[0]);
    
    // KIỂM TRA CHI TIẾT
    if (isNaN(betAmount) || betAmount <= 0) {
        return message.reply(`⚠️ Vui lòng nhập số tiền hợp lệ! (Số dương)`);
    }
    
    if (betAmount < MIN_BET) {
        return message.reply(`⚠️ Số tiền cược tối thiểu là **${MIN_BET.toLocaleString()} VND**!`);
    }
    
    if (betAmount > MAX_BET) {
        return message.reply(`⚠️ Số tiền cược tối đa là **${MAX_BET.toLocaleString()} VND**!`);
    }
    
    if (betAmount > player.money) {
        return message.reply(`❌ Bạn không đủ tiền để cược!\n💰 Số dư hiện tại: **${player.money.toLocaleString()} VND**\n🎯 Số tiền muốn cược: **${betAmount.toLocaleString()} VND**\n💡 Cần thêm: **${(betAmount - player.money).toLocaleString()} VND**`);
    }

    // Tạo game và chạy
    const game = new Crash(player, betAmount);
    game.play();
    const result = game.getResult();
    const isWin = result.isWin;
    const winAmount = result.winAmount;
    const profit = result.profit;
    const multiplier = result.multiplier;
    const crashPoint = result.crashPoint;
    
    // Cập nhật thống kê
    player.addMoney(profit);
    if (isWin) {
        player.crashWins++;
    } else {
        player.crashLosses++;
    }
    player.totalBets += betAmount;
    player.addGameHistory('Crash', betAmount, isWin);
    player.updateFavoriteGame();
    player.checkAchievements('crash');
    savePlayers(players);

    // Tạo hiệu ứng
    const effect = isWin ? createWinEffect() : createLoseEffect();
    
    // Tạo thanh tiến trình multiplier
    const progressBarLength = 20;
    const progress = Math.min(multiplier / (crashPoint || 1), 1);
    const filledLength = Math.floor(progress * progressBarLength);
    const emptyLength = progressBarLength - filledLength;
    const progressBar = '🟩'.repeat(Math.max(0, filledLength)) + '⬜'.repeat(Math.max(0, emptyLength));
    
    // Tạo biểu đồ tăng trưởng
    const growthEmojis = [];
    const growthCount = 10;
    for (let i = 0; i < growthCount; i++) {
        const point = (i + 1) / growthCount;
        if (point <= progress) {
            growthEmojis.push('📈');
        } else {
            growthEmojis.push('⬜');
        }
    }
    const growthChart = growthEmojis.join('');
    
    // Xác định mức độ rủi ro
    let riskLevel = '🟢 Thấp';
    let riskColor = '#00ff00';
    if (multiplier > crashPoint * 0.7) {
        riskLevel = '🔴 Cao';
        riskColor = '#ff0000';
    } else if (multiplier > crashPoint * 0.4) {
        riskLevel = '🟡 Trung bình';
        riskColor = '#ff9900';
    }
    
    // Tạo embed kết quả
    const fields = [
        { 
            name: '📊 Multiplier rút', 
            value: `**${multiplier.toFixed(2)}x**`, 
            inline: true 
        },
        { 
            name: '💥 Crash point', 
            value: `**${crashPoint.toFixed(2)}x**`, 
            inline: true 
        },
        { 
            name: '⚠️ Mức độ rủi ro', 
            value: riskLevel, 
            inline: true 
        },
        { 
            name: '📈 Biểu đồ tăng trưởng', 
            value: `\`${growthChart}\``, 
            inline: false 
        },
        { 
            name: '📈 Tiến trình', 
            value: `\`${progressBar}\` ${Math.round(progress * 100)}%`, 
            inline: false 
        },
        { 
            name: '💰 Số tiền nhận được', 
            value: `${profit > 0 ? '+' : ''}${profit.toLocaleString()} VND`, 
            inline: true 
        },
        { 
            name: '💵 Số dư hiện tại', 
            value: `${player.money.toLocaleString()} VND`, 
            inline: true 
        }
    ];
    
    // Thêm thông tin debug cho admin
    if (message.author.id === OWNER_ID) {
        const config = getGameConfig(player.userId, 'crash');
        fields.push({
            name: '📊 Thông tin debug (Admin)',
            value: `Win Rate: ${config.winRate || 45}% | Crash Prob: ${config.crashProbability || 55}% | Max Multi: ${config.maxMultiplier || 10}x | Min Multi: ${config.minMultiplier || 1.1}x`,
            inline: false
        });
    }
    
    const embed = createGameEmbed(
        `📈 CRASH ${effect}`,
        result.message,
        isWin ? '#00ff00' : '#ff0000',
        fields
    );

    games.delete(message.id);
    return message.reply({ embeds: [embed] });
}

// === GAME DICE ===
if (command === 'dice' || command === 'dc') {
    if (args.length < 2) {
        const embed = createGameEmbed(
            '🎲 DICE',
            '**Hướng dẫn chơi:**\nDự đoán kết quả của một viên xúc xắc!\n\n**🎯 Cách dùng:**\n`!dice [số tiền] [1-3/4-6/even/odd/số]`\n\n**📊 Cách chơi:**\n• **1-3:** Đoán số từ 1-3\n• **4-6:** Đoán số từ 4-6\n• **even:** Đoán số chẵn (2, 4, 6)\n• **odd:** Đoán số lẻ (1, 3, 5)\n• **số cụ thể:** Đoán đúng số (1-6)\n\n**📊 Hệ số nhân:**\n• Đoán khoảng (1-3/4-6/even/odd): x2\n• Đoán số cụ thể: x6\n\n**📊 Ví dụ:**\n`!dice 1000 1-3`\n`!dice 500 even`\n`!dice 200 6`',
            '#ff9900'
        );
        return message.reply({ embeds: [embed] });
    }

    const betAmount = parseInt(args[0]);
    const choice = args.slice(1).join(' ');
    
    // KIỂM TRA CHI TIẾT
    if (isNaN(betAmount) || betAmount <= 0) {
        return message.reply(`⚠️ Số tiền không hợp lệ! Vui lòng nhập số dương.`);
    }
    
    if (betAmount < MIN_BET) {
        return message.reply(`⚠️ Số tiền cược tối thiểu là **${MIN_BET.toLocaleString()} VND**!`);
    }
    
    if (betAmount > MAX_BET) {
        return message.reply(`⚠️ Số tiền cược tối đa là **${MAX_BET.toLocaleString()} VND**!`);
    }
    
    if (betAmount > player.money) {
        return message.reply(`❌ Bạn không đủ tiền để cược!\n💰 Số dư hiện tại: **${player.money.toLocaleString()} VND**\n🎯 Số tiền muốn cược: **${betAmount.toLocaleString()} VND**\n💡 Cần thêm: **${(betAmount - player.money).toLocaleString()} VND**`);
    }

    // Kiểm tra choice hợp lệ
    const validChoices = ['1-3', '4-6', 'even', 'odd'];
    const isNumber = !isNaN(choice) && parseInt(choice) >= 1 && parseInt(choice) <= 6;
    
    if (!validChoices.includes(choice.toLowerCase()) && !isNumber) {
        return message.reply(`⚠️ Vui lòng chọn "1-3", "4-6", "even", "odd" hoặc một số từ 1-6!`);
    }

    const finalChoice = isNumber ? parseInt(choice) : choice.toLowerCase();

    // Tạo game và chạy
    const game = new Dice(player, betAmount, finalChoice);
    game.roll();
    const result = game.getResult();
    const isWin = result.isWin;
    const profit = result.profit || (result.winAmount - betAmount);
    const multiplier = result.multiplier || 1;
    const diceResult = result.result;
    
    // Cập nhật thống kê
    player.addMoney(profit);
    if (isWin) {
        player.diceWins++;
    } else {
        player.diceLosses++;
    }
    player.totalBets += betAmount;
    player.addGameHistory('Dice', betAmount, isWin);
    player.updateFavoriteGame();
    player.checkAchievements('dice');
    savePlayers(players);

    // Tạo hiệu ứng
    const effect = isWin ? createWinEffect() : createLoseEffect();
    
    // Emoji cho xúc xắc
    const diceEmojis = ['⚀', '⚁', '⚂', '⚃', '⚄', '⚅'];
    const diceEmoji = diceEmojis[diceResult - 1] || '🎲';
    
    // Xác định loại cược
    let betType = '';
    if (typeof finalChoice === 'number') {
        betType = `Số ${finalChoice}`;
    } else {
        betType = finalChoice.toUpperCase();
    }
    
    // Tạo thanh tiến trình
    const progressBarLength = 20;
    const progress = isWin ? 1 : 0;
    const filledLength = Math.floor(progress * progressBarLength);
    const emptyLength = progressBarLength - filledLength;
    const progressBar = '🟩'.repeat(Math.max(0, filledLength)) + '⬜'.repeat(Math.max(0, emptyLength));
    
    // Tạo embed kết quả
    const fields = [
        { 
            name: '🎲 Kết quả', 
            value: `${diceEmoji} **${diceResult}**`, 
            inline: false 
        },
        { 
            name: '🎯 Bạn chọn', 
            value: betType, 
            inline: true 
        },
        { 
            name: '📊 Hệ số nhân', 
            value: `${multiplier}x`, 
            inline: true 
        },
        { 
            name: '📈 Tiến trình', 
            value: `\`${progressBar}\` ${Math.round(progress * 100)}%`, 
            inline: false 
        },
        { 
            name: '💰 Số tiền nhận được', 
            value: `${profit > 0 ? '+' : ''}${profit.toLocaleString()} VND`, 
            inline: true 
        },
        { 
            name: '💵 Số dư hiện tại', 
            value: `${player.money.toLocaleString()} VND`, 
            inline: true 
        }
    ];
    
    // Thêm thông tin debug cho admin
    if (message.author.id === OWNER_ID) {
        const config = game.getDiceConfig();
        fields.push({
            name: '📊 Thông tin debug (Admin)',
            value: `Win Rate: ${config.winRate}% | Loss Rate: ${config.lossRate}% | Range Multi: ${config.rangeMultiplier}x | Exact Multi: ${config.exactMultiplier}x`,
            inline: false
        });
    }
    
    const embed = createGameEmbed(
        `🎲 DICE ${effect}`,
        result.message,
        isWin ? '#00ff00' : '#ff0000',
        fields
    );

    games.delete(message.id);
    return message.reply({ embeds: [embed] });
}

// === GAME COINFLIP ===
if (command === 'coinflip' || command === 'cf') {
    if (args.length < 2) {
        const embed = createGameEmbed(
            '🪙 COINFLIP',
            '**Hướng dẫn chơi:**\nDự đoán mặt của đồng xu!\n\n**🎯 Cách dùng:**\n`!coinflip [số tiền] [heads/tails]`\n\n**📊 Cách chơi:**\n• **heads:** Chọn mặt ngửa\n• **tails:** Chọn mặt sấp\n• Thắng: x2 tiền cược\n• Thua: mất tiền cược\n\n**📊 Ví dụ:**\n`!coinflip 1000 heads`\n`!coinflip 500 tails`',
            '#ff9900'
        );
        return message.reply({ embeds: [embed] });
    }

    const betAmount = parseInt(args[0]);
    const choice = args[1].toLowerCase();
    
    // KIỂM TRA CHI TIẾT
    if (isNaN(betAmount) || betAmount <= 0) {
        return message.reply(`⚠️ Số tiền không hợp lệ! Vui lòng nhập số dương.`);
    }
    
    if (betAmount < MIN_BET) {
        return message.reply(`⚠️ Số tiền cược tối thiểu là **${MIN_BET.toLocaleString()} VND**!`);
    }
    
    if (betAmount > MAX_BET) {
        return message.reply(`⚠️ Số tiền cược tối đa là **${MAX_BET.toLocaleString()} VND**!`);
    }
    
    if (betAmount > player.money) {
        return message.reply(`❌ Bạn không đủ tiền để cược!\n💰 Số dư hiện tại: **${player.money.toLocaleString()} VND**\n🎯 Số tiền muốn cược: **${betAmount.toLocaleString()} VND**\n💡 Cần thêm: **${(betAmount - player.money).toLocaleString()} VND**`);
    }

    if (!['heads', 'tails'].includes(choice)) {
        return message.reply('⚠️ Vui lòng chọn "heads" hoặc "tails"');
    }

    // Tạo game và chạy
    const game = new CoinFlip(player, betAmount, choice);
    game.flip();
    const result = game.getResult();
    const isWin = result.isWin;
    const profit = result.profit || (result.winAmount - betAmount);
    
    // Cập nhật thống kê
    player.addMoney(profit);
    if (isWin) {
        player.coinflipWins++;
    } else {
        player.coinflipLosses++;
    }
    player.totalBets += betAmount;
    player.addGameHistory('Coinflip', betAmount, isWin);
    player.updateFavoriteGame();
    player.checkAchievements('coinflip');
    savePlayers(players);

    // Tạo hiệu ứng
    const effect = isWin ? createWinEffect() : createLoseEffect();
    
    // Tạo hiệu ứng tung đồng xu
    const flipFrames = ['🪙', '🔄', '🪙', '🔄', '🪙', '🔄', '🪙'];
    const finalEmoji = isWin ? '🎉' : '💔';
    const resultEmoji = result.result === 'heads' ? '🪙' : '🪙';
    const resultText = result.resultDisplay || (result.result === 'heads' ? 'Mặt Ngửa' : 'Mặt Sấp');
    
    // Tạo thanh tiến trình
    const progressBarLength = 20;
    const progress = isWin ? 1 : 0;
    const filledLength = Math.floor(progress * progressBarLength);
    const emptyLength = progressBarLength - filledLength;
    const progressBar = '🟩'.repeat(Math.max(0, filledLength)) + '⬜'.repeat(Math.max(0, emptyLength));
    
    // Tạo embed kết quả
    const fields = [
        { 
            name: '🪙 Kết quả', 
            value: `${resultEmoji} **${resultText}**`, 
            inline: false 
        },
        { 
            name: '🎯 Bạn chọn', 
            value: result.choiceDisplay || choice.toUpperCase(), 
            inline: true 
        },
        { 
            name: '📊 Hệ số nhân', 
            value: `2x`, 
            inline: true 
        },
        { 
            name: '📈 Tiến trình', 
            value: `\`${progressBar}\` ${Math.round(progress * 100)}%`, 
            inline: false 
        },
        { 
            name: '💰 Số tiền nhận được', 
            value: `${profit > 0 ? '+' : ''}${profit.toLocaleString()} VND`, 
            inline: true 
        },
        { 
            name: '💵 Số dư hiện tại', 
            value: `${player.money.toLocaleString()} VND`, 
            inline: true 
        }
    ];
    
    // Thêm thông tin debug cho admin
    if (message.author.id === OWNER_ID) {
        const config = game.getCoinFlipConfig();
        fields.push({
            name: '📊 Thông tin debug (Admin)',
            value: `Win Rate: ${config.winRate}% | Loss Rate: ${config.lossRate}%`,
            inline: false
        });
    }
    
    const embed = createGameEmbed(
        `🪙 COINFLIP ${effect}`,
        result.message,
        isWin ? '#00ff00' : '#ff0000',
        fields
    );

    games.delete(message.id);
    return message.reply({ embeds: [embed] });
}

    // === LỆNH XEM LỊCH SỬ NẠP TIỀN ===
    if (command === 'lichsunap' || command === 'deposithistory') {
        if (player.depositHistory.length === 0) {
            return message.reply('📭 Ban chua co lich su nap tien nao!');
        }

        let historyText = player.depositHistory.slice(-10).map(d => {
            const date = new Date(d.time);
            return `💰 ${d.amount.toLocaleString()} VND - ${date.toLocaleString()} - ${d.status}`;
        }).join('\n');

        const embed = createGameEmbed(
            '📊 LICH SU NAP TIEN',
            `Tong nap: ${player.totalDeposited.toLocaleString()} VND`,
            '#00ff88',
            [
                { name: '📝 Lich su (10 gan nhat)', value: historyText || 'Chua co giao dich', inline: false }
            ]
        );
        
        return message.reply({ embeds: [embed] });
    }

    // === LỆNH XEM PHÂN TÍCH CỦA BẢN THÂN ===
    if (command === 'analysis' || command === 'analytics') {
        const analysis = player.getPlayerAnalysis();
        const embed = createGameEmbed(
            `📊 Phan tich nguoi choi: ${message.author.username}`,
            'Thong tin chi tiet ve ban',
            '#ff66ff',
            [
                { name: '🎯 Ty le thang', value: `${analysis.winRate}%`, inline: true },
                { name: '💰 Cuoc trung binh', value: `${analysis.averageBet.toLocaleString()} VND`, inline: true },
                { name: '📊 Tong so game', value: `${analysis.totalGames}`, inline: true },
                { name: '🏆 Game yeu thich', value: analysis.favoriteGame, inline: true },
                { name: '✅ Game thang nhieu nhat', value: analysis.bestGame, inline: true },
                { name: '❌ Game thua nhieu nhat', value: analysis.worstGame, inline: true },
                { name: '🔥 Chuoi thang', value: `${analysis.consecutiveWins}`, inline: true },
                { name: '💔 Chuoi thua', value: `${analysis.consecutiveLosses}`, inline: true },
                { name: '⚠️ Muc do rui ro', value: analysis.riskLevel.toUpperCase(), inline: true },
                { name: '📈 Pattern cuoc', value: analysis.betPattern, inline: true },
                { name: '📅 Chuoi ngay choi', value: `${analysis.dailyStreak} ngay`, inline: true },
                { name: '🎮 Game choi nhieu nhat', value: analysis.mostPlayedGame, inline: true },
                { name: '💰 Tong kiem duoc', value: `${analysis.totalEarnings.toLocaleString()} VND`, inline: true },
                { name: '💸 Tong tieu', value: `${analysis.totalSpent.toLocaleString()} VND`, inline: true },
                { name: '💰 Tong nap', value: `${analysis.totalDeposited.toLocaleString()} VND`, inline: true },
                { name: '📝 Ket qua gan day', value: analysis.recentResults.join('\n') || 'Chua co du lieu', inline: false }
            ]
        );
        return message.reply({ embeds: [embed] });
    }

    // === LỆNH XEM THÔNG TIN ===
    if (command === 'info') {
        player.updateFavoriteGame();
        const recentGames = player.gameHistory.slice(-5).map(g => 
            `${g.game}: ${g.win ? '✅' : '❌'} ${g.amount.toLocaleString()} VND`
        ).join('\n') || 'Chua co du lieu';

        const achievements = player.achievements.length > 0 ? 
            player.achievements.slice(0, 5).join('\n') : 'Chua co thanh tich';

        const embed = createGameEmbed(
            `📊 Thong tin nguoi choi: ${message.author.username}`,
            `💰 So tien: **${player.money.toLocaleString()}** VND\n⭐ Cap do: **${player.level}** (XP: ${player.xp})\n🔥 Combo: **${player.comboWins}** (Ky luc: ${player.maxComboWins})`,
            '#00ff88',
            [
                { name: '🎯 Tong so game', value: `${player.totalGames}`, inline: true },
                { name: '🏆 So tran thang', value: `${player.totalWins}`, inline: true },
                { name: '💔 So tran thua', value: `${player.totalLosses}`, inline: true },
                { name: '🎮 Game yeu thich', value: player.favoriteGame, inline: true },
                { name: '📊 Ty le thang', value: player.totalGames > 0 ? `${Math.round((player.totalWins / player.totalGames) * 100)}%` : '0%', inline: true },
                { name: '⚠️ Muc do rui ro', value: player.riskLevel.toUpperCase(), inline: true },
                { name: '📅 Chuoi ngay choi', value: `${player.dailyStreak} ngay`, inline: true },
                { name: '🎮 Game choi nhieu nhat', value: player.mostPlayedGame, inline: true },
                { name: '💰 Tong nap', value: `${player.totalDeposited.toLocaleString()} VND`, inline: true },
                { name: '🏅 Thanh tich', value: achievements, inline: false },
                { name: '📝 Lich su gan day', value: recentGames, inline: false }
            ]
        );
        return message.reply({ embeds: [embed] });
    }

    // === LỆNH XEM HƯỚNG DẪN ===
    if (command === 'help' || command === 'h') {
        // Chia thành 2 embed để tránh vượt quá 25 fields
        const helpFields1 = [
            { name: '💰 !money', value: 'Xem so tien hien co', inline: false },
            { name: '💰 !nap [so tien]', value: 'Nap tien bang VietQR - Vi du: !nap 50000', inline: false },
            { name: '📊 !lichsunap', value: 'Xem lich su nap tien', inline: false },
            { name: '🎯 !info', value: 'Xem thong tin chi tiet nguoi choi', inline: false },
            { name: '📊 !analysis', value: 'Xem phan tich nguoi choi', inline: false },
            { name: '📊 !rank', value: 'Xem bang xep hang', inline: false },
            { name: '🔥 !combo', value: 'Xem bang xep hang combo thang', inline: false },
            { name: '🏇 !race [so tien] [mau ngua]', value: 'Dua ngua - Vi du: !race 1000 Den', inline: false },
            { name: '🏎️ !racing [so tien] [mau xe]', value: 'Dua xe - Vi du: !racing 1000 Do', inline: false },
            { name: '♠️ !blackjack [so tien]', value: 'Choi Xi rach - Vi du: !blackjack 500', inline: false },
            { name: '🎲 !taixiu [so tien] [tai/xiu]', value: 'Choi Tai xiu - Vi du: !taixiu 1000 tai', inline: false },
            { name: '🪙 !xocdia [so tien] [chan/le]', value: 'Choi Xoc dia - Vi du: !xocdia 500 chan', inline: false },
            { name: '🦀 !baucua [so tien] [con vat]', value: 'Choi Bau cua - Vi du: !baucua 1000 cua,tom', inline: false },
            { name: '💰 !nap [so tien]', value: 'Nap tien bang VietQR - Se nhan thong bao rieng khi thanh cong!', inline: false },
        ];
        
        const helpFields2 = [
            { name: '🎰 !slot [so tien]', value: 'Choi Mini Slot - Vi du: !slot 500', inline: false },
            { name: '🎁 !luckydraw [so tien]', value: 'Rut tham trung thuong - Vi du: !luckydraw 1000', inline: false },
            { name: '✊ !kbb [so tien] [keo/bua/bao]', value: 'Keo bua bao - Vi du: !kbb 500 keo', inline: false },
            { name: '🔢 !guess [so tien]', value: 'Doan so 1-100 - Vi du: !guess 500', inline: false },
            { name: '🎰 !lottery [so tien]', value: 'Xo so - Vi du: !lottery 1000', inline: false },
            { name: '🃏 !poker [so tien]', value: 'Choi Poker - Vi du: !poker 500', inline: false },
            { name: '🎰 !roulette [so tien] [red/black/green/so]', value: 'Choi Roulette - Vi du: !roulette 500 red', inline: false },
            { name: '📈 !crash [so tien]', value: 'Choi Crash - Vi du: !crash 500', inline: false },
            { name: '🎲 !dice [so tien] [1-3/4-6/even/odd/so]', value: 'Choi Dice - Vi du: !dice 500 even', inline: false },
            { name: '🪙 !coinflip [so tien] [heads/tails]', value: 'Choi Coinflip - Vi du: !coinflip 500 heads', inline: false },
            { name: '🎁 !daily', value: 'Nhan thuong hang ngay', inline: false },
            { name: '🎯 !refer', value: 'Tao ma gioi thieu', inline: false },
            { name: '🎯 !referral [ma]', value: 'Nhap ma gioi thieu de nhan thuong', inline: false },
            { name: '👑 !vip', value: 'Xem thong tin VIP', inline: false },
            { name: '📈 !stats', value: 'Xem thong ke tong quan', inline: false },
            { name: '🏅 !achievements', value: 'Xem danh sach thanh tich da dat duoc', inline: false }
        ];
        
        const embed1 = createGameEmbed(
            '🎮 Huong dan su dung game bot (1/2)',
            'Duoi day la danh sach cac lenh co san:',
            '#ff9900',
            helpFields1
        );
        
        const embed2 = createGameEmbed(
            '🎮 Huong dan su dung game bot (2/2)',
            'Tiep tuc danh sach lenh:',
            '#ff9900',
            helpFields2
        );
        
        // Gửi cả 2 embed trong 1 tin nhắn
        await message.reply({ embeds: [embed1, embed2] });
        return;
    }

    // === LỆNH XEM THÀNH TÍCH ===
    if (command === 'achievements' || command === 'achievement') {
        const achievements = player.achievements.length > 0 ? 
            player.achievements.join('\n') : 'Chua co thanh tich nao! Hay choi nhieu hon de mo khoa thanh tich.';
        
        const embed = createGameEmbed(
            `🏅 Thanh tich cua ${message.author.username}`,
            `Tong so thanh tich: ${player.achievements.length}`,
            '#ffd700',
            [
                { name: '📜 Danh sach thanh tich', value: achievements, inline: false }
            ]
        );
        return message.reply({ embeds: [embed] });
    }

    // === LỆNH TẠO MÃ GIỚI THIỆU ===
    if (command === 'refer') {
        const embed = createGameEmbed(
            '🎯 Ma gioi thieu cua ban',
            `Ma gioi thieu: **${player.referralCode}**\nSo nguoi da gioi thieu: ${player.totalReferred}`,
            '#ff66ff',
            [
                { name: '📝 Huong dan', value: 'Chia se ma nay voi ban be. Khi ho dung ma cua ban, ca hai deu nhan duoc 5000 VND!', inline: false },
                { name: '🎁 Phan thuong', value: 'Moi lan gioi thieu thanh cong: +5000 VND cho ca hai', inline: false }
            ]
        );
        return message.reply({ embeds: [embed] });
    }

    // === LỆNH NHẬP MÃ GIỚI THIỆU ===
    if (command === 'referral') {
        const code = args.shift();
        if (!code) {
            return message.reply('⚠️ Vui long nhap ma gioi thieu! Vi du: !referral ABC123');
        }

        let referrer = null;
        for (const [id, p] of players) {
            if (p.referralCode === code.toUpperCase() && id !== userId) {
                referrer = p;
                break;
            }
        }

        if (!referrer) {
            return message.reply('❌ Ma gioi thieu khong hop le hoac da het han!');
        }

        if (player.totalReferred > 0) {
            return message.reply('❌ Ban da su dung ma gioi thieu roi!');
        }

        const bonus = 5000;
        player.addMoney(bonus);
        referrer.addMoney(bonus);
        referrer.totalReferred++;
        player.friends.push(referrer.userId);
        savePlayers(players);

        const embed = createGameEmbed(
            '🎉 GIOI THIEU THANH CONG',
            `Ban da duoc gioi thieu boi <@${referrer.userId}>!`,
            '#00ff00',
            [
                { name: '💰 Phan thuong cua ban', value: `+${bonus.toLocaleString()} VND`, inline: true },
                { name: '💰 Phan thuong cua nguoi gioi thieu', value: `+${bonus.toLocaleString()} VND`, inline: true }
            ]
        );
        return message.reply({ embeds: [embed] });
    }

    // === LỆNH XEM THỐNG KÊ ===
    if (command === 'stats') {
        const totalPlayers = players.size;
        const totalMoney = Array.from(players.values()).reduce((sum, p) => sum + p.money, 0);
        const totalGames = Array.from(players.values()).reduce((sum, p) => sum + p.totalGames, 0);
        const totalWins = Array.from(players.values()).reduce((sum, p) => sum + p.totalWins, 0);
        const totalDeposited = Array.from(players.values()).reduce((sum, p) => sum + p.totalDeposited, 0);
        
        const embed = createGameEmbed(
            '📊 THONG KE TONG QUAN',
            'Thong tin tong quan ve bot game',
            '#ff9900',
            [
                { name: '👥 So nguoi choi', value: `${totalPlayers}`, inline: true },
                { name: '💰 Tong tien trong he thong', value: `${totalMoney.toLocaleString()} VND`, inline: true },
                { name: '💰 Tong nap vao he thong', value: `${totalDeposited.toLocaleString()} VND`, inline: true },
                { name: '🎮 Tong so game da choi', value: `${totalGames}`, inline: true },
                { name: '🏆 Tong so tran thang', value: `${totalWins}`, inline: true },
                { name: '💔 Ty le thang trung binh', value: totalGames > 0 ? `${Math.round((totalWins / totalGames) * 100)}%` : '0%', inline: true }
            ]
        );
        return message.reply({ embeds: [embed] });
    }

// === LỆNH XEM VIP ===
if (command === 'vip') {
    // Lấy dữ liệu mới nhất từ file
    const allPlayers = loadPlayers();
    const playerData = allPlayers.get(userId) || player;
    
    // Cập nhật số dư trong RAM nếu có sự khác biệt
    if (playerData && playerData.money !== player.money) {
        player.money = playerData.money;
        console.log(`🔄 Đã cập nhật số dư cho ${userId}: ${player.money.toLocaleString()} VND`);
    }
    
    const totalMoney = player.money;
    let vipLevel = 'Khong';
    let vipBenefits = 'Chua co quyen loi VIP';
    let progress = 0;
    let nextLevel = '';
    let color = '#888888';
    
    if (totalMoney >= 1000000) {
        vipLevel = '🌟 Vang';
        vipBenefits = '✅ Giam 20% phi giao dich\n✅ Tang 10% tien thuong game\n✅ Qua tang dac biet hang tuan\n✅ Ho tro uu tien';
        color = '#ffd700';
    } else if (totalMoney >= 500000) {
        vipLevel = '⭐ Bac';
        vipBenefits = '✅ Giam 10% phi giao dich\n✅ Tang 5% tien thuong game';
        progress = ((totalMoney - 500000) / 500000) * 100;
        nextLevel = 'Vang (1.000.000 VND)';
        color = '#c0c0c0';
    } else if (totalMoney >= 100000) {
        vipLevel = '🔰 Dong';
        vipBenefits = '✅ Giam 5% phi giao dich';
        progress = ((totalMoney - 100000) / 400000) * 100;
        nextLevel = 'Bac (500.000 VND)';
        color = '#cd7f32';
    } else {
        progress = (totalMoney / 100000) * 100;
        nextLevel = 'Dong (100.000 VND)';
        color = '#888888';
    }

    const embed = createGameEmbed(
        '👑 THONG TIN VIP',
        `Cap do VIP hien tai: **${vipLevel}**`,
        color,
        [
            { name: '💰 So tien hien co', value: `${totalMoney.toLocaleString()} VND`, inline: true },
            { name: '📊 Tien trinh len cap', value: `${Math.min(progress, 100).toFixed(1)}%`, inline: true },
            { name: '🎯 Cap tiep theo', value: nextLevel || 'Da dat cap cao nhat!', inline: true },
            { name: '🎁 Quyen loi VIP', value: vipBenefits, inline: false }
        ]
    );
    
    return message.reply({ embeds: [embed] });
}

    // === LỆNH XEM SỐ TIỀN ===
    if (command === 'money') {
        return message.reply(`💰 So tien cua ban: **${player.money.toLocaleString()}** VND`);
    }

    // === LỆNH BẢNG XẾP HẠNG ===
    if (command === 'rank') {
        const topPlayers = Array.from(players.values())
            .sort((a, b) => b.money - a.money)
            .slice(0, 10);
        
        let listText = '🏆 Bang xep hang:\n';
        topPlayers.forEach((p, index) => {
            const medal = index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : `${index + 1}.`;
            listText += `${medal} <@${p.userId}>: ${p.money.toLocaleString()} VND (Level ${p.level})\n`;
        });
        
        return message.reply(listText);
    }

    // === LỆNH BẢNG XẾP HẠNG COMBO ===
    if (command === 'combo') {
        const topPlayers = Array.from(players.values())
            .sort((a, b) => b.maxComboWins - a.maxComboWins)
            .slice(0, 10);
        
        let listText = '🔥 Bang xep hang combo:\n';
        topPlayers.forEach((p, index) => {
            const medal = index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : `${index + 1}.`;
            listText += `${medal} <@${p.userId}>: ${p.maxComboWins} combo (${p.totalWins} wins)\n`;
        });
        
        return message.reply(listText);
    }

    // === LỆNH NHẬN TIỀN HÀNG NGÀY ===
    if (command === 'daily') {
        const now = Date.now();
        const lastDaily = player.lastDaily || 0;
        const cooldown = 24 * 60 * 60 * 1000;
        
        if (now - lastDaily < cooldown) {
            const remaining = Math.ceil((cooldown - (now - lastDaily)) / 3600000);
            return message.reply(`⏳ Ban da nhan thuong hom nay. Vui long cho **${remaining}** gio nua!`);
        }
        
        const today = new Date().setHours(0, 0, 0, 0);
        if (player.lastDailyClaim !== today) {
            const yesterday = today - 24 * 60 * 60 * 1000;
            if (player.lastDailyClaim === yesterday) {
                player.dailyStreak++;
            } else {
                player.dailyStreak = 1;
            }
            player.lastDailyClaim = today;
        }
        
        const totalChance = DAILY_REWARDS.reduce((sum, r) => sum + r.chance, 0);
        let random = Math.random() * totalChance;
        let selectedReward = DAILY_REWARDS[0];
        
        for (const reward of DAILY_REWARDS) {
            random -= reward.chance;
            if (random <= 0) {
                selectedReward = reward;
                break;
            }
        }
        
        let bonus = selectedReward.amount;
        if (player.dailyStreak >= 7) {
            bonus += 2000;
        } else if (player.dailyStreak >= 3) {
            bonus += 1000;
        }
        
        player.addMoney(bonus);
        player.lastDaily = now;
        savePlayers(players);
        
        const embed = createGameEmbed(
            '🎁 NHAN THUONG HANG NGAY',
            `Ban da nhan duoc: ${selectedReward.name}`,
            '#00ff88',
            [
                { name: '📅 Chuoi ngay nhan thuong', value: `${player.dailyStreak} ngay`, inline: true },
                { name: '💰 So tien nhan duoc', value: `+${bonus.toLocaleString()} VND`, inline: true },
                { name: '💵 So du hien tai', value: `${player.money.toLocaleString()} VND`, inline: true },
                { name: '🎁 Bonus streak', value: player.dailyStreak >= 7 ? '🔥 +2000 VND' : player.dailyStreak >= 3 ? '✨ +1000 VND' : 'Khong co bonus', inline: false }
            ]
        );
        return message.reply({ embeds: [embed] });
    }

// === GAME ĐUA NGỰA ===
if (command === 'race' || command === 'duangua') {
    if (args.length < 2) {
        const embed = createGameEmbed(
            '🏇 ĐUA NGỰA',
            '**Hướng dẫn chơi:**\nChọn một chú ngựa và đặt cược!\n\n**🎯 Cách dùng:**\n`!race [số tiền] [màu ngựa]`\n\n**🐎 Các màu ngựa:**\n• Den\n• Trang\n• Nau\n• Xam\n• Vang\n\n**📊 Ví dụ:**\n`!race 1000 Den`',
            '#ff9900'
        );
        return message.reply({ embeds: [embed] });
    }

    const betAmount = parseInt(args[0]);
    const horseName = args.slice(1).join(' ');
    
    // KIỂM TRA CHI TIẾT
    if (isNaN(betAmount) || betAmount <= 0) {
        return message.reply(`⚠️ Số tiền không hợp lệ! Vui lòng nhập số dương.`);
    }
    
    if (betAmount < MIN_BET) {
        return message.reply(`⚠️ Số tiền cược tối thiểu là **${MIN_BET.toLocaleString()} VND**!`);
    }
    
    if (betAmount > MAX_BET) {
        return message.reply(`⚠️ Số tiền cược tối đa là **${MAX_BET.toLocaleString()} VND**!`);
    }
    
    if (betAmount > player.money) {
        return message.reply(`❌ Bạn không đủ tiền để cược!\n💰 Số dư hiện tại: **${player.money.toLocaleString()} VND**\n🎯 Số tiền muốn cược: **${betAmount.toLocaleString()} VND**\n💡 Cần thêm: **${(betAmount - player.money).toLocaleString()} VND**`);
    }

    // Tìm màu ngựa
    const horseIndex = HORSE_COLORS.findIndex(h => {
        const colorName = h.split(' ')[1];
        return h.includes(horseName) || horseName.includes(colorName) || colorName.toLowerCase() === horseName.toLowerCase();
    });
    
    if (horseIndex === -1) {
        return message.reply(`⚠️ Màu ngựa không tồn tại!\n🐎 Các màu có sẵn: Den, Trang, Nau, Xam, Vang`);
    }

    // Tạo game đua ngựa
    const race = new HorseRacing(player, betAmount, horseIndex);
    games.set(message.id, race);

    // Bắt đầu cuộc đua
    const raceLog = race.startRace();
    
    // Gửi thông báo bắt đầu (KHÔNG hiển thị tỷ lệ thắng)
    const startEmbed = createGameEmbed(
        '🏇 CUỘC ĐUA NGỰA',
        `🏁 Cuộc đua đã bắt đầu!\n\n💰 Tiền cược: **${betAmount.toLocaleString()} VND**\n🐎 Ngựa chọn: **${race.horses[horseIndex].name}**`,
        '#ff4444'
    );
    
    // Nếu là admin thì hiển thị thêm thông tin tỷ lệ
    if (message.author.id === OWNER_ID) {
        const config = race.getHorseConfig();
        startEmbed.addFields({
            name: '📊 Thông tin debug (Admin)',
            value: `Win Rate: ${config.winRate}% | Loss Rate: ${config.lossRate}% | Max Speed: ${config.maxSpeed} | Race Rounds: ${config.raceRounds}`,
            inline: false
        });
    }
    
    await message.reply({ embeds: [startEmbed] });
    
    // Hiển thị từng vòng đua
    for (let i = 0; i < raceLog.length; i++) {
        setTimeout(async () => {
            try {
                await message.channel.send({ 
                    embeds: [createGameEmbed(
                        `🏇 Vòng ${i + 1}/${raceLog.length}`,
                        raceLog[i],
                        '#ff6644'
                    )] 
                });
            } catch (error) {
                console.error('Lỗi gửi vòng đua:', error);
            }
        }, (i + 1) * 2500);
    }

    // Kết quả cuối cùng
    setTimeout(async () => {
        try {
            const result = race.getResult();
            const win = result.win;
            const winAmount = result.winAmount;
            const multiplier = result.multiplier || 1;
            
            // Cập nhật thống kê người chơi
            player.addMoney(winAmount);
            if (win) {
                player.horseWins++;
            } else {
                player.horseLosses++;
            }
            player.totalBets += betAmount;
            player.addGameHistory('Đua ngựa', betAmount, win);
            player.updateFavoriteGame();
            player.checkAchievements('horse');
            savePlayers(players);
            
            // Tạo hiệu ứng
            const effect = win ? createWinEffect() : createLoseEffect();
            
            // Tạo thanh tiến trình kết quả
            const progressBarLength = 20;
            const winnerPos = Math.min(result.winner.position || 0, race.raceLength);
            const progress = Math.min(winnerPos / race.raceLength, 1);
            const filledLength = Math.floor(progress * progressBarLength);
            const emptyLength = progressBarLength - filledLength;
            const progressBar = '█'.repeat(Math.max(0, filledLength)) + '░'.repeat(Math.max(0, emptyLength));
            
            // Tạo embed kết quả
            const fields = [
                { 
                    name: '🏆 Ngựa thắng cuộc', 
                    value: `${result.winner.name} ${win ? '✅' : '❌'}`, 
                    inline: true 
                },
                { 
                    name: '🐎 Ngựa bạn chọn', 
                    value: `${race.horses[horseIndex].name}`, 
                    inline: true 
                },
                { 
                    name: '📈 Tiến trình', 
                    value: `\`${progressBar}\` ${Math.round(progress * 100)}%`, 
                    inline: false 
                },
                { 
                    name: '💰 Số tiền nhận được', 
                    value: `${winAmount > 0 ? '+' : ''}${winAmount.toLocaleString()} VND`, 
                    inline: true 
                },
                { 
                    name: '📊 Hệ số nhân', 
                    value: `${multiplier.toFixed(1)}x`, 
                    inline: true 
                },
                { 
                    name: '💵 Số dư hiện tại', 
                    value: `${player.money.toLocaleString()} VND`, 
                    inline: true 
                }
            ];
            
            // Thêm thông tin debug cho admin (KHÔNG hiển thị cho người chơi thường)
            if (message.author.id === OWNER_ID) {
                const config = race.getHorseConfig();
                fields.push({
                    name: '📊 Thông tin debug (Admin)',
                    value: `Win Rate: ${config.winRate}% | Loss Rate: ${config.lossRate}% | Max Speed: ${config.maxSpeed} | Race Rounds: ${config.raceRounds}`,
                    inline: false
                });
            }
            
            const resultEmbed = createGameEmbed(
                `🏆 KẾT QUẢ ĐUA NGỰA ${effect}`,
                win ? '🎉 Ngựa của bạn đã chiến thắng!' : '😢 Ngựa của bạn không chiến thắng.',
                win ? '#00ff00' : '#ff0000',
                fields
            );
            
            await message.channel.send({ embeds: [resultEmbed] });
            games.delete(message.id);
            
        } catch (error) {
            console.error('Lỗi xử lý kết quả đua ngựa:', error);
            await message.channel.send('❌ Có lỗi xảy ra khi xử lý kết quả đua!');
            games.delete(message.id);
        }
    }, (raceLog.length + 1) * 2500 + 1000);

    return;
}

// === GAME ĐUA XE ===
if (command === 'racing') {
    if (args.length < 2) {
        const embed = createGameEmbed(
            '🏎️ ĐUA XE',
            '**Hướng dẫn chơi:**\nChọn một chiếc xe và đặt cược!\n\n**🎯 Cách dùng:**\n`!racing [số tiền] [màu xe]`\n\n**🚗 Các màu xe:**\n• Đỏ 🏎️\n• Xanh 🏎️\n• Vàng 🏎️\n• Trắng 🏎️\n• Đen 🏎️\n\n**📊 Ví dụ:**\n`!racing 1000 Đỏ`',
            '#ff9900'
        );
        return message.reply({ embeds: [embed] });
    }

    const betAmount = parseInt(args[0]);
    const carName = args.slice(1).join(' ');
    const cars = ['🏎️ Đỏ', '🏎️ Xanh', '🏎️ Vàng', '🏎️ Trắng', '🏎️ Đen'];
    
    // KIỂM TRA CHI TIẾT
    if (isNaN(betAmount) || betAmount <= 0) {
        return message.reply(`⚠️ Số tiền không hợp lệ! Vui lòng nhập số dương.`);
    }
    
    if (betAmount < MIN_BET) {
        return message.reply(`⚠️ Số tiền cược tối thiểu là **${MIN_BET.toLocaleString()} VND**!`);
    }
    
    if (betAmount > MAX_BET) {
        return message.reply(`⚠️ Số tiền cược tối đa là **${MAX_BET.toLocaleString()} VND**!`);
    }
    
    if (betAmount > player.money) {
        return message.reply(`❌ Bạn không đủ tiền để cược!\n💰 Số dư hiện tại: **${player.money.toLocaleString()} VND**\n🎯 Số tiền muốn cược: **${betAmount.toLocaleString()} VND**\n💡 Cần thêm: **${(betAmount - player.money).toLocaleString()} VND**`);
    }

    // Tìm màu xe
    const carIndex = cars.findIndex(c => {
        const colorName = c.split(' ')[1];
        return c.includes(carName) || carName.includes(colorName) || colorName.toLowerCase() === carName.toLowerCase();
    });
    
    if (carIndex === -1) {
        return message.reply(`⚠️ Màu xe không tồn tại!\n🚗 Các màu có sẵn: Đỏ, Xanh, Vàng, Trắng, Đen`);
    }

    // Tạo game đua xe
    const race = new Racing(player, betAmount, carIndex);
    games.set(message.id, race);

    // Bắt đầu cuộc đua
    const raceLog = race.startRace();
    
    // Gửi thông báo bắt đầu
    const startEmbed = createGameEmbed(
        '🏎️ CUỘC ĐUA XE',
        `🏁 Cuộc đua đã bắt đầu!\n\n💰 Tiền cược: **${betAmount.toLocaleString()} VND**\n🚗 Xe chọn: **${race.cars[carIndex]}**`,
        '#ff4444'
    );
    
    // Nếu là admin thì hiển thị thêm thông tin tỷ lệ
    if (message.author.id === OWNER_ID) {
        const config = race.getRacingConfig();
        startEmbed.addFields({
            name: '📊 Thông tin debug (Admin)',
            value: `Win Rate: ${config.winRate}% | Loss Rate: ${config.lossRate}% | Max Speed: ${config.maxSpeed} | Race Rounds: ${config.raceRounds}`,
            inline: false
        });
    }
    
    await message.reply({ embeds: [startEmbed] });
    
    // Hiển thị từng vòng đua
    for (let i = 0; i < raceLog.length; i++) {
        setTimeout(async () => {
            try {
                await message.channel.send({ 
                    embeds: [createGameEmbed(
                        `🏎️ Vòng ${i + 1}/${raceLog.length}`,
                        raceLog[i],
                        '#ff6644'
                    )] 
                });
            } catch (error) {
                console.error('Lỗi gửi vòng đua:', error);
            }
        }, (i + 1) * 2500);
    }

    // Kết quả cuối cùng
    setTimeout(async () => {
        try {
            const result = race.getResult();
            const win = result.win;
            const winAmount = result.winAmount;
            const multiplier = result.multiplier || 1;
            
            // Cập nhật thống kê người chơi
            player.addMoney(winAmount);
            if (win) {
                player.horseWins++;
            } else {
                player.horseLosses++;
            }
            player.totalBets += betAmount;
            player.addGameHistory('Đua xe', betAmount, win);
            player.updateFavoriteGame();
            player.checkAchievements('racing');
            savePlayers(players);
            
            // Tạo hiệu ứng
            const effect = win ? createWinEffect() : createLoseEffect();
            
            // Tạo thanh tiến trình kết quả
            const progressBarLength = 20;
            const winnerPos = 30; // race.raceLength
            const progress = Math.min(winnerPos / 30, 1);
            const filledLength = Math.floor(progress * progressBarLength);
            const emptyLength = progressBarLength - filledLength;
            const progressBar = '█'.repeat(Math.max(0, filledLength)) + '░'.repeat(Math.max(0, emptyLength));
            
            // Tạo embed kết quả
            const fields = [
                { 
                    name: '🏆 Xe thắng cuộc', 
                    value: `${result.winner} ${win ? '✅' : '❌'}`, 
                    inline: true 
                },
                { 
                    name: '🚗 Xe bạn chọn', 
                    value: `${race.cars[carIndex]}`, 
                    inline: true 
                },
                { 
                    name: '📈 Tiến trình', 
                    value: `\`${progressBar}\` ${Math.round(progress * 100)}%`, 
                    inline: false 
                },
                { 
                    name: '💰 Số tiền nhận được', 
                    value: `${winAmount > 0 ? '+' : ''}${winAmount.toLocaleString()} VND`, 
                    inline: true 
                },
                { 
                    name: '📊 Hệ số nhân', 
                    value: `${multiplier.toFixed(1)}x`, 
                    inline: true 
                },
                { 
                    name: '💵 Số dư hiện tại', 
                    value: `${player.money.toLocaleString()} VND`, 
                    inline: true 
                }
            ];
            
            // Thêm thông tin debug cho admin
            if (message.author.id === OWNER_ID) {
                const config = race.getRacingConfig();
                fields.push({
                    name: '📊 Thông tin debug (Admin)',
                    value: `Win Rate: ${config.winRate}% | Loss Rate: ${config.lossRate}% | Max Speed: ${config.maxSpeed} | Race Rounds: ${config.raceRounds}`,
                    inline: false
                });
            }
            
            const resultEmbed = createGameEmbed(
                `🏆 KẾT QUẢ ĐUA XE ${effect}`,
                win ? '🎉 Xe của bạn đã chiến thắng!' : '😢 Xe của bạn không chiến thắng.',
                win ? '#00ff00' : '#ff0000',
                fields
            );
            
            await message.channel.send({ embeds: [resultEmbed] });
            games.delete(message.id);
            
        } catch (error) {
            console.error('Lỗi xử lý kết quả đua xe:', error);
            await message.channel.send('❌ Có lỗi xảy ra khi xử lý kết quả đua!');
            games.delete(message.id);
        }
    }, (raceLog.length + 1) * 2500 + 1000);

    return;
}

// === GAME XÌ RÁCH (BLACKJACK) - HOÀN CHỈNH (CÓ TỰ ĐỘNG XÓA TIN NHẮN) ===
if (command === 'blackjack' || command === 'xirach' || command === 'bj') {
    if (args.length < 1) {
        const embed = createGameEmbed(
            '♠️ XÌ RÁCH (BLACKJACK)',
            '**Hướng dẫn chơi:**\nĐánh bài với nhà cái!\n\n**🎯 Cách dùng:**\n`!blackjack [số tiền]`\n\n**📊 Cách chơi:**\n• Mỗi người được chia 2 lá bài\n• Rút thêm bài để gần 21 điểm nhất\n• Blackjack (21 điểm) thắng x2.5\n• Thắng thường x2\n• Hòa nhận lại tiền\n• **Người chơi rút bài xong ấn DỪNG thì bot mới rút bài**\n\n**📊 Ví dụ:**\n`!blackjack 1000`',
            '#ff9900'
        );
        return message.reply({ embeds: [embed] });
    }

    const betAmount = parseInt(args[0]);
    
    // KIỂM TRA CHI TIẾT
    if (isNaN(betAmount) || betAmount <= 0) {
        return message.reply(`⚠️ Số tiền không hợp lệ! Vui lòng nhập số dương.`);
    }
    
    if (betAmount < MIN_BET) {
        return message.reply(`⚠️ Số tiền cược tối thiểu là **${MIN_BET.toLocaleString()} VND**!`);
    }
    
    if (betAmount > MAX_BET) {
        return message.reply(`⚠️ Số tiền cược tối đa là **${MAX_BET.toLocaleString()} VND**!`);
    }
    
    if (betAmount > player.money) {
        return message.reply(`❌ Bạn không đủ tiền để cược!\n💰 Số dư hiện tại: **${player.money.toLocaleString()} VND**\n🎯 Số tiền muốn cược: **${betAmount.toLocaleString()} VND**\n💡 Cần thêm: **${(betAmount - player.money).toLocaleString()} VND**`);
    }

    // Tạo game
    const game = new Blackjack(player, betAmount);
    game.startGame();
    games.set(message.id, game);

    const displayHand = (hand, hidden = false) => {
        if (hidden) {
            return `🃏 Ẩn | ${hand.slice(1).map(c => `${c.value}${c.suit}`).join(' ')}`;
        }
        return hand.map(c => `${c.value}${c.suit}`).join(' ');
    };

    const playerValue = game.calculateHandValue(game.playerHand);
    const dealerValue = game.calculateHandValue(game.dealerHand);

    // Nếu game đã kết thúc (Blackjack tự nhiên)
    if (game.isFinished) {
        const result = game.getResult();
        const profit = result.winAmount - betAmount;
        const isWin = profit > 0;
        
        player.addMoney(profit);
        if (isWin) {
            player.blackjackWins++;
        } else if (result.result === 'push') {
            // Hòa
        } else {
            player.blackjackLosses++;
        }
        player.totalBets += betAmount;
        player.addGameHistory('Xì rách', betAmount, isWin);
        player.updateFavoriteGame();
        player.checkAchievements('blackjack');
        savePlayers(players);

        const effect = isWin ? createWinEffect() : (result.result === 'push' ? '🤝' : createLoseEffect());
        
        const fields = [
            { name: '🎴 Bài của bạn', value: displayHand(game.playerHand), inline: false },
            { name: '📊 Điểm của bạn', value: `${playerValue}`, inline: true },
            { name: '🎴 Bài của nhà cái', value: displayHand(game.dealerHand), inline: false },
            { name: '📊 Điểm của nhà cái', value: `${dealerValue}`, inline: true },
            { name: '💰 Số tiền nhận được', value: `${profit > 0 ? '+' : ''}${profit.toLocaleString()} VND`, inline: true },
            { name: '💵 Số dư hiện tại', value: `${player.money.toLocaleString()} VND`, inline: true }
        ];
        
        if (message.author.id === OWNER_ID) {
            const config = game.getBlackjackConfig();
            fields.push({
                name: '📊 Thông tin debug (Admin)',
                value: `Win Rate: ${config.winRate}% | Loss Rate: ${config.lossRate}% | Blackjack: ${config.blackjackRate}% | Push: ${config.pushRate}%`,
                inline: false
            });
        }
        
        const embed = createGameEmbed(
            `♠️ KẾT QUẢ XÌ RÁCH ${effect}`,
            result.message,
            isWin ? '#00ff00' : (result.result === 'push' ? '#ff9900' : '#ff0000'),
            fields
        );
        
        games.delete(message.id);
        return message.reply({ embeds: [embed] });
    }

    // Tạo embed và buttons
    const embed = createGameEmbed(
        '♠️ XÌ RÁCH',
        `Tiền cược: **${betAmount.toLocaleString()} VND**\n\n**📌 Hướng dẫn:** Rút bài để gần 21 điểm, sau đó ấn **DỪNG** để bot rút bài và tính kết quả!`,
        '#0099ff',
        [
            { name: '🎴 Bài của bạn', value: displayHand(game.playerHand), inline: false },
            { name: '📊 Điểm của bạn', value: `${playerValue}`, inline: true },
            { name: '🎴 Bài của nhà cái', value: displayHand(game.dealerHand, true), inline: false },
            { name: '📊 Điểm của nhà cái', value: `?`, inline: true }
        ]
    );

    const row = new ActionRowBuilder()
        .addComponents(
            new ButtonBuilder()
                .setCustomId('hit')
                .setLabel('🃏 Rút bài')
                .setStyle(ButtonStyle.Primary),
            new ButtonBuilder()
                .setCustomId('stand')
                .setLabel('✋ DỪNG')
                .setStyle(ButtonStyle.Success)
        );

    const reply = await message.reply({ embeds: [embed], components: [row] });

    const filter = i => i.user.id === message.author.id;
    const collector = reply.createMessageComponentCollector({ filter, time: 120000 });

    collector.on('collect', async i => {
        const currentGame = games.get(message.id);
        if (!currentGame) {
            await i.update({ 
                content: '❌ Game đã kết thúc hoặc hết thời gian!', 
                embeds: [], 
                components: [] 
            });
            return;
        }

        // Xử lý Rút bài
        if (i.customId === 'hit') {
            currentGame.playerHit();
            
            const newPlayerValue = currentGame.calculateHandValue(currentGame.playerHand);
            
            // Kiểm tra nếu người chơi bị bust (quá 21)
            if (newPlayerValue > 21) {
                // Người chơi bust - tự động xử lý kết quả
                currentGame.isFinished = true;
                currentGame.result = 'bust';
                currentGame.betMultiplier = 0;
                
                const result = currentGame.getResult();
                const profit = result.winAmount - currentGame.betAmount;
                
                player.addMoney(profit);
                player.blackjackLosses++;
                player.totalBets += currentGame.betAmount;
                player.addGameHistory('Xì rách', currentGame.betAmount, false);
                player.updateFavoriteGame();
                savePlayers(players);
                
                const bustFields = [
                    { name: '🎴 Bài của bạn', value: displayHand(currentGame.playerHand), inline: false },
                    { name: '📊 Điểm của bạn', value: `${newPlayerValue}`, inline: true },
                    { name: '🎴 Bài của nhà cái', value: displayHand(currentGame.dealerHand), inline: false },
                    { name: '📊 Điểm của nhà cái', value: `${currentGame.calculateHandValue(currentGame.dealerHand)}`, inline: true },
                    { name: '💰 Số tiền nhận được', value: `-${currentGame.betAmount.toLocaleString()} VND`, inline: true },
                    { name: '💵 Số dư hiện tại', value: `${player.money.toLocaleString()} VND`, inline: true }
                ];
                
                const bustEmbed = createGameEmbed(
                    '💔 BUST! QUÁ 21 ĐIỂM!',
                    'Bạn đã rút quá 21 điểm và thua cược!',
                    '#ff0000',
                    bustFields
                );
                
                await i.update({ embeds: [bustEmbed], components: [] });
                games.delete(message.id);
                collector.stop();
                return;
            }
            
            // Cập nhật embed sau khi rút
            const updateEmbed = createGameEmbed(
                '♠️ XÌ RÁCH',
                `Tiền cược: **${currentGame.betAmount.toLocaleString()} VND**\nBạn đã rút thêm 1 lá bài!`,
                '#0099ff',
                [
                    { name: '🎴 Bài của bạn', value: displayHand(currentGame.playerHand), inline: false },
                    { name: '📊 Điểm của bạn', value: `${newPlayerValue}`, inline: true },
                    { name: '🎴 Bài của nhà cái', value: displayHand(currentGame.dealerHand, true), inline: false },
                    { name: '📊 Điểm của nhà cái', value: `?`, inline: true }
                ]
            );
            
            await i.update({ embeds: [updateEmbed], components: [row] });
            return;
        }
        
        // Xử lý DỪNG (Stand) - Bot rút bài và tính kết quả
        if (i.customId === 'stand') {
            // Lưu tin nhắn hiện tại để xóa sau
            const currentReply = reply;
            
            // Hiển thị thông báo bot đang rút bài
            const standEmbed = createGameEmbed(
                '♠️ XÌ RÁCH',
                `Tiền cược: **${currentGame.betAmount.toLocaleString()} VND**\n\n⏳ **Bot đang rút bài...**`,
                '#ff9900',
                [
                    { name: '🎴 Bài của bạn', value: displayHand(currentGame.playerHand), inline: false },
                    { name: '📊 Điểm của bạn', value: `${currentGame.calculateHandValue(currentGame.playerHand)}`, inline: true },
                    { name: '🎴 Bài của nhà cái', value: `🃏 Ẩn | ?`, inline: false },
                    { name: '📊 Điểm của nhà cái', value: `?`, inline: true }
                ]
            );
            
            await i.update({ embeds: [standEmbed], components: [] });
            
            // Bot rút bài (có delay để tạo hiệu ứng)
            await new Promise(resolve => setTimeout(resolve, 1500));
            
            // Bot rút bài
            currentGame.playerStand();
            
            // Lấy kết quả sau khi bot rút
            const result = currentGame.getResult();
            const profit = result.winAmount - currentGame.betAmount;
            const isWin = profit > 0;
            const newPlayerValue = currentGame.calculateHandValue(currentGame.playerHand);
            const newDealerValue = currentGame.calculateHandValue(currentGame.dealerHand);
            
            // Cập nhật thống kê
            if (result.result !== 'push') {
                player.addMoney(profit);
                if (isWin) {
                    player.blackjackWins++;
                } else {
                    player.blackjackLosses++;
                }
            }
            player.totalBets += currentGame.betAmount;
            player.addGameHistory('Xì rách', currentGame.betAmount, isWin);
            player.updateFavoriteGame();
            player.checkAchievements('blackjack');
            savePlayers(players);

            const effect = isWin ? createWinEffect() : (result.result === 'push' ? '🤝' : createLoseEffect());
            
            // Tạo thanh tiến trình so sánh điểm
            const progressBarLength = 20;
            const maxScore = 21;
            const playerProgress = Math.min(newPlayerValue / maxScore, 1);
            const dealerProgress = Math.min(newDealerValue / maxScore, 1);
            const playerFilled = Math.floor(playerProgress * progressBarLength);
            const dealerFilled = Math.floor(dealerProgress * progressBarLength);
            const playerBar = '🟩'.repeat(Math.max(0, playerFilled)) + '⬜'.repeat(Math.max(0, progressBarLength - playerFilled));
            const dealerBar = '🟨'.repeat(Math.max(0, dealerFilled)) + '⬜'.repeat(Math.max(0, progressBarLength - dealerFilled));
            
            // Xác định kết quả chi tiết
            let resultDetail = '';
            if (result.result === 'win') {
                if (newDealerValue > 21) {
                    resultDetail = '🏆 Nhà cái bị bust! Bạn thắng!';
                } else {
                    resultDetail = `🏆 Bạn có ${newPlayerValue} điểm, nhà cái có ${newDealerValue} điểm. Bạn thắng!`;
                }
            } else if (result.result === 'push') {
                resultDetail = `🤝 Cả hai cùng ${newPlayerValue} điểm. Hòa!`;
            } else if (result.result === 'bust') {
                resultDetail = '💔 Bạn bị bust! Thua cược!';
            } else {
                if (newPlayerValue > 21) {
                    resultDetail = '💔 Bạn bị bust! Thua cược!';
                } else {
                    resultDetail = `💔 Bạn có ${newPlayerValue} điểm, nhà cái có ${newDealerValue} điểm. Thua cược!`;
                }
            }
            
            const fields = [
                { 
                    name: '🎴 Bài của bạn', 
                    value: displayHand(currentGame.playerHand), 
                    inline: false 
                },
                { 
                    name: '📊 Điểm của bạn', 
                    value: `${newPlayerValue} / 21`, 
                    inline: true 
                },
                { 
                    name: '📈 Thanh tiến trình của bạn', 
                    value: `\`${playerBar}\``, 
                    inline: false 
                },
                { 
                    name: '🎴 Bài của nhà cái', 
                    value: displayHand(currentGame.dealerHand), 
                    inline: false 
                },
                { 
                    name: '📊 Điểm của nhà cái', 
                    value: `${newDealerValue} / 21`, 
                    inline: true 
                },
                { 
                    name: '📈 Thanh tiến trình của nhà cái', 
                    value: `\`${dealerBar}\``, 
                    inline: false 
                },
                { 
                    name: '📝 Kết quả', 
                    value: resultDetail, 
                    inline: false 
                },
                { 
                    name: '💰 Số tiền nhận được', 
                    value: `${profit > 0 ? '+' : ''}${profit.toLocaleString()} VND`, 
                    inline: true 
                },
                { 
                    name: '💵 Số dư hiện tại', 
                    value: `${player.money.toLocaleString()} VND`, 
                    inline: true 
                }
            ];
            
            if (message.author.id === OWNER_ID) {
                const config = currentGame.getBlackjackConfig();
                fields.push({
                    name: '📊 Thông tin debug (Admin)',
                    value: `Win Rate: ${config.winRate}% | Loss Rate: ${config.lossRate}% | Blackjack: ${config.blackjackRate}% | Push: ${config.pushRate}%`,
                    inline: false
                });
            }
            
            const resultEmbed = createGameEmbed(
                `♠️ KẾT QUẢ XÌ RÁCH ${effect}`,
                result.message,
                isWin ? '#00ff00' : (result.result === 'push' ? '#ff9900' : '#ff0000'),
                fields
            );

            // Xóa tin nhắn "Bot đang rút bài..." và gửi kết quả mới
            try {
                // Xóa tin nhắn cũ (tin nhắn đang hiển thị "Bot đang rút bài...")
                await currentReply.delete();
            } catch (error) {
                console.log('⚠️ Không thể xóa tin nhắn cũ:', error.message);
            }
            
            // Gửi kết quả mới
            await message.channel.send({ embeds: [resultEmbed] });
            games.delete(message.id);
            collector.stop();
            return;
        }
    });

    collector.on('end', async (collected, reason) => {
        const currentGame = games.get(message.id);
        if (currentGame && !currentGame.isFinished) {
            // Hiển thị thông báo hết thời gian
            const timeoutEmbed = createGameEmbed(
                '⏰ HẾT THỜI GIAN',
                `⏰ Hết thời gian! Tự động dừng bài và bot rút bài.`,
                '#ff9900',
                [
                    { name: '🎴 Bài của bạn', value: displayHand(currentGame.playerHand), inline: false },
                    { name: '📊 Điểm của bạn', value: `${currentGame.calculateHandValue(currentGame.playerHand)}`, inline: true },
                    { name: '🎴 Bài của nhà cái', value: `🃏 Ẩn | ?`, inline: false }
                ]
            );
            
            await reply.edit({ embeds: [timeoutEmbed], components: [] });
            
            // Tự động dừng (stand) khi hết thời gian
            await new Promise(resolve => setTimeout(resolve, 1500));
            currentGame.playerStand();
            
            const result = currentGame.getResult();
            const profit = result.winAmount - currentGame.betAmount;
            const isWin = profit > 0;
            const newPlayerValue = currentGame.calculateHandValue(currentGame.playerHand);
            const newDealerValue = currentGame.calculateHandValue(currentGame.dealerHand);
            
            if (result.result !== 'push') {
                player.addMoney(profit);
                if (isWin) {
                    player.blackjackWins++;
                } else {
                    player.blackjackLosses++;
                }
            }
            player.totalBets += currentGame.betAmount;
            player.addGameHistory('Xì rách', currentGame.betAmount, isWin);
            player.updateFavoriteGame();
            savePlayers(players);
            
            const effect = isWin ? createWinEffect() : (result.result === 'push' ? '🤝' : createLoseEffect());
            
            const endFields = [
                { name: '🎴 Bài của bạn', value: displayHand(currentGame.playerHand), inline: false },
                { name: '📊 Điểm của bạn', value: `${newPlayerValue}`, inline: true },
                { name: '🎴 Bài của nhà cái', value: displayHand(currentGame.dealerHand), inline: false },
                { name: '📊 Điểm của nhà cái', value: `${newDealerValue}`, inline: true },
                { name: '💰 Số tiền nhận được', value: `${profit > 0 ? '+' : ''}${profit.toLocaleString()} VND`, inline: true },
                { name: '💵 Số dư hiện tại', value: `${player.money.toLocaleString()} VND`, inline: true }
            ];
            
            const endEmbed = createGameEmbed(
                `⏰ KẾT THÚC XÌ RÁCH ${effect}`,
                result.message,
                isWin ? '#00ff00' : (result.result === 'push' ? '#ff9900' : '#ff0000'),
                endFields
            );
            
            // Xóa tin nhắn cũ và gửi kết quả mới
            try {
                await reply.delete();
            } catch (error) {
                console.log('⚠️ Không thể xóa tin nhắn cũ:', error.message);
            }
            
            await message.channel.send({ embeds: [endEmbed] });
            games.delete(message.id);
        }
    });

    return;
}

// === GAME TÀI XỈU ===
if (command === 'taixiu' || command === 'tx') {
    if (args.length < 2) {
        const embed = createGameEmbed(
            '🎲 TÀI XỈU',
            '**Hướng dẫn chơi:**\nDự đoán tổng điểm của 3 viên xúc xắc!\n\n**🎯 Cách dùng:**\n`!taixiu [số tiền] [tai/xiu]`\n\n**📊 Cách chơi:**\n• **Tài:** Tổng điểm từ 11 đến 17\n• **Xỉu:** Tổng điểm từ 3 đến 10\n\n**📊 Ví dụ:**\n`!taixiu 1000 tai`\n`!taixiu 500 xiu`',
            '#ff9900'
        );
        return message.reply({ embeds: [embed] });
    }

    const betAmount = parseInt(args[0]);
    const choice = args[1].toLowerCase();
    
    // KIỂM TRA CHI TIẾT
    if (isNaN(betAmount) || betAmount <= 0) {
        return message.reply(`⚠️ Số tiền không hợp lệ! Vui lòng nhập số dương.`);
    }
    
    if (betAmount < MIN_BET) {
        return message.reply(`⚠️ Số tiền cược tối thiểu là **${MIN_BET.toLocaleString()} VND**!`);
    }
    
    if (betAmount > MAX_BET) {
        return message.reply(`⚠️ Số tiền cược tối đa là **${MAX_BET.toLocaleString()} VND**!`);
    }
    
    if (betAmount > player.money) {
        return message.reply(`❌ Bạn không đủ tiền để cược!\n💰 Số dư hiện tại: **${player.money.toLocaleString()} VND**\n🎯 Số tiền muốn cược: **${betAmount.toLocaleString()} VND**\n💡 Cần thêm: **${(betAmount - player.money).toLocaleString()} VND**`);
    }

    if (!['tai', 'xiu'].includes(choice)) {
        return message.reply('⚠️ Vui lòng chọn "tai" hoặc "xiu"');
    }

    // Tạo game và chạy
    const game = new TaiXiu(player, betAmount, choice);
    const result = game.roll();
    const gameResult = game.getResult();
    const isWin = gameResult.isWin;
    const winAmount = gameResult.winAmount;
    
    // Cập nhật thống kê
    player.addMoney(winAmount);
    if (isWin) {
        player.taixiuWins++;
    } else {
        player.taixiuLosses++;
    }
    player.totalBets += betAmount;
    player.addGameHistory('Tài xỉu', betAmount, isWin);
    player.updateFavoriteGame();
    player.checkAchievements('taixiu');
    savePlayers(players);

    // Tạo hiệu ứng
    const effect = isWin ? createWinEffect() : createLoseEffect();
    
    // Tạo emoji cho xúc xắc
    const diceEmojis = ['⚀', '⚁', '⚂', '⚃', '⚄', '⚅'];
    const diceDisplay = gameResult.dice.map(d => diceEmojis[d - 1]).join(' ');
    
    // Tạo thanh tiến trình tổng điểm
    const total = gameResult.total;
    const progressBarLength = 20;
    const progress = Math.min((total - 3) / 14, 1);
    const filledLength = Math.floor(progress * progressBarLength);
    const emptyLength = progressBarLength - filledLength;
    const progressBar = '🟩'.repeat(Math.max(0, filledLength)) + '⬜'.repeat(Math.max(0, emptyLength));
    
    // Xác định kết quả
    const resultText = total >= 11 ? '🟢 TÀI' : '🔴 XỈU';
    const isCorrect = (total >= 11 && choice === 'tai') || (total < 11 && choice === 'xiu');
    
    // Tạo embed kết quả
    const fields = [
        { 
            name: '🎲 Kết quả xúc xắc', 
            value: `${diceDisplay}`, 
            inline: false 
        },
        { 
            name: '📊 Tổng điểm', 
            value: `**${total} điểm**`, 
            inline: true 
        },
        { 
            name: '🎯 Kết quả', 
            value: resultText, 
            inline: true 
        },
        { 
            name: '🎯 Bạn chọn', 
            value: choice.toUpperCase(), 
            inline: true 
        },
        { 
            name: '📈 Tiến trình', 
            value: `\`${progressBar}\` ${Math.round(progress * 100)}%`, 
            inline: false 
        },
        { 
            name: '💰 Số tiền nhận được', 
            value: `${winAmount > 0 ? '+' : ''}${winAmount.toLocaleString()} VND`, 
            inline: true 
        },
        { 
            name: '💵 Số dư hiện tại', 
            value: `${player.money.toLocaleString()} VND`, 
            inline: true 
        }
    ];
    
    // Thêm thông tin debug cho admin
    if (message.author.id === OWNER_ID) {
        const config = game.getTaiXiuConfig();
        fields.push({
            name: '📊 Thông tin debug (Admin)',
            value: `Win Rate: ${config.winRate}% | Loss Rate: ${config.lossRate}%`,
            inline: false
        });
    }
    
    const embed = createGameEmbed(
        `🎲 TÀI XỈU ${effect}`,
        isWin ? '🎉 Bạn đã chiến thắng!' : '💔 Bạn đã thua!',
        isWin ? '#00ff00' : '#ff0000',
        fields
    );

    games.delete(message.id);
    return message.reply({ embeds: [embed] });
}

// === GAME XÓC ĐĨA ===
if (command === 'xocdia' || command === 'xd') {
    if (args.length < 2) {
        const embed = createGameEmbed(
            '🪙 XÓC ĐĨA',
            '**Hướng dẫn chơi:**\nDự đoán kết quả của 4 đồng xu!\n\n**🎯 Cách dùng:**\n`!xocdia [số tiền] [chan/le]`\n\n**📊 Cách chơi:**\n• **Chẵn:** Số mặt ngửa (🪙) là 0, 2 hoặc 4\n• **Lẻ:** Số mặt ngửa (🪙) là 1 hoặc 3\n\n**📊 Ví dụ:**\n`!xocdia 1000 chan`\n`!xocdia 500 le`',
            '#ff9900'
        );
        return message.reply({ embeds: [embed] });
    }

    const betAmount = parseInt(args[0]);
    const choice = args[1].toLowerCase();
    
    // KIỂM TRA CHI TIẾT
    if (isNaN(betAmount) || betAmount <= 0) {
        return message.reply(`⚠️ Số tiền không hợp lệ! Vui lòng nhập số dương.`);
    }
    
    if (betAmount < MIN_BET) {
        return message.reply(`⚠️ Số tiền cược tối thiểu là **${MIN_BET.toLocaleString()} VND**!`);
    }
    
    if (betAmount > MAX_BET) {
        return message.reply(`⚠️ Số tiền cược tối đa là **${MAX_BET.toLocaleString()} VND**!`);
    }
    
    if (betAmount > player.money) {
        return message.reply(`❌ Bạn không đủ tiền để cược!\n💰 Số dư hiện tại: **${player.money.toLocaleString()} VND**\n🎯 Số tiền muốn cược: **${betAmount.toLocaleString()} VND**\n💡 Cần thêm: **${(betAmount - player.money).toLocaleString()} VND**`);
    }

    if (!['chan', 'le'].includes(choice)) {
        return message.reply('⚠️ Vui lòng chọn "chan" hoặc "le"');
    }

    // Tạo game và chạy
    const game = new XocDia(player, betAmount, choice);
    const result = game.spin();
    const gameResult = game.getResult();
    const isWin = gameResult.isWin;
    const winAmount = gameResult.winAmount;
    
    // Cập nhật thống kê
    player.addMoney(winAmount);
    if (isWin) {
        player.xocdiaWins++;
    } else {
        player.xocdiaLosses++;
    }
    player.totalBets += betAmount;
    player.addGameHistory('Xóc đĩa', betAmount, isWin);
    player.updateFavoriteGame();
    player.checkAchievements('xocdia');
    savePlayers(players);

    // Tạo hiệu ứng
    const effect = isWin ? createWinEffect() : createLoseEffect();
    
    // Tạo thanh tiến trình cho số mặt ngửa
    const totalCoins = gameResult.total || 0;
    const progressBarLength = 20;
    const progress = Math.min(totalCoins / 4, 1);
    const filledLength = Math.floor(progress * progressBarLength);
    const emptyLength = progressBarLength - filledLength;
    const progressBar = '🟨'.repeat(Math.max(0, filledLength)) + '⬜'.repeat(Math.max(0, emptyLength));
    
    // Xác định kết quả
    const resultText = totalCoins % 2 === 0 ? '🟢 CHẴN' : '🔴 LẺ';
    const isCorrect = (totalCoins % 2 === 0 && choice === 'chan') || (totalCoins % 2 === 1 && choice === 'le');
    
    // Tạo embed kết quả
    const fields = [
        { 
            name: '🪙 Kết quả đồng xu', 
            value: `${gameResult.coins}`, 
            inline: false 
        },
        { 
            name: '📊 Số mặt ngửa', 
            value: `**${totalCoins} / 4**`, 
            inline: true 
        },
        { 
            name: '🎯 Kết quả', 
            value: resultText, 
            inline: true 
        },
        { 
            name: '🎯 Bạn chọn', 
            value: choice.toUpperCase(), 
            inline: true 
        },
        { 
            name: '📈 Tiến trình', 
            value: `\`${progressBar}\` ${Math.round(progress * 100)}%`, 
            inline: false 
        },
        { 
            name: '💰 Số tiền nhận được', 
            value: `${winAmount > 0 ? '+' : ''}${winAmount.toLocaleString()} VND`, 
            inline: true 
        },
        { 
            name: '💵 Số dư hiện tại', 
            value: `${player.money.toLocaleString()} VND`, 
            inline: true 
        }
    ];
    
    // Thêm thông tin debug cho admin
    if (message.author.id === OWNER_ID) {
        const config = game.getXocDiaConfig();
        fields.push({
            name: '📊 Thông tin debug (Admin)',
            value: `Win Rate: ${config.winRate}% | Loss Rate: ${config.lossRate}%`,
            inline: false
        });
    }
    
    const embed = createGameEmbed(
        `🪙 XÓC ĐĨA ${effect}`,
        isWin ? '🎉 Bạn đã chiến thắng!' : '💔 Bạn đã thua!',
        isWin ? '#00ff00' : '#ff0000',
        fields
    );

    games.delete(message.id);
    return message.reply({ embeds: [embed] });
}

// === GAME BẦU CUA ===
if (command === 'baucua' || command === 'bc') {
    if (args.length < 2) {
        const embed = createGameEmbed(
            '🦀 BẦU CUA',
            '**Hướng dẫn chơi:**\nChọn 1 hoặc nhiều con vật để đặt cược!\n\n**🎯 Cách dùng:**\n`!baucua [số tiền] [con vật]`\n`!baucua [số tiền] [con1,con2,con3]`\n\n**🐾 Các con vật:**\n• cua 🦀\n• tom 🦐\n• ca 🐟\n• ga 🐔\n• rong 🐉\n• heo 🐷\n\n**📊 Ví dụ:**\n`!baucua 1000 cua`\n`!baucua 1000 cua,tom,ca`',
            '#ff9900'
        );
        return message.reply({ embeds: [embed] });
    }

    const betAmount = parseInt(args[0]);
    
    // KIỂM TRA CHI TIẾT
    if (isNaN(betAmount) || betAmount <= 0) {
        return message.reply(`⚠️ Số tiền không hợp lệ! Vui lòng nhập số dương.`);
    }
    
    if (betAmount < MIN_BET) {
        return message.reply(`⚠️ Số tiền cược tối thiểu là **${MIN_BET.toLocaleString()} VND**!`);
    }
    
    if (betAmount > MAX_BET) {
        return message.reply(`⚠️ Số tiền cược tối đa là **${MAX_BET.toLocaleString()} VND**!`);
    }
    
    if (betAmount > player.money) {
        return message.reply(`❌ Bạn không đủ tiền để cược!\n💰 Số dư hiện tại: **${player.money.toLocaleString()} VND**\n🎯 Số tiền muốn cược: **${betAmount.toLocaleString()} VND**\n💡 Cần thêm: **${(betAmount - player.money).toLocaleString()} VND**`);
    }

    // Xử lý danh sách con vật được chọn
    const choicesText = args.slice(1).join('').split(',');
    const validAnimals = BAU_CUA_ANIMALS.map(a => a.name);
    const choices = choicesText.filter(c => validAnimals.includes(c.toLowerCase().trim()));
    
    if (choices.length === 0) {
        return message.reply(`⚠️ Vui lòng chọn ít nhất 1 con vật hợp lệ!\n🐾 Các con vật: cua, tom, ca, ga, rong, heo`);
    }

    // Tạo game và chạy
    const game = new BauCua(player, betAmount, choices);
    const rollResult = game.roll();
    const result = game.getResult();
    const isWin = result.isWin;
    const winAmount = result.winAmount;
    
    // Cập nhật thống kê
    player.addMoney(winAmount);
    if (isWin) {
        player.baucuaWins++;
    } else {
        player.baucuaLosses++;
    }
    player.totalBets += betAmount;
    player.addGameHistory('Bầu cua', betAmount, isWin);
    player.updateFavoriteGame();
    player.checkAchievements('baucua');
    savePlayers(players);

    // Tạo hiệu ứng
    const effect = isWin ? createWinEffect() : createLoseEffect();
    
    // Tạo emoji cho kết quả
    const resultEmojis = result.results.map(r => r).join(' | ');
    
    // Tạo emoji cho các con vật đã chọn
    const choiceEmojis = choices.map(c => {
        const animal = BAU_CUA_ANIMALS.find(a => a.name === c);
        return animal ? animal.emoji : c;
    }).join(', ');
    
    // Tạo danh sách con vật trùng
    let matchDetail = result.matchedItems.length > 0 ? 
        result.matchedItems.map(c => {
            const animal = BAU_CUA_ANIMALS.find(a => a.name === c);
            return `${animal ? animal.emoji : ''} ${c}`;
        }).join(', ') : '❌ Không trúng';
    
    // Tạo thanh tiến trình
    const progressBarLength = 20;
    const progress = Math.min(result.matches / 3, 1);
    const filledLength = Math.floor(progress * progressBarLength);
    const emptyLength = progressBarLength - filledLength;
    const progressBar = '🟩'.repeat(Math.max(0, filledLength)) + '⬜'.repeat(Math.max(0, emptyLength));
    
    // Tạo embed kết quả
    const fields = [
        { 
            name: '🎲 Kết quả xúc xắc', 
            value: `${resultEmojis}`, 
            inline: false 
        },
        { 
            name: '🎯 Bạn chọn', 
            value: choiceEmojis, 
            inline: false 
        },
        { 
            name: '🎯 Trúng con', 
            value: matchDetail, 
            inline: false 
        },
        { 
            name: '📊 Số con trúng', 
            value: `${result.matches} / 3`, 
            inline: true 
        },
        { 
            name: '📈 Tiến trình', 
            value: `\`${progressBar}\` ${Math.round(progress * 100)}%`, 
            inline: false 
        },
        { 
            name: '💰 Số tiền nhận được', 
            value: `${winAmount > 0 ? '+' : ''}${winAmount.toLocaleString()} VND`, 
            inline: true 
        },
        { 
            name: '💵 Số dư hiện tại', 
            value: `${player.money.toLocaleString()} VND`, 
            inline: true 
        }
    ];
    
    // Thêm thông tin debug cho admin
    if (message.author.id === OWNER_ID) {
        const config = game.getBauCuaConfig();
        fields.push({
            name: '📊 Thông tin debug (Admin)',
            value: `Win Rate: ${config.winRate}% | Loss Rate: ${config.lossRate}% | Match Multiplier: ${config.matchMultiplier}x`,
            inline: false
        });
    }
    
    const embed = createGameEmbed(
        `🦀 BẦU CUA ${effect}`,
        result.message,
        isWin ? '#00ff00' : '#ff0000',
        fields
    );

    games.delete(message.id);
    return message.reply({ embeds: [embed] });
}

// === GAME MINI SLOT ===
if (command === 'slot' || command === 'sl') {
    if (args.length < 1) {
        const embed = createGameEmbed(
            '🎰 MINI SLOT',
            '**Hướng dẫn chơi:**\nQuay slot để nhận thưởng!\n\n**🎯 Cách dùng:**\n`!slot [số tiền]`\n\n**📊 Cách chơi:**\n• Quay 4 biểu tượng ngẫu nhiên\n• Trùng 2: x2 tiền cược\n• Trùng 3: x5 tiền cược\n• Trùng 4: JACKPOT x15 tiền cược\n\n**📊 Ví dụ:**\n`!slot 1000`',
            '#ff9900'
        );
        return message.reply({ embeds: [embed] });
    }

    const betAmount = parseInt(args[0]);
    
    // KIỂM TRA CHI TIẾT
    if (isNaN(betAmount) || betAmount <= 0) {
        return message.reply(`⚠️ Số tiền không hợp lệ! Vui lòng nhập số dương.`);
    }
    
    if (betAmount < MIN_BET) {
        return message.reply(`⚠️ Số tiền cược tối thiểu là **${MIN_BET.toLocaleString()} VND**!`);
    }
    
    if (betAmount > MAX_BET) {
        return message.reply(`⚠️ Số tiền cược tối đa là **${MAX_BET.toLocaleString()} VND**!`);
    }
    
    if (betAmount > player.money) {
        return message.reply(`❌ Bạn không đủ tiền để cược!\n💰 Số dư hiện tại: **${player.money.toLocaleString()} VND**\n🎯 Số tiền muốn cược: **${betAmount.toLocaleString()} VND**\n💡 Cần thêm: **${(betAmount - player.money).toLocaleString()} VND**`);
    }

    // Tạo game và chạy
    const game = new MiniSlot(player, betAmount);
    const spinResult = game.spin();
    const result = game.getResult();
    const isWin = result.isWin;
    const winAmount = result.winAmount;
    const multiplier = result.multiplier || 0;
    const winCount = result.winCount || 0;
    
    // Cập nhật thống kê
    player.addMoney(winAmount);
    if (isWin) {
        player.slotWins++;
    } else {
        player.slotLosses++;
    }
    player.totalBets += betAmount;
    player.addGameHistory('Mini Slot', betAmount, isWin);
    player.updateFavoriteGame();
    player.checkAchievements('slot');
    savePlayers(players);

    // Tạo hiệu ứng
    const effect = isWin ? createWinEffect() : createLoseEffect();
    
    // Tạo hiển thị slot
    const slotDisplay = result.symbols.join(' | ');
    
    // Tạo thanh tiến trình
    const progressBarLength = 20;
    const progress = Math.min(winCount / 4, 1);
    const filledLength = Math.floor(progress * progressBarLength);
    const emptyLength = progressBarLength - filledLength;
    const progressBar = '🟩'.repeat(Math.max(0, filledLength)) + '⬜'.repeat(Math.max(0, emptyLength));
    
    // Tạo embed kết quả
    const fields = [
        { 
            name: '🎰 Kết quả', 
            value: `\`${slotDisplay}\``, 
            inline: false 
        },
        { 
            name: '📊 Số biểu tượng trùng', 
            value: `${winCount} / 4`, 
            inline: true 
        },
        { 
            name: '📈 Tiến trình', 
            value: `\`${progressBar}\` ${Math.round(progress * 100)}%`, 
            inline: false 
        },
        { 
            name: '💰 Số tiền nhận được', 
            value: `${winAmount > 0 ? '+' : ''}${winAmount.toLocaleString()} VND`, 
            inline: true 
        },
        { 
            name: '📊 Hệ số nhân', 
            value: `${multiplier > 0 ? multiplier + 'x' : '0x'}`, 
            inline: true 
        },
        { 
            name: '💵 Số dư hiện tại', 
            value: `${player.money.toLocaleString()} VND`, 
            inline: true 
        }
    ];
    
    // Thêm thông tin debug cho admin
    if (message.author.id === OWNER_ID) {
        const config = game.getSlotConfig();
        fields.push({
            name: '📊 Thông tin debug (Admin)',
            value: `Win Rate: ${config.winRate}% | Jackpot Rate: ${config.jackpotRate}% | Jackpot: ${config.jackpotMultiplier}x | 3 Match: ${config.threeMatchMultiplier}x | 2 Match: ${config.twoMatchMultiplier}x`,
            inline: false
        });
    }
    
    const embed = createGameEmbed(
        `🎰 MINI SLOT ${effect}`,
        result.message,
        isWin ? '#00ff00' : '#ff0000',
        fields
    );

    games.delete(message.id);
    return message.reply({ embeds: [embed] });
}

// === GAME RÚT THĂM ===
if (command === 'luckydraw' || command === 'ld') {
    if (args.length < 1) {
        const embed = createGameEmbed(
            '🎁 RÚT THĂM TRÚNG THƯỞNG',
            '**Hướng dẫn chơi:**\nQuay số may mắn để nhận thưởng!\n\n**🎯 Cách dùng:**\n`!luckydraw [số tiền]`\n\n**📊 Các giải thưởng:**\n• 💎 X2 - X20 tiền cược\n• 💔 Mất tiền cược\n• 🔄 Hoàn tiền\n\n**📊 Ví dụ:**\n`!luckydraw 1000`',
            '#ff9900'
        );
        return message.reply({ embeds: [embed] });
    }

    const betAmount = parseInt(args[0]);
    
    // KIỂM TRA CHI TIẾT
    if (isNaN(betAmount) || betAmount <= 0) {
        return message.reply(`⚠️ Vui lòng nhập số tiền hợp lệ! (Số dương)`);
    }
    
    if (betAmount < MIN_BET) {
        return message.reply(`⚠️ Số tiền cược tối thiểu là **${MIN_BET.toLocaleString()} VND**!`);
    }
    
    if (betAmount > MAX_BET) {
        return message.reply(`⚠️ Số tiền cược tối đa là **${MAX_BET.toLocaleString()} VND**!`);
    }
    
    if (betAmount > player.money) {
        return message.reply(`❌ Bạn không đủ tiền để cược!\n💰 Số dư hiện tại: **${player.money.toLocaleString()} VND**\n🎯 Số tiền muốn cược: **${betAmount.toLocaleString()} VND**\n💡 Cần thêm: **${(betAmount - player.money).toLocaleString()} VND**`);
    }

    // Tạo game và chạy
    const game = new LuckyDraw(player, betAmount);
    const result = game.draw();
    const isWin = result.isWin;
    const winAmount = result.winAmount;
    const prize = result.prize;
    
    // Cập nhật thống kê
    player.addMoney(winAmount);
    if (isWin) {
        player.luckydrawWins++;
    } else if (winAmount < 0) {
        player.luckydrawLosses++;
    }
    player.totalBets += betAmount;
    player.addGameHistory('Rút thăm', betAmount, isWin);
    player.updateFavoriteGame();
    player.checkAchievements('luckydraw');
    savePlayers(players);

    // Tạo hiệu ứng
    const effect = isWin ? createWinEffect() : (winAmount === 0 ? '🔄' : createLoseEffect());
    
    // Tạo thanh tiến trình
    const progressBarLength = 20;
    let progress = 0;
    if (prize.multiplier > 0) {
        progress = Math.min(prize.multiplier / 20, 1);
    } else if (prize.multiplier < 0) {
        progress = 0.1;
    } else {
        progress = 0.5;
    }
    const filledLength = Math.floor(progress * progressBarLength);
    const emptyLength = progressBarLength - filledLength;
    const progressBar = '🟩'.repeat(Math.max(0, filledLength)) + '⬜'.repeat(Math.max(0, emptyLength));
    
    // Tạo embed kết quả
    const fields = [
        { 
            name: '🎁 Giải thưởng', 
            value: `${prize.emoji} ${prize.name}`, 
            inline: false 
        },
        { 
            name: '📊 Hệ số nhân', 
            value: `${prize.multiplier > 0 ? '+' : ''}${prize.multiplier}x`, 
            inline: true 
        },
        { 
            name: '📈 Tiến trình', 
            value: `\`${progressBar}\` ${Math.round(progress * 100)}%`, 
            inline: false 
        },
        { 
            name: '💰 Số tiền nhận được', 
            value: `${winAmount > 0 ? '+' : ''}${winAmount.toLocaleString()} VND`, 
            inline: true 
        },
        { 
            name: '💵 Số dư hiện tại', 
            value: `${player.money.toLocaleString()} VND`, 
            inline: true 
        }
    ];
    
    // Thêm thông tin debug cho admin
    if (message.author.id === OWNER_ID) {
        const config = getGameConfig(player.userId, 'luckydraw');
        fields.push({
            name: '📊 Thông tin debug (Admin)',
            value: `Win Rate: ${config.winRate || 35}% | Loss Rate: ${config.lossRate || 40}% | Draw Rate: ${config.drawRate || 25}%`,
            inline: false
        });
    }
    
    const embed = createGameEmbed(
        `🎁 RÚT THĂM TRÚNG THƯỞNG ${effect}`,
        isWin ? '🎉 Chúc mừng bạn đã trúng thưởng!' : (winAmount === 0 ? '🔄 Bạn đã hòa!' : '💔 Chúc bạn may mắn lần sau!'),
        isWin ? '#00ff00' : (winAmount === 0 ? '#ff9900' : '#ff0000'),
        fields
    );

    games.delete(message.id);
    return message.reply({ embeds: [embed] });
}

// === GAME KÉO BÚA BAO ===
if (command === 'kbb') {
    if (args.length < 2) {
        const embed = createGameEmbed(
            '✊ KÉO BÚA BAO',
            '**Hướng dẫn chơi:**\nĐấu với bot trong trò chơi kéo búa bao!\n\n**🎯 Cách dùng:**\n`!kbb [số tiền] [keo/bua/bao]`\n\n**📊 Cách chơi:**\n• ✊ Kéo thắng Bao\n• ✋ Búa thắng Kéo\n• ✌️ Bao thắng Búa\n\n**📊 Ví dụ:**\n`!kbb 1000 keo`\n`!kbb 500 bua`',
            '#ff9900'
        );
        return message.reply({ embeds: [embed] });
    }

    const betAmount = parseInt(args[0]);
    const choice = args[1].toLowerCase();
    
    // KIỂM TRA CHI TIẾT
    if (isNaN(betAmount) || betAmount <= 0) {
        return message.reply(`⚠️ Số tiền không hợp lệ! Vui lòng nhập số dương.`);
    }
    
    if (betAmount < MIN_BET) {
        return message.reply(`⚠️ Số tiền cược tối thiểu là **${MIN_BET.toLocaleString()} VND**!`);
    }
    
    if (betAmount > MAX_BET) {
        return message.reply(`⚠️ Số tiền cược tối đa là **${MAX_BET.toLocaleString()} VND**!`);
    }
    
    if (betAmount > player.money) {
        return message.reply(`❌ Bạn không đủ tiền để cược!\n💰 Số dư hiện tại: **${player.money.toLocaleString()} VND**\n🎯 Số tiền muốn cược: **${betAmount.toLocaleString()} VND**\n💡 Cần thêm: **${(betAmount - player.money).toLocaleString()} VND**`);
    }

    if (!['keo', 'bua', 'bao'].includes(choice)) {
        return message.reply('⚠️ Vui lòng chọn "keo", "bua" hoặc "bao"');
    }

    // Tạo game và chạy
    const game = new RockPaperScissors(player, betAmount, choice);
    game.play();
    const result = game.getResult();
    const isWin = result.isWin;
    const winAmount = result.winAmount;
    const playerEmoji = result.playerEmoji || '❓';
    const botEmoji = result.botEmoji || '❓';
    
    // Cập nhật thống kê
    player.addMoney(winAmount);
    if (isWin) {
        player.kbbWins++;
    } else if (result.result === 'draw') {
        // Hòa - không tính thắng/thua
    } else {
        player.kbbLosses++;
    }
    if (result.result !== 'draw') {
        player.totalGames++;
    }
    player.totalBets += betAmount;
    player.addGameHistory('Kéo búa bao', betAmount, isWin);
    player.updateFavoriteGame();
    player.checkAchievements('kbb');
    savePlayers(players);

    // Tạo hiệu ứng
    const effect = isWin ? createWinEffect() : (result.result === 'draw' ? '🤝' : createLoseEffect());
    
    // Tạo thanh tiến trình
    const progressBarLength = 20;
    const progress = isWin ? 1 : (result.result === 'draw' ? 0.5 : 0);
    const filledLength = Math.floor(progress * progressBarLength);
    const emptyLength = progressBarLength - filledLength;
    const progressBar = '🟩'.repeat(Math.max(0, filledLength)) + '⬜'.repeat(Math.max(0, emptyLength));
    
    // Tạo embed kết quả
    const fields = [
        { 
            name: '👤 Bạn', 
            value: `${playerEmoji} ${choice.toUpperCase()}`, 
            inline: true 
        },
        { 
            name: '🤖 Bot', 
            value: `${botEmoji} ${result.botChoice.toUpperCase()}`, 
            inline: true 
        },
        { 
            name: '📊 Kết quả', 
            value: result.message, 
            inline: true 
        },
        { 
            name: '📈 Tiến trình', 
            value: `\`${progressBar}\` ${Math.round(progress * 100)}%`, 
            inline: false 
        },
        { 
            name: '💰 Số tiền nhận được', 
            value: `${winAmount > 0 ? '+' : ''}${winAmount.toLocaleString()} VND`, 
            inline: true 
        },
        { 
            name: '💵 Số dư hiện tại', 
            value: `${player.money.toLocaleString()} VND`, 
            inline: true 
        }
    ];
    
    // Thêm thông tin debug cho admin
    if (message.author.id === OWNER_ID) {
        const config = game.getKBBConfig();
        fields.push({
            name: '📊 Thông tin debug (Admin)',
            value: `Win Rate: ${config.winRate}% | Loss Rate: ${config.lossRate}% | Draw Rate: ${config.drawRate}%`,
            inline: false
        });
    }
    
    const embed = createGameEmbed(
        `✊ KÉO BÚA BAO ${effect}`,
        result.message,
        isWin ? '#00ff00' : (result.result === 'draw' ? '#ff9900' : '#ff0000'),
        fields
    );

    games.delete(message.id);
    return message.reply({ embeds: [embed] });
}

// === GAME ĐOÁN SỐ ===
if (command === 'guess' || command === 'doanso') {
    if (args.length < 1) {
        const embed = createGameEmbed(
            '🔢 ĐOÁN SỐ',
            '**Hướng dẫn chơi:**\nĐoán số từ 1 đến 100 trong 10 lượt!\n\n**🎯 Cách dùng:**\n`!guess [số tiền]`\n\n**📊 Cách chơi:**\n• Nhập số từ 1-100 để đoán\n• Có 10 lượt đoán\n• Đoán càng sớm thưởng càng cao\n\n**📊 Ví dụ:**\n`!guess 1000`\nSau đó nhập số để đoán',
            '#ff9900'
        );
        return message.reply({ embeds: [embed] });
    }

    const betAmount = parseInt(args[0]);
    
    // KIỂM TRA CHI TIẾT
    if (isNaN(betAmount) || betAmount <= 0) {
        return message.reply(`⚠️ Số tiền không hợp lệ! Vui lòng nhập số dương.`);
    }
    
    if (betAmount < MIN_BET) {
        return message.reply(`⚠️ Số tiền cược tối thiểu là **${MIN_BET.toLocaleString()} VND**!`);
    }
    
    if (betAmount > MAX_BET) {
        return message.reply(`⚠️ Số tiền cược tối đa là **${MAX_BET.toLocaleString()} VND**!`);
    }
    
    if (betAmount > player.money) {
        return message.reply(`❌ Bạn không đủ tiền để cược!\n💰 Số dư hiện tại: **${player.money.toLocaleString()} VND**\n🎯 Số tiền muốn cược: **${betAmount.toLocaleString()} VND**\n💡 Cần thêm: **${(betAmount - player.money).toLocaleString()} VND**`);
    }

    // Tạo game
    const game = new GuessNumber(player, betAmount);
    games.set(message.id, game);

    // Tạo embed bắt đầu
    const embed = createGameEmbed(
        '🔢 ĐOÁN SỐ',
        `Nhập số từ 1-100 để đoán!\nBạn có ${game.maxAttempts} lượt đoán.`,
        '#0099ff',
        [
            { name: '💰 Tiền cược', value: `${betAmount.toLocaleString()} VND`, inline: true },
            { name: '🎯 Lượt đoán còn lại', value: `${game.maxAttempts}`, inline: true },
            { name: '📊 Phạm vi', value: '1 - 100', inline: true }
        ]
    );

    await message.reply({ embeds: [embed] });

    // Tạo collector để lắng nghe câu trả lời
    const filter = m => m.author.id === message.author.id && !isNaN(parseInt(m.content));
    const collector = message.channel.createMessageCollector({ filter, time: 60000, max: game.maxAttempts });

    let lastGuessTime = Date.now();

    collector.on('collect', async m => {
        const currentGame = games.get(message.id);
        if (!currentGame || currentGame.isFinished) return;

        const guess = parseInt(m.content);
        if (guess < 1 || guess > 100) {
            return m.reply('⚠️ Vui lòng nhập số từ 1-100!');
        }

        // Ngăn spam
        const now = Date.now();
        if (now - lastGuessTime < 1000) {
            return m.reply('⏳ Vui lòng chờ 1 giây giữa các lần đoán!');
        }
        lastGuessTime = now;

        const result = currentGame.guess(guess);
        let response = '';
        let embedColor = '#0099ff';

        if (result === 'correct') {
            const finalResult = currentGame.getResult();
            const isWin = finalResult.isWin;
            const winAmount = finalResult.winAmount;
            
            player.addMoney(winAmount);
            if (isWin) {
                player.guessWins++;
            } else {
                player.guessLosses++;
            }
            player.totalBets += betAmount;
            player.addGameHistory('Đoán số', betAmount, isWin);
            player.updateFavoriteGame();
            player.checkAchievements('guess');
            savePlayers(players);

            // Tạo thanh tiến trình
            const progressBarLength = 20;
            const progress = Math.min(currentGame.attempts / currentGame.maxAttempts, 1);
            const filledLength = Math.floor(progress * progressBarLength);
            const emptyLength = progressBarLength - filledLength;
            const progressBar = '🟩'.repeat(Math.max(0, filledLength)) + '⬜'.repeat(Math.max(0, emptyLength));

            const fields = [
                { name: '🔢 Số bí mật', value: `**${finalResult.secretNumber}**`, inline: true },
                { name: '📊 Số lượt đoán', value: `${currentGame.attempts}/${currentGame.maxAttempts}`, inline: true },
                { name: '🎯 Kết quả', value: '🎉 Chính xác!', inline: true },
                { name: '📈 Tiến trình', value: `\`${progressBar}\` ${Math.round(progress * 100)}%`, inline: false },
                { name: '💰 Số tiền nhận được', value: `${winAmount > 0 ? '+' : ''}${winAmount.toLocaleString()} VND`, inline: true },
                { name: '💵 Số dư hiện tại', value: `${player.money.toLocaleString()} VND`, inline: true }
            ];

            // Thêm debug cho admin
            if (message.author.id === OWNER_ID) {
                const config = currentGame.getGuessConfig();
                fields.push({
                    name: '📊 Thông tin debug (Admin)',
                    value: `Win Rate: ${config.winRate}% | Loss Rate: ${config.lossRate}% | Max Attempts: ${config.maxAttempts}`,
                    inline: false
                });
            }

            const resultEmbed = createGameEmbed(
                `🎉 ĐOÁN ĐÚNG!`,
                finalResult.message,
                '#00ff00',
                fields
            );
            
            await m.reply({ embeds: [resultEmbed] });
            games.delete(message.id);
            collector.stop();
            
        } else if (result === 'too_low') {
            response = `📈 Số ${guess} quá thấp! Còn ${currentGame.maxAttempts - currentGame.attempts} lượt.`;
            embedColor = '#ff6644';
        } else if (result === 'too_high') {
            response = `📉 Số ${guess} quá cao! Còn ${currentGame.maxAttempts - currentGame.attempts} lượt.`;
            embedColor = '#ff6644';
        } else if (result === 'out_of_attempts') {
            const finalResult = currentGame.getResult();
            const winAmount = finalResult.winAmount;
            
            player.addMoney(winAmount);
            player.guessLosses++;
            player.totalBets += betAmount;
            player.addGameHistory('Đoán số', betAmount, false);
            savePlayers(players);

            const fields = [
                { name: '🔢 Số bí mật', value: `**${finalResult.secretNumber}**`, inline: true },
                { name: '📊 Số lượt đoán', value: `${currentGame.attempts}/${currentGame.maxAttempts}`, inline: true },
                { name: '💔 Kết quả', value: 'Hết lượt!', inline: true },
                { name: '💰 Số tiền nhận được', value: `-${betAmount.toLocaleString()} VND`, inline: true },
                { name: '💵 Số dư hiện tại', value: `${player.money.toLocaleString()} VND`, inline: true }
            ];

            const resultEmbed = createGameEmbed(
                `💔 HẾT LƯỢT!`,
                finalResult.message,
                '#ff0000',
                fields
            );
            
            await m.reply({ embeds: [resultEmbed] });
            games.delete(message.id);
            collector.stop();
        }

        if (response) {
            // Cập nhật thanh tiến trình
            const progressBarLength = 20;
            const progress = Math.min(currentGame.attempts / currentGame.maxAttempts, 1);
            const filledLength = Math.floor(progress * progressBarLength);
            const emptyLength = progressBarLength - filledLength;
            const progressBar = '🟩'.repeat(Math.max(0, filledLength)) + '⬜'.repeat(Math.max(0, emptyLength));

            const updateEmbed = createGameEmbed(
                '🔢 ĐOÁN SỐ',
                response,
                embedColor,
                [
                    { name: '💰 Tiền cược', value: `${currentGame.betAmount.toLocaleString()} VND`, inline: true },
                    { name: '🎯 Lượt đoán còn lại', value: `${currentGame.maxAttempts - currentGame.attempts}`, inline: true },
                    { name: '📈 Tiến trình', value: `\`${progressBar}\` ${Math.round(progress * 100)}%`, inline: false },
                    { name: '📝 Các số đã đoán', value: currentGame.guesses.join(', ') || 'Chưa có', inline: false }
                ]
            );
            await m.reply({ embeds: [updateEmbed] });
        }
    });

    collector.on('end', async () => {
        const currentGame = games.get(message.id);
        if (currentGame && !currentGame.isFinished) {
            const winAmount = -betAmount;
            player.addMoney(winAmount);
            player.guessLosses++;
            player.totalBets += betAmount;
            player.addGameHistory('Đoán số', betAmount, false);
            savePlayers(players);
            
            const endEmbed = createGameEmbed(
                '⏰ HẾT GIỜ',
                `⏰ Hết thời gian! Số đúng là **${currentGame.secretNumber}**.\nBạn đã thua ${betAmount.toLocaleString()} VND!`,
                '#ff9900',
                [
                    { name: '💰 Số tiền mất', value: `-${betAmount.toLocaleString()} VND`, inline: true },
                    { name: '💵 Số dư hiện tại', value: `${player.money.toLocaleString()} VND`, inline: true },
                    { name: '📝 Các số đã đoán', value: currentGame.guesses.join(', ') || 'Chưa có', inline: false }
                ]
            );
            await message.channel.send({ embeds: [endEmbed] });
            games.delete(message.id);
        }
    });

    return;
}

// === GAME XỔ SỐ ===
if (command === 'lottery' || command === 'xs') {
    if (args.length < 1) {
        const embed = createGameEmbed(
            '🎰 XỔ SỐ',
            '**Hướng dẫn chơi:**\nDự đoán 3 số may mắn!\n\n**🎯 Cách dùng:**\n`!lottery [số tiền]`\n\n**📊 Cách chơi:**\n• Chọn 3 số từ 0-9\n• Số của bạn sẽ được tạo ngẫu nhiên\n• Trùng 1 số: x2 tiền cược\n• Trùng 2 số: x10 tiền cược\n• Trùng 3 số: JACKPOT x100 tiền cược\n\n**📊 Ví dụ:**\n`!lottery 1000`',
            '#ff9900'
        );
        return message.reply({ embeds: [embed] });
    }

    const betAmount = parseInt(args[0]);
    
    // KIỂM TRA CHI TIẾT
    if (isNaN(betAmount) || betAmount <= 0) {
        return message.reply(`⚠️ Số tiền không hợp lệ! Vui lòng nhập số dương.`);
    }
    
    if (betAmount < MIN_BET) {
        return message.reply(`⚠️ Số tiền cược tối thiểu là **${MIN_BET.toLocaleString()} VND**!`);
    }
    
    if (betAmount > MAX_BET) {
        return message.reply(`⚠️ Số tiền cược tối đa là **${MAX_BET.toLocaleString()} VND**!`);
    }
    
    if (betAmount > player.money) {
        return message.reply(`❌ Bạn không đủ tiền để cược!\n💰 Số dư hiện tại: **${player.money.toLocaleString()} VND**\n🎯 Số tiền muốn cược: **${betAmount.toLocaleString()} VND**\n💡 Cần thêm: **${(betAmount - player.money).toLocaleString()} VND**`);
    }

    // Tạo game và chạy
    const game = new Lottery(player, betAmount);
    const generateResult = game.generateNumbers();
    const result = game.getResult();
    const isWin = result.isWin;
    const winAmount = result.winAmount;
    const matches = result.matches || 0;
    const multiplier = result.multiplier || 0;
    
    // Cập nhật thống kê
    player.addMoney(winAmount);
    if (isWin) {
        player.luckydrawWins++;
    } else {
        player.luckydrawLosses++;
    }
    player.totalBets += betAmount;
    player.addGameHistory('Xổ số', betAmount, isWin);
    player.updateFavoriteGame();
    player.checkAchievements('lottery');
    savePlayers(players);

    // Tạo hiệu ứng
    const effect = isWin ? createWinEffect() : createLoseEffect();
    
    // Format số thành dạng dễ đọc
    const playerNumbersDisplay = result.playerNumbers.join(' | ');
    const winningNumbersDisplay = result.winningNumbers.join(' | ');
    
    // Đánh dấu các số trùng
    const playerNumbersWithMark = result.playerNumbers.map((num, index) => {
        if (result.winningNumbers[index] === num) {
            return `**✅ ${num}**`;
        }
        return num;
    }).join(' | ');
    
    // Tạo thanh tiến trình
    const progressBarLength = 20;
    const progress = Math.min(matches / 3, 1);
    const filledLength = Math.floor(progress * progressBarLength);
    const emptyLength = progressBarLength - filledLength;
    const progressBar = '🟩'.repeat(Math.max(0, filledLength)) + '⬜'.repeat(Math.max(0, emptyLength));
    
    // Tạo embed kết quả
    const fields = [
        { 
            name: '🎯 Số của bạn', 
            value: `\`${playerNumbersWithMark}\``, 
            inline: false 
        },
        { 
            name: '🏆 Số trúng thưởng', 
            value: `\`${winningNumbersDisplay}\``, 
            inline: false 
        },
        { 
            name: '📊 Số trùng', 
            value: `${matches} / 3`, 
            inline: true 
        },
        { 
            name: '📊 Hệ số nhân', 
            value: `${multiplier > 0 ? multiplier + 'x' : '0x'}`, 
            inline: true 
        },
        { 
            name: '📈 Tiến trình', 
            value: `\`${progressBar}\` ${Math.round(progress * 100)}%`, 
            inline: false 
        },
        { 
            name: '💰 Số tiền nhận được', 
            value: `${winAmount > 0 ? '+' : ''}${winAmount.toLocaleString()} VND`, 
            inline: true 
        },
        { 
            name: '💵 Số dư hiện tại', 
            value: `${player.money.toLocaleString()} VND`, 
            inline: true 
        }
    ];
    
    // Thêm thông tin debug cho admin
    if (message.author.id === OWNER_ID) {
        const config = game.getLotteryConfig();
        fields.push({
            name: '📊 Thông tin debug (Admin)',
            value: `Win Rate: ${config.winRate}% | Loss Rate: ${config.lossRate}% | Multipliers: 1s=${config.matchMultipliers['1']}x, 2s=${config.matchMultipliers['2']}x, 3s=${config.matchMultipliers['3']}x`,
            inline: false
        });
    }
    
    const embed = createGameEmbed(
        `🎰 XỔ SỐ ${effect}`,
        result.message,
        isWin ? '#00ff00' : '#ff0000',
        fields
    );

    games.delete(message.id);
    return message.reply({ embeds: [embed] });
}

}); // Đóng client.on('messageCreate')

// Đăng nhập vào hệ thống Discord bằng Token được lưu an toàn trong file .env
client.login(BOT_TOKEN).catch(error => {
    console.error('❌ Lỗi đăng nhập bot:', error);
    console.error('💡 Kiểm tra lại BOT_TOKEN trong file .env');
    process.exit(1);
});