window.i18nData = window.i18nData || {};
window.i18nData['fr'] = {
    // --- 1. Global & Navigation ---
    title: "Matrice de Minage NEO",
    connect: "Connecter Portefeuille",
    connected: "Connecté",
    total_value: "Valeur Totale des Actifs",
    loading: "Chargement...",
    no_data: "Aucune donnée disponible",
    copy_success: "Copié dans le presse-papiers",
    copy_fail: "Échec de la copie, faites-le manuellement",
    nav_home: "Accueil",
    nav_mine: "Minage",
    nav_market: "Stats",
    nav_me: "Profil",
    nav_wp: "Livre Blanc",

    // --- 2. Interface Mineur (Miner Page) ---
    miner_title: "Mes Mineurs",
    miner_name: "Mineur Intelligent Avalon 1066",
    miner_desc: "Puissance ≈ 30TH/s, Consommation : 1500W",
    m_count: "Nombre d'unités",
    m_yield: "Rendement quotidien",
    m_term: "Échéance du minage", 
    m_locked: "Quantité verrouillée", 
    buy_miner: "Acheter Mineur",
    pay_fee: "Payer Électricité",
    transfer_miner: "Transférer Mineur",

    // --- 3. Actifs et Équipe (User Page) ---
    assets_list: "Aperçu des Actifs",
    recharge: "Dépôt",
    withdraw: "Retrait",
    exchange: "Échange (Swap)",
    transfer: "Transfert",
    team_title: "Mon Équipe",
    invite_code: "Mon ID",
    inviter: "Parrainé par",
    direct_num: "Filleuls directs",
    direct_sales: "Volume direct",
    team_num: "Taille de l'équipe",
    team_sales: "Volume de l'équipe",
    total_rewards: "Récompenses totales",
    reg_time: "Date d'inscription",

    // --- 4. Éléments communs des fenêtres (Modals) ---
    btn_confirm: "Confirmer l'envoi",
    btn_confirm_bind: "Signer et Lier",
    btn_transfer_now: "Signer et Transférer",
    btn_submit_email: "Signer et Postuler",
    placeholder_inviter_id: "Entrez l'ID du parrain",
    placeholder_email: "Entrez votre e-mail",
    receiver_address: "Adresse du destinataire",
    transfer_amount: "Quantité à transférer",
    expected_pay: "Montant à payer",
    elec_cost: "Coût de l'électricité",
    available: "Solde disponible",

    // --- 5. Titres des fenêtres (Modal Titles) ---
    modal_register_title: "Activer Compte de Minage",
    modal_bind_title: "Liaison de Parrainage",
    miner_transfer_title: "Transfert Interne de Mineur",
    modal_team_title: "Demande de Données Équipe",
    internal_transfer: "Transfert Interne",

    // --- 6. Descriptions ---
    register_desc: "Entrez l'ID du parrain pour activer votre nœud de puissance",
    team_detail_desc: "En raison du volume de données, le rapport détaillé sera envoyé par e-mail",
    wait_audit: "Demande soumise, en attente de révision",
    sign_to_confirm: "Veuillez signer dans votre portefeuille pour confirmer",

    // --- 7. Mapping des statuts Backend (Clés en chinois pour compatibilité) ---
    已提交: "Soumis",
    处理中: "En cours",
    成功: "Succès",
    失败: "Échec",
    充值: "Dépôt",
    提现: "Retrait",
    兑换: "Échange",
    内部转账: "Transfert Interne",
    购买矿机: "Achat Mineur",
    缴纳电费: "Paiement Électricité",

    // --- 8. Nouvelles et Annonces ---
    news_title: "Annonces et Nouvelles",
    news_list: [
        "Lancement officiel de la Matrice NEO, nouvelle ère du hachage",
        "Mise à jour du protocole FBS v2.0, frais réduits de 30%",
        "Avis temporaire sur la maintenance des nœuds NEO (30 mars)",
        "Nouveauté : Extraction en un clic de 10 types de jetons éco",
        "Programme de recrutement de nœuds mondiaux en cours, rejoignez-nous"
    ],

    // --- 9. Détails des Jetons (Stats Page) ---
    stats_title: "Tokenomics",
    stats_subtitle: "Données Marché & Paramètres",
    token_labels: {
        fullname: "Nom complet",
        position: "Positionnement",
        supply: "Offre totale",
        distribution: "Mécanisme de distribution",
        mechanism: "Mécanisme de libération"
    },
    tokens: [
        { symbol: "NEO", name: "New Energy Ore", desc: "Jeton principal / Revenu de minage", total: "1,000,000,000", dist: "Minage 30% | Écosystème 20% | Équipe 15% | Investisseurs 15% | Airdrop 10% | Liquidité 10%", mech: "Libération linéaire, fin de production en 5 ans, halving annuel." },
        { symbol: "NEX", name: "Neo Energy Xtreme", desc: "Accélérateur / Boost de rendement", total: "500,000,000", dist: "Nœuds performance 40% | Staking NEO 25% | Partenaires 15% | Équipe 10% | Communauté 10%", mech: "Libération progressive selon la puissance du réseau." },
        { symbol: "NET", name: "Neo Energy Token", desc: "Carburant réseau / Jeton de frais Gas", total: "200,000,000", dist: "Récompenses nœuds 35% | Maintenance 30% | Réserve liquidité 20% | Airdrop 15%", mech: "Mécanisme de combustion et déflation." },
        { symbol: "NEA", name: "Neo Energy Asset", desc: "Asset mapping / Ancrage mineur physique", total: "Dynamique selon la puissance totale", dist: "Mapping mineurs 60% | Staking 25% | Écosystème 10% | Équipe 5%", mech: "Correspondance 1:1 avec le matériel de minage physique." },
        { symbol: "NRY", name: "Neo Resource Yield", desc: "Droits aux dividendes / Partage des profits", total: "300,000,000", dist: "Dividendes 50% | Récompenses holding 25% | Contributeurs 15% | Réserve équipe 10%", mech: "Distribution trimestrielle des profits aux détenteurs." },
        { symbol: "NCL", name: "Neo Core Link", desc: "Hub cross-chain / Média d'interopérabilité", total: "400,000,000", dist: "Récompenses nœuds 40% | Partenariats 30% | Gouvernance 15% | Développement 15%", mech: "Libération lors de l'intégration des protocoles." }
    ]
};
