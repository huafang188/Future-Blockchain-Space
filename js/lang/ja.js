window.i18nData = window.i18nData || {};
window.i18nData['ja'] = {
    // --- 1. グローバル & ナビゲーション ---
    title: "NEO生態マイニングマトリックス",
    connect: "ウォレット接続",
    connected: "接続済み",
    total_value: "総資産価値",
    loading: "読み込み中...",
    no_data: "データがありません",
    copy_success: "クリップボードにコピーしました",
    copy_fail: "コピーに失敗しました。手動で操作してください",
    nav_home: "ホーム",
    nav_mine: "マイニング",
    nav_market: "ボード",
    nav_me: "マイページ",
    nav_wp: "白書",

    // --- 2. マイナーインターフェース (Miner Page) ---
    miner_title: "マイマイナー",
    miner_name: "アヴァロン 1066 スマートマイナー",
    miner_desc: "1台あたりの計算能力 ≈ 30TH/s、消費電力：1500W",
    m_count: "保有台数",
    m_yield: "1日あたりの産出量",
    m_term: "マイニング期限", 
    m_locked: "ロック数量", 
    miner_model: "FBS スマートマイナー S1",
    partners_title: "パートナー & ウォレット",
    buy_miner: "マイナー購入",
    pay_fee: "電気代支払い",
    transfer_miner: "マイナー譲渡",
    miner_status_label: "マイナーステータス",
    miner_status_running: "稼働中",
    miner_specs: "1台あたりの計算能力 = 30TH/S、消費電力 1500W",

    // --- 3. 資産とチーム (User Page) ---
    assets_list: "資産プレビュー",
    recharge: "入金",
    withdraw: "出金",
    exchange: "スワップ",
    transfer: "送金",
    team_title: "マイチーム",
    invite_code: "マイID",
    inviter: "紹介者",
    direct_num: "直紹介人数",
    direct_sales: "直紹介実績",
    team_num: "チーム総人数",
    team_sales: "チーム総実績",
    total_rewards: "累計報酬",
    reg_time: "登録日時",
    btn_bind_inviter: "紹介者を紐付ける",
    team_detail: "チームデータを申請する",

    // --- 4. ポップアップ共通 (Modals) ---
    btn_confirm: "確認して送信",
    btn_confirm_bind: "署名して紐付け",
    btn_transfer_now: "署名して譲渡",
    btn_submit_email: "署名して申請",
    placeholder_inviter_id: "紹介者IDを入力してください",
    placeholder_email: "メールアドレスを入力してください",
    receiver_address: "受取人ウォレットアドレス",
    transfer_amount: "送金数量",
    expected_pay: "支払い予定額",
    elec_cost: "必要な電気代",
    available: "利用可能残高",

    // --- 5. 業務別ポップアップタイトル (Modal Titles) ---
    modal_register_title: "マイニングアカウントの有効化",
    modal_bind_title: "紹介関係の紐付け",
    miner_transfer_title: "内部マイナー譲渡",
    modal_team_title: "チーム詳細データの申請",
    internal_transfer: "内部送金",

    // --- 6. 説明文 ---
    register_desc: "紹介者IDを入力して、ハッシュパワーノードを有効化してください",
    team_detail_desc: "データ量が多いため、チーム詳細レポートはメールにて送信されます",
    wait_audit: "申請を送信しました。審査をお待ちください",
    sign_to_confirm: "ウォレットで署名して本人確認を行ってください",

    // --- 7. バックエンドステータスとタイプのマッピング (Keyは中国語を維持) ---
    已提交: "送信済み",
    处理中: "処理中",
    成功: "成功",
    失败: "失敗",
    充值: "入金",
    提现: "出金",
    兑换: "スワップ",
    内部转账: "内部送金",
    购买矿机: "マイナー購入",
    缴纳电费: "電気代支払い",

    // --- 8. ニュース & お知らせ ---
    news_title: "お知らせとニュース",
    history_title: "取引履歴",
    transfer_title: "送金履歴",
    news_list: [
        "NEO生態マイニングマトリックスが正式に稼働、計算能力の新時代へ",
        "FBSプロトコル v2.0 アップグレード完了、取引コストを30%削減",
        "NEOノードメンテナンスに関する臨時のお知らせ（3月30日）",
        "新機能：10種類のエコシステムトークン収益の一括受取に対応",
        "グローバルノード募集中、今すぐ参加しましょう"
    ],

    // --- 9. トークン詳細 (Stats Page) ---
    stats_title: "トークン詳細とパラメータ",
    stats_subtitle: "トークンエコノミクスと市場データ",
    token_labels: {
        fullname: "正式名称",
        position: "ポジショニング",
        supply: "総発行量",
        distribution: "分配メカニズム",
        mechanism: "放出メカニズム"
    },
    tokens: [
        { symbol: "NEO", name: "New Energy Ore", desc: "エコシステム基軸通貨 / マイニング報酬主軸", total: "1,000,000,000", dist: "マイニング報酬 30% | エコシステム構築 20% | チーム 15% | 初期投資 15% | エアドロップ 10% | 流動性 10%", mech: "線形放出、5年で産出完了予定、毎年半減期を適用。" },
        { symbol: "NEX", name: "Neo Energy Xtreme", desc: "計算能力加速 / マイニング増益権利", total: "500,000,000", dist: "高性能ノード 40% | NEOステーキング 25% | パートナー 15% | チーム 10% | コミュニティ 10%", mech: "計算能力の上昇に伴い段階的に放出。" },
        { symbol: "NET", name: "Neo Energy Token", desc: "ネットワーク燃料 / ガス代トークン", total: "200,000,000", dist: "ノード運営報酬 35% | ネットワーク維持 30% | 流動性準備 20% | エアドロップ 15%", mech: "バーン＋デフレメカニズムによる供給調整。" },
        { symbol: "NEA", name: "Neo Energy Asset", desc: "ハッシュ資産マッピング / 実機マイナーペグトークン", total: "ハッシュパワー規模に応じて動的発行", dist: "実機マッピング 60% | ステーキングマイニング 25% | パートナー 10% | チーム 5%", mech: "実機マイニング機器と1:1の資産マッピング。" },
        { symbol: "NRY", name: "Neo Resource Yield", desc: "収益配当 / エコシステム利益還元権利", total: "300,000,000", dist: "利益分配 50% | 長期保有報酬 25% | 貢献者インセンティブ 15% | チーム準備 10%", mech: "四半期ごとの利益分配、保有者に配当を付与。" },
        { symbol: "NCL", name: "Neo Core Link", desc: "クロスチェーンハブ / 相互運用メディア", total: "400,000,000", dist: "ノード報酬 40% | パートナーシップ 30% | ガバナンス 15% | 開発チーム 15%", mech: "プロトコル接続やサービス連携時に段階的に放出。" }
    ]
};
