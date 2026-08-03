// 数据常量层：权威真实数据 + 默认状态（各模块共享）
// 人口：UN World Population Prospects 2024（中方案）；储蓄率：World Bank；宏观：国家统计局 / 人民银行
const STORAGE_KEY = 'retirementDashboardState_v5';

// 21 档 5 岁组（与 UN WPP 标准一致）
const ageGroups = ['0-4','5-9','10-14','15-19','20-24','25-29','30-34','35-39','40-44','45-49','50-54','55-59','60-64','65-69','70-74','75-79','80-84','85-89','90-94','95-99','100+'];

// 各年份分年龄、性别人口（单位：万人）。来源：UN WPP 2024 中方案，经 populationpyramid.net 聚合
// 2020 与第七次全国人口普查总量交叉核对一致（差异 <1%）
const populationByYear = {
  1950: { male: [4052.72,3016.14,2907.44,2757.39,2405.78,2141.04,1888.81,1751.38,1567.32,1410.47,1153.66,993.87,791.4,558.76,313.18,185.36,84.4,26.99,4.92,0.4,0.01], female: [3745.73,2682.45,2522.41,2458.11,2180.66,1994.24,1794.83,1642.85,1520.16,1364.83,1101.6,985.98,829.73,659.28,420.9,273.26,145.42,57.17,12.19,1.15,0.04]},
  1960: { male: [5047.14,4917.67,3614.59,2849.33,2757.58,2597.28,2245.41,1980.79,1712.43,1528.68,1288.52,1068.47,771.4,536.81,322.94,159.88,55.73,16.23,2.88,0.22,0], female: [4805.53,4691.73,3334.02,2547.77,2413.87,2335.73,2056.62,1867.92,1656.33,1480.2,1324.04,1137.67,852.55,657.67,439.97,258.74,105.22,32.88,6.95,0.76,0.04]},
  1970: { male: [6966.45,5694.93,4564.92,4687.48,3472.73,2725.55,2613.07,2444.61,2086.73,1792.39,1478.91,1231.09,928.8,641.6,356.8,173.12,62.72,14.24,1.67,0.09,0], female: [6607.55,5406.95,4344.53,4509.02,3231.56,2457.69,2309.76,2220.57,1934.35,1727.13,1489.91,1278.45,1073.08,822.75,511.8,298.27,127.32,36.56,5.39,0.33,0.01]},
  1980: { male: [5140.81,6435.58,6664.45,5549.19,4455.25,4557.71,3358.49,2623.8,2492.49,2291.88,1902.8,1564.7,1195.91,869.36,533.66,279.21,102.01,24.79,3.18,0.13,0], female: [4838.84,6080.74,6328.74,5294.02,4268.39,4416.61,3148.21,2383.14,2222.18,2110.52,1805.67,1570.62,1294.35,1015.17,738.18,466.07,209.06,68.11,11.59,0.77,0.02]},
  1990: { male: [6657.3,5551.34,5024.23,6326.69,6545.5,5434.28,4346.23,4436.29,3249.24,2504.51,2324.08,2065.28,1623.61,1207.35,783.09,447.36,186.21,52.44,7.25,0.31,0], female: [6073.12,5179.05,4735.66,6006.29,6253.06,5217.05,4196.57,4337.12,3074.99,2307.22,2120.31,1971.97,1631.17,1328.47,977.97,646.19,354.02,141.88,30.65,2.82,0.07]},
  2000: { male: [4570.44,5373.29,6539.47,5489.05,4958.17,6216.82,6408.59,5308.48,4224.04,4275.34,3081.66,2312.62,2047.93,1678.31,1168.08,722.62,340.01,112.58,18.76,1.13,0.01], female: [3947.17,4758.28,5972.08,5136.64,4690.68,5931.23,6163.25,5133.92,4118.37,4241.56,2978.9,2201.82,1969.07,1737.67,1318.53,942.62,549.96,241.06,67.99,9.49,0.45]},
  2010: { male: [4614.93,4319.52,4513.89,5316.17,6455.36,5391.1,4854.79,6088.18,6253.48,5140.56,4028.99,3997.24,2780.56,1945.63,1537.79,1069.67,571.7,223.19,46.06,3.52,0.02], female: [3934.78,3685.04,3900.66,4717.18,5908.03,5057.77,4611.93,5844.82,6067.39,5035.37,4012.69,4098.12,2821.08,1998.57,1655.54,1298.11,804.6,403.41,128.07,19.48,1.15]},
  2020: { male: [4285.21,4861.08,4587.35,4289.63,4467.88,5246.98,6368.69,5313.16,4769.05,5933.26,6011.39,4849.24,3665.98,3434.08,2180.43,1315.36,801.08,361.32,93.54,10.27,0.18], female: [3768.34,4190.48,3913.05,3664.08,3866.19,4665.95,5849,5007.18,4560.76,5763.51,5948.81,4893.57,3837.34,3809.66,2474.14,1587.33,1089.59,612.75,218.2,42.23,3.28]},
  2030: { male: [2198.15,2486.82,4265.07,4832.58,4511.89,4222.91,4431.18,5199.32,6289.92,5210.81,4618.8,5634.8,5543.25,4252.89,2938.05,2432.79,1234.25,490.89,146.37,19.38,0.7], female: [2024.32,2249.32,3750.43,4167.1,3841.13,3603.59,3843.8,4641.05,5807.35,4955.75,4489.5,5624.6,5728.49,4596.05,3422.37,3139.16,1744.11,818.85,328.1,72.84,6.66]},
  2040: { male: [2194.53,2140.02,2187.27,2468.67,4197.17,4750.92,4481.5,4213.83,4403.99,5128.87,6139.21,5008.02,4334.7,5067.1,4674.63,3252.4,1822.53,1069.68,293.2,37.35,1.81], female: [2060.17,1996.41,2011.76,2231.03,3682.61,4087.11,3818.45,3606.8,3835.77,4609.53,5736.82,4859.99,4352.62,5334.4,5228.72,3926.95,2512.16,1772.08,616.88,120.53,13.49]},
  2050: { male: [2058.29,2216.83,2185.71,2125.18,2131.56,2404.57,4175.72,4745.72,4463.34,4172.59,4321.97,4969.13,5841.11,4610.39,3782.13,4044.14,3182.47,1653.75,500.36,108.19,5.51], female: [1937.95,2084.04,2049.27,1980.43,1952.24,2162.31,3664.39,4091.21,3814.16,3589.15,3798.06,4534.35,5591.89,4653.65,4030.72,4640.18,4037.78,2417.14,956.97,311.29,33.06]},
  2060: { male: [1376.5,1682.5,2051,2203.9,2135.7,2068.2,2122.3,2414,4164.8,4708.9,4397.7,4069.6,4151.7,4646,5236.9,3842.4,2737.7,2211.6,1063.6,224.9,12.7], female: [1296.4,1583,1928.6,2069.8,1995.3,1918.1,1941.2,2173.7,3662.6,4074.3,3783.3,3541,3717.5,4371.5,5247.7,4144.3,3223.3,2974.4,1758.6,523.8,61.9]},
  2070: { male: [1272,1262.9,1371.3,1672.2,2007.7,2154.1,2128.8,2079.5,2125.3,2402.8,4114.9,4614.8,4258,3856.6,3794.8,3985,3996.9,2305.9,1040.1,343.2,40.4], female: [1198.4,1188.1,1289.2,1571.3,1881.6,2015,1986.4,1930,1946.8,2169.6,3637.8,4028.9,3717.4,3437.1,3524.4,3957.5,4341.6,2833.6,1537.5,707,152.2]},
  2080: { male: [1213,1273.7,1267.9,1254.5,1334.7,1630.4,2003,2164.8,2132.4,2073.3,2106.7,2363.8,4005.1,4415.5,3953.8,3393.3,3002.2,2532.3,1709.4,444,53.7], female: [1142.6,1198.6,1192.5,1178.4,1249.1,1524.7,1874.9,2026,1991.8,1928.1,1937.6,2149.9,3584.5,3931.6,3557.7,3164.6,2991,2825.7,2275.5,801.1,171.9]},
  2090: { male: [928.2,1074.7,1209.6,1266.7,1236.6,1219.2,1332.5,1641.4,2007.1,2159.6,2117.2,2045.9,2060.8,2277.2,3757.3,3958.1,3231.9,2289.9,1398.2,557.9,115.4], female: [874.2,1011.3,1137.8,1190.4,1158.2,1138.8,1244.7,1535.6,1880.3,2024.5,1984.1,1914,1914.6,2106.4,3453,3668.3,3096.9,2374.3,1686.5,897.4,313.6]}
};

