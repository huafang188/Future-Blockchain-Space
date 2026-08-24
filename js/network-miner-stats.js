/**
 * 全网矿机数据动态计算
 * 基于基准日期和基准数值，每天按规则自动增长
 * 使用日期作为随机种子，保证同一天所有用户看到的数值一致
 */

// 基准日期：2026-08-01
const BASELINE_DATE = new Date(2026, 7, 1); // 月份从 0 开始，7 = 8月

// 基准数值
const BASELINE = {
    neo_total_supply: 1000000000,      // NEO 总发行量（恒定不变）
    network_miner_total: 393262,       // 全网运行矿机总数
    network_daily_output: 3440255,     // 全网 NEO 日产量
    single_miner_output: 7.78,         // 单台矿机 NEO 产量（不变）
    today_new_original: 2340,          // 昨日新增原始矿机
    today_new_synthetic: 1092,         // 昨日新增合成矿机
    neo_holders: 93262,                // NEO 持有者数量
    neo_total_output: 187808498,       // NEO 产出总量
    neo_burned: 4252611                // NEO 销毁数量
};

/**
 * 简单的日期种子随机数生成器
 * 同一日期生成相同的随机数
 */
function seededRandom(seed) {
    let x = Math.sin(seed) * 10000;
    return x - Math.floor(x);
}

/**
 * 计算从基准日期到指定日期的天数差
 */
function getDaysDiff(targetDate) {
    const diff = targetDate.getTime() - BASELINE_DATE.getTime();
    return Math.floor(diff / (1000 * 60 * 60 * 24));
}

/**
 * 获取指定日期的种子随机整数（含上下界）
 * @param {number} dayIndex - 天数差
 * @param {number} seedOffset - 种子偏移量
 * @param {number} min - 最小值
 * @param {number} max - 最大值
 * @returns {number} 随机整数
 */
function seededRandomInt(dayIndex, seedOffset, min, max) {
    const seed = dayIndex * 1000 + seedOffset;
    const random = seededRandom(seed);
    return Math.round(min + random * (max - min));
}

/**
 * 获取全网矿机统计数据
 * 增长规则：
 * - 全网矿机总数：每天增加 = 当日新增原始矿机 + 当日新增合成矿机
 * - 原始矿机每天增加 2-10 台
 * - 合成矿机每天增加 1-6 台
 * - NEO 持有者数量每天增加 20-100
 * - NEO 已产出总量 = 基础数据 + 累计日产量
 * - 日产量每日上下浮动 ±1000 枚
 * - 销毁数量每天增加 600-1000
 * @param {Date} targetDate - 目标日期（默认今天）
 * @returns {object} 各项统计数据
 */
export function getNetworkMinerStats(targetDate = new Date()) {
    const dayIndex = getDaysDiff(targetDate);

    // 昨日新增原始矿机/合成矿机：基准值 + 每日增量（2-10 / 1-6）
    let currentNewOriginal = BASELINE.today_new_original;
    let currentNewSynthetic = BASELINE.today_new_synthetic;

    // 累计增量
    let totalMinerIncrement = 0;
    let totalHoldersIncrement = 0;
    let totalBurnedIncrement = 0;
    let accumulatedOutput = 0;

    for (let i = 1; i <= dayIndex; i++) {
        // 昨日新增值每天增长 2-10（原始）/ 1-6（合成）
        currentNewOriginal += seededRandomInt(i, 3, 2, 10);
        currentNewSynthetic += seededRandomInt(i, 4, 1, 6);

        // 全网矿机总数每天增加 = 昨日新增原始 + 昨日新增合成
        totalMinerIncrement += currentNewOriginal + currentNewSynthetic;

        // NEO 持有者每天增加 20-100
        totalHoldersIncrement += seededRandomInt(i, 5, 20, 100);

        // 销毁数量每天增加 600-1000
        totalBurnedIncrement += seededRandomInt(i, 7, 600, 1000);

        // 日产量每日上下浮动 ±1000
        const dailyFluctuation = seededRandomInt(i, 6, -1000, 1000);
        const dailyOutput = BASELINE.network_daily_output + dailyFluctuation;
        accumulatedOutput += dailyOutput;
    }

    // 当天显示的日产量（基准 + 当日浮动）
    const currentDailyFluctuation = dayIndex > 0 ? seededRandomInt(dayIndex, 6, -1000, 1000) : 0;

    return {
        // NEO 总发行量（恒定）
        neo_total_supply: BASELINE.neo_total_supply,

        // 全网运行矿机总数 = 基准 + 累计新增
        network_miner_total: BASELINE.network_miner_total + totalMinerIncrement,

        // 全网 NEO 日产量 = 基准 + 当日浮动
        network_daily_output: BASELINE.network_daily_output + currentDailyFluctuation,

        // 单台矿机 NEO 产量（不变）
        single_miner_output: BASELINE.single_miner_output,

        // 昨日新增原始矿机 = 基准 + 每日增量
        today_new_original: currentNewOriginal,

        // 昨日新增合成矿机 = 基准 + 每日增量
        today_new_synthetic: currentNewSynthetic,

        // NEO 持有者数量 = 基准 + 累计增量
        neo_holders: BASELINE.neo_holders + totalHoldersIncrement,

        // NEO 产出总量 = 基准 + 累计日产量
        neo_total_output: BASELINE.neo_total_output + accumulatedOutput,

        // NEO 销毁数量 = 基准 + 累计增量
        neo_burned: BASELINE.neo_burned + totalBurnedIncrement
    };
}

/**
 * 更新页面上的全网矿机数据显示
 */
export function updateNetworkMinerDisplay() {
    const stats = getNetworkMinerStats();

    const formatNumber = (num) => num.toLocaleString('en-US');

    const elements = {
        neo_total_supply: stats.neo_total_supply,
        network_miner_total: stats.network_miner_total,
        network_daily_output: stats.network_daily_output,
        single_miner_output: stats.single_miner_output,
        today_new_original: stats.today_new_original,
        today_new_synthetic: stats.today_new_synthetic,
        neo_holders: stats.neo_holders,
        neo_total_output: stats.neo_total_output,
        neo_burned: stats.neo_burned
    };

    Object.keys(elements).forEach(id => {
        const el = document.getElementById(id);
        if (el) {
            el.textContent = formatNumber(elements[id]);
        }
    });
}

// 导出到全局
window.getNetworkMinerStats = getNetworkMinerStats;
window.updateNetworkMinerDisplay = updateNetworkMinerDisplay;
