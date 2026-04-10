window.i18nData = window.i18nData || {};
window.i18nData['de'] = {
    // --- 1. Global & Navigation ---
    title: "NEO Mining-Matrix",
    connect: "Wallet verbinden",
    connected: "Verbunden",
    total_value: "Gesamtwert der Assets",
    loading: "Laden...",
    no_data: "Keine Daten vorhanden",
    copy_success: "In die Zwischenablage kopiert",
    copy_fail: "Kopieren fehlgeschlagen, bitte manuell durchführen",
    nav_home: "Start",
    nav_mine: "Mining",
    nav_market: "Board",
    nav_me: "Profil",
    nav_wp: "Whitepaper",

    // --- 2. Miner-Interface (Miner Page) ---
    miner_title: "Meine Miner",
    miner_name: "Avalon 1066 Smart Miner",
    miner_desc: "Rechenleistung ≈ 30TH/s, Verbrauch: 1500W",
    m_count: "Anzahl Miner",
    m_yield: "Täglicher Ertrag",
    m_term: "Mining-Laufzeit", 
    m_locked: "Gesperrter Betrag", 
    miner_model: "FBS Smart Miner S1",
    partners_title: "Partner & Wallet",
    buy_miner: "Miner kaufen",
    pay_fee: "Stromkosten zahlen",
    transfer_miner: "Miner übertragen",
    miner_status_label: "Miner-Status",
    miner_status_running: "Laufend",
    miner_specs: "Rechenleistung = 30TH/S, Verbrauch 1500W",

    // --- 3. Assets & Team (User Page) ---
    assets_list: "Asset-Übersicht",
    recharge: "Einzahlen",
    withdraw: "Auszahlen",
    exchange: "Swap",
    transfer: "Transfer",
    team_title: "Mein Team",
    invite_code: "Meine ID",
    inviter: "Empfohlen von",
    direct_num: "Direkte Partner",
    direct_sales: "Direktumsatz",
    team_num: "Teamgröße",
    team_sales: "Teamumsatz",
    total_rewards: "Gesamtbelohnungen",
    reg_time: "Registrierungsdatum",
    btn_bind_inviter: "Einladungs-ID binden",
    team_detail: "Team-Daten anfordern",

    // --- 4. Allgemeine Modal-Elemente (Modals) ---
    btn_confirm: "Bestätigen",
    btn_confirm_bind: "Signieren & Binden",
    btn_transfer_now: "Signieren & Übertragen",
    btn_submit_email: "Signieren & Beantragen",
    placeholder_inviter_id: "Einladungs-ID eingeben",
    placeholder_email: "E-Mail-Adresse eingeben",
    receiver_address: "Empfänger-Adresse",
    transfer_amount: "Übertragungsmenge",
    expected_pay: "Voraussichtliche Zahlung",
    elec_cost: "Stromkosten",
    available: "Verfügbares Guthaben",

    // --- 5. Modal Titel (Modal Titles) ---
    modal_register_title: "Mining-Konto aktivieren",
    modal_bind_title: "Empfehlung binden",
    miner_transfer_title: "Interner Miner-Transfer",
    modal_team_title: "Team-Bericht anfordern",
    internal_transfer: "Interner Transfer",

    // --- 6. Beschreibungen ---
    register_desc: "Geben Sie die Einladungs-ID ein, um Ihren Hash-Knoten zu aktivieren",
    team_detail_desc: "Aufgrund der Datenmenge wird der detaillierte Team-Bericht per E-Mail gesendet",
    wait_audit: "Antrag eingereicht, bitte warten Sie auf die Prüfung",
    sign_to_confirm: "Bitte signieren Sie in Ihrer Wallet, um Ihre Identität zu bestätigen",

    // --- 7. Backend-Status Mapping (Keys auf Chinesisch für Kompatibilität) ---
    已提交: "Eingereicht",
    处理中: "In Bearbeitung",
    成功: "Erfolgreich",
    失败: "Fehlgeschlagen",
    充值: "Einzahlung",
    提现: "Auszahlung",
    兑换: "Swap",
    内部转账: "Interner Transfer",
    购买矿机: "Miner-Kauf",
    缴纳电费: "Stromzahlung",

    // --- 8. News & Ankündigungen ---
    news_title: "Ankündigungen & News",
    history_title: "Transaktionsverlauf",
    transfer_title: "Transferverlauf",
    news_list: [
        "NEO Eco Mining Matrix ist offiziell gestartet — Eine neue Ära beginnt",
        "FBS-Protokoll v2.0 Upgrade abgeschlossen, Transaktionskosten um 30% gesenkt",
        "Temporäre Wartung der NEO-Knoten (30. März)",
        "Neu: Unterstützung für One-Click-Extraction von 10 Öko-Token-Erträgen",
        "Globales Knoten-Rekrutierungsprogramm läuft, jetzt beitreten"
    ],

    // --- 9. Token-Details (Stats Page) ---
    stats_title: "Tokenomics",
    stats_subtitle: "Marktdaten & Parameter",
    token_labels: {
        fullname: "Vollständiger Name",
        position: "Positionierung",
        supply: "Gesamtangebot",
        distribution: "Verteilungsmechanismus",
        mechanism: "Freigabemechanismus"
    },
    tokens: [
        { symbol: "NEO", name: "New Energy Ore", desc: "Kern-Token / Haupt-Mining-Ertrag", total: "1.000.000.000", dist: "Mining 30% | Ökosystem 20% | Team 15% | Frühe Investoren 15% | Airdrop 10% | Liquidität 10%", mech: "Lineare Mining-Ausgabe über 5 Jahre, jährliches Halving." },
        { symbol: "NEX", name: "Neo Energy Xtreme", desc: "Rechenbeschleuniger / Mining-Boost-Zertifikat", total: "500.000.000", dist: "Hochleistungsknoten 40% | NEO Staking 25% | Partner 15% | Team 10% | Community 10%", mech: "Schrittweise Freigabe bei steigender Netzwerkleistung." },
        { symbol: "NET", name: "Neo Energy Token", desc: "Netzwerkgas / Gebühren-Token", total: "200.000.000", dist: "Knoten-Belohnungen 35% | Wartung 30% | Liquiditätsreserve 20% | Airdrop 15%", mech: "Burn- & Deflationsmechanismus." },
        { symbol: "NEA", name: "Neo Energy Asset", desc: "Hash-Asset-Mapping / Physischer Miner-Anchor", total: "Dynamisch basierend auf Hashpower", dist: "Miner-Mapping 60% | Staking 25% | Ökosystem 10% | Team 5%", mech: "1:1-Anbindung an physische Mining-Hardware." },
        { symbol: "NRY", name: "Neo Resource Yield", desc: "Dividendenrechte / Gewinnbeteiligung", total: "300.000.000", dist: "Gewinnausschüttung 50% | Haltedauer-Bonus 25% | Mitwirkende 15% | Teamreserve 10%", mech: "Quartalsweise Gewinnausschüttung an Halter." },
        { symbol: "NCL", name: "Neo Core Link", desc: "Cross-Chain Hub / Interoperabilitätsmedium", total: "400.000.000", dist: "Cross-Chain Belohnungen 40% | Partnerschaften 30% | Governance 15% | Entwicklung 15%", mech: "Freigabe bei Protokollintegration und Service-Koppelung." }
    ],

    // --- 10. Factory Modul ---
    stake_title: "Mein Staking",
    remaining_days: "Verbleibend",
    days_unit: "Tage",
    btn_stake: "Staken",
    my_liquidity_title: "Meine Liquidität",
    btn_add_liquidity: "Liquidität hinzufügen",
    btn_remove_liquidity: "Liquidität entnehmen",
    total_liquidity_title: "Gesamte Liquiditätspool",
    stake_modal_title: "Token staken",
    select_stake_token: "Token auswählen",
    select_period: "Periode auswählen",
    stake_amount: "Stake-Betrag",
    confirm_stake: "Stake bestätigen & signieren",
    add_liquidity_title: "Liquidität hinzufügen",
    remove_liquidity_title: "Liquidität entnehmen",
    select_lp_pair: "LP-Paar auswählen",
    lp_amount: "Betrag (USDT)",
    confirm_add_liquidity: "Hinzufügen bestätigen & signieren",
    confirm_remove_liquidity: "Entnahme bestätigen & signieren"
};