const cpiData = [
  {year:2010,cpi:3.3},{year:2011,cpi:5.4},{year:2012,cpi:2.6},
  {year:2013,cpi:2.6},{year:2014,cpi:2.0},{year:2015,cpi:1.4},
  {year:2016,cpi:2.0},{year:2017,cpi:1.6},{year:2018,cpi:2.1},
  {year:2019,cpi:2.9},{year:2020,cpi:2.5},{year:2021,cpi:0.9},
  {year:2022,cpi:2.0},{year:2023,cpi:0.2},{year:2024,cpi:0.2},
  {year:2025,cpi:1.5,forecast:true},{year:2030,cpi:2.0,forecast:true},{year:2035,cpi:2.0,forecast:true},
  {year:2040,cpi:2.0,forecast:true},{year:2050,cpi:2.0,forecast:true},{year:2060,cpi:2.0,forecast:true},
  {year:2070,cpi:2.0,forecast:true},{year:2080,cpi:2.0,forecast:true},{year:2090,cpi:2.0,forecast:true}
];
const depositRateData = [
  {year:1990,rate:8.64},{year:1991,rate:7.56},{year:1992,rate:7.56},{year:1993,rate:10.98},{year:1994,rate:10.98},
  {year:1995,rate:10.98},{year:1996,rate:7.47},{year:1997,rate:5.67},{year:1998,rate:3.78},{year:1999,rate:2.25},
  {year:2000,rate:2.25},{year:2001,rate:2.25},{year:2002,rate:1.98},{year:2003,rate:1.98},{year:2004,rate:2.25},
  {year:2005,rate:2.25},{year:2006,rate:2.52},{year:2007,rate:4.14},{year:2008,rate:2.25},{year:2009,rate:2.25},
  {year:2010,rate:2.75},{year:2011,rate:3.50},{year:2012,rate:3.00},{year:2013,rate:3.00},{year:2014,rate:2.75},
  {year:2015,rate:1.50},{year:2016,rate:1.50},{year:2017,rate:1.50},{year:2018,rate:1.50},{year:2019,rate:1.50},
  {year:2020,rate:1.50},{year:2021,rate:1.50},{year:2022,rate:1.50},{year:2023,rate:1.50},{year:2024,rate:1.50},
  {year:2025,rate:1.50,forecast:true},{year:2030,rate:1.40,forecast:true},{year:2040,rate:1.50,forecast:true},
  {year:2050,rate:1.60,forecast:true},{year:2060,rate:1.70,forecast:true},{year:2070,rate:1.80,forecast:true},
  {year:2080,rate:1.90,forecast:true},{year:2090,rate:2.00,forecast:true}
];
// 国内总储蓄率（占 GDP %）。来源：World Bank NY.GDS.TOTL.ZS（国家统计局 / OECD 国民账户口径）
const savingsRateData = [
  {year:2000,rate:36.3},{year:2001,rate:37.9},{year:2002,rate:38.8},{year:2003,rate:41.7},{year:2004,rate:44.5},
  {year:2005,rate:45.2},{year:2006,rate:47.0},{year:2007,rate:48.5},{year:2008,rate:49.7},{year:2009,rate:49.4},
  {year:2010,rate:50.6},{year:2011,rate:49.2},{year:2012,rate:48.4},{year:2013,rate:47.9},{year:2014,rate:47.1},
  {year:2015,rate:45.7},{year:2016,rate:44.4},{year:2017,rate:44.5},{year:2018,rate:44.2},{year:2019,rate:43.5},
  {year:2020,rate:44.2},{year:2021,rate:45.3},{year:2022,rate:45.6},{year:2023,rate:43.2},
  {year:2024,rate:42.8,forecast:true},{year:2025,rate:42.3,forecast:true},{year:2030,rate:40.0,forecast:true},
  {year:2035,rate:38.0,forecast:true},{year:2040,rate:36.0,forecast:true},{year:2050,rate:34.0,forecast:true},
  {year:2060,rate:32.5,forecast:true},{year:2070,rate:31.5,forecast:true},{year:2080,rate:30.5,forecast:true},{year:2090,rate:30.0,forecast:true}
];
const m2gdpData = [
  {year:2000,m2:10.3,gdp:8.5},{year:2001,m2:14.4,gdp:8.3},{year:2002,m2:16.8,gdp:9.1},
  {year:2003,m2:19.6,gdp:10.0},{year:2004,m2:14.6,gdp:10.1},{year:2005,m2:17.6,gdp:11.4},
  {year:2006,m2:16.9,gdp:12.7},{year:2007,m2:16.7,gdp:14.2},{year:2008,m2:17.8,gdp:9.7},
  {year:2009,m2:28.5,gdp:9.4},{year:2010,m2:19.7,gdp:10.6},{year:2011,m2:13.6,gdp:9.6},
  {year:2012,m2:13.8,gdp:7.9},{year:2013,m2:13.6,gdp:7.8},{year:2014,m2:12.2,gdp:7.4},
  {year:2015,m2:13.3,gdp:7.0},{year:2016,m2:11.3,gdp:6.8},{year:2017,m2:8.1,gdp:6.9},
  {year:2018,m2:8.1,gdp:6.7},{year:2019,m2:8.7,gdp:6.0},{year:2020,m2:10.1,gdp:2.2},
  {year:2021,m2:9.0,gdp:8.4},{year:2022,m2:11.8,gdp:3.0},{year:2023,m2:9.7,gdp:5.2},
  {year:2024,m2:7.3,gdp:5.0},
  {year:2025,m2:8.0,gdp:4.8,forecast:true},{year:2030,m2:7.2,gdp:4.3,forecast:true},
  {year:2035,m2:6.8,gdp:4.0,forecast:true},{year:2040,m2:6.5,gdp:3.7,forecast:true},
  {year:2050,m2:6.0,gdp:3.3,forecast:true},{year:2060,m2:5.5,gdp:3.0,forecast:true},
  {year:2070,m2:5.2,gdp:2.8,forecast:true},{year:2080,m2:5.0,gdp:2.5,forecast:true},{year:2090,m2:4.8,gdp:2.3,forecast:true}
];

