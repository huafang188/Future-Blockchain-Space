const i18n = {
    'zh-CN': {
        title: "Future Blockchain Space",
        connect: "连接钱包",
        total_value: "总资产价值",
        miner_title: "我的矿机",
        buy_miner: "购买矿机",
        pay_fee: "缴纳电费",
        assets_list: "资产概览",
        team_title: "我的团队",
        history_title: "交易历史",
        recharge: "充值",
        withdraw: "提币",
        exchange: "兑换"
    },
    'en': {
        title: "Future Blockchain Space",
        connect: "Connect Wallet",
        total_value: "Total Net Assets",
        miner_title: "My Miner",
        buy_miner: "Buy Miner",
        pay_fee: "Pay Electricity",
        assets_list: "Assets Overview",
        team_title: "My Team",
        history_title: "History",
        recharge: "Deposit",
        withdraw: "Withdraw",
        exchange: "Exchange"
    }
    // 日语、俄语等以此类推添加...
};

function changeLanguage(lang) {
    window.currentLang = lang;
    document.querySelectorAll('[data-i18n]').forEach(el => {
        const key = el.getAttribute('data-i18n');
        el.innerText = i18n[lang][key] || key;
    });
}
