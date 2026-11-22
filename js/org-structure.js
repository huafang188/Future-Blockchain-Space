window.orgRenderAll = function () {
    if (!document.getElementById('orgCorpGrid')) return;
    orgRenderCards();
};
function orgIsZh() {
    var lang = localStorage.getItem('fbs_lang') || 'zh-CN';
    return lang.indexOf('zh') === 0;
}
function orgT(v) { return orgIsZh() ? v.zh : v.en; }

var ORG_DATA = {
corp: [
 { name: "Alex Chen", initials: "AC", role: { zh: "创始人 & CEO", en: "Founder & CEO" }, short: { zh: "统筹整体战略规划、经济模型设计与核心生态战略资源整合。", en: "Overall strategy, token economy design and core ecosystem resources." }, full: { zh: "拥有 10 年分布式系统与金融科技架构经验，曾主导多个大型区块链底层基础设施从 0 到 1 的落地，负责项目整体技术路线图与全球战略合作。", en: "10 years in distributed systems and fintech architecture; led multiple blockchain infrastructures from zero to one, owning the roadmap and global strategic partnerships." }, tags: { zh: ["战略规划", "经济模型", "生态合作"], en: ["Strategy", "Tokenomics", "Partnerships"] } },
 { name: "Dr. Lin Wei", initials: "LW", role: { zh: "联合创始人 & 首席技术官", en: "Co-Founder & CTO" }, short: { zh: "主导底层协议架构、核心智能合约研发及主网技术演进。", en: "Protocol architecture, core smart contracts and mainnet evolution." }, full: { zh: "分布式计算博士，专注于共识算法、跨链通信与智能合约架构设计，带领核心工程团队把控代码质量与主网高性能运行。", en: "PhD in distributed computing; specializes in consensus, cross-chain messaging and contract architecture, leading core engineering quality and mainnet performance." }, tags: { zh: ["协议架构", "核心研发", "技术路线"], en: ["Protocol", "R&D", "Roadmap"] } },
 { name: "Kevin Zhou", initials: "KZ", role: { zh: "首席区块链架构师", en: "Chief Blockchain Architect" }, short: { zh: "负责节点网络性能优化、数据索引层与跨链互操作协议设计。", en: "Node performance, indexing layer and cross-chain interoperability." }, full: { zh: "资深底层系统工程师，曾参与开源公链执行引擎与状态存储优化，主导高并发场景下的链上吞吐量与低延迟架构升级。", en: "Senior systems engineer; contributed to execution engine and state storage optimization, leading high-concurrency throughput and low-latency upgrades." }, tags: { zh: ["节点网络", "跨链架构", "性能优化"], en: ["Node Network", "Cross-chain", "Performance"] } },
 { name: "Ryan Patel", initials: "RP", role: { zh: "智能合约安全负责人", en: "Head of Security" }, short: { zh: "负责智能合约形式化验证、代码审计对接及链上实时风控监控。", en: "Formal verification, audit coordination and on-chain risk control." }, full: { zh: "前知名区块链安全机构高级审计专家，主导建立全生命周期安全开发规范，协调第三方权威审计机构并维护漏洞赏金计划。", en: "Former senior auditor at a top blockchain security firm; built full-lifecycle security standards and runs the bug bounty program." }, tags: { zh: ["合约审计", "形式化验证", "链上风控"], en: ["Audits", "Formal Verification", "Risk Control"] } },
 { name: "Chloe Wang", initials: "CW", role: { zh: "产品与经济模型总监", en: "VP of Product" }, short: { zh: "主导核心 DApp 交互体验、代币效用设计及协议参数模型推演。", en: "DApp UX, token utility design and protocol parameter modeling." }, full: { zh: "拥有丰富 Web3 产品与 DeFi 机制设计经验，专注于降低普通用户与开发者使用门槛，平衡协议长期增长与代币供需模型。", en: "Experienced in Web3 product and DeFi mechanism design; lowers the entry barrier while balancing protocol growth and token supply-demand." }, tags: { zh: ["产品设计", "Tokenomics", "用户体验"], en: ["Product", "Tokenomics", "UX"] } },
 { name: "Sarah Zhang", initials: "SZ", role: { zh: "开发者关系负责人", en: "Head of DevRel" }, short: { zh: "负责 SDK 工具链文档体系、黑客松组织及第三方开发者接入支持。", en: "SDK docs, hackathons and third-party developer onboarding." }, full: { zh: "连接核心研发与外部开发者的桥梁，主导开发者文档完善、技术工作坊、源码示例库建设及全球黑客松技术支持。", en: "Bridges core engineering and external developers; owns documentation, workshops, example repositories and global hackathon support." }, tags: { zh: ["开发者文档", "SDK 支持", "黑客松"], en: ["Docs", "SDK Support", "Hackathons"] } },
 { name: "Daniel Kim", initials: "DK", role: { zh: "全球商务拓展总监", en: "Head of BD" }, short: { zh: "负责交易所、钱包、基础设施服务商及行业机构战略合作落地。", en: "Exchange, wallet, infrastructure and institutional partnerships." }, full: { zh: "深耕亚太与欧美加密商业网络，主导生态流动性合作、主流钱包集成、跨链桥接入及企业级合作伙伴拓展。", en: "Deep APAC and Western crypto business network; leads liquidity partnerships, wallet integrations and enterprise deals." }, tags: { zh: ["战略合作", "生态集成", "机构拓展"], en: ["Partnerships", "Integrations", "Institutions"] } },
 { name: "Grace Liu", initials: "GL", role: { zh: "合规与财务负责人", en: "Legal & Finance Lead" }, short: { zh: "负责企业主体合规、知识产权管理、审计财务及研发预算管控。", en: "Entity compliance, IP management, audit finance and budgets." }, full: { zh: "具备跨境科技企业法务与财务管理背景，确保核心研发实体与外部基金会之间的服务协议合规透明、知识产权权属清晰。", en: "Cross-border legal and finance background; ensures compliant and transparent agreements between the entity and the foundation." }, tags: { zh: ["合规框架", "财务透明", "IP 管理"], en: ["Compliance", "Transparency", "IP"] } }
],
comm: [
 { name: "Marcus Vance", initials: "MV", role: { zh: "生态基金负责人", en: "Ecosystem Lead" }, short: { zh: "统筹生态 Grants 资金分配、早期项目孵化与里程碑验收评审。", en: "Grants allocation, incubation and milestone reviews." }, full: { zh: "专注 Web3 早期生态孵化与开发者资助，负责筛选高潜力生态应用，组织技术评审委员会并监督生态激励资金的透明使用。", en: "Focused on early-stage Web3 incubation and developer funding; screens high-potential apps and oversees transparent grant usage." }, tags: { zh: ["Grants 审批", "项目孵化", "国库透明度"], en: ["Grants", "Incubation", "Transparency"] } },
 { name: "Elena Rostova", initials: "ER", role: { zh: "社区治理负责人", en: "Governance Lead" }, short: { zh: "管理治理论坛、RFC 提案流程规范及代表人协作机制。", en: "Governance forum, RFC process and delegate coordination." }, full: { zh: "专注于去中心化治理架构实践，搭建了从社区温度检查、论坛提案讨论到链上多签执行的标准化透明治理流程。", en: "Practitioner of decentralized governance; standardized the flow from temperature checks to on-chain multisig execution." }, tags: { zh: ["DAO 治理", "提案规范", "代表协作"], en: ["DAO", "Proposals", "Delegates"] } },
 { name: "Security Council", initials: "SC", role: { zh: "安全应急委员会", en: "Multisig Committee" }, short: { zh: "由核心技术骨干与外部安全专家组成的 4/7 多签应急响应小组。", en: "A 4/7 multisig rapid-response group of core engineers and external experts." }, full: { zh: "采用严格受限的多签权限机制，在发现高危协议漏洞或极端异常时快速执行防御措施，并向社区公开事后复盘报告。", en: "Strictly limited multisig authority; executes defensive measures on critical vulnerabilities and publishes post-mortems to the community." }, tags: { zh: ["4/7 多签", "应急响应", "资产守护"], en: ["4/7 Multisig", "Response", "Asset Guard"] } },
 { name: "Sophia Martinez", initials: "SM", role: { zh: "全球市场与品牌增长", en: "Head of Growth" }, short: { zh: "负责全球品牌传播、生态联合营销活动及媒体公关关系维护。", en: "Global brand, joint campaigns and media relations." }, full: { zh: "资深 Web3 品牌增长专家，策划全球生态联合 Campaign、AMA 路演及行业峰会亮相，持续提升生态在开发者与用户中的影响力。", en: "Veteran Web3 brand growth expert; plans global campaigns, AMAs and summit appearances to grow ecosystem influence." }, tags: { zh: ["品牌增长", "生态营销", "媒体公关"], en: ["Brand", "Marketing", "PR"] } },
 { name: "Kenji Sato", initials: "KS", role: { zh: "亚太区大使负责人", en: "APAC Ambassador Lead" }, short: { zh: "统筹华语、日韩及东南亚区域大使网络、本地化运营与线下 Meetup。", en: "Chinese, Japanese-Korean and SEA ambassador network and meetups." }, full: { zh: "熟悉亚太各区域加密社区文化，负责招募与考核区域核心大使，组织多城市开发者沙龙与本地语言文档推广。", en: "Understands APAC crypto community cultures; recruits regional ambassadors and organizes multi-city developer salons." }, tags: { zh: ["亚太社区", "区域大使", "线下活动"], en: ["APAC", "Ambassadors", "Events"] } },
 { name: "Lucas Meyer", initials: "LM", role: { zh: "欧美社区负责人", en: "EMEA & Americas Lead" }, short: { zh: "负责欧美及拉美地区开发者社群建设、高校区块链社团合作。", en: "Western and LATAM developer communities and university clubs." }, full: { zh: "驻欧洲生态协调人，致力于拓展海外英文社区与高校技术极客网络，推动全球多元文化背景的贡献者加入生态。", en: "Europe-based coordinator; grows English-speaking communities and university hacker networks worldwide." }, tags: { zh: ["欧美社区", "高校合作", "全球拓展"], en: ["Western Communities", "Universities", "Expansion"] } },
 { name: "Maya Lin", initials: "ML", role: { zh: "技术布道与内容主编", en: "Content & Research Lead" }, short: { zh: "负责双周开发进展周报、深度研报与科普教程体系。", en: "Bi-weekly dev updates, research reports and tutorials." }, full: { zh: "将复杂的技术架构转化为清晰易读的图解与教程，定期发布生态发展月报，消除核心团队与社区之间的信息不对称。", en: "Turns complex architecture into clear visuals and tutorials; publishes monthly reports to remove information asymmetry." }, tags: { zh: ["开发周报", "技术科普", "内容生态"], en: ["Dev Updates", "Explainers", "Content"] } },
 { name: "Noah Brooks", initials: "NB", role: { zh: "社区运营与支持主管", en: "Community Ops Lead" }, short: { zh: "管理核心社群秩序、反欺诈安全提醒与用户反馈。", en: "Community order, anti-scam alerts and user feedback." }, full: { zh: "带领全球志愿者 Mod 团队提供 7×24 小时社区答疑，建立防钓鱼安全预警机制，并将一线用户反馈结构化同步给产品研发组。", en: "Leads global volunteer mods for 24/7 support, built anti-phishing alerts, and channels user feedback to product teams." }, tags: { zh: ["社群运营", "反诈防骗", "用户反馈"], en: ["Community Ops", "Anti-Scam", "Feedback"] } }
]};

