import type { CountryCentroid } from '../types';

/**
 * Subset of ISO 3166-1 country definitions for mythology-rich nations.
 * The `numeric` value matches the `id` field on features in
 * world-atlas / countries-110m.json (a TopoJSON used at runtime).
 *
 * `lnglat` is a hand-picked "myth-meaningful" point inside each country
 * (e.g. Athens for Greece) rather than a strict geographic centroid.
 */
export const COUNTRIES: CountryCentroid[] = [
  { iso: 'CHN', numeric: '156', zh: '中国',         en: 'China',          lnglat: [104, 35],   flag: '🇨🇳' },
  { iso: 'IND', numeric: '356', zh: '印度',         en: 'India',          lnglat: [78, 22],    flag: '🇮🇳' },
  { iso: 'GRC', numeric: '300', zh: '希腊',         en: 'Greece',         lnglat: [23.7, 37.9],flag: '🇬🇷' },
  { iso: 'EGY', numeric: '818', zh: '埃及',         en: 'Egypt',          lnglat: [31.2, 30.0],flag: '🇪🇬' },
  { iso: 'IRQ', numeric: '368', zh: '伊拉克',       en: 'Iraq',           lnglat: [44.4, 33.3],flag: '🇮🇶' },
  { iso: 'IRN', numeric: '364', zh: '伊朗',         en: 'Iran',           lnglat: [51.4, 35.7],flag: '🇮🇷' },
  { iso: 'ITA', numeric: '380', zh: '意大利',       en: 'Italy',          lnglat: [12.5, 41.9],flag: '🇮🇹' },
  { iso: 'DEU', numeric: '276', zh: '德国',         en: 'Germany',        lnglat: [10.4, 51.2],flag: '🇩🇪' },
  { iso: 'GBR', numeric: '826', zh: '英国',         en: 'United Kingdom', lnglat: [-1.5, 52.5],flag: '🇬🇧' },
  { iso: 'IRL', numeric: '372', zh: '爱尔兰',       en: 'Ireland',        lnglat: [-7.7, 53.4],flag: '🇮🇪' },
  { iso: 'ISL', numeric: '352', zh: '冰岛',         en: 'Iceland',        lnglat: [-19.0, 64.9],flag: '🇮🇸' },
  { iso: 'NOR', numeric: '578', zh: '挪威',         en: 'Norway',         lnglat: [10.0, 60.5],flag: '🇳🇴' },
  { iso: 'SWE', numeric: '752', zh: '瑞典',         en: 'Sweden',         lnglat: [18.1, 59.3],flag: '🇸🇪' },
  { iso: 'DNK', numeric: '208', zh: '丹麦',         en: 'Denmark',        lnglat: [10.0, 56.0],flag: '🇩🇰' },
  { iso: 'FIN', numeric: '246', zh: '芬兰',         en: 'Finland',        lnglat: [25.0, 61.9],flag: '🇫🇮' },
  { iso: 'RUS', numeric: '643', zh: '俄罗斯',       en: 'Russia',         lnglat: [37.6, 55.7],flag: '🇷🇺' },
  { iso: 'FRA', numeric: '250', zh: '法国',         en: 'France',         lnglat: [2.4, 47.0],flag: '🇫🇷' },
  { iso: 'ESP', numeric: '724', zh: '西班牙',       en: 'Spain',          lnglat: [-3.7, 40.4],flag: '🇪🇸' },
  { iso: 'PRT', numeric: '620', zh: '葡萄牙',       en: 'Portugal',       lnglat: [-8.0, 39.5],flag: '🇵🇹' },
  { iso: 'TUR', numeric: '792', zh: '土耳其',       en: 'Turkey',         lnglat: [35.0, 39.0],flag: '🇹🇷' },
  { iso: 'SAU', numeric: '682', zh: '沙特阿拉伯',   en: 'Saudi Arabia',   lnglat: [45.0, 24.0],flag: '🇸🇦' },
  { iso: 'ISR', numeric: '376', zh: '以色列',       en: 'Israel',         lnglat: [35.0, 31.5],flag: '🇮🇱' },
  { iso: 'JPN', numeric: '392', zh: '日本',         en: 'Japan',          lnglat: [139.7, 35.7],flag: '🇯🇵' },
  { iso: 'KOR', numeric: '410', zh: '韩国',         en: 'South Korea',    lnglat: [127.8, 36.0],flag: '🇰🇷' },
  { iso: 'PRK', numeric: '408', zh: '朝鲜',         en: 'North Korea',    lnglat: [127.0, 40.0],flag: '🇰🇵' },
  { iso: 'VNM', numeric: '704', zh: '越南',         en: 'Vietnam',        lnglat: [108.0, 14.0],flag: '🇻🇳' },
  { iso: 'THA', numeric: '764', zh: '泰国',         en: 'Thailand',       lnglat: [101.0, 15.0],flag: '🇹🇭' },
  { iso: 'IDN', numeric: '360', zh: '印度尼西亚',   en: 'Indonesia',      lnglat: [110.0, -5.0],flag: '🇮🇩' },
  { iso: 'MMR', numeric: '104', zh: '缅甸',         en: 'Myanmar',        lnglat: [96.0, 21.0],flag: '🇲🇲' },
  { iso: 'KHM', numeric: '116', zh: '柬埔寨',       en: 'Cambodia',       lnglat: [104.9, 12.6],flag: '🇰🇭' },
  { iso: 'PHL', numeric: '608', zh: '菲律宾',       en: 'Philippines',    lnglat: [121.0, 13.0],flag: '🇵🇭' },
  { iso: 'MNG', numeric: '496', zh: '蒙古',         en: 'Mongolia',       lnglat: [105.0, 46.9],flag: '🇲🇳' },
  { iso: 'NPL', numeric: '524', zh: '尼泊尔',       en: 'Nepal',          lnglat: [85.3, 27.7],flag: '🇳🇵' },
  { iso: 'LKA', numeric: '144', zh: '斯里兰卡',     en: 'Sri Lanka',      lnglat: [80.7, 7.9],flag: '🇱🇰' },
  { iso: 'USA', numeric: '840', zh: '美国',         en: 'United States',  lnglat: [-98.0, 39.0],flag: '🇺🇸' },
  { iso: 'CAN', numeric: '124', zh: '加拿大',       en: 'Canada',         lnglat: [-95.0, 56.0],flag: '🇨🇦' },
  { iso: 'MEX', numeric: '484', zh: '墨西哥',       en: 'Mexico',         lnglat: [-99.1, 19.4],flag: '🇲🇽' },
  { iso: 'GTM', numeric: '320', zh: '危地马拉',     en: 'Guatemala',      lnglat: [-90.5, 15.5],flag: '🇬🇹' },
  { iso: 'PER', numeric: '604', zh: '秘鲁',         en: 'Peru',           lnglat: [-71.5, -13.5],flag: '🇵🇪' },
  { iso: 'BRA', numeric: '076', zh: '巴西',         en: 'Brazil',         lnglat: [-51.9, -14.2],flag: '🇧🇷' },
  { iso: 'ARG', numeric: '032', zh: '阿根廷',       en: 'Argentina',      lnglat: [-63.0, -38.4],flag: '🇦🇷' },
  { iso: 'NGA', numeric: '566', zh: '尼日利亚',     en: 'Nigeria',        lnglat: [7.5, 7.5],flag: '🇳🇬' },
  { iso: 'ETH', numeric: '231', zh: '埃塞俄比亚',   en: 'Ethiopia',       lnglat: [38.7, 9.1],flag: '🇪🇹' },
  { iso: 'ZAF', numeric: '710', zh: '南非',         en: 'South Africa',   lnglat: [25.0, -29.0],flag: '🇿🇦' },
  { iso: 'GHA', numeric: '288', zh: '加纳',         en: 'Ghana',          lnglat: [-1.0, 7.9],flag: '🇬🇭' },
  { iso: 'MLI', numeric: '466', zh: '马里',         en: 'Mali',           lnglat: [-4.0, 17.6],flag: '🇲🇱' },
  { iso: 'AUS', numeric: '036', zh: '澳大利亚',     en: 'Australia',      lnglat: [134.5, -25.0],flag: '🇦🇺' },
  { iso: 'NZL', numeric: '554', zh: '新西兰',       en: 'New Zealand',    lnglat: [173.0, -41.0],flag: '🇳🇿' },
  { iso: 'POL', numeric: '616', zh: '波兰',         en: 'Poland',         lnglat: [19.4, 52.2],flag: '🇵🇱' },
  { iso: 'CZE', numeric: '203', zh: '捷克',         en: 'Czechia',        lnglat: [14.4, 50.1],flag: '🇨🇿' },
  { iso: 'HUN', numeric: '348', zh: '匈牙利',       en: 'Hungary',        lnglat: [19.5, 47.2],flag: '🇭🇺' },
  { iso: 'ROU', numeric: '642', zh: '罗马尼亚',     en: 'Romania',        lnglat: [25.0, 45.9],flag: '🇷🇴' },
  { iso: 'UKR', numeric: '804', zh: '乌克兰',       en: 'Ukraine',        lnglat: [31.0, 49.0],flag: '🇺🇦' },
  { iso: 'GEO', numeric: '268', zh: '格鲁吉亚',     en: 'Georgia',        lnglat: [43.4, 42.3],flag: '🇬🇪' },
  { iso: 'ARM', numeric: '051', zh: '亚美尼亚',     en: 'Armenia',        lnglat: [45.0, 40.1],flag: '🇦🇲' },
  { iso: 'NLD', numeric: '528', zh: '荷兰',         en: 'Netherlands',    lnglat: [5.3, 52.1],flag: '🇳🇱' },
  { iso: 'AUT', numeric: '040', zh: '奥地利',       en: 'Austria',        lnglat: [14.5, 47.6],flag: '🇦🇹' },
  { iso: 'CHE', numeric: '756', zh: '瑞士',         en: 'Switzerland',    lnglat: [8.2, 46.8],flag: '🇨🇭' },
  { iso: 'BEL', numeric: '056', zh: '比利时',       en: 'Belgium',        lnglat: [4.5, 50.6],flag: '🇧🇪' },
  { iso: 'HTI', numeric: '332', zh: '海地',         en: 'Haiti',          lnglat: [-72.3, 18.9],flag: '🇭🇹' },
  { iso: 'AFG', numeric: '004', zh: '阿富汗',       en: 'Afghanistan',    lnglat: [67.7, 33.9],flag: '🇦🇫' },
];

export const COUNTRY_BY_ISO: Record<string, CountryCentroid> = COUNTRIES.reduce((m, c) => {
  m[c.iso] = c;
  return m;
}, {} as Record<string, CountryCentroid>);

export const COUNTRY_BY_NUMERIC: Record<string, CountryCentroid> = COUNTRIES.reduce((m, c) => {
  m[c.numeric] = c;
  return m;
}, {} as Record<string, CountryCentroid>);
