window.i18nData = window.i18nData || {};
window.i18nData['es'] = {
    // --- 1. Global y Navegación ---
    title: "Matriz de Minería NEO",
    connect: "Conectar Billetera",
    connected: "Conectado",
    total_value: "Valor Total de Activos",
    loading: "Cargando...",
    no_data: "No hay datos disponibles",
    copy_success: "Copiado al portapapeles",
    copy_fail: "Error al copiar, por favor hazlo manualmente",
    nav_home: "Inicio",
    nav_mine: "Minería",
    nav_market: "Tablero",
    nav_me: "Perfil",
    nav_wp: "Whitepaper",

    // --- 2. Interfaz del Minero (Página de Minería) ---
    miner_title: "Mis Mineros",
    miner_name: "Minero Inteligente Avalon 1066",
    miner_desc: "Potencia ≈ 30TH/s, Consumo: 1500W",
    m_count: "Cantidad de unidades",
    m_yield: "Rendimiento Diario",
    m_term: "Plazo de Minería", 
    m_locked: "Cantidad Bloqueada", 
    buy_miner: "Comprar Minero",
    pay_fee: "Pagar Electricidad",
    transfer_miner: "Transferir Minero",

    // --- 3. Activos y Equipo (Página de Usuario) ---
    assets_list: "Resumen de Activos",
    recharge: "Depósito",
    withdraw: "Retiro",
    exchange: "Canje (Swap)",
    transfer: "Transferencia",
    team_title: "Mi Equipo",
    invite_code: "Mi ID",
    inviter: "Invitado por",
    direct_num: "Referidos Directos",
    direct_sales: "Ventas Directas",
    team_num: "Tamaño del Equipo",
    team_sales: "Ventas del Equipo",
    total_rewards: "Recompensas Totales",
    reg_time: "Fecha de Registro",

    // --- 4. Elementos comunes de Modales (Popups) ---
    btn_confirm: "Confirmar Envío",
    btn_confirm_bind: "Firmar para Vincular",
    btn_transfer_now: "Firmar para Transferir",
    btn_submit_email: "Firmar para Solicitar",
    placeholder_inviter_id: "Ingrese ID del Invitador",
    placeholder_email: "Ingrese su correo electrónico",
    receiver_address: "Dirección del Destinatario",
    transfer_amount: "Cantidad a Transferir",
    expected_pay: "Pago Estimado",
    elec_cost: "Costo de Electricidad",
    available: "Saldo Disponible",

    // --- 5. Títulos de Modales Específicos ---
    modal_register_title: "Activar Cuenta de Minería",
    modal_bind_title: "Vincular Referido",
    miner_transfer_title: "Transferencia Interna de Minero",
    modal_team_title: "Solicitud de Datos de Equipo",
    internal_transfer: "Transferencia Interna",

    // --- 6. Descripciones ---
    register_desc: "Ingrese el ID del invitador para activar su nodo de potencia",
    team_detail_desc: "Debido al gran volumen de datos, el informe detallado del equipo se enviará por correo",
    wait_audit: "Solicitud enviada, esperando revisión",
    sign_to_confirm: "Por favor, firme en su billetera para confirmar su identidad",

    // --- 7. Mapeo de Estados del Backend (Mantener llaves en chino para compatibilidad) ---
    已提交: "Enviado",
    处理中: "En proceso",
    成功: "Éxito",
    失败: "Fallido",
    充值: "Depósito",
    提现: "Retiro",
    兑换: "Canje",
    内部转账: "Transferencia Interna",
    购买矿机: "Compra de Minero",
    缴纳电费: "Pago de Electricidad",

    // --- 8. Noticias y Anuncios ---
    news_title: "Anuncios y Noticias",
    news_list: [
        "La Matriz de Minería NEO está oficialmente en línea, comienza una nueva era",
        "Protocolo FBS v2.0 actualizado, costos de transacción reducidos en un 30%",
        "Aviso temporal sobre mantenimiento de nodos NEO (30 de marzo)",
        "Nuevo: Soporte para extracción en un clic de 10 tipos de tokens eco",
        "Plan de reclutamiento de nodos globales en marcha, únete ahora"
    ],

    // --- 9. Detalles de Tokens (Página de Estadísticas) ---
    stats_title: "Economía de Tokens",
    stats_subtitle: "Datos de Mercado y Parámetros",
    token_labels: {
        fullname: "Nombre Completo",
        position: "Posicionamiento",
        supply: "Suministro Total",
        distribution: "Distribución",
        mechanism: "Mecanismo de Liberación"
    },
    tokens: [
        { symbol: "NEO", name: "New Energy Ore", desc: "Token principal del ecosistema / Salida principal de minería", total: "1,000,000,000", dist: "Minería 30% | Ecosistema 20% | Equipo 15% | Inversores iniciales 15% | Airdrop 10% | Liquidez 10%", mech: "Emisión lineal en 5 años, halving anual." },
        { symbol: "NEX", name: "Neo Energy Xtreme", desc: "Acelerador de potencia / Certificado de boost de minería", total: "500,000,000", dist: "Nodos de rendimiento 40% | Staking NEO 25% | Socios 15% | Equipo 10% | Comunidad 10%", mech: "Liberación gradual basada en el crecimiento de la potencia de red." },
        { symbol: "NET", name: "Neo Energy Token", desc: "Combustible de red / Token para comisiones de Gas", total: "200,000,000", dist: "Premios de nodos 35% | Mantenimiento 30% | Reserva de liquidez 20% | Airdrop 15%", mech: "Mecanismo de quema y deflación." },
        { symbol: "NEA", name: "Neo Energy Asset", desc: "Mapeo de activos de hash / Anclaje a minero físico", total: "Dinámico según potencia total", dist: "Mapeo de mineros físicos 60% | Staking 25% | Socios 10% | Equipo 5%", mech: "Correspondencia 1:1 con el hardware de minería físico." },
        { symbol: "NRY", name: "Neo Resource Yield", desc: "Derechos de dividendos / Participación en beneficios", total: "300,000,000", dist: "Distribución de utilidades 50% | Premios por holding 25% | Colaboradores 15% | Reserva del equipo 10%", mech: "Distribución trimestral de beneficios a los holders." },
        { symbol: "NCL", name: "Neo Core Link", desc: "Hub cross-chain / Medio de interoperabilidad", total: "400,000,000", dist: "Premios nodos cross-chain 40% | Alianzas 30% | Gobernanza 15% | Desarrollo 15%", mech: "Liberación durante la integración de protocolos y servicios." }
    ]
};