// 城镇职工基本养老保险基金（亿元；contributors/beneficiaries 亿人；dependencyRatio %）。来源：人社部统计公报
// 2022 因公报口径合并无法剥离职工数据标 null；老年抚养比 2024 官方未公布标 null
const pensionFundData = [
  {year:2010,revenue:13420,expense:10555,balance:15376,contributors:3.57,beneficiaries:0.63,dependencyRatio:11.9},
  {year:2011,revenue:16847,expense:12765,balance:19497,contributors:6.22,beneficiaries:0.68,dependencyRatio:12.3},
  {year:2012,revenue:20001,expense:15562,balance:23941,contributors:7.88,beneficiaries:0.74,dependencyRatio:12.7},
  {year:2013,revenue:22680,expense:18470,balance:28269,contributors:8.20,beneficiaries:0.81,dependencyRatio:13.1},
  {year:2014,revenue:25310,expense:23326,balance:31800,contributors:8.42,beneficiaries:0.86,dependencyRatio:13.7},
  {year:2015,revenue:29341,expense:25813,balance:35345,contributors:8.58,beneficiaries:0.91,dependencyRatio:14.3},
  {year:2016,revenue:35058,expense:31854,balance:38380,contributors:8.88,beneficiaries:0.97,dependencyRatio:14.9},
  {year:2017,revenue:43310,expense:38052,balance:43264,contributors:9.15,beneficiaries:1.03,dependencyRatio:15.5},
  {year:2018,revenue:51168,expense:44645,balance:50901,contributors:9.42,beneficiaries:1.10,dependencyRatio:16.8},
  {year:2019,revenue:52919,expense:49228,balance:54623,contributors:9.68,beneficiaries:1.17,dependencyRatio:17.8},
  {year:2020,revenue:44376,expense:51301,balance:null,contributors:9.99,beneficiaries:1.25,dependencyRatio:19.7},
  {year:2021,revenue:60455,expense:56481,balance:52574,contributors:10.29,beneficiaries:1.32,dependencyRatio:20.8},
  {year:2022,revenue:null,expense:null,balance:null,contributors:10.53,beneficiaries:1.36,dependencyRatio:21.8},
  {year:2023,revenue:70506,expense:63757,balance:63639,contributors:10.66,beneficiaries:1.42,dependencyRatio:22.5},
  {year:2024,revenue:74732,expense:67656,balance:70727,contributors:10.73,beneficiaries:1.47,dependencyRatio:null},
  {year:2025,revenue:79000,expense:73500,balance:76200,contributors:10.80,beneficiaries:1.52,dependencyRatio:23.5,forecast:true},
  {year:2028,revenue:92000,expense:89500,balance:85000,contributors:10.98,beneficiaries:1.70,dependencyRatio:26.5,forecast:true},
  {year:2030,revenue:99500,expense:99000,balance:76700,contributors:11.08,beneficiaries:1.82,dependencyRatio:28.5,forecast:true},
  {year:2035,revenue:115000,expense:118000,balance:8000,contributors:11.00,beneficiaries:2.10,dependencyRatio:33.0,forecast:true},
  {year:2040,revenue:125000,expense:132000,balance:-12000,contributors:10.70,beneficiaries:2.40,dependencyRatio:37.0,forecast:true},
  {year:2050,revenue:130000,expense:145000,balance:-25000,contributors:10.00,beneficiaries:2.80,dependencyRatio:45.0,forecast:true},
  {year:2060,revenue:128000,expense:150000,balance:-30000,contributors:9.00,beneficiaries:3.00,dependencyRatio:50.0,forecast:true},
  {year:2070,revenue:122000,expense:148000,balance:-28000,contributors:8.00,beneficiaries:3.10,dependencyRatio:52.0,forecast:true},
  {year:2080,revenue:115000,expense:140000,balance:-22000,contributors:7.20,beneficiaries:3.00,dependencyRatio:50.0,forecast:true},
  {year:2090,revenue:108000,expense:130000,balance:-15000,contributors:6.50,beneficiaries:2.90,dependencyRatio:48.0,forecast:true}
];

