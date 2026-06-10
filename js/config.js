/**
 * 基础配置
 */
export const API_BASE = "https://api.neoneo.ink/api/user";

/**
 * 多链配置
 */
export const CHAIN_CONFIG = {
    'BSC': {
        chainId: '0x38',
        chainIdDecimal: 56,
        chainName: 'BNB Smart Chain',
        nativeCurrency: { name: 'BNB', symbol: 'BNB', decimals: 18 },
        rpcUrls: ['https://bsc-dataseed.binance.org/'],
        blockExplorerUrls: ['https://bscscan.com/'],
        icon: 'assets/币安智能链.png'
    },
    'TON': {
        chainId: '0x357',
        chainIdDecimal: 855,
        chainName: 'TON Chain',
        nativeCurrency: { name: 'TON', symbol: 'TON', decimals: 9 },
        rpcUrls: ['https://toncenter.com'],
        blockExplorerUrls: ['https://tonscan.org/'],
        icon: 'assets/TON.webp'
    },
    'SOL': {
        chainId: '0x82',
        chainIdDecimal: 130,
        chainName: 'Solana',
        nativeCurrency: { name: 'SOL', symbol: 'SOL', decimals: 9 },
        rpcUrls: ['https://api.mainnet-beta.solana.com'],
        blockExplorerUrls: ['https://solscan.io/'],
        icon: 'assets/Solana.webp'
    }
};

/**
 * 当前选中的链（默认 BSC）
 */
export let CURRENT_CHAIN = 'BSC';

/**
 * 获取当前链配置
 */
export function getCurrentChainConfig() {
    return CHAIN_CONFIG[CURRENT_CHAIN] || CHAIN_CONFIG['BSC'];
}

/**
 * 设置当前链
 */
export function setCurrentChain(chain) {
    if (CHAIN_CONFIG[chain]) {
        CURRENT_CHAIN = chain;
    }
}

/**
 * 收款地址配置 - 按链区分
 */
export const CHAIN_RECEIVE_ADDRS = {
    'BSC': {
        ELECTRIC: "0xa59Ee12770664e002E6e0dDcAC447707AD873F33",
        MINER: "0x8007c1F954D46f98D108EB6E0dD979406C5Bb444"
    },
    'TON': {
        ELECTRIC: "UQBYus42aiF7FhyecH-WgZnKDydikIVyJusFCKMnUXQcjj2y",
        MINER: "UQDG6EoKX4wBcYVFcDYhnf6gVJBVwX1vLRxXo8WDZEv_cp5B"
    },
    'SOL': {
        ELECTRIC: "DJtb4QyA61BvKLAQeTnRz2s8p98KBv8yTF48SGf6sQ1s",
        MINER: "7eUfQwcrkMkKAQ5VKbshC8humahAFaeAeNurUsM2U43u"
    }
};

/**
 * 兼容旧版 RECEIVE_ADDRS（默认 BSC）
 */
export const RECEIVE_ADDRS = {
    DEFAULT: CHAIN_RECEIVE_ADDRS['BSC']
};

/**
 * 团队分流策略配置
 * 根据后端返回的团队名称映射到对应的地址组
 */
export const TEAM_STRATEGY = {
    'team_a': 'TEAM_A',
    'team_b': 'TEAM_B',
    'team_c': 'TEAM_C',
    'A队': 'TEAM_A',
    'B队': 'TEAM_B',
    'C队': 'TEAM_C',
    'default': 'DEFAULT'
};

/**
 * 推荐码与团队的映射配置
 * - 推荐码可以是团队创始人或核心成员的邀请码
 * - 用户通过这些推荐码注册后，归属于对应团队
 */
export const INVITER_TEAM_MAP = {
    'TEAM_A': ['LEADER_A', 'VIP_A001', 'VIP_A002', 'VIP_A003'],
    'TEAM_B': ['LEADER_B', 'VIP_B001', 'VIP_B002'],
    'TEAM_C': ['LEADER_C', 'VIP_C001', 'VIP_C002', 'VIP_C003', 'VIP_C004']
};

/**
 * 团队层级配置（用于确定最高层级）
 * 数字越大表示层级越高
 */
export const TEAM_LEVELS = {
    'TEAM_A': 10,
    'TEAM_B': 8,
    'TEAM_C': 5,
    'DEFAULT': 0
};

