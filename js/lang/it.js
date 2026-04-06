window.i18nData = window.i18nData || {};
window.i18nData['it'] = {
    // --- 1. Global & Navigazione ---
    title: "Matrice di Mining NEO",
    connect: "Connetti Wallet",
    connected: "Connesso",
    total_value: "Valore Totale Asset",
    loading: "Caricamento...",
    no_data: "Nessun dato disponibile",
    copy_success: "Copiato negli appunti",
    copy_fail: "Copia fallita, procedi manualmente",
    nav_home: "Home",
    nav_mine: "Mining",
    nav_market: "Stats",
    nav_me: "Profilo",
    nav_wp: "Whitepaper",

    // --- 2. Interfaccia Miner (Pagina Mining) ---
    miner_title: "I Miei Miner",
    miner_name: "Miner Intelligente Avalon 1066",
    miner_desc: "Potenza ≈ 30TH/s, Consumo: 1500W",
    m_count: "Quantità unità",
    m_yield: "Resa Giornaliera",
    m_term: "Scadenza Mining", 
    m_locked: "Quantità Vincolata", 
    buy_miner: "Acquista Miner",
    pay_fee: "Paga Elettricità",
    transfer_miner: "Trasferisci Miner",

    // --- 3. Asset e Team (Pagina Profilo) ---
    assets_list: "Panoramica Asset",
    recharge: "Deposito",
    withdraw: "Prelievo",
    exchange: "Scambio (Swap)",
    transfer: "Trasferimento",
    team_title: "Il Mio Team",
    invite_code: "Il Mio ID",
    inviter: "Invitato da",
    direct_num: "Referral Diretti",
    direct_sales: "Volume Diretto",
    team_num: "Dimensione Team",
    team_sales: "Volume Team",
    total_rewards: "Premi Totali",
    reg_time: "Data Registrazione",

    // --- 4. Elementi comuni Modal (Popup) ---
    btn_confirm: "Conferma Invio",
    btn_confirm_bind: "Firma per Collegare",
    btn_transfer_now: "Firma per Trasferire",
    btn_submit_email: "Firma per Richiedere",
    placeholder_inviter_id: "Inserisci ID Invitante",
    placeholder_email: "Inserisci la tua e-mail",
    receiver_address: "Indirizzo Ricevente",
    transfer_amount: "Quantità da Trasferire",
    expected_pay: "Pagamento Stimato",
    elec_cost: "Costo Elettricità",
    available: "Saldo Disponibile",

    // --- 5. Titoli Modal Specifici ---
    modal_register_title: "Attiva Account Mining",
    modal_bind_title: "Collegamento Referral",
    miner_transfer_title: "Trasferimento Interno Miner",
    modal_team_title: "Richiesta Report Team",
    internal_transfer: "Trasferimento Interno",

    // --- 6. Descrizioni ---
    register_desc: "Inserisci l'ID invitante per attivare il tuo nodo di calcolo",
    team_detail_desc: "A causa del volume di dati, il report dettagliato del team verrà inviato via e-mail",
    wait_audit: "Richiesta inviata, in attesa di revisione",
    sign_to_confirm: "Firma nel tuo wallet per confermare l'identità",

    // --- 7. Mappatura Stati Backend (Chiavi in cinese per compatibilità) ---
    已提交: "Inviato",
    处理中: "In corso",
    成功: "Successo",
    失败: "Fallito",
    充值: "Deposito",
    提现: "Prelievo",
    兑换: "Scambio",
    内部转账: "Trasferimento Interno",
    购买矿机: "Acquisto Miner",
    缴纳电费: "Pagamento Elettricità",

    // --- 8. News & Annunci ---
    news_title: "Annunci e News",
    news_list: [
        "La Matrice di Mining NEO è ufficialmente online, inizia una nuova era",
        "Protocollo FBS v2.0 aggiornato, costi di transazione ridotti del 30%",
        "Avviso temporaneo sulla manutenzione dei nodi NEO (30 marzo)",
        "Novità: Supporto per l'estrazione in un click di 10 tipi di token eco",
        "Programma di reclutamento nodi globali in corso, unisciti ora"
    ],

    // --- 9. Dettagli Token (Pagina Stats) ---
    stats_title: "Tokenomics",
    stats_subtitle: "Dati di Mercato e Parametri",
    token_labels: {
        fullname: "Nome Completo",
        position: "Posizionamento",
        supply: "Offerta Totale",
        distribution: "Distribuzione",
        mechanism: "Meccanismo di Rilascio"
    },
    tokens: [
        { symbol: "NEO", name: "New Energy Ore", desc: "Main token ecosistema / Output principale mining", total: "1.000.000.000", dist: "Mining 30% | Ecosistema 20% | Team 15% | Investitori 15% | Airdrop 10% | Liquidità 10%", mech: "Emissione lineare in 5 anni, halving annuale." },
        { symbol: "NEX", name: "Neo Energy Xtreme", desc: "Acceleratore calcolo / Certificato boost mining", total: "500.000.000", dist: "Nodi performance 40% | Staking NEO 25% | Partner 15% | Team 10% | Comunità 10%", mech: "Rilascio graduale in base alla crescita della potenza di calcolo." },
        { symbol: "NET", name: "Neo Energy Token", desc: "Carburante rete / Token per commissioni Gas", total: "200.000.000", dist: "Premi nodi 35% | Manutenzione rete 30% | Riserva liquidità 20% | Airdrop 15%", mech: "Meccanismo di combustione e deflazione." },
        { symbol: "NEA", name: "Neo Energy Asset", desc: "Asset mapping / Ancoraggio miner fisico", total: "Dinamica in base alla potenza totale", dist: "Mapping miner fisici 60% | Staking 25% | Ecosistema 10% | Team 5%", mech: "Corrispondenza 1:1 con l'hardware di mining fisico." },
        { symbol: "NRY", name: "Neo Resource Yield", desc: "Diritti dividendi / Condivisione profitti ecosistema", total: "300.000.000", dist: "Distribuzione utili 50% | Premi holding 25% | Contributori 15% | Riserva team 10%", mech: "Distribuzione trimestrale dei profitti ai possessori." },
        { symbol: "NCL", name: "Neo Core Link", desc: "Hub cross-chain / Media di interoperabilità", total: "400.000.000", dist: "Premi nodi cross-chain 40% | Partnership 30% | Governance 15% | Sviluppo 15%", mech: "Rilascio durante l'integrazione di protocolli e servizi." }
    ]
};
