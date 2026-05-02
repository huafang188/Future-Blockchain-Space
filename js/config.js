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
 * 获取收款地址（支持按团队分流）
 * @param {string} type - 地址类型: RECHARGE, ELECTRIC, MINER
 * @param {Object} userInfo - 用户信息（包含 team 字段）
 * @returns {string} 收款地址
 */
export function getReceiveAddress(type, userInfo = {}) {
    // 根据团队名称/ID选择地址组
    const teamKey = userInfo.team || 'default';
    const group = TEAM_STRATEGY[teamKey] || TEAM_STRATEGY['default'];
    
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