function orgRenderCards() {
    function render(list, containerId, isComm) {
        var el = document.getElementById(containerId);
        if (!el) return;
        el.innerHTML = list.map(function (item, idx) {
            return '<div class="org-card' + (isComm ? ' comm-card' : '') + '" onclick="orgOpenModal(\'' + (isComm ? 'comm' : 'corp') + '\',' + idx + ')">' +
                '<div class="org-avatar' + (isComm ? ' comm-avatar' : '') + '">' + item.initials + '</div>' +
                '<div class="org-name">' + item.name + '</div>' +
                '<div class="org-role' + (isComm ? ' comm-role' : '') + '">' + orgT(item.role) + '</div>' +
                '<div class="org-bio">' + orgT(item.short) + '</div>' +
                '</div>';
        }).join('');
    }
    render(ORG_DATA.corp, 'orgCorpGrid', false);
    render(ORG_DATA.comm, 'orgCommGrid', true);
}

window.orgFilterView = function (mode, btn) {
    document.querySelectorAll('.org-filter-btn').forEach(function (b) { b.classList.remove('active'); });
    btn.classList.add('active');
    var wrapper = document.getElementById('orgWrapper');
    var colCorp = document.getElementById('orgColCorp');
    var colComm = document.getElementById('orgColComm');
    if (mode === 'all') {
        wrapper.classList.remove('single-view');
        colCorp.classList.remove('org-hidden');
        colComm.classList.remove('org-hidden');
    } else {
        wrapper.classList.add('single-view');
        colCorp.classList.toggle('org-hidden', mode !== 'corp');
        colComm.classList.toggle('org-hidden', mode !== 'comm');
    }
};

window.orgOpenModal = function (type, index) {
    var item = ORG_DATA[type][index];
    var avatar = document.getElementById('orgMAvatar');
    avatar.textContent = item.initials;
    avatar.className = 'org-avatar-lg' + (type === 'comm' ? ' comm-avatar' : '');
    document.getElementById('orgMName').innerText = item.name;
    document.getElementById('orgMRole').innerText = orgT(item.role);
    document.getElementById('orgMBio').innerText = orgT(item.full);
    document.getElementById('orgMTags').innerHTML = orgT(item.tags).map(function (tg) {
        return '<span class="org-tag-pill">' + tg + '</span>';
    }).join('');
    document.getElementById('orgModal').classList.add('active');
};

window.orgCloseModal = function () {
    document.getElementById('orgModal').classList.remove('active');
};

var _origI18nRenderOrg = window.i18nRender;
window.i18nRender = function (lang) {
    if (_origI18nRenderOrg) _origI18nRenderOrg(lang);
    orgRenderAll();
};
orgRenderAll();
