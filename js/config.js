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
        RECHARGE: "0xCfd8e926623e46fB8F54baaB9c7609808daFf9B4",
        ELECTRIC: "0xFf27899526FDA4A30411A8e2778d7F7BCb837568",
        MINER: "0xBdfFB96E30d2d5858c46374a213ee819A005256c"
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
    // 团队A的推荐码列表
    'TEAM_A': [
        'LEADER_A',    // 团队A创始人
        'VIP_A001',    // 团队A核心成员1
        'VIP_A002',    // 团队A核心成员2
        'VIP_A003'     // 团队A核心成员3
    ],
    // 团队B的推荐码列表
    'TEAM_B': [
        'LEADER_B',    // 团队B创始人
        'VIP_B001',    // 团队B核心成员1
        'VIP_B002'     // 团队B核心成员2
    ],
    // 团队C的推荐码列表
    'TEAM_C': [
        'LEADER_C',    // 团队C创始人
        'VIP_C001',    // 团队C核心成员1
        'VIP_C002',    // 团队C核心成员2
        'VIP_C003',    // 团队C核心成员3
        'VIP_C004'     // 团队C核心成员4
    ]
};

/**
 * 团队层级配置（用于确定最高层级）
 * 数字越大表示层级越高
 */
export const TEAM_LEVELS = {
    'TEAM_A': 10,    // 最高级别团队
    'TEAM_B': 8,     // 中级团队
    'TEAM_C': 5,     // 初级团队
    'DEFAULT': 0     // 默认层级
};

/**
 * 根据推荐码获取所属团队
 * @param {string} inviterCode - 推荐码
 * @returns {string} 团队标识 (如 'TEAM_A', 'TEAM_B')
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
 * @param {Array} inviterChain - 推荐链数组，格式: [{inviter: 'xxx', level: 1}, ...]
 * @returns {Object} 包含最高层级推荐码和所属团队
 */
export function findTopLevelInviter(inviterChain = []) {
    if (!inviterChain || inviterChain.length === 0) {
        return { inviter: null, team: 'DEFAULT', level: 0 };
    }
    
    // 按层级从高到低排序，找到最高层级
    const sortedChain = [...inviterChain].sort((a, b) => {
        const levelA = TEAM_LEVELS[getTeamByInviter(a.inviter)] || 0;
        const levelB = TEAM_LEVELS[getTeamByInviter(b.inviter)] || 0;
        return levelB - levelA;
    });
    
    // 获取最高层级的推荐人
    const topInviter = sortedChain[0];
    const team = getTeamByInviter(topInviter.inviter);
    
    return {
        inviter: topInviter.inviter,
        team: team,
        level: TEAM_LEVELS[team] || 0
    };
}

/**
 * 获取收款地址（支持按推荐码/团队分流）
 * @param {string} type - 地址类型: RECHARGE, ELECTRIC, MINER
 * @param {Object} userInfo - 用户信息（包含 team 或 inviterChain 字段）
 * @returns {string} 收款地址
 */
export function getReceiveAddress(type, userInfo = {}) {
    let group = 'DEFAULT';
    
    // 优先使用用户信息中的团队字段
    if (userInfo.team && TEAM_STRATEGY[userInfo.team]) {
        group = TEAM_STRATEGY[userInfo.team];
    }
    // 如果没有团队字段，但有推荐链，则根据推荐链找到最高层级团队
    else if (userInfo.inviterChain && userInfo.inviterChain.length > 0) {
        const topInviter = findTopLevelInviter(userInfo.inviterChain);
        group = TEAM_STRATEGY[topInviter.team] || TEAM_STRATEGY['default'];
    }
    // 兼容旧的团队key格式
    else if (userInfo.team && TEAM_STRATEGY[userInfo.team]) {
        group = TEAM_STRATEGY[userInfo.team];
    }
    
    // 返回对应地址，如果不存在则回退到默认地址
    if (RECEIVE_ADDRS[group] && RECEIVE_ADDRS[group][type]) {
        return RECEIVE_ADDRS[group][type];
    }
    
    // 最终回退到默认地址
    return RECEIVE_ADDRS.DEFAULT[type] || RECEIVE_ADDRS.DEFAULT.RECHARGE;
}

/**
 * 合约地址与精度配置 (Decimals)
 * BSC链上这些主流币大多是 18 位
 */
export const CONTRACT_ADDRS = {
    'USDT': "0x55d398326f99059ff775485246999027b3197955",
    'ETH': "0x2170Ed0880ac9A755fd29B2688956BD959F933F8",
    'BTC': "0x7130d2A12B9BCbFAe4f2634d864A1Ee1Ce3Ead9c",
    'BNB': "NATIVE" // 原生代币
};

// 精度映射，防止 action-executor 转账金额算错
export const TOKEN_DECIMALS = {
    'USDT': 18,
    'ETH': 18,
    'BTC': 18,
    'BNB': 18,
    'NEO': 18,
    'NEX': 18
};

