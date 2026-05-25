/**
 * 基础配置
 */
export const API_BASE = "https://api.neoneo.ink/api/user";
export const BSC_CHAIN_ID = '0x38';

/**
 * 收款地址配置 - 支持多组地址用于客户分流
 */
export const RECEIVE_ADDRS = {
    // 默认地址组（普通用户）
    DEFAULT: {
        RECHARGE: "0x0e2DAE4E3445F7C64DB6Fa661cf6FAA44448db5c",
        ELECTRIC: "0xD75231EAb3cC3B1a11a356926176fC5809C3778E",
        MINER: "0xfB58e5ff840dA66dc26F44866D3739bfCaAECb43"
    },
    // 团队A地址组
    TEAM_A: {
        RECHARGE: "0xTeamA_Recharge_Address",
        ELECTRIC: "0xTeamA_Electric_Address",
        MINER: "0xTeamA_Miner_Address"
    },
    // 团队B地址组
    TEAM_B: {
        RECHARGE: "0xTeamB_Recharge_Address",
        ELECTRIC: "0xTeamB_Electric_Address",
        MINER: "0xTeamB_Miner_Address"
    },
    // 团队C地址组
    TEAM_C: {
        RECHARGE: "0xTeamC_Recharge_Address",
        ELECTRIC: "0xTeamC_Electric_Address",
        MINER: "0xTeamC_Miner_Address"
    }
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
 * 获取收款地址（支持按团队分流）
 * @param {string} type - 地址类型: RECHARGE, ELECTRIC, MINER
 * @param {Object} userInfo - 用户信息（包含 team 字段）
 * @returns {string} 收款地址
 */
export function getReceiveAddress(type, userInfo = {}) {
    let group = 'DEFAULT';
    
    // 优先使用后端返回的团队字段（来自推荐关系列表中的"团队"列）
    if (userInfo.team) {
        const teamKey = userInfo.team.toLowerCase().trim();
        // 尝试直接匹配
        if (TEAM_STRATEGY[teamKey]) {
            group = TEAM_STRATEGY[teamKey];
        }
        // 尝试映射匹配
        else if (TEAM_STRATEGY[userInfo.team]) {
            group = TEAM_STRATEGY[userInfo.team];
        }
    }
    // 如果没有团队字段，但有推荐链，则根据推荐链找到最高层级团队
    else if (userInfo.inviterChain && userInfo.inviterChain.length > 0) {
        const topInviter = findTopLevelInviter(userInfo.inviterChain);
        group = TEAM_STRATEGY[topInviter.team] || TEAM_STRATEGY['default'];
    }
    
    // 返回对应地址，如果不存在则回退到默认地址
    if (RECEIVE_ADDRS[group] && RECEIVE_ADDRS[group][type]) {
        return RECEIVE_ADDRS[group][type];
    }
    
    return RECEIVE_ADDRS.DEFAULT[type] || RECEIVE_ADDRS.DEFAULT.RECHARGE;
}

/**
 * 合约地址与精度配置
 */
export const CONTRACT_ADDRS = {
    'USDT': "0x55d398326f99059ff775485246999027b3197955",
    'ETH': "0x2170Ed0880ac9A755fd29B2688956BD959F933F8",
    'BTC': "0x7130d2A12B9BCbFAe4f2634d864A1Ee1Ce3Ead9c",
    'BNB': "NATIVE"
};

export const TOKEN_DECIMALS = {
    'USDT': 18,
    'ETH': 18,
    'BTC': 18,
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
    'ETH': { logo: 'assets/ETH.webp', chartUrl: '' },
    'BTC': { logo: 'assets/BTC.webp', chartUrl: '' }
};