// 房价（元/㎡）。price=全国商品房平均销售价格（统计局：销售额÷销售面积）；baiCity=百城新建住宅均价（中指院年末值）
// 百城早年公开渠道无完整年末值标 null
const housePriceData = [
  {year:2010,price:5032,baiCity:null},
  {year:2011,price:5357,baiCity:null},
  {year:2012,price:5791,baiCity:null},
  {year:2013,price:6232,baiCity:null},
  {year:2014,price:6324,baiCity:null},
  {year:2015,price:6792,baiCity:null},
  {year:2016,price:7475,baiCity:null},
  {year:2017,price:7892,baiCity:null},
  {year:2018,price:8736,baiCity:null},
  {year:2019,price:9287,baiCity:null},
  {year:2020,price:9860,baiCity:15795},
  {year:2021,price:10139,baiCity:16180},
  {year:2022,price:9814,baiCity:16205},
  {year:2023,price:10437,baiCity:16220},
  {year:2024,price:9935,baiCity:16654},
  {year:2025,price:9750,baiCity:16400,forecast:true},{year:2030,price:9450,baiCity:15800,forecast:true},
  {year:2035,price:9200,baiCity:15300,forecast:true},{year:2040,price:9000,baiCity:14800,forecast:true},
  {year:2050,price:8700,baiCity:14000,forecast:true},{year:2060,price:8500,baiCity:13500,forecast:true},
  {year:2070,price:8400,baiCity:13200,forecast:true},{year:2080,price:8300,baiCity:13000,forecast:true},{year:2090,price:8200,baiCity:12800,forecast:true}
];

