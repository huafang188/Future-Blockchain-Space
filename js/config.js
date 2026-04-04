// 基础API地址
export const API_BASE = "https://api.neoneo.ink/api/user";
// BSC链ID
export const BSC_CHAIN_ID = '0x38';

// 收款地址配置
export const RECEIVE_ADDRS = {
    RECHARGE: "0xCfd8e926623e46fB8F54baaB9c7609808daFf9B4",
    ELECTRIC: "0xFf27899526FDA4A30411A8e2778d7F7BCb837568",
    MINER: "0xBdfFB96E30d2d5858c46374a213ee819A005256c"
};

// 合约地址配置
export const CONTRACT_ADDRS = {
    'USDT': "0x55d398326f99059ff775485246999027b3197955",
    'ETH': "0x2170Ed0880ac9A755fd29B2688956BD959F933F8",
    'BTC': "0x7130d2A12B9BCbFAe4f2634d864A1Ee1Ce3Ead9c",
    'BNB': "NATIVE"
};

// 代币信息（价格、logo）
export const tokenInfo = {
    'NEO': { price: 0.152, logo: 'assets/neo_logo.webp' },
    'NEX': { price: 1.00,  logo: 'assets/nex_logo.webp' },
    'NET': { price: 2.00,  logo: 'assets/net_logo.webp' },
    'NEA': { price: 3.00,  logo: 'assets/nea_logo.webp' },
    'NRY': { price: 4.00,  logo: 'assets/nry_logo.webp' },
    'NCL': { price: 5.00,  logo: 'assets/ncl_logo.webp' },
    'USDT': { price: 1.0,   logo: 'assets/USDT.webp' },
    'BNB': { price: 6.0, logo: 'assets/BNB.webp' },
    'ETH': { price: 7.0, logo: 'assets/ETH.webp' },
    'BTC': { price: 8.0, logo: 'assets/BTC.webp' }
};

// 交易状态样式映射
export const STATUS_CLASS_MAP = {
    "已提交": "status-submitted",
    "处理中": "status-processing",
    "成功": "status-success",
    "失败": "status-failed"
};
