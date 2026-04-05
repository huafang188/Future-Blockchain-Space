/**
 * 基础配置
 */
export const API_BASE = "https://api.neoneo.ink/api/user";
export const BSC_CHAIN_ID = '0x38';

/**
 * 收款地址配置
 */
export const RECEIVE_ADDRS = {
    RECHARGE: "0xCfd8e926623e46fB8F54baaB9c7609808daFf9B4",
    ELECTRIC: "0xFf27899526FDA4A30411A8e2778d7F7BCb837568",
    MINER: "0xBdfFB96E30d2d5858c46374a213ee819A005256c"
};

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