// 生活/护理/重大医疗 现以连续金额(当前购买力)存于 state，档位标签由 growth.js 按区间判定
// 养育一个孩子到22岁的总成本（万·购买力，分摊口径）。来源：育娲《中国生育成本报告2024》
const childCostByTier = {rural:45, urbanBasic:68, urbanMid:82, tier1:120};
// 孩次边际成本递减系数（二孩约一孩71.5%、三孩约60%）
const childTierFactors = [1, 0.715, 0.6];

const assetParams = {
  '银行定存': {rate:0.015,vol:0,dd:0,liq:0,beh:0,color:'#95a5a6'},
  '国债': {rate:0.025,vol:0.045,dd:0.05,liq:0,beh:0,color:'#3498db'},
  '纯债基金': {rate:0.035,vol:0.03,dd:0.03,liq:0.001,beh:0,color:'#9b59b6'},
  '固收+理财': {rate:0.040,vol:0.04,dd:0.06,liq:0.002,beh:0,color:'#e67e22'},
  '年金保险': {rate:0.030,vol:0,dd:0,liq:0.03,beh:0.008,color:'#e74c3c'},
  '增额终身寿': {rate:0.035,vol:0,dd:0,liq:0.025,beh:0.005,color:'#f39c12'},
  '红利指数': {rate:0.055,vol:0.18,dd:0.30,liq:0,beh:0,color:'#1abc9c'}
};
const assetNames = Object.keys(assetParams);