/**
 * 根据推荐码获取所属团队
 * @param {string} inviterCode - 推荐码
 * @returns {string} 团队标识
 */
export function getTeamByInviter(inviterCode) {
    if (!inviterCode) return 'DEFAULT';
    
    const code = inviterCode.toUpperCase().trim();
    
    for (const [team, codes] of Object.entries(INVITER_TEAM_MAP)) {
        if (codes.includes(code)) {
            return team;
        }
    }
    
    return 'DEFAULT';
}

/**
 * 根据推荐链找到最高层级的推荐码（团队创始人）
 * @param {Array} inviterChain - 推荐链数组
 * @returns {Object} 包含最高层级推荐码和所属团队
 */
export function findTopLevelInviter(inviterChain = []) {
    if (!inviterChain || inviterChain.length === 0) {
        return { inviter: null, team: 'DEFAULT', level: 0 };
    }
    
    const sortedChain = [...inviterChain].sort((a, b) => {
        const levelA = TEAM_LEVELS[getTeamByInviter(a.inviter)] || 0;
        const levelB = TEAM_LEVELS[getTeamByInviter(b.inviter)] || 0;
        return levelB - levelA;
    });
    
    const topInviter = sortedChain[0];
    const team = getTeamByInviter(topInviter.inviter);
    
    return {
        inviter: topInviter.inviter,
        team: team,
        level: TEAM_LEVELS[team] || 0
    };
}

/**
 * 获取收款地址（支持按链区分）
 * @param {string} type - 地址类型: RECHARGE, ELECTRIC, MINER
 * @param {string} chain - 链名称: BSC, TON, SOL（默认当前链）
 * @returns {string} 收款地址
 */
export function getReceiveAddress(type, chain) {
    const targetChain = chain || CURRENT_CHAIN;
    const chainAddrs = CHAIN_RECEIVE_ADDRS[targetChain];
    if (chainAddrs && chainAddrs[type]) {
        return chainAddrs[type];
    }
    // 回退到 BSC 默认地址
    return CHAIN_RECEIVE_ADDRS['BSC'][type] || CHAIN_RECEIVE_ADDRS['BSC'].RECHARGE;
}

/**
 * 合约地址与精度配置（按链区分，仅 USDT 合约，其他代币为链原生）
 */
export const CHAIN_CONTRACT_ADDRS = {
    'BSC': {
        'USDT': "0x55d398326f99059ff775485246999027b3197955"
    },
    'TON': {
        'USDT': "UQCxE6mUtQJKFnGfaROTKOt1lZbDiiX1kCixRv7Nw2Id_p0p"
    },
    'SOL': {
        'USDT': "Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB"
    }
};

/**
 * 兼容旧版 CONTRACT_ADDRS（默认 BSC）
 */
export const CONTRACT_ADDRS = CHAIN_CONTRACT_ADDRS['BSC'];

/**
 * 根据当前链获取合约地址（仅 USDT 有合约，其他代币返回 null 表示原生）
 */
export function getContractAddress(tokenSymbol) {
    const chainAddrs = CHAIN_CONTRACT_ADDRS[CURRENT_CHAIN] || CHAIN_CONTRACT_ADDRS['BSC'];
    return chainAddrs[tokenSymbol] || null;
}

export const TOKEN_DECIMALS = {
    'USDT': 18,
    'TON': 9,
    'SOL': 9,
    'BNB': 18,
    'NEO': 18,
    'NEX': 18,
    'NET': 18,
    'NEA': 18,
    'NRY': 18,
    'NCL': 18
};

/**
 * 代币视觉配置
 */
export const tokenConfig = {
    'NEO': { logo: 'assets/neo_logo.webp', chartUrl: '' },
    'NEX': { logo: 'assets/nex_logo.webp', chartUrl: '' },
    'NET': { logo: 'assets/net_logo.webp', chartUrl: '' },
    'NEA': { logo: 'assets/nea_logo.webp', chartUrl: '' },
    'NRY': { logo: 'assets/nry_logo.webp', chartUrl: '' },
    'NCL': { logo: 'assets/ncl_logo.webp', chartUrl: '' },
    'USDT': { logo: 'assets/USDT.webp', chartUrl: '' },
    'BNB': { logo: 'assets/BNB.webp', chartUrl: '' },
    'TON': { logo: 'assets/TON.webp', chartUrl: '' },
    'SOL': { logo: 'assets/Solana.webp', chartUrl: '' }
};
