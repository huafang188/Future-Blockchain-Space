window.i18nData = window.i18nData || {};
window.i18nData['zh-HK'] = {
    // --- 1. 全局與導航 ---
    title: "NEO生態挖礦矩陣",
    connect: "連接錢包",
    connected: "已連接",
    total_value: "總資產價值",
    loading: "加載中...",
    no_data: "暫無數據",
    copy_success: "已成功複製到剪貼簿",
    copy_fail: "複製失敗，請手動操作",
    nav_home: "首頁",
    nav_mine: "礦場",
    nav_market: "看板",
    nav_me: "我的",
    nav_wp: "白皮書",

    // --- 2. 礦機主界面 (Miner Page) ---
    miner_title: "我的礦機",
    miner_name: "阿瓦隆 1066 智能礦機",
    miner_desc: "每台礦機算力≈30TH/s，功耗：1500W",
    m_count: "礦機數量",
    m_yield: "預估日產",
    m_term: "挖礦期限", // 對齊飛書截圖
    m_locked: "鎖倉數量", // 對齊飛書截圖
    buy_miner: "購買礦機",
    pay_fee: "繳納電費",
    transfer_miner: "轉讓礦機",

    // --- 3. 資產與團隊 (User Page) ---
    assets_list: "資產預覽",
    recharge: "充值",
    withdraw: "提幣",
    exchange: "兌換",
    transfer: "轉賬",
    team_title: "我的團隊",
    invite_code: "我的ID",
    inviter: "推薦人",
    direct_num: "直推人數",
    direct_sales: "直推業績",
    team_num: "團隊人數",
    team_sales: "團隊業績",
    total_rewards: "累計獎勵",
    reg_time: "註冊時間",

    // --- 4. 彈窗公共部分 (Modals) ---
    btn_confirm: "確認提交",
    btn_confirm_bind: "立即綁定簽名",
    btn_transfer_now: "提交轉讓簽名",
    btn_submit_email: "提交申請簽名",
    placeholder_inviter_id: "請輸入推薦人 ID",
    placeholder_email: "請輸入您的聯繫郵箱",
    receiver_address: "接收者錢包地址",
    transfer_amount: "轉出數量",
    expected_pay: "預計支付",
    elec_cost: "所需電費",
    available: "可用餘額",

    // --- 5. 業務具體彈窗標題 (Modal Titles) ---
    modal_register_title: "激活挖礦帳戶",
    modal_bind_title: "綁定推薦關係",
    miner_transfer_title: "內部轉讓礦機",
    modal_team_title: "申請團隊詳單",
    internal_transfer: "內部轉賬",

    // --- 6. 描述文字 ---
    register_desc: "請輸入推薦人 ID 以激活您的算力節點",
    team_detail_desc: "由於數據量較大，團隊詳細報表將發送至您的郵箱",
    wait_audit: "申請已提交，請等待後台審核",
    sign_to_confirm: "請在錢包中簽名以確認身份",

    // --- 7. 後端狀態與類型映射 (保持 Key 為簡體以匹配飛書原始數據) ---
    已提交: "已提交",
    處理中: "處理中",
    成功: "成功",
    失敗: "失敗",
    充值: "充值",
    提現: "提現",
    兌換: "兌換",
    內部轉賬: "內部轉賬",
    購買礦機: "購買礦機",
    缴纳电费: "繳納電費",

    // --- 8. 新聞與公告 ---
    news_title: "公告與新聞",
    news_list: [
        "NEO生態挖礦矩陣正式上線，開啟算力新紀元",
        "FBS 協議 v2.0 升級完成，交易損耗降低 30%",
        "關於 NEO 節點維護的臨時公告（3月30日）",
        "新功能：支持一鍵提取 10 種生態代幣收益",
        "全球節點招募計劃火熱進行中，立即參與"
    ],

    // --- 9. 代幣詳情頁 (Stats Page) ---
    stats_title: "代幣詳情與參數",
    stats_subtitle: "代幣經濟學與市場數據",
    token_labels: {
        fullname: "全稱",
        position: "定位",
        supply: "總供應量",
        distribution: "分配機制",
        mechanism: "釋放機制"
    },
    tokens: [
        { symbol: "NEO", name: "New Energy Ore", desc: "生態核心主幣 / 挖礦核心產出", total: "1,000,000,000", dist: "挖礦產出 30% | 生態建設 20% | 團隊激勵 15% | 早期投資 15% | 社區空投 10% | 流動性 10%", mech: "挖礦線性產出，預計5年內挖完，逐年減半。" },
        { symbol: "NEX", name: "Neo Energy Xtreme", desc: "算力加速 / 挖礦增益憑證", total: "500,000,000", dist: "高性能節點挖礦 40% | 質押NEO獲得 25% | 生態合作 15% | 團隊 10% | 社區激勵 10%", mech: "隨算力提升逐步釋放，高算力節點優先產出。" },
        { symbol: "NET", name: "Neo Energy Token", desc: "網絡燃料 / Gas 費代幣", total: "200,000,000", dist: "節點運行獎勵 35% | 網絡維護 30% | 流動性儲備 20% | 社區空投 15%", mech: "燃燒+銷毀機制，總量通縮。" },
        { symbol: "NEA", name: "Neo Energy Asset", desc: "算力資產映射 / 實體礦機錨定幣", total: "動態錨定實體算力規模", dist: "實體礦機映射 60% | 算力質押挖礦 25% | 生態合作 10% | 團隊 5%", mech: "資產與實體算力一一對應。" },
        { symbol: "NRY", name: "Neo Resource Yield", desc: "收益分紅 / 生態利潤權益", total: "300,000,000", dist: "生態利潤分紅 50% | 長期持有獎勵 25% | 節點貢獻激勵 15% | 團隊儲備 10%", mech: "按季度利潤分配，持有即可分紅。" },
        { symbol: "NCL", name: "Neo Core Link", desc: "跨鏈樞紐 / 生態互通媒介", total: "400,000,000", dist: "跨鏈節點獎勵 40% | 生態合作 30% | 社區治理 15% | 團隊開發 15%", mech: "跨鏈交互、協議對接時逐步釋放。" }
    ]
};