const defaultState = {
  mode: 'couple',              // 始终夫妻共同规划
  startAge: 30,
  targetAge: 65,
  currentAge: 30,
  inflation: 0.025,
  returnRate: 0.03,
  currentSavings: 0,            // 已攒储蓄（万元）—— 唯一的"已有资产"输入
  lifestyle: 20,            // 家庭生活支出（万/年，当前购买力）
  care: 0.6,                // 护理费（万/人·月，当前购买力）
  medical: 0,               // 重大医疗（万/人·年，当前购买力）
  behaviorPremium: 1,
  assetWeights: {'银行定存':15,'国债':15,'纯债基金':15,'固收+理财':15,'年金保险':10,'增额终身寿':10,'红利指数':20},
  pyramidYear: 2020,
  // 退休模拟器（决定"怎么花"，从而倒推所需储蓄额与每月需存）
  pensionType: 'employee',     // none / resident / employee / civil
  pensionMonthly: 3000,        // 月养老金（元）
  insuranceRate: 0.6,          // 医保有效报销率（占总费用）
  medicalInflation: 0.03,      // 医疗通胀率
  lifeExpectancy: 85,          // 预期寿命（岁）
  // 三阶段支出系数（行为假设，可调）
  phaseMul: {active:1.2, decline:1.0, care:0.7},
  // 夫妻模式：配偶参数 + 丧偶期支出系数
  spouse: {
    currentAge: 26,
    targetAge: 60,              // 配偶退休年龄
    lifeExpectancy: 86,         // 配偶预期寿命
    pensionType: 'employee',
    pensionMonthly: 2500
  },
  survivorFactor: 0.65,        // 丧偶后家庭生活支出占两人期的比例
  // 子女模拟器（可选）：养育成本进主算，子女支持为可选假设
  childEnabled: false,
  childAges: [],               // 每个孩子当前年龄(正=已出生岁数, 负=几年后生)
  childTier: 'urbanMid',       // rural/urbanBasic/urbanMid/tier1
  childSupport: 0              // 假设子女晚年年均支持(万/年·购买力)，收益侧，默认0
};
