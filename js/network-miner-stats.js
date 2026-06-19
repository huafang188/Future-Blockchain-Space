/**
 * 全网矿机数据动态计算
 * 基于基准日期和基准数值，每天自动增长
 * 使用日期作为随机种子，保证同一天所有用户看到的数值一致
 */

// 基准日期：2026-06-18
const BASELINE_DATE = new Date(2026, 5, 18); // 月份从 0 开始，5 = 6月

// 基准数值
const BASELINE = {
    network_miner_total: 170000,       // 全网运行矿机总数
    network_daily_output: 1652400,     // 全网 NEO 日产量
    single_miner_output: 9.72,         // 单台矿机 NEO 产量（不变）
    today_new_original: 2328,          // 今日新增原始矿机
    today_new_synthetic: 6794,         // 今日新增合成矿机
    neo_holders: 173594,               // NEO 持有者数量
    neo_total_output: 83980219,        // NEO 产出总量
    neo_burned: 2043985                // NEO 销毁数量
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
 * 获取指定日期的随机增长率
 * @param {number} dayIndex - 天数差
 * @param {number} seedOffset - 种子偏移量（不同指标用不同偏移避免相同随机数）
 * @param {number} minRate - 最小增长率（如 0.05 表示 5%）
 * @param {number} maxRate - 最大增长率（如 0.08 表示 8%）
 * @returns {number} 增长率
 */
function getDailyRate(dayIndex, seedOffset, minRate, maxRate) {
    const seed = dayIndex * 1000 + seedOffset;
    const random = seededRandom(seed);
    return minRate + random * (maxRate - minRate);
}

/**
 * 计算复利增长
 * @param {number} base - 基准值
 * @param {number} dayIndex - 天数差
 * @param {number} seedOffset - 种子偏移量
 * @param {number} minRate - 最小日增长率
 * @param {number} maxRate - 最大日增长率
 * @returns {number} 当前值
 */
function compoundGrowth(base, dayIndex, seedOffset, minRate, maxRate) {
    if (dayIndex <= 0) return base;
    
    let value = base;
    for (let i = 0; i < dayIndex; i++) {
        const rate = getDailyRate(i, seedOffset, minRate, maxRate);
        value = value * (1 + rate);
    }
    return value;
}

/**
 * 计算线性增长（固定增量）
 * @param {number} base - 基准值
 * @param {number} dayIndex - 天数差
 * @param {number} seedOffset - 种子偏移量
 * @param {number} minIncrement - 最小日增量
 * @param {number} maxIncrement - 最大日增量
 * @returns {number} 当前值
 */
function linearGrowth(base, dayIndex, seedOffset, minIncrement, maxIncrement) {
    if (dayIndex <= 0) return base;
    
    let value = base;
    for (let i = 0; i < dayIndex; i++) {
        const seed = i * 1000 + seedOffset;
        const random = seededRandom(seed);
        const increment = minIncrement + random * (maxIncrement - minIncrement);
        value += increment;
    }
    return value;
}

/**
 * 获取全网矿机统计数据
 * @param {Date} targetDate - 目标日期（默认今天）
 * @returns {object} 各项统计数据
 */
export function getNetworkMinerStats(targetDate = new Date()) {
    const dayIndex = getDaysDiff(targetDate);
    
    return {
        // 全网运行矿机总数：每日复利增长 5%-8%
        network_miner_total: Math.round(compoundGrowth(BASELINE.network_miner_total, dayIndex, 1, 0.05, 0.08)),
        
        // 全网 NEO 日产量：每日复利增长 1%
        network_daily_output: Math.round(compoundGrowth(BASELINE.network_daily_output, dayIndex, 2, 0.01, 0.01)),
        
        // 单台矿机 NEO 产量：不变
        single_miner_output: BASELINE.single_miner_output,
        
        // 今日新增原始矿机：每日线性增长 800-1000 台
        today_new_original: Math.round(linearGrowth(BASELINE.today_new_original, dayIndex, 3, 800, 1000)),
        
        // 今日新增合成矿机：每日线性增长 500-900 台
        today_new_synthetic: Math.round(linearGrowth(BASELINE.today_new_synthetic, dayIndex, 4, 500, 900)),
        
        // NEO 持有者数量：每日复利增长 5%-9%
        neo_holders: Math.round(compoundGrowth(BASELINE.neo_holders, dayIndex, 5, 0.05, 0.09)),
        
        // NEO 产出总量：基准值 + 累计每日产量
        neo_total_output: Math.round(BASELINE.neo_total_output + getAccumulatedOutput(dayIndex)),
        
        // NEO 销毁数量：每日复利增长 1%-2%
        neo_burned: Math.round(compoundGrowth(BASELINE.neo_burned, dayIndex, 7, 0.01, 0.02))
    };
}

/**
 * 计算累计 NEO 产量
 */
function getAccumulatedOutput(dayIndex) {
    if (dayIndex <= 0) return 0;
    
    let total = 0;
    let dailyOutput = BASELINE.network_daily_output;
    for (let i = 0; i < dayIndex; i++) {
        const rate = getDailyRate(i, 2, 0.01, 0.01);
        total += dailyOutput;
        dailyOutput = dailyOutput * (1 + rate);
    }
    return total;
}

/**
 * 更新页面上的全网矿机数据显示
 */
export function updateNetworkMinerDisplay() {
    const stats = getNetworkMinerStats();
    
    const formatNumber = (num) => num.toLocaleString('en-US');
    
    const elements = {
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
