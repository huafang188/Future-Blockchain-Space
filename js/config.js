
export const API_BASE = "https://api.neoneo.ink/api/user";

export const ACTIVE_CHAINS = ['BSC'];

export const CHAIN_CONFIG = {
    'BSC': {
        chainId: '0x38',
        chainIdDecimal: 56,
        chainName: 'BNB Smart Chain',
        nativeCurrency: { name: 'BNB', symbol: 'BNB', decimals: 18 },
        rpcUrls: ['https://bsc-dataseed.binance.org/'],
        blockExplorerUrls: ['https://bscscan.com/'],
        icon: 'assets/币安智能链.png',
        active: true

    }
};

export let CURRENT_CHAIN = 'BSC';

export function getCurrentChainConfig() {
    return CHAIN_CONFIG[CURRENT_CHAIN] || CHAIN_CONFIG['BSC'];
}

export function setCurrentChain(chain) {
    if (CHAIN_CONFIG[chain]) {
        CURRENT_CHAIN = chain;
    }
}

export const CHAIN_RECEIVE_ADDRS = {
    'BSC': {
        ELECTRIC: "0xD2C3Ee0Fc72d1fCBfcecEFBb551D811176E8404F",
        MINER: "0x654a0af182C08bfFAf72bb12E0FB57F625E06628"

    }
};

export const RECEIVE_ADDRS = {
    DEFAULT: CHAIN_RECEIVE_ADDRS['BSC']
};

export const TEAM_STRATEGY = {
    'team_a': 'TEAM_A',
    'team_b': 'TEAM_B',
    'team_c': 'TEAM_C',
    'A队': 'TEAM_A',
    'B队': 'TEAM_B',
    'C队': 'TEAM_C',
    'default': 'DEFAULT'
};

export const INVITER_TEAM_MAP = {
    'TEAM_A': ['LEADER_A', 'VIP_A001', 'VIP_A002', 'VIP_A003'],
    'TEAM_B': ['LEADER_B', 'VIP_B001', 'VIP_B002'],
    'TEAM_C': ['LEADER_C', 'VIP_C001', 'VIP_C002', 'VIP_C003', 'VIP_C004']
};

export const TEAM_LEVELS = {
    'TEAM_A': 10,
    'TEAM_B': 8,
    'TEAM_C': 5,
    'DEFAULT': 0
};

export function getTeamByInviter(inviterCode) {
    if (!inviterCode) return 'DEFAULT';

    const code = String(inviterCode).toUpperCase().trim();

    for (const [team, codes] of Object.entries(INVITER_TEAM_MAP)) {
        if (codes.includes(code)) {
            return team;
        }
    }

    return 'DEFAULT';
}

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

export function getReceiveAddress(type, chain) {
    const targetChain = chain || CURRENT_CHAIN;
    const chainAddrs = CHAIN_RECEIVE_ADDRS[targetChain];
    if (chainAddrs && chainAddrs[type]) {
        return chainAddrs[type];
    }
    return CHAIN_RECEIVE_ADDRS['BSC'][type];
}

export const CHAIN_CONTRACT_ADDRS = {
    'BSC': {
        'USDT': "0x55d398326f99059ff775485246999027b3197955",
        'NRY': "0xD61F3ADB5dB97eA40b9D719fD7458e251770e51e"

    }
};

export const CONTRACT_ADDRS = CHAIN_CONTRACT_ADDRS['BSC'];

export function getContractAddress(tokenSymbol) {
    const chainAddrs = CHAIN_CONTRACT_ADDRS[CURRENT_CHAIN] || CHAIN_CONTRACT_ADDRS['BSC'];
    return chainAddrs[tokenSymbol] || null;
}

export const TOKEN_DECIMALS = {
    'USDT': 18,

    'BNB': 18,
    'NEO': 18,
    'NEX': 18,
    'NET': 18,
    'NEA': 18,
    'NRY': 18,
    'NCL': 18
};

export const tokenConfig = {
    'NEO': { logo: 'assets/NEO.webp', chartUrl: '' },
    'NEX': { logo: 'assets/NEX.webp', chartUrl: '' },
    'NET': { logo: 'assets/net_logo.webp', chartUrl: '' },
    'NEA': { logo: 'assets/NEA.webp', chartUrl: '' },
    'NRY': { logo: 'assets/NRY.webp', chartUrl: '' },
    'NCL': { logo: 'assets/NCL.webp', chartUrl: '' },
    'USDT': { logo: 'assets/USDT.webp', chartUrl: '' },
    'BNB': { logo: 'assets/BNB.webp', chartUrl: '' }
};
