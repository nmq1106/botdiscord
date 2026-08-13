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
            blackjackRate: 5,
            dealerBustRate: 20,
            pushRate: 10
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
let BANK_INFO = {
    bankName: 'MB Bank',
    bankCode: 'MB',
    accountNumber: '5211060910',
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
            
            if (config.bankInfo) {
                BANK_INFO.bankName = config.bankInfo.bankName || BANK_INFO.bankName;
                BANK_INFO.bankCode = config.bankInfo.bankCode || BANK_INFO.bankCode;
                BANK_INFO.accountNumber = config.bankInfo.accountNumber || BANK_INFO.accountNumber;
                BANK_INFO.accountName = config.bankInfo.accountName || BANK_INFO.accountName;
                BANK_INFO.branch = config.bankInfo.branch || BANK_INFO.branch;
            }
            
            // Gán giá trị, KHÔNG dùng let/const
            GAME_CONFIGS = config.gameConfigs || {};
            PLAYER_OVERRIDES = config.playerOverrides || {};
            
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
            console.log(`📊 Số game có cấu hình: ${Object.keys(GAME_CONFIGS).length}`);
            console.log(`👤 Số player có override: ${Object.keys(PLAYER_OVERRIDES).length}`);
            
            return config;
        }
    } catch (error) {
        console.error('❌ Lỗi đọc file cấu hình:', error);
    }
    return null;
}

