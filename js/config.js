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
 * 飞书表格字段映射配置
 * 根据用户现有数据表结构配置字段名映射
 */
export const FEISHU_FIELD_MAP = {
    // 推荐关系表字段映射
    inviterRelation: {
        user: '用户',
        inviteCode: '推荐码',
        inviter: '推荐人',
        registerTime: '注册时间'
    },
    // 用户团队表字段映射
    userTeam: {
        user: '用户',
        directCount: '直推人数',
        directSales: '直推业绩',
        totalCount: '团队人数',
        totalSales: '团队业绩',
        totalReward: '累计奖励'
    }
};

/**
 * 根据推荐码获取团队信息（从后端数据中查找）
 * @param {Object} teamDataList - 后端返回的团队数据列表
 * @param {string} inviteCode - 用户的推荐码
 * @returns {Object} 团队数据
 */
export function getTeamInfoByCode(teamDataList, inviteCode) {
    if (!teamDataList || !inviteCode) {
        return {
            directCount: 0,
            directSales: 0,
            totalCount: 0,
            totalSales: 0,
            totalReward: 0
        };
    }
    
    // 在团队数据列表中查找匹配的推荐码
    const found = teamDataList.find(item => {
        return item[FEISHU_FIELD_MAP.userTeam.user] === inviteCode ||
               item[FEISHU_FIELD_MAP.inviterRelation.inviteCode] === inviteCode;
    });
    
    if (found) {
        const fm = FEISHU_FIELD_MAP.userTeam;
        return {
            directCount: parseInt(found[fm.directCount]) || 0,
            directSales: parseFloat(found[fm.directSales]) || 0,
            totalCount: parseInt(found[fm.totalCount]) || 0,
            totalSales: parseFloat(found[fm.totalSales]) || 0,
            totalReward: parseFloat(found[fm.totalReward]) || 
                        Math.floor((parseFloat(found[fm.totalSales]) || 0) * 0.05)
        };
    }
    
    return {
        directCount: 0,
        directSales: 0,
        totalCount: 0,
        totalSales: 0,
        totalReward: 0
    };
}

/**
 * 根据推荐码获取推荐链（从后端数据中构建）
 * @param {Object} relationList - 后端返回的推荐关系列表
 * @param {string} inviteCode - 用户的推荐码
 * @returns {Array} 推荐链数组
 */
export function buildInviterChain(relationList, inviteCode) {
    if (!relationList || !inviteCode) return [];
    
    const chain = [];
    const fm = FEISHU_FIELD_MAP.inviterRelation;
    let currentCode = inviteCode;
    let level = 1;
    
    // 最多追溯10层
    while (currentCode && level <= 10) {
        const found = relationList.find(item => {
            return item[fm.inviteCode] === currentCode;
        });
        
        if (!found) break;
        
        const inviter = found[fm.inviter];
        if (!inviter || inviter === currentCode) break; // 防止循环
        
        chain.push({ inviter: inviter, level: level });
        currentCode = inviter;
        level++;
    }
    
    return chain;
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