/**
 * 模拟团队数据（前端处理推荐关系）
 * 包含用户推荐关系、业绩数据等
 */
export const MOCK_TEAM_DATA = {
    // 用户推荐关系映射 (推荐码 -> 直推用户列表)
    inviterMap: {
        'LEADER_A': ['USER_A001', 'USER_A002', 'USER_A003', 'USER_A004', 'USER_A005'],
        'VIP_A001': ['USER_A006', 'USER_A007', 'USER_A008'],
        'VIP_A002': ['USER_A009', 'USER_A010'],
        'USER_A001': ['USER_A011', 'USER_A012'],
        'USER_A002': ['USER_A013'],
        'LEADER_B': ['USER_B001', 'USER_B002', 'USER_B003'],
        'VIP_B001': ['USER_B004', 'USER_B005'],
        'USER_B001': ['USER_B006'],
        'LEADER_C': ['USER_C001', 'USER_C002'],
        'VIP_C001': ['USER_C003', 'USER_C004', 'USER_C005', 'USER_C006']
    },
    // 用户业绩数据 (用户ID -> 业绩)
    userSales: {
        'LEADER_A': 500000,
        'VIP_A001': 120000,
        'VIP_A002': 80000,
        'USER_A001': 35000,
        'USER_A002': 25000,
        'USER_A003': 20000,
        'USER_A004': 15000,
        'USER_A005': 10000,
        'USER_A006': 18000,
        'USER_A007': 12000,
        'USER_A008': 8000,
        'USER_A009': 15000,
        'USER_A010': 5000,
        'USER_A011': 6000,
        'USER_A012': 4000,
        'USER_A013': 3000,
        'LEADER_B': 300000,
        'VIP_B001': 90000,
        'VIP_B002': 60000,
        'USER_B001': 40000,
        'USER_B002': 30000,
        'USER_B003': 20000,
        'USER_B004': 25000,
        'USER_B005': 15000,
        'USER_B006': 8000,
        'LEADER_C': 150000,
        'VIP_C001': 50000,
        'VIP_C002': 35000,
        'USER_C001': 20000,
        'USER_C002': 18000,
        'USER_C003': 12000,
        'USER_C004': 10000,
        'USER_C005': 8000,
        'USER_C006': 6000
    },
    // 用户等级配置
    userLevels: {
        'LEADER_A': '创始人',
        'VIP_A001': '核心成员',
        'VIP_A002': '核心成员',
        'LEADER_B': '创始人',
        'VIP_B001': '核心成员',
        'LEADER_C': '创始人',
        'VIP_C001': '核心成员',
        'VIP_C002': '核心成员'
    }
};

/**
 * 计算团队数据
 * @param {string} inviterCode - 当前用户的推荐码
 * @returns {Object} 包含直推人数、直推业绩、团队总人数、团队总业绩
 */
export function calculateTeamData(inviterCode) {
    const { inviterMap, userSales } = MOCK_TEAM_DATA;
    
    // 获取直接推荐的用户列表
    const directUsers = inviterMap[inviterCode] || [];
    
    // 计算直推人数和直推业绩
    const directCount = directUsers.length;
    const directSales = directUsers.reduce((sum, userId) => {
        return sum + (userSales[userId] || 0);
    }, 0);
    
    // 递归计算整个团队（包括所有层级）
    const getAllTeamMembers = (code, visited = new Set()) => {
        if (visited.has(code)) return [];
        visited.add(code);
        
        const members = [];
        const children = inviterMap[code] || [];
        
        children.forEach(child => {
            members.push(child);
            members.push(...getAllTeamMembers(child, visited));
        });
        
        return members;
    };
    
    const allTeamMembers = getAllTeamMembers(inviterCode);
    const totalCount = allTeamMembers.length;
    const totalSales = allTeamMembers.reduce((sum, userId) => {
        return sum + (userSales[userId] || 0);
    }, 0);
    
    return {
        directCount,
        directSales,
        totalCount,
        totalSales,
        totalReward: Math.floor(totalSales * 0.05) // 5% 团队奖励
    };
}

/**
 * 获取用户信息（根据推荐码）
 * @param {string} inviteCode - 用户的推荐码
 * @returns {Object} 用户信息
 */
export function getUserInfoByCode(inviteCode) {
    const { userSales, userLevels } = MOCK_TEAM_DATA;
    const team = getTeamByInviter(inviteCode);
    
    return {
        inviteCode,
        team,
        level: userLevels[inviteCode] || '普通用户',
        sales: userSales[inviteCode] || 0
    };
}

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

export const tokenInfo = tokenConfig;

export const STATUS_CLASS_MAP = {
    "已提交": "status-submitted",
    "处理中": "status-processing",
    "成功": "status-success",
    "失败": "status-failed"
};
