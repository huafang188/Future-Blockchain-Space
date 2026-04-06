window.i18nData = window.i18nData || {};
window.i18nData['ko'] = {
    // --- 1. 글로벌 및 네비게이션 ---
    title: "NEO 에코 채굴 매트릭스",
    connect: "지갑 연결",
    connected: "연결됨",
    total_value: "총 자산 가치",
    loading: "로딩 중...",
    no_data: "데이터가 없습니다",
    copy_success: "클립보드에 복사되었습니다",
    copy_fail: "복사 실패, 수동으로 복사해주세요",
    nav_home: "홈",
    nav_mine: "마이닝",
    nav_market: "보드",
    nav_me: "마이",
    nav_wp: "백서",

    // --- 2. 채굴기 인터페이스 (Miner Page) ---
    miner_title: "내 채굴기",
    miner_name: "아발론 1066 스마트 채굴기",
    miner_desc: "대당 해시파워 ≈ 30TH/s, 소비전력: 1500W",
    m_count: "채굴기 수량",
    m_yield: "일일 생산량",
    m_term: "채굴 기간", 
    m_locked: "락업 수량", 
    buy_miner: "채굴기 구매",
    pay_fee: "전기료 납부",
    transfer_miner: "채굴기 전송",

    // --- 3. 자산 및 팀 (User Page) ---
    assets_list: "자산 현황",
    recharge: "충전",
    withdraw: "출금",
    exchange: "스왑",
    transfer: "전송",
    team_title: "내 팀",
    invite_code: "내 ID",
    inviter: "추천인",
    direct_num: "직속 추천 인원",
    direct_sales: "직속 추천 실적",
    team_num: "전체 팀 인원",
    team_sales: "전체 팀 실적",
    total_rewards: "누적 보상",
    reg_time: "가입 일시",

    // --- 4. 팝업 공통 (Modals) ---
    btn_confirm: "확인 및 제출",
    btn_confirm_bind: "서명하여 바인딩",
    btn_transfer_now: "서명하여 전송",
    btn_submit_email: "서명하여 신청",
    placeholder_inviter_id: "추천인 ID를 입력하세요",
    placeholder_email: "이메일 주소를 입력하세요",
    receiver_address: "수신자 지갑 주소",
    transfer_amount: "전송 수량",
    expected_pay: "예상 결제 금액",
    elec_cost: "필요 전기료",
    available: "사용 가능 잔액",

    // --- 5. 업무별 팝업 제목 (Modal Titles) ---
    modal_register_title: "채굴 계정 활성화",
    modal_bind_title: "추천 관계 바인딩",
    miner_transfer_title: "내부 채굴기 전송",
    modal_team_title: "팀 상세 데이터 신청",
    internal_transfer: "내부 전송",

    // --- 6. 설명 문구 ---
    register_desc: "추천인 ID를 입력하여 해시 노드를 활성화하세요",
    team_detail_desc: "데이터 양이 많으므로 팀 상세 보고서는 이메일로 발송됩니다",
    wait_audit: "신청이 완료되었습니다. 심사를 기다려주세요",
    sign_to_confirm: "지갑에서 서명하여 본인임을 확인해주세요",

    // --- 7. 백엔드 상태 및 유형 매핑 (Key는 원본 데이터 유지를 위해 간체 사용) ---
    已提交: "제출됨",
    处理中: "처리 중",
    成功: "성공",
    失败: "실패",
    充值: "충전",
    提现: "출금",
    兑换: "스왑",
    内部转账: "내부 전송",
    购买矿机: "채굴기 구매",
    缴纳电费: "전기료 납부",

    // --- 8. 뉴스 및 공지사항 ---
    news_title: "공지 및 뉴스",
    news_list: [
        "NEO 에코 채굴 매트릭스 정식 출시, 해시파워의 새로운 시대",
        "FBS 프로토콜 v2.0 업그레이드 완료, 거래 비용 30% 감소",
        "NEO 노드 유지보수에 관한 임시 공지 (3월 30일)",
        "신규 기능: 10종의 생태계 토큰 수익 일괄 수령 지원",
        "글로벌 노드 모집 계획 진행 중, 지금 참여하세요"
    ],

    // --- 9. 토큰 상세 정보 (Stats Page) ---
    stats_title: "토큰 이코노미",
    stats_subtitle: "토큰 경제 모델 및 시장 데이터",
    token_labels: {
        fullname: "전체 명칭",
        position: "포지션",
        supply: "총 공급량",
        distribution: "배분 메커니즘",
        mechanism: "릴리스 방식"
    },
    tokens: [
        { symbol: "NEO", name: "New Energy Ore", desc: "생태계 핵심 메인 토큰 / 채굴 핵심 산출물", total: "1,000,000,000", dist: "채굴 산출 30% | 생태계 구축 20% | 팀 인센티브 15% | 초기 투자 15% | 에어드롭 10% | 유동성 10%", mech: "선형 채굴 산출, 5년 내 채굴 완료 예상, 매년 반감기 적용." },
        { symbol: "NEX", name: "Neo Energy Xtreme", desc: "해시파워 가속 / 채굴 증폭 권한", total: "500,000,000", dist: "고성능 노드 채굴 40% | NEO 스테이킹 25% | 생태계 협력 15% | 팀 10% | 커뮤니티 10%", mech: "해시파워 상승에 따른 단계별 릴리스." },
        { symbol: "NET", name: "Neo Energy Token", desc: "네트워크 연료 / 가스비 토큰", total: "200,000,000", dist: "노드 운영 보상 35% | 네트워크 유지보수 30% | 유동성 예비 20% | 에어드롭 15%", mech: "소각 모델을 통한 발행량 조절." },
        { symbol: "NEA", name: "Neo Energy Asset", desc: "해시 자산 맵핑 / 실물 채굴기 고정 토큰", total: "전체 해시파워 규모에 따른 유동적 발행", dist: "실물 채굴기 맵핑 60% | 스테이킹 채굴 25% | 생태계 협력 10% | 팀 5%", mech: "실물 채굴 장비와 1:1 자산 맵핑." },
        { symbol: "NRY", name: "Neo Resource Yield", desc: "수익 배당 / 생태계 이익 공유 권한", total: "300,000,000", dist: "이익 배당 50% | 장기 보유 보상 25% | 기여자 인센티브 15% | 팀 예비 10%", mech: "분기별 수익 분배, 보유 시 배당 수령." },
        { symbol: "NCL", name: "Neo Core Link", desc: "크로스체인 허브 / 생태계 상호 운용 매개체", total: "400,000,000", dist: "크로스체인 노드 보상 40% | 파트너십 30% | 거버넌스 15% | 개발팀 15%", mech: "프로토콜 연결 및 서비스 연동 시 단계별 릴리스." }
    ]
};