// === HÀM LẤY CẤU HÌNH CHO GAME ===
function getGameConfig(playerId, gameName) {
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
        
        // 1B: Kiểm tra game cụ thể của player (CHỈ KHI KHÔNG CÓ GLOBAL)
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

    depositMoney(amount, transactionId) {
        if (typeof amount !== 'number' || isNaN(amount) || amount <= 0) {
            return { success: false, message: 'So tien khong hop le!' };
        }

        this.money += amount;
        this.totalDeposited += amount;
        this.depositHistory.push({
            amount: amount,
            transactionId: transactionId,
            time: Date.now(),
            status: 'completed'
        });
        
        this.xp += amount / 10;
        this.checkLevelUp();
        
        console.log(`💰 ${this.userId} da nap ${amount} VND, giao dich: ${transactionId}`);
        
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
        if (typeof amount !== 'number' || isNaN(amount) || amount <= 0) {
            return false;
        }
        
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

function loadPlayers() {
    try {
        if (fs.existsSync(DATA_FILE)) {
            const data = fs.readFileSync(DATA_FILE, 'utf8');
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
        console.error('Loi khi doc file du lieu:', error);
    }
    return new Map();
}

function savePlayers(playersMap) {
    try {
        const data = {};
        for (const [key, value] of playersMap) {
            data[key] = value.toJSON();
        }
        fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2), 'utf8');
        console.log('✅ Da luu du lieu nguoi choi thanh cong!');
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

const players = loadPlayers();
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
        const maxFields = Math.min(fields.length, 25);
        for (let i = 0; i < maxFields; i++) {
            const field = fields[i];
            if (field.name && field.value) {
                embed.addFields({ name: field.name, value: field.value, inline: field.inline || false });
            }
        }
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
        
        try {
            const fallbackText = `NGAN HANG: ${BANK_INFO.bankName}\nSO TK: ${BANK_INFO.accountNumber}\nCHU TK: ${BANK_INFO.accountName}\nSO TIEN: ${amount.toLocaleString()} VND\nNOI DUNG: ${description}`;
            const fallbackQR = await QRCode.toDataURL(fallbackText, {
                width: 400,
                margin: 2,
                color: {
                    dark: '#000000',
                    light: '#ffffff'
                }
            });
            console.log('⚠️ Sử dụng QR fallback (text)');
            return fallbackQR;
        } catch (fallbackError) {
            console.error('❌ Lỗi tạo QR fallback:', fallbackError);
            return null;
        }
    }
}

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

function generateTransactionId(userId, amount) {
    const timestamp = Date.now().toString(36).toUpperCase();
    const random = Math.random().toString(36).substring(2, 6).toUpperCase();
    const userPart = userId.slice(-4).toUpperCase();
    return `NAP${userPart}${timestamp.slice(-4)}${random}`;
}

function generateTransferContent(userId, username, amount) {
    return `NAP ${username} ${amount} VND`;
}

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
// === CÁC CLASS GAME ===
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
        
        let raceRounds = Math.floor(config.raceRounds / lossMultiplier);
        raceRounds = Math.max(10, Math.min(25, raceRounds));
        
        let winRate = config.winRate / 100;
        let lossRate = config.lossRate / 100;
        
        winRate = Math.max(0.05, winRate - (lossMultiplier - 1) * 0.08);
        lossRate = Math.min(0.95, lossRate + (lossMultiplier - 1) * 0.08);
        
        const playerWin = Math.random() < winRate;
        
        console.log(`🏇 Horse: ${this.player.userId} - PlayerWin: ${playerWin} - WinRate: ${winRate}`);

        for (let round = 0; round < raceRounds; round++) {
            let roundText = `🏁 Vòng ${round + 1}:\n`;
            
            this.horses.forEach((horse, index) => {
                let speed = Math.floor(Math.random() * (config.maxSpeed || 12)) + (config.minSpeed || 1);
                
                if (index === this.horseIndex) {
                    if (playerWin) {
                        speed = Math.floor(speed * (0.9 + Math.random() * 0.3));
                    } else {
                        speed = Math.floor(speed * (0.6 + Math.random() * 0.3));
                    }
                } else {
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

        if (!this.winner) {
            if (playerWin) {
                this.winner = this.horses[this.horseIndex];
                this.horses[this.horseIndex].position = this.raceLength;
            } else {
                let randomWinner = Math.floor(Math.random() * this.horses.length);
                while (randomWinner === this.horseIndex) {
                    randomWinner = Math.floor(Math.random() * this.horses.length);
                }
                this.winner = this.horses[randomWinner];
                this.horses[randomWinner].position = this.raceLength;
            }
            this.isFinished = true;
        }

        console.log(`🏇 Horse Result: ${this.winner.name} - Player Horse: ${this.horses[this.horseIndex].name}`);
        return raceLog;
    }

    getResult() {
        const win = this.winner.id === this.horseIndex;
        const baseMultiplier = 2;
        const bonusMultiplier = (this.horses.length - this.winner.id - 1) * 0.5;
        const multiplier = baseMultiplier + bonusMultiplier;
        const winAmount = win ? Math.floor(this.betAmount * multiplier) : -this.betAmount;
        
        return { 
            win, 
            winAmount, 
            winner: this.winner,
            multiplier: multiplier
        };
    }
}

// === CLASS GAME XÌ RÁCH ===
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

    startGame() {
        this.playerHand.push(this.drawCard());
        this.dealerHand.push(this.drawCard());
        this.playerHand.push(this.drawCard());
        this.dealerHand.push(this.drawCard());
        
        const config = this.getBlackjackConfig();
        const lossMultiplier = this.player.calculateLossMultiplier();
        
        let adjustedWinRate = config.winRate / 100;
        let adjustedLossRate = config.lossRate / 100;
        let adjustedBlackjackRate = config.blackjackRate / 100;
        let adjustedPushRate = config.pushRate / 100;
        
        adjustedWinRate = Math.max(0.05, adjustedWinRate - (lossMultiplier - 1) * 0.08);
        adjustedLossRate = Math.min(0.9, adjustedLossRate + (lossMultiplier - 1) * 0.08);
        adjustedBlackjackRate = Math.max(0.01, adjustedBlackjackRate - (lossMultiplier - 1) * 0.01);
        adjustedPushRate = Math.max(0.01, adjustedPushRate - (lossMultiplier - 1) * 0.02);
        
        const total = adjustedWinRate + adjustedLossRate + adjustedBlackjackRate + adjustedPushRate;
        adjustedWinRate = adjustedWinRate / total;
        adjustedLossRate = adjustedLossRate / total;
        adjustedBlackjackRate = adjustedBlackjackRate / total;
        adjustedPushRate = adjustedPushRate / total;
        
        const playerValue = this.calculateHandValue(this.playerHand);
        const dealerValue = this.calculateHandValue(this.dealerHand);
        
        if (playerValue === 21 && dealerValue !== 21) {
            this.isFinished = true;
            this.result = 'blackjack';
            this.betMultiplier = 2.5;
            return;
        }
        
        if (dealerValue === 21 && playerValue !== 21) {
            this.isFinished = true;
            this.result = 'loss';
            this.betMultiplier = 0;
            return;
        }
        
        if (playerValue === 21 && dealerValue === 21) {
            this.isFinished = true;
            this.result = 'push';
            this.betMultiplier = 1;
            return;
        }
        
        const random = Math.random();
        
        if (random < adjustedBlackjackRate) {
            this.playerHand = [this.drawCard(), this.drawCard()];
            this.dealerHand = [this.drawCard(), this.drawCard()];
            this.isFinished = true;
            this.result = 'blackjack';
            this.betMultiplier = 2.5;
            return;
        }
        
        if (random < adjustedWinRate + adjustedBlackjackRate) {
            this.generateWinHand();
        } else if (random < adjustedWinRate + adjustedBlackjackRate + adjustedPushRate) {
            this.generatePushHand();
        } else {
            this.generateLossHand();
        }
    }

    generateWinHand() {
        let playerValue = 0;
        let dealerValue = 0;
        
        this.playerHand = [];
        this.dealerHand = [];
        
        while (playerValue < 17) {
            this.playerHand.push(this.drawCard());
            playerValue = this.calculateHandValue(this.playerHand);
            if (playerValue > 21) {
                this.playerHand = [];
                playerValue = 0;
                continue;
            }
        }
        
        let attempts = 0;
        do {
            this.dealerHand = [];
            dealerValue = 0;
            while (dealerValue < 16) {
                this.dealerHand.push(this.drawCard());
                dealerValue = this.calculateHandValue(this.dealerHand);
                if (dealerValue > 21) break;
            }
            attempts++;
        } while ((dealerValue <= playerValue && dealerValue <= 21) && attempts < 50);
        
        if (dealerValue > 21 || playerValue > dealerValue) {
            this.isFinished = true;
            this.result = 'win';
            this.betMultiplier = 2;
        } else {
            this.isFinished = true;
            this.result = 'win';
            this.betMultiplier = 2;
        }
    }

    generatePushHand() {
        let playerValue = 0;
        let dealerValue = 0;
        
        this.playerHand = [];
        this.dealerHand = [];
        
        while (playerValue < 16) {
            this.playerHand.push(this.drawCard());
            playerValue = this.calculateHandValue(this.playerHand);
            if (playerValue > 21) {
                this.playerHand = [];
                playerValue = 0;
                continue;
            }
        }
        
        let attempts = 0;
        do {
            this.dealerHand = [];
            dealerValue = 0;
            while (dealerValue < playerValue - 2 || dealerValue > playerValue + 2) {
                this.dealerHand.push(this.drawCard());
                dealerValue = this.calculateHandValue(this.dealerHand);
                if (dealerValue > 21) break;
            }
            attempts++;
        } while (dealerValue !== playerValue && dealerValue <= 21 && attempts < 50);
        
        if (dealerValue === playerValue) {
            this.isFinished = true;
            this.result = 'push';
            this.betMultiplier = 1;
        } else {
            this.isFinished = true;
            this.result = 'push';
            this.betMultiplier = 1;
        }
    }

    generateLossHand() {
        let playerValue = 0;
        let dealerValue = 0;
        
        this.playerHand = [];
        this.dealerHand = [];
        
        while (playerValue < 14) {
            this.playerHand.push(this.drawCard());
            playerValue = this.calculateHandValue(this.playerHand);
            if (playerValue > 21) {
                this.playerHand = [];
                playerValue = 0;
                continue;
            }
        }
        
        let attempts = 0;
        do {
            this.dealerHand = [];
            dealerValue = 0;
            while (dealerValue < 18 || dealerValue <= playerValue) {
                this.dealerHand.push(this.drawCard());
                dealerValue = this.calculateHandValue(this.dealerHand);
                if (dealerValue > 21) break;
            }
            attempts++;
        } while ((dealerValue <= playerValue || dealerValue > 21) && attempts < 50);
        
        if (dealerValue > 21) {
            this.generateLossHand();
            return;
        }
        
        if (dealerValue > playerValue) {
            this.isFinished = true;
            this.result = 'loss';
            this.betMultiplier = 0;
        } else {
            this.isFinished = true;
            this.result = 'loss';
            this.betMultiplier = 0;
        }
    }

    playerHit() {
        if (this.isFinished) return;
        this.playerHand.push(this.drawCard());
        const playerValue = this.calculateHandValue(this.playerHand);
        if (playerValue > 21) {
            this.isFinished = true;
            this.result = 'bust';
            this.betMultiplier = 0;
        }
    }

    playerStand() {
        if (this.isFinished) return;
        
        const lossMultiplier = this.player.calculateLossMultiplier();
        let dealerValue = this.calculateHandValue(this.dealerHand);
        let targetScore = Math.floor(17 * (1 + (lossMultiplier - 1) * 0.05));
        targetScore = Math.max(17, Math.min(21, targetScore));
        
        while (dealerValue < targetScore && !this.isFinished) {
            this.dealerHand.push(this.drawCard());
            dealerValue = this.calculateHandValue(this.dealerHand);
        }
        
        this.isFinished = true;
        const playerValue = this.calculateHandValue(this.playerHand);
        
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

    getTaiXiuConfig() {
        const config = getGameConfig(this.player.userId, this.gameName);
        return {
            winRate: config.winRate || 48,
            lossRate: config.lossRate || 52
        };
    }

    roll() {
        const config = this.getTaiXiuConfig();
        const lossMultiplier = this.player.calculateLossMultiplier();
        
        let winRate = config.winRate / 100;
        let lossRate = config.lossRate / 100;
        
        winRate = Math.max(0.1, winRate - (lossMultiplier - 1) * 0.08);
        lossRate = Math.min(0.9, lossRate + (lossMultiplier - 1) * 0.08);
        
        const total = winRate + lossRate;
        winRate = winRate / total;
        lossRate = lossRate / total;
        
        let isTai;
        let totalDice;
        
        const random = Math.random();
        
        if (this.choice === 'tai') {
            isTai = random < winRate;
        } else {
            isTai = random >= winRate;
        }
        
        if (isTai) {
            totalDice = 11 + Math.floor(Math.random() * 7);
        } else {
            totalDice = 3 + Math.floor(Math.random() * 8);
        }
        
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
        
        let winRate = config.winRate / 100;
        let lossRate = config.lossRate / 100;
        
        winRate = Math.max(0.1, winRate - (lossMultiplier - 1) * 0.08);
        lossRate = Math.min(0.9, lossRate + (lossMultiplier - 1) * 0.08);
        
        const total = winRate + lossRate;
        winRate = winRate / total;
        lossRate = lossRate / total;
        
        const random = Math.random();
        
        if (this.choice === 'chan') {
            this.isEven = random < winRate;
        } else {
            this.isEven = random >= winRate;
        }
        
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
        
        if (!found) {
            if (this.isEven) {
                const evenValues = [0, 2, 4];
                this.total = evenValues[Math.floor(Math.random() * evenValues.length)];
            } else {
                const oddValues = [1, 3];
                this.total = oddValues[Math.floor(Math.random() * oddValues.length)];
            }
            
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
            for (let i = this.coins.length - 1; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1));
                [this.coins[i], this.coins[j]] = [this.coins[j], this.coins[i]];
            }
        }
        
        this.coinsDisplay = this.coins.map(c => c === 1 ? '🪙' : '⚫').join(' ');
        this.isFinished = true;
        this.result = this.isEven ? 'chan' : 'le';
        
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

    getBauCuaConfig() {
        const config = getGameConfig(this.player.userId, this.gameName);
        return {
            winRate: config.winRate || 30,
            lossRate: config.lossRate || 70,
            matchMultiplier: config.matchMultiplier || 2
        };
    }

    roll() {
        const config = this.getBauCuaConfig();
        const animals = BAU_CUA_ANIMALS;
        const lossMultiplier = this.player.calculateLossMultiplier();
        
        let winRate = config.winRate / 100;
        let lossRate = config.lossRate / 100;
        
        winRate = Math.max(0.05, winRate - (lossMultiplier - 1) * 0.08);
        lossRate = Math.min(0.95, lossRate + (lossMultiplier - 1) * 0.08);
        
        const total = winRate + lossRate;
        winRate = winRate / total;
        lossRate = lossRate / total;
        
        const willWin = Math.random() < winRate;
        
        const selected = [];
        const selectedNames = [];
        
        const availableAnimals = animals.filter(a => !this.choices.includes(a.name));
        const chosenAnimals = animals.filter(a => this.choices.includes(a.name));
        
        if (willWin) {
            const numMatches = Math.floor(Math.random() * 3) + 1;
            
            const matchedAnimals = [];
            for (let i = 0; i < numMatches; i++) {
                const randomAnimal = chosenAnimals[Math.floor(Math.random() * chosenAnimals.length)];
                matchedAnimals.push(randomAnimal);
            }
            
            const remaining = 3 - matchedAnimals.length;
            for (let i = 0; i < remaining; i++) {
                let randomAnimal;
                if (Math.random() < 0.7 && chosenAnimals.length > 0) {
                    randomAnimal = chosenAnimals[Math.floor(Math.random() * chosenAnimals.length)];
                } else {
                    randomAnimal = availableAnimals[Math.floor(Math.random() * availableAnimals.length)] || 
                                  animals[Math.floor(Math.random() * animals.length)];
                }
                matchedAnimals.push(randomAnimal);
            }
            
            for (let i = matchedAnimals.length - 1; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1));
                [matchedAnimals[i], matchedAnimals[j]] = [matchedAnimals[j], matchedAnimals[i]];
            }
            
            matchedAnimals.forEach(animal => {
                selected.push(animal);
                selectedNames.push(animal.name);
            });
            
        } else {
            for (let i = 0; i < 3; i++) {
                let randomAnimal;
                if (availableAnimals.length > 0) {
                    randomAnimal = availableAnimals[Math.floor(Math.random() * availableAnimals.length)];
                } else {
                    randomAnimal = animals[Math.floor(Math.random() * animals.length)];
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
        
        let matches = 0;
        for (const choice of this.choices) {
            for (const resultName of this.resultNames) {
                if (resultName === choice) {
                    matches++;
                }
            }
        }
        
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
        
        let winRate = config.winRate / 100;
        let lossRate = config.lossRate / 100;
        let jackpotRate = config.jackpotRate / 100;
        
        winRate = Math.max(0.05, winRate - (lossMultiplier - 1) * 0.08);
        lossRate = Math.min(0.95, lossRate + (lossMultiplier - 1) * 0.08);
        jackpotRate = Math.max(0.01, jackpotRate - (lossMultiplier - 1) * 0.01);
        
        const total = winRate + lossRate;
        winRate = winRate / total;
        lossRate = lossRate / total;
        
        const random = Math.random();
        const isWin = random < winRate;
        const isJackpot = random < jackpotRate && isWin;
        
        if (isJackpot) {
            const symbol = symbols[Math.floor(Math.random() * symbols.length)];
            this.reels = [symbol, symbol, symbol, symbol];
            this.winCount = 4;
            this.winSymbol = symbol;
            this.multiplier = config.jackpotMultiplier || 15;
            
        } else if (isWin) {
            const symbol = symbols[Math.floor(Math.random() * symbols.length)];
            const sameCount = Math.random() < 0.4 ? 3 : 2;
            
            this.reels = [];
            for (let i = 0; i < 4; i++) {
                if (i < sameCount) {
                    this.reels.push(symbol);
                } else {
                    let otherSymbol;
                    do {
                        otherSymbol = symbols[Math.floor(Math.random() * symbols.length)];
                    } while (otherSymbol === symbol);
                    this.reels.push(otherSymbol);
                }
            }
            
            for (let i = this.reels.length - 1; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1));
                [this.reels[i], this.reels[j]] = [this.reels[j], this.reels[i]];
            }
            
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
            this.reels = [];
            let attempts = 0;
            let hasPair = true;
            
            while (hasPair && attempts < 100) {
                this.reels = [];
                for (let i = 0; i < 4; i++) {
                    this.reels.push(symbols[Math.floor(Math.random() * symbols.length)]);
                }
                
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
        const config = getGameConfig(this.player.userId, this.gameName);
        const lossMultiplier = this.player.calculateLossMultiplier();
        
        let winRate = (config.winRate || 35) / 100;
        let lossRate = (config.lossRate || 40) / 100;
        let drawRate = (config.drawRate || 25) / 100;
        
        winRate = Math.max(0.05, winRate - (lossMultiplier - 1) * 0.05);
        lossRate = Math.min(0.85, lossRate + (lossMultiplier - 1) * 0.05);
        drawRate = 1 - winRate - lossRate;
        
        const total = winRate + lossRate + drawRate;
        winRate = winRate / total;
        lossRate = lossRate / total;
        drawRate = drawRate / total;
        
        const prizes = [];
        
        const multipliers = config.multipliers || {
            '2x': 25,
            '3x': 18,
            '5x': 10,
            '10x': 5,
            '20x': 2
        };
        
        let totalMultiplierChance = 0;
        for (const [multiplier, chance] of Object.entries(multipliers)) {
            totalMultiplierChance += chance;
        }
        
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
        
        prizes.push({
            name: '💔 Mất cược',
            multiplier: -1,
            chance: lossRate * 100,
            emoji: '💔'
        });
        
        prizes.push({
            name: '🔄 Hòa',
            multiplier: 0,
            chance: drawRate * 100,
            emoji: '🔄'
        });

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
        
        let winRate = config.winRate / 100;
        let lossRate = config.lossRate / 100;
        let drawRate = config.drawRate / 100;
        
        winRate = Math.max(0.05, winRate - (lossMultiplier - 1) * 0.08);
        lossRate = Math.min(0.85, lossRate + (lossMultiplier - 1) * 0.08);
        drawRate = 1 - winRate - lossRate;
        
        const total = winRate + lossRate + drawRate;
        winRate = winRate / total;
        lossRate = lossRate / total;
        drawRate = drawRate / total;
        
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
        
        if (resultType === 'win') {
            const botIndex = (playerIndex + 2) % 3;
            this.botChoice = choices[botIndex];
        } else if (resultType === 'loss') {
            const botIndex = (playerIndex + 1) % 3;
            this.botChoice = choices[botIndex];
        } else {
            this.botChoice = this.choice;
        }
        
        this.isFinished = true;
        this.result = resultType;
    }

    getResult() {
        if (!this.isFinished) return null;
        
        let winAmount = this.result === 'win' ? this.betAmount : 
                       this.result === 'draw' ? 0 : -this.betAmount;
        
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
        
        let winRate = config.winRate / 100;
        let lossRate = config.lossRate / 100;
        
        winRate = Math.max(0.05, winRate - (lossMultiplier - 1) * 0.08);
        lossRate = Math.min(0.95, lossRate + (lossMultiplier - 1) * 0.08);
        
        const total = winRate + lossRate;
        winRate = winRate / total;
        lossRate = lossRate / total;
        
        const willWin = Math.random() < winRate;
        
        let adjustedSecret = this.secretNumber;
        
        if (willWin) {
            const diff = Math.abs(number - adjustedSecret);
            if (diff > 10) {
                const direction = number > adjustedSecret ? 1 : -1;
                adjustedSecret += direction * Math.floor(diff * 0.3);
            }
        } else {
            const diff = Math.abs(number - adjustedSecret);
            if (diff < 20 && this.attempts < 3) {
                const direction = number > adjustedSecret ? -1 : 1;
                adjustedSecret += direction * Math.floor(20 + Math.random() * 30);
            }
        }
        
        adjustedSecret = Math.max(1, Math.min(100, adjustedSecret));
        this.secretNumber = Math.round(adjustedSecret);
        
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
        
        let winRate = config.winRate / 100;
        let lossRate = config.lossRate / 100;
        
        winRate = Math.max(0.05, winRate - (lossMultiplier - 1) * 0.08);
        lossRate = Math.min(0.95, lossRate + (lossMultiplier - 1) * 0.08);
        
        const total = winRate + lossRate;
        winRate = winRate / total;
        lossRate = lossRate / total;
        
        this.playerNumbers = [
            Math.floor(Math.random() * 10),
            Math.floor(Math.random() * 10),
            Math.floor(Math.random() * 10)
        ];
        
        const random = Math.random();
        let targetMatches;
        
        if (random < winRate * 0.3) {
            targetMatches = 3;
        } else if (random < winRate * 0.7) {
            targetMatches = 2;
        } else if (random < winRate) {
            targetMatches = 1;
        } else {
            targetMatches = 0;
        }
        
        if (targetMatches === 3) {
            this.winningNumbers = [...this.playerNumbers];
        } else if (targetMatches === 2) {
            this.winningNumbers = [...this.playerNumbers];
            const changeIndex = Math.floor(Math.random() * 3);
            let newNumber;
            do {
                newNumber = Math.floor(Math.random() * 10);
            } while (newNumber === this.winningNumbers[changeIndex]);
            this.winningNumbers[changeIndex] = newNumber;
        } else if (targetMatches === 1) {
            this.winningNumbers = [...this.playerNumbers];
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
        
        let matches = 0;
        for (let i = 0; i < 3; i++) {
            if (this.playerNumbers[i] === this.winningNumbers[i]) {
                matches++;
            }
        }
        
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
        if (counts.includes(4)) return 8;
        if (counts.includes(3) && counts.includes(2)) return 7;
        if (counts.includes(3)) return 6;
        if (counts.filter(c => c === 2).length === 2) return 5;
        if (counts.includes(2)) return 4;
        return 0;
    }

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
        
        let winRate = config.winRate / 100;
        let lossRate = config.lossRate / 100;
        let drawRate = config.drawRate / 100;
        
        winRate = Math.max(0.05, winRate - (lossMultiplier - 1) * 0.08);
        lossRate = Math.min(0.85, lossRate + (lossMultiplier - 1) * 0.08);
        drawRate = 1 - winRate - lossRate;
        
        const total = winRate + lossRate + drawRate;
        winRate = winRate / total;
        lossRate = lossRate / total;
        drawRate = drawRate / total;
        
        const random = Math.random();
        let resultType;
        
        if (random < winRate) {
            resultType = 'win';
        } else if (random < winRate + lossRate) {
            resultType = 'loss';
        } else {
            resultType = 'draw';
        }
        
        if (resultType === 'win') {
            this.generateWinHand();
        } else if (resultType === 'loss') {
            this.generateLossHand();
        } else {
            this.generateDrawHand();
        }
        
        this.isFinished = true;
    }

    generateWinHand() {
        let attempts = 0;
        let playerValue = 0;
        let botValue = 0;
        
        const strongHands = [4, 5, 6, 7, 8];
        
        do {
            this.playerHand = [];
            this.botHand = [];
            
            for (let i = 0; i < 5; i++) {
                this.playerHand.push(this.drawCard());
                this.botHand.push(this.drawCard());
            }
            
            playerValue = this.getHandValue(this.playerHand);
            botValue = this.getHandValue(this.botHand);
            attempts++;
            
        } while ((playerValue <= botValue || !strongHands.includes(playerValue)) && attempts < 50);
        
        if (playerValue <= botValue || !strongHands.includes(playerValue)) {
            this.playerHand = [];
            this.botHand = [];
            
            const rank = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A'][Math.floor(Math.random() * 13)];
            this.playerHand.push({ suit: '♥', value: rank });
            this.playerHand.push({ suit: '♦', value: rank });
            
            for (let i = 0; i < 3; i++) {
                let newCard;
                do {
                    newCard = this.drawCard();
                } while (newCard.value === rank);
                this.playerHand.push(newCard);
            }
            
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
        let attempts = 0;
        let playerValue = 0;
        let botValue = 0;
        
        do {
            this.playerHand = [];
            this.botHand = [];
            
            for (let i = 0; i < 5; i++) {
                this.playerHand.push(this.drawCard());
                this.botHand.push(this.drawCard());
            }
            
            playerValue = this.getHandValue(this.playerHand);
            botValue = this.getHandValue(this.botHand);
            attempts++;
            
        } while (playerValue >= botValue && attempts < 50);
        
        if (playerValue >= botValue) {
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
            
            const rank = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A'][Math.floor(Math.random() * 13)];
            this.botHand = [];
            this.botHand.push({ suit: '♥', value: rank });
            this.botHand.push({ suit: '♦', value: rank });
            
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
        let attempts = 0;
        let playerValue = 0;
        let botValue = 0;
        
        do {
            this.playerHand = [];
            this.botHand = [];
            
            for (let i = 0; i < 5; i++) {
                this.playerHand.push(this.drawCard());
                this.botHand.push(this.drawCard());
            }
            
            playerValue = this.getHandValue(this.playerHand);
            botValue = this.getHandValue(this.botHand);
            attempts++;
            
        } while (playerValue !== botValue && attempts < 50);
        
        if (playerValue !== botValue) {
            const handTypes = [0, 4, 5, 6];
            const handType = handTypes[Math.floor(Math.random() * handTypes.length)];
            
            this.playerHand = [];
            this.botHand = [];
            
            if (handType === 0) {
                const values = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A'];
                const shuffled = values.sort(() => Math.random() - 0.5);
                const selected = shuffled.slice(0, 5);
                for (let i = 0; i < 5; i++) {
                    this.playerHand.push({ suit: ['♥', '♦', '♣', '♠'][i % 4], value: selected[i] });
                    this.botHand.push({ suit: ['♥', '♦', '♣', '♠'][(i + 2) % 4], value: selected[i] });
                }
            } else if (handType === 4) {
                const rank = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A'][Math.floor(Math.random() * 13)];
                const suits = ['♥', '♦', '♣', '♠'];
                for (let i = 0; i < 2; i++) {
                    this.playerHand.push({ suit: suits[i], value: rank });
                    this.botHand.push({ suit: suits[i + 2], value: rank });
                }
                const otherRanks = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A'].filter(v => v !== rank);
                const shuffled = otherRanks.sort(() => Math.random() - 0.5);
                for (let i = 0; i < 3; i++) {
                    this.playerHand.push({ suit: suits[i % 4], value: shuffled[i] });
                    this.botHand.push({ suit: suits[(i + 1) % 4], value: shuffled[i] });
                }
            } else if (handType === 5) {
                const ranks = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A'];
                const shuffled = ranks.sort(() => Math.random() - 0.5);
                const pair1 = shuffled[0];
                const pair2 = shuffled[1];
                const suits = ['♥', '♦', '♣', '♠'];
                this.playerHand.push({ suit: suits[0], value: pair1 });
                this.playerHand.push({ suit: suits[1], value: pair1 });
                this.botHand.push({ suit: suits[2], value: pair1 });
                this.botHand.push({ suit: suits[3], value: pair1 });
                this.playerHand.push({ suit: suits[0], value: pair2 });
                this.playerHand.push({ suit: suits[1], value: pair2 });
                this.botHand.push({ suit: suits[2], value: pair2 });
                this.botHand.push({ suit: suits[3], value: pair2 });
                const kicker = shuffled[2];
                this.playerHand.push({ suit: suits[0], value: kicker });
                this.botHand.push({ suit: suits[2], value: kicker });
            } else if (handType === 6) {
                const rank = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A'][Math.floor(Math.random() * 13)];
                const suits = ['♥', '♦', '♣', '♠'];
                for (let i = 0; i < 3; i++) {
                    this.playerHand.push({ suit: suits[i], value: rank });
                    this.botHand.push({ suit: suits[i], value: rank });
                }
                const otherRanks = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A'].filter(v => v !== rank);
                const shuffled = otherRanks.sort(() => Math.random() - 0.5);
                for (let i = 0; i < 2; i++) {
                    this.playerHand.push({ suit: suits[i % 4], value: shuffled[i] });
                    this.botHand.push({ suit: suits[(i + 1) % 4], value: shuffled[i] });
                }
            }
            
            playerValue = this.getHandValue(this.playerHand);
            botValue = this.getHandValue(this.botHand);
            
            if (playerValue !== botValue) {
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
        
        let redRate = config.redRate / 100;
        let blackRate = config.blackRate / 100;
        let greenRate = config.greenRate / 100;
        
        redRate = Math.max(0.1, redRate - (lossMultiplier - 1) * 0.05);
        blackRate = Math.max(0.1, blackRate - (lossMultiplier - 1) * 0.05);
        greenRate = Math.min(0.1, greenRate + (lossMultiplier - 1) * 0.02);
        
        const total = redRate + blackRate + greenRate;
        redRate = redRate / total;
        blackRate = blackRate / total;
        greenRate = greenRate / total;
        
        const random = Math.random();
        let resultColor;
        
        if (random < redRate) {
            resultColor = 'red';
        } else if (random < redRate + blackRate) {
            resultColor = 'black';
        } else {
            resultColor = 'green';
        }
        
        let winRate = config.winRate / 100;
        let lossRate = config.lossRate / 100;
        
        winRate = Math.max(0.1, winRate - (lossMultiplier - 1) * 0.08);
        lossRate = Math.min(0.9, lossRate + (lossMultiplier - 1) * 0.08);
        
        const totalWL = winRate + lossRate;
        winRate = winRate / totalWL;
        lossRate = lossRate / totalWL;
        
        let isWin = Math.random() < winRate;
        
        let number;
        let color;
        
        if (isWin) {
            if (this.choice === 'red') {
                color = 'red';
                const redNumbers = [1, 3, 5, 7, 9, 12, 14, 16, 18, 19, 21, 23, 25, 27, 30, 32, 34, 36];
                number = redNumbers[Math.floor(Math.random() * redNumbers.length)];
            } else if (this.choice === 'black') {
                color = 'black';
                const blackNumbers = [2, 4, 6, 8, 10, 11, 13, 15, 17, 20, 22, 24, 26, 28, 29, 31, 33, 35];
                number = blackNumbers[Math.floor(Math.random() * blackNumbers.length)];
            } else if (this.choice === 'green') {
                color = 'green';
                number = 0;
            } else if (!isNaN(this.choice)) {
                const num = parseInt(this.choice);
                if (num >= 0 && num <= 36) {
                    number = num;
                    if (num === 0) color = 'green';
                    else if (num % 2 === 0) color = 'black';
                    else color = 'red';
                } else {
                    number = Math.floor(Math.random() * 37);
                    if (number === 0) color = 'green';
                    else if (number % 2 === 0) color = 'black';
                    else color = 'red';
                }
            } else {
                number = Math.floor(Math.random() * 37);
                if (number === 0) color = 'green';
                else if (number % 2 === 0) color = 'black';
                else color = 'red';
            }
        } else {
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
                let num;
                do {
                    num = Math.floor(Math.random() * 37);
                } while (num === parseInt(this.choice));
                number = num;
                if (number === 0) color = 'green';
                else if (number % 2 === 0) color = 'black';
                else color = 'red';
            } else {
                number = Math.floor(Math.random() * 37);
                if (number === 0) color = 'green';
                else if (number % 2 === 0) color = 'black';
                else color = 'red';
            }
        }
        
        this.resultNumber = number;
        this.resultColor = color;
        this.isFinished = true;
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
        const config = getGameConfig(this.player.userId, this.gameName);
        const lossMultiplier = this.player.calculateLossMultiplier();
        
        let winRate = (config.winRate || 45) / 100;
        let crashProbability = (config.crashProbability || 55) / 100;
        
        winRate = Math.max(0.05, winRate - (lossMultiplier - 1) * 0.08);
        crashProbability = Math.min(0.95, crashProbability + (lossMultiplier - 1) * 0.08);
        
        const willCrash = Math.random() > winRate;
        
        let crashPoint;
        if (willCrash) {
            const minMultiplier = config.minMultiplier || 1.1;
            const maxCrash = Math.min((config.maxMultiplier || 10) * 0.4, (config.maxMultiplier || 10) * 0.6);
            crashPoint = minMultiplier + Math.random() * (maxCrash - minMultiplier);
        } else {
            const minHigh = (config.maxMultiplier || 10) * 0.5;
            const maxHigh = (config.maxMultiplier || 10) * 0.95;
            crashPoint = minHigh + Math.random() * (maxHigh - minHigh);
        }
        
        crashPoint = crashPoint / (1 + (lossMultiplier - 1) * 0.15);
        
        crashPoint = Math.max(config.minMultiplier || 1.1, crashPoint);
        crashPoint = Math.min(config.maxMultiplier || 10, crashPoint);
        
        this.crashPoint = Math.round(crashPoint * 100) / 100;
        
        return this.crashPoint;
    }

    play() {
        this.crashPoint = this.calculateCrashPoint();
        
        const rng = Math.random();
        
        if (rng < 0.3) {
            this.multiplier = 1 + Math.random() * 0.5;
        } else if (rng < 0.6) {
            this.multiplier = this.crashPoint * 0.5 + Math.random() * (this.crashPoint * 0.3);
        } else if (rng < 0.85) {
            this.multiplier = this.crashPoint * 0.8 + Math.random() * (this.crashPoint * 0.15);
        } else {
            this.multiplier = this.crashPoint;
        }
        
        this.multiplier = Math.min(this.multiplier, this.crashPoint - 0.01);
        this.multiplier = Math.max(1, this.multiplier);
        this.multiplier = Math.round(this.multiplier * 100) / 100;
        
        this.isFinished = true;
    }

    getResult() {
        if (!this.isFinished) return null;
        
        const winAmount = this.betAmount * this.multiplier;
        const isWin = winAmount > this.betAmount;
        
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
        
        let winRate = config.winRate / 100;
        let lossRate = config.lossRate / 100;
        
        winRate = Math.max(0.1, winRate - (lossMultiplier - 1) * 0.08);
        lossRate = Math.min(0.9, lossRate + (lossMultiplier - 1) * 0.08);
        
        const total = winRate + lossRate;
        winRate = winRate / total;
        lossRate = lossRate / total;
        
        const isWin = Math.random() < winRate;
        
        let result;
        
        if (isWin) {
            if (this.choice === '1-3') {
                result = Math.floor(Math.random() * 3) + 1;
            } else if (this.choice === '4-6') {
                result = Math.floor(Math.random() * 3) + 4;
            } else if (this.choice === 'even') {
                const evenNumbers = [2, 4, 6];
                result = evenNumbers[Math.floor(Math.random() * evenNumbers.length)];
            } else if (this.choice === 'odd') {
                const oddNumbers = [1, 3, 5];
                result = oddNumbers[Math.floor(Math.random() * oddNumbers.length)];
            } else if (!isNaN(this.choice)) {
                const num = parseInt(this.choice);
                if (num >= 1 && num <= 6) {
                    result = num;
                } else {
                    result = Math.floor(Math.random() * 6) + 1;
                }
            } else {
                result = Math.floor(Math.random() * 6) + 1;
            }
        } else {
            if (this.choice === '1-3') {
                result = Math.floor(Math.random() * 3) + 4;
            } else if (this.choice === '4-6') {
                result = Math.floor(Math.random() * 3) + 1;
            } else if (this.choice === 'even') {
                const oddNumbers = [1, 3, 5];
                result = oddNumbers[Math.floor(Math.random() * oddNumbers.length)];
            } else if (this.choice === 'odd') {
                const evenNumbers = [2, 4, 6];
                result = evenNumbers[Math.floor(Math.random() * evenNumbers.length)];
            } else if (!isNaN(this.choice)) {
                const num = parseInt(this.choice);
                let randomNum;
                do {
                    randomNum = Math.floor(Math.random() * 6) + 1;
                } while (randomNum === num);
                result = randomNum;
            } else {
                result = Math.floor(Math.random() * 6) + 1;
            }
        }
        
        this.result = result;
        this.isFinished = true;
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
        
        let winRate = config.winRate / 100;
        let lossRate = config.lossRate / 100;
        
        winRate = Math.max(0.1, winRate - (lossMultiplier - 1) * 0.08);
        lossRate = Math.min(0.9, lossRate + (lossMultiplier - 1) * 0.08);
        
        const total = winRate + lossRate;
        winRate = winRate / total;
        lossRate = lossRate / total;
        
        const isWin = Math.random() < winRate;
        
        let result;
        
        if (isWin) {
            result = this.choice;
        } else {
            result = this.choice === 'heads' ? 'tails' : 'heads';
        }
        
        this.result = result;
        this.isFinished = true;
    }

    getResult() {
        if (!this.isFinished) return null;
        
        const isWin = this.choice === this.result;
        const winAmount = isWin ? this.betAmount * 2 : -this.betAmount;
        
        const resultEmojis = {
            'heads': '🪙 Mặt Ngửa',
            'tails': '🪙 Mặt Sấp'
        };
        
        const choiceEmojis = {
            'heads': '🪙 Ngửa',
            'tails': '🪙 Sấp'
        };
        
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

// === PHẦN CLIENT EVENTS ===
client.once('ready', () => {
    console.log(`✅ Bot da san sang hoat dong voi ten: ${client.user.tag}`);
    
    console.log(`📊 Bot dang o ${client.guilds.cache.size} server:`);
    client.guilds.cache.forEach(guild => {
        console.log(`   - ${guild.name} (${guild.id})`);
    });
    
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

// === XỬ LÝ MESSAGE ===
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
        if (!OWNER_ID) {
            return message.reply('❌ OWNER_ID chưa được cấu hình trong file .env!');
        }
        
        if (message.author.id !== OWNER_ID) {
            return message.reply('❌ Bạn không có quyền sử dụng lệnh này!');
        }
        
        const subCommand = args.shift()?.toLowerCase();
        
        // === LỆNH SET GLOBAL WIN RATE ===
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
            
            let config = loadBotConfig() || {};
            if (!config.globalWinRate) config.globalWinRate = {};
            
            config.globalWinRate.enabled = true;
            config.globalWinRate.winRate = winRate;
            config.globalWinRate.lossRate = lossRate;
            config.globalWinRate.drawRate = 0;
            
            fs.writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2));
            loadBotConfig();
            GLOBAL_WIN_RATE = config.globalWinRate || { enabled: false, winRate: 50, lossRate: 50 };
            
            return message.reply(`✅ Đã cập nhật GLOBAL WIN RATE:
        📊 Tỷ lệ thắng: **${winRate}%**
        📊 Tỷ lệ thua: **${lossRate}%**
        📌 Áp dụng cho TẤT CẢ người chơi và game!`);
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
            
            if (playerConfig.global) {
                response += `**🌍 GLOBAL:**\n`;
                response += `  - winRate: ${playerConfig.global.winRate || 50}%\n`;
                response += `  - lossRate: ${playerConfig.global.lossRate || 50}%\n`;
                response += `  - drawRate: ${playerConfig.global.drawRate || 0}%\n\n`;
            }
            
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
            
            const validGames = ['luckydraw', 'crash', 'blackjack', 'taixiu', 'xocdia', 'slot', 'kbb', 'horse', 'racing', 'baucua', 'guess', 'lottery', 'poker', 'roulette', 'dice', 'coinflip'];
            
            if (!validGames.includes(gameName)) {
                return message.reply(`❌ Game không hợp lệ! Các game: ${validGames.join(', ')}`);
            }
            
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
            
            fs.writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2));
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
            
            fs.writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2));
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
            let playerConfigText = '📌 **CẤU HÌNH NGƯỜI CHƠI RIÊNG:**\n';
            let globalConfig = '🌍 **GLOBAL WIN RATE:**\n';
            
            if (config.globalWinRate) {
                globalConfig += `Trạng thái: ${config.globalWinRate.enabled ? '🟢 BẬT' : '🔴 TẮT'}\n`;
                globalConfig += `Win Rate: ${config.globalWinRate.winRate || 50}%\n`;
                globalConfig += `Loss Rate: ${config.globalWinRate.lossRate || 50}%\n`;
                globalConfig += `Draw Rate: ${config.globalWinRate.drawRate || 0}%\n\n`;
            } else {
                globalConfig += '❌ Chưa có cấu hình Global\n\n';
            }
            
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
            
            if (config.playerOverrides && Object.keys(config.playerOverrides).length > 0) {
                let count = 0;
                for (const [userId, games] of Object.entries(config.playerOverrides)) {
                    if (count > 0) playerConfigText += '\n';
                    playerConfigText += `<@${userId}>:\n`;
                    
                    if (games.global) {
                        playerConfigText += `  **GLOBAL:**\n`;
                        playerConfigText += `    - winRate: ${games.global.winRate || 50}\n`;
                        playerConfigText += `    - lossRate: ${games.global.lossRate || 50}\n`;
                        playerConfigText += `    - drawRate: ${games.global.drawRate || 0}\n`;
                    }
                    
                    for (const [game, settings] of Object.entries(games)) {
                        if (game === 'global') continue;
                        playerConfigText += `  **${game.toUpperCase()}:**\n`;
                        const settingsStr = Object.entries(settings)
                            .filter(([key]) => !['multipliers', 'matchMultipliers'].includes(key))
                            .map(([key, value]) => `    - ${key}: ${value}`)
                            .join('\n');
                        playerConfigText += settingsStr + '\n';
                    }
                    count++;
                }
            } else {
                playerConfigText += '📌 Chưa có cấu hình riêng cho người chơi nào.\n';
            }
            
            const embeds = [];
            
            if (globalConfig.length > 0) {
                embeds.push(createGameEmbed('🌍 GLOBAL WIN RATE', globalConfig, '#ff9900'));
            }
            
            if (serverConfig.length > 0) {
                // Chia nhỏ nếu quá dài
                if (serverConfig.length > 2000) {
                    const parts = serverConfig.match(/.{1,1900}/g) || [];
                    for (let i = 0; i < parts.length; i++) {
                        embeds.push(createGameEmbed(
                            `📊 CẤU HÌNH SERVER (${i + 1}/${parts.length})`,
                            parts[i],
                            '#0099ff'
                        ));
                    }
                } else {
                    embeds.push(createGameEmbed('📊 CẤU HÌNH SERVER', serverConfig, '#0099ff'));
                }
            }
            
            if (playerConfigText.length > 0) {
                if (playerConfigText.length > 2000) {
                    const parts = playerConfigText.match(/.{1,1900}/g) || [];
                    for (let i = 0; i < parts.length; i++) {
                        embeds.push(createGameEmbed(
                            `👤 CẤU HÌNH PLAYER (${i + 1}/${parts.length})`,
                            parts[i],
                            '#ff66ff'
                        ));
                    }
                } else {
                    embeds.push(createGameEmbed('👤 CẤU HÌNH PLAYER', playerConfigText, '#ff66ff'));
                }
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
            
            transaction.status = 'completed';
            transactions[transactionId] = transaction;
            saveTransactions(transactions);
            
            const targetId = transaction.userId;
            if (players.has(targetId)) {
                const targetPlayer = players.get(targetId);
                const amount = transaction.amount;
                
                for (const deposit of targetPlayer.pendingDeposits) {
                    if (deposit.transactionId === transactionId && deposit.status === 'pending') {
                        deposit.status = 'completed';
                        break;
                    }
                }
                
                for (const deposit of targetPlayer.depositHistory) {
                    if (deposit.transactionId === transactionId && deposit.status === 'pending') {
                        deposit.status = 'completed';
                        break;
                    }
                }
                
                targetPlayer.money += amount;
                targetPlayer.totalDeposited += amount;
                targetPlayer.xp += amount / 10;
                targetPlayer.checkLevelUp();
                savePlayers(players);
                
                const embed = createGameEmbed(
                    '✅ XAC NHAN NAP TIEN',
                    `Da xac nhan nap tien cho <@${targetId}>`,
                    '#00ff00',
                    [
                        { name: '💰 So tien', value: `${amount.toLocaleString()} VND`, inline: true },
                        { name: '🔑 Ma giao dich', value: transactionId, inline: true },
                        { name: '💵 So du hien tai', value: `${targetPlayer.money.toLocaleString()} VND`, inline: true },
                        { name: '📌 Trang thai', value: '✅ Da xac nhan', inline: true }
                    ]
                );
                
                try {
                    const user = await client.users.fetch(targetId);
                    if (user) {
                        await user.send(`🎉 **XAC NHAN NAP TIEN THANH CONG!**\n\n💰 So tien: ${amount.toLocaleString()} VND\n🔑 Ma giao dich: ${transactionId}\n💵 So du hien tai: ${targetPlayer.money.toLocaleString()} VND`);
                    }
                } catch (error) {
                    console.log('Khong the gui DM cho user');
                }
                
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
            
            transactions[transactionId].status = 'cancelled';
            saveTransactions(transactions);
            
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
      • testadmin - Kiểm tra admin channel`);
    }
    
    // === LỆNH NẠP TIỀN ===
    if (command === 'nap' || command === 'deposit') {
        const amount = parseInt(args[0]);
        
        if (isNaN(amount) || amount < 10000) {
            return message.reply('⚠️ So tien nap toi thieu la 10.000 VND!');
        }

        if (amount > 100000000) {
            return message.reply('⚠️ So tien nap toi da la 100.000.000 VND!');
        }

        const transactionId = generateTransactionId(userId, amount);
        const transferContent = generateTransferContent(userId, message.author.username, amount);
        
        let vietQRDataUrl = await generateVietQR(
            BANK_INFO.bankCode,
            BANK_INFO.accountNumber,
            BANK_INFO.accountName,
            amount,
            transferContent
        );
        
        if (!vietQRDataUrl) {
            vietQRDataUrl = await generateVietQRFromAPI(
                BANK_INFO.bankCode,
                BANK_INFO.accountNumber,
                BANK_INFO.accountName,
                amount,
                transferContent
            );
        }
        
        if (!vietQRDataUrl) {
            const fallbackText = `NGAN HANG: ${BANK_INFO.bankName}\nSO TK: ${BANK_INFO.accountNumber}\nCHU TK: ${BANK_INFO.accountName}\nSO TIEN: ${amount.toLocaleString()} VND\nNOI DUNG: ${transferContent}`;
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
            return message.reply('❌ Loi tao VietQR Code, vui long thu lai sau!');
        }

        const embed = new EmbedBuilder()
            .setColor('#00ff88')
            .setTitle('💰 HUONG DAN NAP TIEN - VIETQR')
            .setDescription(`**${message.author.username}**, quet ma QR ben duoi de chuyen khoan:`)
            .addFields(
                { name: '🏦 Ngan hang', value: BANK_INFO.bankName, inline: true },
                { name: '💳 So tai khoan', value: BANK_INFO.accountNumber, inline: true },
                { name: '👤 Chu tai khoan', value: BANK_INFO.accountName, inline: true },
                { name: '💰 So tien', value: `${amount.toLocaleString()} VND`, inline: true },
                { name: '📝 Noi dung chuyen khoan', value: `\`${transferContent}\``, inline: false },
                { name: '🔑 Ma giao dich', value: `\`${transactionId}\``, inline: false },
                { name: '⏰ Thoi gian', value: `Cho xac nhan trong vong 30 phut`, inline: false },
                { name: '📌 Trang thai', value: `⏳ Dang cho xac nhan`, inline: false }
            )
            .setImage('attachment://vietqr.png')
            .setTimestamp()
            .setFooter({ text: '💡 Quet ma QR bang app ngan hang de chuyen tien nhanh chong!' });

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
                bankName: BANK_INFO.bankName,
                bankCode: BANK_INFO.bankCode,
                accountNumber: BANK_INFO.accountNumber,
                accountName: BANK_INFO.accountName
            }
        };
        saveTransactions(transactions);

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

        await message.reply({
            embeds: [embed],
            files: [{ attachment: imageBuffer, name: 'vietqr.png' }]
        });

        const adminEmbed = createGameEmbed(
            '🔔 YEU CAU NAP TIEN',
            `Nguoi choi <@${userId}> yeu cau nap tien`,
            '#ff9900',
            [
                { name: '👤 Nguoi choi', value: `${message.author.username} (${userId})`, inline: true },
                { name: '💰 So tien', value: `${amount.toLocaleString()} VND`, inline: true },
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

    // === CÁC LỆNH GAME KHÁC ===
    // (Các lệnh game Poker, Roulette, Crash, Dice, Coinflip, Blackjack, TaiXiu, XocDia, BauCua, Slot, LuckyDraw, KBB, Guess, Horse, Racing, Lottery)
    // Tất cả các lệnh game này đều sử dụng getGameConfig() để lấy tỷ lệ
    
    // === LỆNH POKER ===
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

        const game = new Poker(player, betAmount);
        game.play();
        const result = game.getResult();
        const isWin = result.isWin;
        const winAmount = result.winAmount;
        const profit = winAmount - betAmount;
        
        player.addMoney(profit);
        if (isWin) {
            player.pokerWins++;
        } else if (result.result === 'draw') {
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

        const effect = isWin ? createWinEffect() : (result.result === 'draw' ? '🤝' : createLoseEffect());
        
        const progressBarLength = 20;
        const progress = isWin ? 1 : (result.result === 'draw' ? 0.5 : 0);
        const filledLength = Math.floor(progress * progressBarLength);
        const emptyLength = progressBarLength - filledLength;
        const progressBar = '🟩'.repeat(Math.max(0, filledLength)) + '⬜'.repeat(Math.max(0, emptyLength));
        
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

    // === LỆNH ROULETTE ===
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

        const validChoices = ['red', 'black', 'green'];
        const isNumber = !isNaN(choice) && parseInt(choice) >= 0 && parseInt(choice) <= 36;
        
        if (!validChoices.includes(choice.toLowerCase()) && !isNumber) {
            return message.reply(`⚠️ Vui lòng chọn "red", "black", "green" hoặc một số từ 0-36!`);
        }

        const finalChoice = isNumber ? parseInt(choice) : choice.toLowerCase();

        const game = new Roulette(player, betAmount, finalChoice);
        game.spin();
        const result = game.getResult();
        const isWin = result.isWin;
        const profit = result.profit || (result.winAmount - betAmount);
        const multiplier = result.multiplier || 1;
        
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

        const effect = isWin ? createWinEffect() : createLoseEffect();
        
        const colorEmojis = {
            'red': '🔴',
            'black': '⚫',
            'green': '🟢'
        };
        
        const colorEmoji = colorEmojis[result.color] || '🎯';
        const choiceDisplay = typeof finalChoice === 'number' ? `Số ${finalChoice}` : finalChoice.toUpperCase();
        
        const progressBarLength = 20;
        const progress = isWin ? 1 : 0;
        const filledLength = Math.floor(progress * progressBarLength);
        const emptyLength = progressBarLength - filledLength;
        const progressBar = '🟩'.repeat(Math.max(0, filledLength)) + '⬜'.repeat(Math.max(0, emptyLength));
        
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

    // === LỆNH CRASH ===
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

        const game = new Crash(player, betAmount);
        game.play();
        const result = game.getResult();
        const isWin = result.isWin;
        const winAmount = result.winAmount;
        const profit = result.profit;
        const multiplier = result.multiplier;
        const crashPoint = result.crashPoint;
        
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

        const effect = isWin ? createWinEffect() : createLoseEffect();
        
        const progressBarLength = 20;
        const progress = Math.min(multiplier / (crashPoint || 1), 1);
        const filledLength = Math.floor(progress * progressBarLength);
        const emptyLength = progressBarLength - filledLength;
        const progressBar = '🟩'.repeat(Math.max(0, filledLength)) + '⬜'.repeat(Math.max(0, emptyLength));
        
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
        
        let riskLevel = '🟢 Thấp';
        let riskColor = '#00ff00';
        if (multiplier > crashPoint * 0.7) {
            riskLevel = '🔴 Cao';
            riskColor = '#ff0000';
        } else if (multiplier > crashPoint * 0.4) {
            riskLevel = '🟡 Trung bình';
            riskColor = '#ff9900';
        }
        
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

    // === LỆNH DICE ===
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

        const validChoices = ['1-3', '4-6', 'even', 'odd'];
        const isNumber = !isNaN(choice) && parseInt(choice) >= 1 && parseInt(choice) <= 6;
        
        if (!validChoices.includes(choice.toLowerCase()) && !isNumber) {
            return message.reply(`⚠️ Vui lòng chọn "1-3", "4-6", "even", "odd" hoặc một số từ 1-6!`);
        }

        const finalChoice = isNumber ? parseInt(choice) : choice.toLowerCase();

        const game = new Dice(player, betAmount, finalChoice);
        game.roll();
        const result = game.getResult();
        const isWin = result.isWin;
        const profit = result.profit || (result.winAmount - betAmount);
        const multiplier = result.multiplier || 1;
        const diceResult = result.result;
        
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

        const effect = isWin ? createWinEffect() : createLoseEffect();
        
        const diceEmojis = ['⚀', '⚁', '⚂', '⚃', '⚄', '⚅'];
        const diceEmoji = diceEmojis[diceResult - 1] || '🎲';
        
        let betType = '';
        if (typeof finalChoice === 'number') {
            betType = `Số ${finalChoice}`;
        } else {
            betType = finalChoice.toUpperCase();
        }
        
        const progressBarLength = 20;
        const progress = isWin ? 1 : 0;
        const filledLength = Math.floor(progress * progressBarLength);
        const emptyLength = progressBarLength - filledLength;
        const progressBar = '🟩'.repeat(Math.max(0, filledLength)) + '⬜'.repeat(Math.max(0, emptyLength));
        
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

    // === LỆNH COINFLIP ===
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

        const game = new CoinFlip(player, betAmount, choice);
        game.flip();
        const result = game.getResult();
        const isWin = result.isWin;
        const profit = result.profit || (result.winAmount - betAmount);
        
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

        const effect = isWin ? createWinEffect() : createLoseEffect();
        
        const resultText = result.resultDisplay || (result.result === 'heads' ? 'Mặt Ngửa' : 'Mặt Sấp');
        
        const progressBarLength = 20;
        const progress = isWin ? 1 : 0;
        const filledLength = Math.floor(progress * progressBarLength);
        const emptyLength = progressBarLength - filledLength;
        const progressBar = '🟩'.repeat(Math.max(0, filledLength)) + '⬜'.repeat(Math.max(0, emptyLength));
        
        const fields = [
            { 
                name: '🪙 Kết quả', 
                value: `🪙 **${resultText}**`, 
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

    // === GAME XÌ RÁCH ===
    if (command === 'blackjack' || command === 'xirach' || command === 'bj') {
        if (args.length < 1) {
            const embed = createGameEmbed(
                '♠️ XÌ RÁCH (BLACKJACK)',
                '**Hướng dẫn chơi:**\nĐánh bài với nhà cái!\n\n**🎯 Cách dùng:**\n`!blackjack [số tiền]`\n\n**📊 Cách chơi:**\n• Mỗi người được chia 2 lá bài\n• Rút thêm bài để gần 21 điểm nhất\n• Blackjack (21 điểm) thắng x2.5\n• Thắng thường x2\n• Hòa nhận lại tiền\n\n**📊 Ví dụ:**\n`!blackjack 1000`',
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
            
            // Thêm debug cho admin
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
            `Tiền cược: **${betAmount.toLocaleString()} VND**`,
            '#0099ff',
            [
                { name: '🎴 Bài của bạn', value: displayHand(game.playerHand), inline: false },
                { name: '📊 Điểm của bạn', value: `${playerValue}`, inline: true },
                { name: '🎴 Bài của nhà cái', value: displayHand(game.dealerHand, true), inline: false }
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
                    .setLabel('✋ Dừng')
                    .setStyle(ButtonStyle.Success)
            );
    
        const reply = await message.reply({ embeds: [embed], components: [row] });
    
        const filter = i => i.user.id === message.author.id;
        const collector = reply.createMessageComponentCollector({ filter, time: 60000 });
    
        collector.on('collect', async i => {
            const currentGame = games.get(message.id);
            if (!currentGame) return;
    
            if (i.customId === 'hit') {
                currentGame.playerHit();
            } else if (i.customId === 'stand') {
                currentGame.playerStand();
            }
    
            const newPlayerValue = currentGame.calculateHandValue(currentGame.playerHand);
            const newDealerValue = currentGame.calculateHandValue(currentGame.dealerHand);
            const result = currentGame.getResult();
    
            if (currentGame.isFinished) {
                const profit = result.winAmount - currentGame.betAmount;
                const isWin = profit > 0;
                
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
                
                const fields = [
                    { name: '🎴 Bài của bạn', value: displayHand(currentGame.playerHand), inline: false },
                    { name: '📊 Điểm của bạn', value: `${newPlayerValue}`, inline: true },
                    { name: '🎴 Bài của nhà cái', value: displayHand(currentGame.dealerHand), inline: false },
                    { name: '📊 Điểm của nhà cái', value: `${newDealerValue}`, inline: true },
                    { name: '💰 Số tiền nhận được', value: `${profit > 0 ? '+' : ''}${profit.toLocaleString()} VND`, inline: true },
                    { name: '💵 Số dư hiện tại', value: `${player.money.toLocaleString()} VND`, inline: true }
                ];
                
                // Thêm debug cho admin
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
    
                await i.update({ embeds: [resultEmbed], components: [] });
                games.delete(message.id);
            } else {
                const updateEmbed = createGameEmbed(
                    '♠️ XÌ RÁCH',
                    `Tiền cược: **${currentGame.betAmount.toLocaleString()} VND**`,
                    '#0099ff',
                    [
                        { name: '🎴 Bài của bạn', value: displayHand(currentGame.playerHand), inline: false },
                        { name: '📊 Điểm của bạn', value: `${newPlayerValue}`, inline: true },
                        { name: '🎴 Bài của nhà cái', value: displayHand(currentGame.dealerHand, true), inline: false }
                    ]
                );
    
                await i.update({ embeds: [updateEmbed], components: [row] });
            }
        });
    
        collector.on('end', async () => {
            const currentGame = games.get(message.id);
            if (currentGame && !currentGame.isFinished) {
                currentGame.playerStand();
                const result = currentGame.getResult();
                const profit = result.winAmount - currentGame.betAmount;
                const isWin = profit > 0;
                
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
                
                const endEmbed = createGameEmbed(
                    '⏰ KẾT THÚC XÌ RÁCH',
                    '⏰ Hết thời gian! Tự động dừng bài.',
                    '#ff9900',
                    [
                        { name: '💰 Số tiền nhận được', value: `${profit > 0 ? '+' : ''}${profit.toLocaleString()} VND`, inline: true },
                        { name: '💵 Số dư hiện tại', value: `${player.money.toLocaleString()} VND`, inline: true }
                    ]
                );
                await reply.edit({ embeds: [endEmbed], components: [] });
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
            { name: '🦀 !baucua [so tien] [con vat]', value: 'Choi Bau cua - Vi du: !baucua 1000 cua,tom', inline: false }
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
        
        await message.reply({ embeds: [embed1, embed2] });
        return;
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

// === GAME XÌ RÁCH ===
if (command === 'blackjack' || command === 'xirach' || command === 'bj') {
    if (args.length < 1) {
        const embed = createGameEmbed(
            '♠️ XÌ RÁCH (BLACKJACK)',
            '**Hướng dẫn chơi:**\nĐánh bài với nhà cái!\n\n**🎯 Cách dùng:**\n`!blackjack [số tiền]`\n\n**📊 Cách chơi:**\n• Mỗi người được chia 2 lá bài\n• Rút thêm bài để gần 21 điểm nhất\n• Blackjack (21 điểm) thắng x2.5\n• Thắng thường x2\n• Hòa nhận lại tiền\n\n**📊 Ví dụ:**\n`!blackjack 1000`',
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
        
        // Thêm debug cho admin
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
        `Tiền cược: **${betAmount.toLocaleString()} VND**`,
        '#0099ff',
        [
            { name: '🎴 Bài của bạn', value: displayHand(game.playerHand), inline: false },
            { name: '📊 Điểm của bạn', value: `${playerValue}`, inline: true },
            { name: '🎴 Bài của nhà cái', value: displayHand(game.dealerHand, true), inline: false }
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
                .setLabel('✋ Dừng')
                .setStyle(ButtonStyle.Success)
        );

    const reply = await message.reply({ embeds: [embed], components: [row] });

    const filter = i => i.user.id === message.author.id;
    const collector = reply.createMessageComponentCollector({ filter, time: 60000 });

    collector.on('collect', async i => {
        const currentGame = games.get(message.id);
        if (!currentGame) return;

        if (i.customId === 'hit') {
            currentGame.playerHit();
        } else if (i.customId === 'stand') {
            currentGame.playerStand();
        }

        const newPlayerValue = currentGame.calculateHandValue(currentGame.playerHand);
        const newDealerValue = currentGame.calculateHandValue(currentGame.dealerHand);
        const result = currentGame.getResult();

        if (currentGame.isFinished) {
            const profit = result.winAmount - currentGame.betAmount;
            const isWin = profit > 0;
            
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
            
            const fields = [
                { name: '🎴 Bài của bạn', value: displayHand(currentGame.playerHand), inline: false },
                { name: '📊 Điểm của bạn', value: `${newPlayerValue}`, inline: true },
                { name: '🎴 Bài của nhà cái', value: displayHand(currentGame.dealerHand), inline: false },
                { name: '📊 Điểm của nhà cái', value: `${newDealerValue}`, inline: true },
                { name: '💰 Số tiền nhận được', value: `${profit > 0 ? '+' : ''}${profit.toLocaleString()} VND`, inline: true },
                { name: '💵 Số dư hiện tại', value: `${player.money.toLocaleString()} VND`, inline: true }
            ];
            
            // Thêm debug cho admin
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

            await i.update({ embeds: [resultEmbed], components: [] });
            games.delete(message.id);
        } else {
            const updateEmbed = createGameEmbed(
                '♠️ XÌ RÁCH',
                `Tiền cược: **${currentGame.betAmount.toLocaleString()} VND**`,
                '#0099ff',
                [
                    { name: '🎴 Bài của bạn', value: displayHand(currentGame.playerHand), inline: false },
                    { name: '📊 Điểm của bạn', value: `${newPlayerValue}`, inline: true },
                    { name: '🎴 Bài của nhà cái', value: displayHand(currentGame.dealerHand, true), inline: false }
                ]
            );

            await i.update({ embeds: [updateEmbed], components: [row] });
        }
    });

    collector.on('end', async () => {
        const currentGame = games.get(message.id);
        if (currentGame && !currentGame.isFinished) {
            currentGame.playerStand();
            const result = currentGame.getResult();
            const profit = result.winAmount - currentGame.betAmount;
            const isWin = profit > 0;
            
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
            
            const endEmbed = createGameEmbed(
                '⏰ KẾT THÚC XÌ RÁCH',
                '⏰ Hết thời gian! Tự động dừng bài.',
                '#ff9900',
                [
                    { name: '💰 Số tiền nhận được', value: `${profit > 0 ? '+' : ''}${profit.toLocaleString()} VND`, inline: true },
                    { name: '💵 Số dư hiện tại', value: `${player.money.toLocaleString()} VND`, inline: true }
                ]
            );
            await reply.edit({ embeds: [endEmbed], components: [] });
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
});

// Đăng nhập vào hệ thống Discord
client.login(BOT_TOKEN).catch(error => {
    console.error('❌ Lỗi đăng nhập bot:', error);
    console.error('💡 Kiểm tra lại BOT_TOKEN trong file .env');
    process.exit(1);
});