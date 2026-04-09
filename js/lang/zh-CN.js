window.i18nData = window.i18nData || {};
window.i18nData['zh-CN'] = {
    // --- 1. 全局与导航 ---
    title: "NEO生态挖矿矩阵",
    connect: "连接钱包",
    connected: "已连接",
    total_value: "总资产价值",
    loading: "加载中...",
    no_data: "暂无数据",
    copy_success: "已成功复制到剪贴板",
    copy_fail: "复制失败，请手动操作",
    nav_home: "首页",
    nav_mine: "矿场",
    nav_market: "看板",
    nav_me: "我的",
    nav_wp: "白皮书",

    // --- 2. 矿机主界面 (Miner Page) ---
    miner_title: "我的矿机",
    miner_name: "阿瓦隆 1066 智能矿机",
    miner_desc: "每台矿机算力≈30TH/s，功耗：1500W",
    m_count: "矿机数量",
    m_yield: "预估日产",
    m_term: "挖矿期限", // 对齐飞书截图
    m_locked: "锁仓数量", // 对齐飞书截图
    miner_model: "FBS 智能矿机 S1",
    partners_title: "合作伙伴 & 钱包",
    buy_miner: "购买矿机",
    pay_fee: "缴纳电费",
    transfer_miner: "转让矿机",
    miner_status_label: "矿机状态",
    miner_status_running: "运行中",
    miner_specs: "每台矿机算力 = 30TH/S，功耗 1500W",

    // --- 3. 资产与团队 (User Page) ---
    assets_list: "资产预览",
    recharge: "充值",
    withdraw: "提币",
    exchange: "兑换",
    transfer: "转账",
    team_title: "我的团队",
    invite_code: "我的ID",
    inviter: "推荐人",
    direct_num: "直推人数",
    direct_sales: "直推业绩",
    team_num: "团队人数",
    team_sales: "团队业绩",
    total_rewards: "累计奖励",
    reg_time: "注册时间",
    btn_bind_inviter: "绑定我的推荐人",
    team_detail: "申请团队数据",

    // --- 4. 弹窗公共部分 (Modals) ---
    btn_confirm: "确认提交",
    btn_confirm_bind: "立即绑定签名",
    btn_transfer_now: "提交转让签名",
    btn_submit_email: "提交申请签名",
    placeholder_inviter_id: "请输入推荐人 ID",
    placeholder_email: "请输入您的联系邮箱",
    receiver_address: "接收者钱包地址",
    transfer_amount: "转出数量",
    expected_pay: "预计支付",
    elec_cost: "所需电费",
    available: "可用余额",
    team_email_desc: "团队详情将通过邮件发送",
    expected_receive: "预计兑入",
    swap_from: "兑出资产",
    recharge_amount: "充值数量",
    select_recharge_asset: "选择充值资产",
    receiver_address_placeholder: "接收者地址 (0x...)",
    amount_max_placeholder: "数量 (最多 {max})",
    max_available: "最大可用",

    // --- 5. 业务具体弹窗标题 (Modal Titles) ---
    modal_register_title: "激活挖矿账户",
    modal_bind_title: "绑定推荐关系",
    miner_transfer_title: "内部转让矿机",
    modal_team_title: "申请团队详单",
    internal_transfer: "内部转账",

    // --- 6. 描述文字 ---
    register_desc: "请输入推荐人 ID 以激活您的算力节点",
    team_detail_desc: "由于数据量较大，团队详细报表将发送至您的邮箱",
    wait_audit: "申请已提交，请等待后台审核",
    sign_to_confirm: "请在钱包中签名以确认身份",

    // --- 7. 后端状态与类型映射 (保持 Key 为中文以匹配飞书) ---
    已提交: "已提交",
    处理中: "处理中",
    成功: "成功",
    失败: "失败",
    充值: "充值",
    提现: "提现",
    兑换: "兑换",
    内部转账: "内部转账",
    购买矿机: "购买矿机",
    缴纳电费: "缴纳电费",

    // --- 8. 新闻与公告 ---
    news_title: "公告与新闻",
    history_title: "交易历史",
    transfer_title: "转账流水",
    news_list: [
        "NEO生态挖矿矩阵正式上线，开启算力新纪元",
        "FBS 协议 v2.0 升级完成，交易损耗降低 30%",
        "关于 NEO 节点维护的临时公告（3月30日）",
        "新功能：支持一键提取 10 种生态代币收益",
        "全球节点招募计划火热进行中，立即参与"
    ],

    // --- 9. 代币详情页 (Stats Page) ---
    stats_title: "代币详情与参数",
    stats_subtitle: "代币经济学与市场数据",
    token_labels: {
        fullname: "全称",
        position: "定位",
        supply: "总供应量",
        distribution: "分配机制",
        mechanism: "释放机制"
    },
    tokens: [
        { symbol: "NEO", name: "New Energy Ore", desc: "生态核心主币 / 挖矿核心产出", total: "1,000,000,000", dist: "挖矿产出 30% | 生态建设 20% | 团队激励 15% | 早期投资 15% | 社区空投 10% | 流动性 10%", mech: "挖矿线性产出，预计5年内挖完，逐年减半。" },
        { symbol: "NEX", name: "Neo Energy Xtreme", desc: "算力加速 / 挖矿增益凭证", total: "500,000,000", dist: "高性能节点挖矿 40% | 质押NEO获得 25% | 生态合作 15% | 团队 10% | 社区激励 10%", mech: "随算力提升逐步释放，高算力节点优先产出。" },
        { symbol: "NET", name: "Neo Energy Token", desc: "网络燃料 / Gas 费代币", total: "200,000,000", dist: "节点运行奖励 35% | 网络维护 30% | 流动性储备 20% | 社区空投 15%", mech: "燃烧+销毁机制，总量通缩。" },
        { symbol: "NEA", name: "Neo Energy Asset", desc: "算力资产映射 / 实体矿机锚定币", total: "动态锚定实体算力规模", dist: "实体矿机映射 60% | 算力质押挖矿 25% | 生态合作 10% | 团队 5%", mech: "资产与实体算力一一对应。" },
        { symbol: "NRY", name: "Neo Resource Yield", desc: "收益分红 / 生态利润权益", total: "300,000,000", dist: "生态利润分红 50% | 长期持有奖励 25% | 节点贡献激励 15% | 团队储备 10%", mech: "按季度利润分配，持有即可分红。" },
        { symbol: "NCL", name: "Neo Core Link", desc: "跨链枢纽 / 生态互通媒介", total: "400,000,000", dist: "跨链节点奖励 40% | 生态合作 30% | 社区治理 15% | 团队开发 15%", mech: "跨链交互、协议对接时逐步释放。" }
    ]
};
