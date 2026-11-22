/* Countries for Flag Master and Capital City Challenge.
   COUNTRIES: { name, cap (capital, or '' when it is left out of the capitals game), ct (continent code), f (1 well known,
   2 known, 3 less familiar), big (a much bigger city, for capitals that are not their country's biggest city), flag (a drawing, or undefined) }.
   Countries whose capital is split, disputed or about to move are left out of the capitals (or out entirely).
   Russia and Turkey span Europe and Asia: ct is the group they are played in, CT_NAME says both.
   A flag is [width, height, ...ops], drawn by flagSVG() with simple shapes only (no emblems, no emoji):
     'h', colors...   equal horizontal stripes, top to bottom     'v', colors...   equal vertical stripes, hoist to fly
     'r', x, y, w, h, col  rectangle      'p', 'x,y x,y ...', col  polygon      'c', cx, cy, r, col  disc
     's', cx, cy, R, turn, col  five-pointed star (turn: degrees clockwise from pointing up)
     'S', cx, cy, R, turn, points, inner ratio, col   'm', cx, cy, R, r, offset, angle, col  crescent opening toward angle
     'n', x, y, w, col  Nordic cross bars   'l', x1, y1, x2, y2, width, col  band   'u', x, y, w, h  Union Jack
     'z', base x, tip x, points, col  serrated hoist band   'w', cx, cy, r, col  24-spoke wheel   'P', cx, cy, R, w, col  pentagram outline
     'o', cx, cy, r, R, col  sun with 32 rays   'U'  the US flag (190 x 100)   'K'  the South Korean flag (36 x 24)   '<...>' raw SVG */
const CT_NAME = { EU: 'Europe', AS: 'Asia', AF: 'Africa', NA: 'North America', SA: 'South America', OC: 'Oceania' };
const COUNTRIES = (() => {
  const rows = `France|Paris|EU|1
Germany|Berlin|EU|1
Italy|Rome|EU|1
Spain|Madrid|EU|1
United Kingdom|London|EU|1
Ireland|Dublin|EU|1
Portugal|Lisbon|EU|1
Greece|Athens|EU|1
Russia|Moscow|EU|1
Netherlands|Amsterdam|EU|1
Sweden|Stockholm|EU|1
Norway|Oslo|EU|1
Austria|Vienna|EU|1
Denmark|Copenhagen|EU|1
Belgium|Brussels|EU|2
Luxembourg|Luxembourg City|EU|3
Switzerland|Bern|EU|2|Zürich
Poland|Warsaw|EU|2
Czechia|Prague|EU|2
Slovakia|Bratislava|EU|3
Hungary|Budapest|EU|2
Romania|Bucharest|EU|2
Bulgaria|Sofia|EU|3
Serbia|Belgrade|EU|3
Croatia|Zagreb|EU|3
Slovenia|Ljubljana|EU|3
Bosnia and Herzegovina|Sarajevo|EU|3
North Macedonia|Skopje|EU|3
Albania|Tirana|EU|3
Montenegro|Podgorica|EU|3
Moldova|Chișinău|EU|3
Ukraine|Kyiv|EU|2
Belarus|Minsk|EU|3
Lithuania|Vilnius|EU|3
Latvia|Riga|EU|3
Estonia|Tallinn|EU|3
Finland|Helsinki|EU|2
Iceland|Reykjavík|EU|2
Malta|Valletta|EU|3
Monaco||EU|2
Turkey|Ankara|AS|2|Istanbul
China|Beijing|AS|1|Shanghai
Japan|Tokyo|AS|1
India|New Delhi|AS|1
South Korea|Seoul|AS|1
Thailand|Bangkok|AS|1
North Korea|Pyongyang|AS|3
Vietnam|Hanoi|AS|2|Ho Chi Minh City
Philippines|Manila|AS|2
Malaysia|Kuala Lumpur|AS|2
Pakistan|Islamabad|AS|2|Karachi
Bangladesh|Dhaka|AS|3
Nepal|Kathmandu|AS|3
Bhutan|Thimphu|AS|3
Mongolia|Ulaanbaatar|AS|3
Kazakhstan|Astana|AS|3|Almaty
Uzbekistan|Tashkent|AS|3
Kyrgyzstan|Bishkek|AS|3
Tajikistan|Dushanbe|AS|3
Turkmenistan|Ashgabat|AS|3
Saudi Arabia|Riyadh|AS|2
United Arab Emirates|Abu Dhabi|AS|2|Dubai
Qatar|Doha|AS|3
Bahrain|Manama|AS|3
Kuwait|Kuwait City|AS|3
Oman|Muscat|AS|3
Jordan|Amman|AS|3
Lebanon|Beirut|AS|3
Iraq|Baghdad|AS|2
Myanmar|Naypyidaw|AS|3|Yangon
Cambodia|Phnom Penh|AS|3
Laos|Vientiane|AS|3
Brunei|Bandar Seri Begawan|AS|3
Maldives|Malé|AS|3
Singapore||AS|2
Indonesia||AS|2
Israel||AS|2
Kenya|Nairobi|AF|1
Nigeria|Abuja|AF|2|Lagos
Ethiopia|Addis Ababa|AF|2
Ghana|Accra|AF|2
Morocco|Rabat|AF|2|Casablanca
Algeria|Algiers|AF|3
Tunisia|Tunis|AF|3
Senegal|Dakar|AF|3
Mali|Bamako|AF|3
Niger|Niamey|AF|3
Chad|N'Djamena|AF|3
Cameroon|Yaoundé|AF|3
Gabon|Libreville|AF|3
Angola|Luanda|AF|3
Zambia|Lusaka|AF|3
Zimbabwe|Harare|AF|3
Botswana|Gaborone|AF|3
Namibia|Windhoek|AF|3
Mozambique|Maputo|AF|3
Madagascar|Antananarivo|AF|3
Uganda|Kampala|AF|3
Rwanda|Kigali|AF|3
Tanzania|Dodoma|AF|3|Dar es Salaam
Somalia|Mogadishu|AF|3
Guinea|Conakry|AF|3
Sierra Leone|Freetown|AF|3
Liberia|Monrovia|AF|3
Mauritius|Port Louis|AF|3
Burkina Faso|Ouagadougou|AF|3
Mauritania|Nouakchott|AF|3
Togo|Lomé|AF|3
Eritrea|Asmara|AF|3
Malawi|Lilongwe|AF|3
Côte d'Ivoire||AF|3
Benin||AF|3
United States|Washington, D.C.|NA|1|New York City
Canada|Ottawa|NA|1|Toronto
Mexico|Mexico City|NA|1
Cuba|Havana|NA|1
Jamaica|Kingston|NA|2
Panama|Panama City|NA|2
Costa Rica|San José|NA|3
Honduras|Tegucigalpa|NA|3
Guatemala|Guatemala City|NA|3
Nicaragua|Managua|NA|3
El Salvador|San Salvador|NA|3
Dominican Republic|Santo Domingo|NA|3
Haiti|Port-au-Prince|NA|3
Bahamas|Nassau|NA|3
Trinidad and Tobago|Port of Spain|NA|3
Belize|Belmopan|NA|3|Belize City
Barbados|Bridgetown|NA|3
Brazil|Brasília|SA|1|São Paulo
Argentina|Buenos Aires|SA|1
Chile|Santiago|SA|1
Peru|Lima|SA|1
Colombia|Bogotá|SA|2
Venezuela|Caracas|SA|2
Ecuador|Quito|SA|3
Uruguay|Montevideo|SA|3
Paraguay|Asunción|SA|3
Guyana|Georgetown|SA|3
Suriname|Paramaribo|SA|3
Australia|Canberra|OC|1|Sydney
New Zealand|Wellington|OC|1|Auckland
Fiji|Suva|OC|3
Papua New Guinea|Port Moresby|OC|3
Samoa|Apia|OC|3
Palau|Ngerulmud|OC|3
Vanuatu|Port Vila|OC|3
Solomon Islands|Honiara|OC|3`;
  const W = '#fff', F = {
    France: [3, 2, 'v', '#002395', W, '#ed2939'], Italy: [3, 2, 'v', '#009246', W, '#ce2b37'], Ireland: [2, 1, 'v', '#169b62', W, '#ff883e'],
    Belgium: [15, 13, 'v', '#000', '#fdda24', '#ef3340'], Germany: [5, 3, 'h', '#000', '#dd0000', '#ffce00'], Netherlands: [3, 2, 'h', '#ae1c28', W, '#21468b'],
    Luxembourg: [5, 3, 'h', '#ed2939', W, '#00a1de'], Russia: [3, 2, 'h', W, '#0039a6', '#d52b1e'], Austria: [3, 2, 'h', '#c8102e', W, '#c8102e'],
    Hungary: [2, 1, 'h', '#cd2a3e', W, '#436f4d'], Bulgaria: [5, 3, 'h', W, '#00966e', '#d62612'], Estonia: [11, 7, 'h', '#0072ce', '#000', W],
    Lithuania: [5, 3, 'h', '#fdb913', '#006a44', '#c1272d'], Latvia: [2, 1, 'h', '#9e3039', '#9e3039', W, '#9e3039', '#9e3039'],
    Poland: [8, 5, 'h', W, '#dc143c'], Ukraine: [3, 2, 'h', '#0057b7', '#ffd700'], Romania: [3, 2, 'v', '#002b7f', '#fcd116', '#ce1126'],
    Monaco: [5, 4, 'h', '#ce1126', W], Czechia: [3, 2, 'h', W, '#d7141a', 'p', '0,0 1.5,1 0,2', '#11457e'],
    Denmark: [37, 28, 'h', '#c8102e', 'n', 12, 12, 4, W], Norway: [22, 16, 'h', '#ba0c2f', 'n', 6, 6, 4, W, 'n', 7, 7, 2, '#00205b'],
    Sweden: [16, 10, 'h', '#006aa7', 'n', 5, 4, 2, '#fecc02'], Finland: [18, 11, 'h', W, 'n', 5, 4, 3, '#002f6c'],
    Iceland: [25, 18, 'h', '#02529c', 'n', 7, 7, 4, W, 'n', 8, 8, 2, '#dc1e35'],
    Switzerland: [32, 32, 'h', '#da291c', 'r', 13, 6, 6, 20, W, 'r', 6, 13, 20, 6, W],
    Greece: [27, 18, 'h', '#0d5eaf', W, '#0d5eaf', W, '#0d5eaf', W, '#0d5eaf', W, '#0d5eaf', 'r', 0, 0, 10, 10, '#0d5eaf', 'r', 4, 0, 2, 10, W, 'r', 0, 4, 10, 2, W],
    'United Kingdom': [60, 30, 'u', 0, 0, 60, 30],
    Turkey: [30, 20, 'h', '#e30a17', 'm', 10, 10, 5, 4, 1.25, 0, W, 's', 16.9, 10, 2.5, 270, W],
    Japan: [3, 2, 'h', W, 'c', 1.5, 1, .6, '#bc002d'], Bangladesh: [10, 6, 'h', '#006a4e', 'c', 4.5, 3, 2, '#f42a41'],
    China: [30, 20, 'h', '#de2910', 's', 5, 5, 3, 0, '#ffde00', 's', 10, 2, 1, 239, '#ffde00', 's', 12, 4, 1, 262, '#ffde00', 's', 12, 7, 1, 286, '#ffde00', 's', 10, 9, 1, 309, '#ffde00'],
    Vietnam: [30, 20, 'h', '#da251d', 's', 15, 10.4, 6, 0, '#ffff00'], Indonesia: [3, 2, 'h', '#ce1126', W],
    Thailand: [3, 2, 'h', '#a51931', W, '#2d2a4a', '#2d2a4a', W, '#a51931'], India: [30, 20, 'h', '#ff9933', W, '#138808', 'w', 15, 10, 2.6, '#000080'],
    Pakistan: [30, 20, 'h', '#01411c', 'r', 0, 0, 7.5, 20, W, 'm', 18.75, 10, 6, 5.5, 1.6, -41.6, W, 's', 21.96, 7.14, 2, 48.4, W],
    Israel: [11, 8, 'h', W, 'r', 0, .75, 11, 1.25, '#0038b8', 'r', 0, 6, 11, 1.25, '#0038b8', '<path d="M5.5 2.5L6.799 4.75H4.201ZM5.5 5.5L4.201 3.25H6.799Z" fill="none" stroke="#0038b8" stroke-width=".27"/>'],
    Laos: [3, 2, 'h', '#ce1126', '#002868', '#002868', '#ce1126', 'c', 1.5, 1, .4, W],
    Qatar: [28, 11, 'h', '#8a1538', 'z', 7.5, 10, 9, W], Bahrain: [25, 15, 'h', '#ce1126', 'z', 6.25, 9.4, 5, W],
    'United Arab Emirates': [24, 12, 'h', '#00732f', W, '#000', 'r', 0, 0, 6, 12, '#ef3340'],
    Kuwait: [24, 12, 'h', '#007a3d', W, '#ce1126', 'p', '0,0 6,4 6,8 0,12', '#000'],
    Myanmar: [30, 20, 'h', '#fecb00', '#34b233', '#ea2839', 's', 15, 10.6, 7.4, 0, W],
    Singapore: [36, 24, 'h', '#ef3340', W, 'm', 8, 6, 4.6, 4.2, 1.5, 0, W, 's', 11, 4, .8, 0, W, 's', 13.09, 5.52, .8, 0, W, 's', 12.29, 7.98, .8, 0, W, 's', 9.71, 7.98, .8, 0, W, 's', 8.91, 5.52, .8, 0, W],
    'South Korea': [36, 24, 'K'], Palau: [16, 10, 'h', '#4aadd6', 'c', 7, 5, 3, '#ffde00'],
    Nigeria: [2, 1, 'v', '#008751', W, '#008751'], Chad: [3, 2, 'v', '#002664', '#fecb00', '#c60c30'], Mali: [3, 2, 'v', '#14b53a', '#fcd116', '#ce1126'],
    Guinea: [3, 2, 'v', '#ce1126', '#fcd116', '#009460'], Senegal: [3, 2, 'v', '#00853f', '#fdef42', '#e31b23', 's', 1.5, 1.04, .36, 0, '#00853f'],
    Cameroon: [3, 2, 'v', '#007a5e', '#ce1126', '#fcd116', 's', 1.5, 1.04, .36, 0, '#fcd116'], "Côte d'Ivoire": [3, 2, 'v', '#f77f00', W, '#009e60'],
    Ghana: [3, 2, 'h', '#ce1126', '#fcd116', '#006b3f', 's', 1.5, 1.04, .34, 0, '#000'], Gabon: [4, 3, 'h', '#009e60', '#fcd116', '#3a75c4'],
    'Sierra Leone': [3, 2, 'h', '#1eb53a', W, '#0072c6'], Botswana: [36, 24, 'h', '#6da9d2', 'r', 0, 9, 36, 6, W, 'r', 0, 10, 36, 4, '#000'],
    Mauritius: [3, 2, 'h', '#ea2839', '#1a206d', '#ffd500', '#00a551'], Benin: [3, 2, 'h', '#fcd116', '#e8112d', 'r', 0, 0, 1.2, 2, '#008751'],
    Madagascar: [3, 2, 'h', '#fc3d32', '#007e3a', 'r', 0, 0, 1, 2, W], Somalia: [3, 2, 'h', '#4189dd', 's', 1.5, 1.04, .44, 0, W],
    Tunisia: [3, 2, 'h', '#e70013', 'c', 1.5, 1, .5, W, 'm', 1.47, 1, .375, .3, .095, 0, '#e70013', 's', 1.6, 1, .225, 270, '#e70013'],
    Algeria: [3, 2, 'v', '#006233', W, 'm', 1.5, 1, .5, .4, .125, 0, '#d21034', 's', 1.69, 1, .25, 270, '#d21034'],
    Morocco: [3, 2, 'h', '#c1272d', 'P', 1.5, 1.05, .5, .07, '#006233'], Niger: [7, 6, 'h', '#e05206', W, '#0db02b', 'c', 3.5, 3, .75, '#e05206'],
    Tanzania: [3, 2, 'h', '#1eb53a', 'p', '3,0 3,2 0,2', '#00a3dd', 'l', -.2, 2.133, 3.2, -.133, .66, '#fcd116', 'l', -.2, 2.133, 3.2, -.133, .46, '#000'],
    'United States': [190, 100, 'U'],
    Canada: [9600, 4800, 'v', '#d52b1e', W, W, '#d52b1e', '<path fill="#d52b1e" d="M4890 4430l-45-863a95 95 0 0 1 111-98l859 151-116-320a65 65 0 0 1 20-73l941-762-212-99a65 65 0 0 1-34-79l186-572-542 115a65 65 0 0 1-73-38l-105-247-423 454a65 65 0 0 1-111-57l204-1052-327 189a65 65 0 0 1-91-27l-332-652-332 652a65 65 0 0 1-91 27l-327-189 204 1052a65 65 0 0 1-111 57l-423-454-105 247a65 65 0 0 1-73 38l-542-115 186 572a65 65 0 0 1-34 79l-212 99 941 762a65 65 0 0 1 20 73l-116 320 859-151a95 95 0 0 1 111 98l-45 863z"/>'],
    Brazil: [20, 14, 'h', '#009c3b', 'p', '1.7,7 10,1.7 18.3,7 10,12.3', '#ffdf00', 'c', 10, 7, 3.5, '#002776',
      '<clipPath id="{id}b"><circle cx="10" cy="7" r="3.5"/></clipPath><circle cx="12" cy="15" r="8.25" fill="none" stroke="#fff" stroke-width=".5" clip-path="url(#{id}b)"/><g fill="#fff"><circle cx="9" cy="9" r=".14"/><circle cx="10.5" cy="8.7" r=".14"/><circle cx="11.6" cy="9.6" r=".12"/><circle cx="8.2" cy="8.9" r=".12"/><circle cx="10" cy="10.2" r=".14"/><circle cx="12.4" cy="8.5" r=".12"/><circle cx="9.3" cy="10.6" r=".1"/><circle cx="11" cy="10.9" r=".12"/><circle cx="7.6" cy="9.9" r=".1"/></g>'],
    Argentina: [28, 18, 'h', '#74acdf', W, '#74acdf', 'o', 14, 9, 1.5, 2.7, '#f6b40e'], Colombia: [3, 2, 'h', '#fcd116', '#fcd116', '#003893', '#ce1126'],
    Peru: [3, 2, 'v', '#d91023', W, '#d91023'], Chile: [3, 2, 'h', W, '#d52b1e', 'r', 0, 0, 1, 1, '#0039a6', 's', .5, .5, .25, 0, W],
    Cuba: [2, 1, 'h', '#002a8f', W, '#002a8f', W, '#002a8f', 'p', '0,0 .866,.5 0,1', '#cf142b', 's', .289, .5, .16, 0, W],
    Panama: [3, 2, 'h', W, 'r', 1.5, 0, 1.5, 1, '#d21034', 'r', 0, 1, 1.5, 1, '#005293', 's', .75, .5, .25, 0, '#005293', 's', 2.25, 1.5, .25, 0, '#d21034'],
    Jamaica: [2, 1, 'h', '#009b3a', 'p', '0,0 1,.5 0,1', '#000', 'p', '2,0 1,.5 2,1', '#000', 'l', -.2, -.1, 2.2, 1.1, .17, '#fed100', 'l', -.2, 1.1, 2.2, -.1, .17, '#fed100'],
    'Trinidad and Tobago': [5, 3, 'h', '#da1a35', 'l', -.3, -.18, 5.3, 3.18, 1, W, 'l', -.3, -.18, 5.3, 3.18, .76, '#000'],
    Bahamas: [2, 1, 'h', '#00778b', '#ffc72c', '#00778b', 'p', '0,0 .866,.5 0,1', '#000'],
    Australia: [120, 60, 'h', '#012169', 'u', 0, 0, 60, 30, 'S', 30, 45, 9, 0, 7, .444, W, 'S', 90, 50, 4.29, 0, 7, .444, W, 'S', 90, 10, 4.29, 0, 7, .444, W,
      'S', 75, 26.25, 4.29, 0, 7, .444, W, 'S', 103.33, 22.25, 4.29, 0, 7, .444, W, 's', 96, 32.5, 2.5, 0, W],
    'New Zealand': [120, 60, 'h', '#012169', 'u', 0, 0, 60, 30, 's', 90, 11.5, 4.4, 0, W, 's', 90, 11.5, 3.4, 0, '#c8102e', 's', 90, 48, 4.6, 0, W, 's', 90, 48, 3.6, 0, '#c8102e',
      's', 77.5, 27.5, 4.2, 0, W, 's', 77.5, 27.5, 3.25, 0, '#c8102e', 's', 102, 24, 3.6, 0, W, 's', 102, 24, 2.7, 0, '#c8102e']
  };
  return rows.split('\n').map(l => { const [name, cap, ct, f, big] = l.trim().split('|'); return { name, cap, ct, f: +f, big: big || '', flag: F[name] }; });
})();
const ctName = c => c.name === 'Russia' ? 'Europe and Asia' : c.name === 'Turkey' ? 'Asia and Europe' : CT_NAME[c.ct];
let flagN = 0;
function flagSVG(spec) {
  const [Wd, Ht] = spec, id = 'fl' + (++flagN), f = v => +(+v).toFixed(3), out = [];
  const star = (cx, cy, R, rot, n, k) => { let s = ''; for (let i = 0; i < 2 * n; i++) { const a = (rot + i * 180 / n) * Math.PI / 180, r = i % 2 ? R * k : R; s += f(cx + r * Math.sin(a)) + ',' + f(cy - r * Math.cos(a)) + ' '; } return s; };
  const poly = (pts, col) => `<polygon points="${pts}" fill="${col}"/>`, rect = (x, y, w, hh, col) => `<rect x="${x}" y="${y}" width="${w}" height="${hh}" fill="${col}"/>`;
  const uj = (x, y, w, hh) => `<svg x="${x}" y="${y}" width="${w}" height="${hh}" viewBox="0 0 60 30" preserveAspectRatio="none"><clipPath id="${id}t"><path d="M30,15h30v15zv15h-30zh-30v-15zv-15h30z"/></clipPath><path d="M0,0v30h60v-30z" fill="#012169"/><path d="M0,0L60,30M60,0L0,30" stroke="#fff" stroke-width="6"/><path d="M0,0L60,30M60,0L0,30" clip-path="url(#${id}t)" stroke="#c8102e" stroke-width="4"/><path d="M30,0v30M0,15h60" stroke="#fff" stroke-width="10"/><path d="M30,0v30M0,15h60" stroke="#c8102e" stroke-width="6"/></svg>`;
  for (let i = 2; i < spec.length;) {
    const op = spec[i++], a = j => spec[i + j];
    if (op[0] === '<') out.push(op.replace(/\{id\}/g, id));
    else if (op === 'h' || op === 'v') { const cols = []; while (i < spec.length && String(spec[i])[0] === '#') cols.push(spec[i++]);
      cols.forEach((col, k) => out.push(op === 'h' ? rect(0, f(k * Ht / cols.length), Wd, f(Ht / cols.length + .01), col) : rect(f(k * Wd / cols.length), 0, f(Wd / cols.length + .01), Ht, col))); }
    else if (op === 'r') { out.push(rect(a(0), a(1), a(2), a(3), a(4))); i += 5; }
    else if (op === 'p') { out.push(poly(a(0), a(1))); i += 2; }
    else if (op === 'c') { out.push(`<circle cx="${a(0)}" cy="${a(1)}" r="${a(2)}" fill="${a(3)}"/>`); i += 4; }
    else if (op === 's') { out.push(poly(star(a(0), a(1), a(2), a(3), 5, .382), a(4))); i += 5; }
    else if (op === 'S') { out.push(poly(star(a(0), a(1), a(2), a(3), a(4), a(5)), a(6))); i += 7; }
    else if (op === 'n') { out.push(rect(a(0), 0, a(2), Ht, a(3)), rect(0, a(1), Wd, a(2), a(3))); i += 4; }
    else if (op === 'l') { out.push(`<line x1="${a(0)}" y1="${a(1)}" x2="${a(2)}" y2="${a(3)}" stroke="${a(5)}" stroke-width="${a(4)}"/>`); i += 6; }
    else if (op === 'u') { out.push(uj(a(0), a(1), a(2), a(3))); i += 4; }
    else if (op === 'm') { const [cx, cy, R, r, d, ang, col] = spec.slice(i, i + 7), t = ang * Math.PI / 180, ux = Math.cos(t), uy = Math.sin(t), aa = (R * R - r * r + d * d) / (2 * d), hh = Math.sqrt(R * R - aa * aa),
        px = cx + aa * ux, py = cy + aa * uy, p1 = f(px - hh * uy) + ' ' + f(py + hh * ux), p2 = f(px + hh * uy) + ' ' + f(py - hh * ux);
      out.push(`<path d="M${p1}A${R} ${R} 0 1 1 ${p2}A${r} ${r} 0 ${aa > d ? 1 : 0} 0 ${p1}Z" fill="${col}"/>`); i += 7; }
    else if (op === 'z') { const [x0, x1, n, col] = spec.slice(i, i + 4); let p = '0,0 '; for (let k = 0; k < n; k++) p += `${x0},${f(k * Ht / n)} ${x1},${f((k + .5) * Ht / n)} `; out.push(poly(p + `${x0},${Ht} 0,${Ht}`, col)); i += 4; }
    else if (op === 'w') { const [cx, cy, r, col] = spec.slice(i, i + 4); let d = ''; for (let k = 0; k < 24; k++) { const t = k * Math.PI / 12; d += `M${cx} ${cy}L${f(cx + r * Math.cos(t))} ${f(cy + r * Math.sin(t))}`; }
      out.push(`<g stroke="${col}" fill="none"><circle cx="${cx}" cy="${cy}" r="${r}" stroke-width="${f(r * .12)}"/><path d="${d}" stroke-width="${f(r * .05)}"/></g><circle cx="${cx}" cy="${cy}" r="${f(r * .17)}" fill="${col}"/>`); i += 4; }
    else if (op === 'P') { const [cx, cy, R, w, col] = spec.slice(i, i + 5), v = k => f(cx + R * Math.sin(k * 1.2566)) + ' ' + f(cy - R * Math.cos(k * 1.2566));
      out.push(`<path d="M${v(0)}L${v(2)}L${v(4)}L${v(1)}L${v(3)}Z" fill="none" stroke="${col}" stroke-width="${w}" stroke-linejoin="miter"/>`); i += 5; }
    else if (op === 'o') { const [cx, cy, r, R, col] = spec.slice(i, i + 5); let p = ''; for (let k = 0; k < 64; k++) { const t = k * Math.PI / 32, rr = k % 2 ? r * 1.08 : (k % 4 ? R * .9 : R); p += f(cx + rr * Math.sin(t)) + ',' + f(cy - rr * Math.cos(t)) + ' '; }
      out.push(poly(p, col), `<circle cx="${cx}" cy="${cy}" r="${r}" fill="${col}" stroke="#85340a" stroke-width="${f(r * .06)}"/>`); i += 5; }
    else if (op === 'U') { out.push(rect(0, 0, 190, 100, '#fff')); for (let k = 0; k < 13; k += 2) out.push(rect(0, f(k * 100 / 13), 190, f(100 / 13), '#b22234'));
      out.push(rect(0, 0, 76, f(700 / 13), '#3c3b6e')); let p = ''; for (let rw = 0; rw < 9; rw++) for (let k = 0; k < (rw % 2 ? 5 : 6); k++) p += `<polygon points="${star(6.3 * (2 * k + 1 + rw % 2), 5.4 * (rw + 1), 3.08, 0, 5, .382)}"/>`;
      out.push(`<g fill="#fff">${p}</g>`); }
    else if (op === 'K') { const R = '#cd2e3a', B = '#0047a0', bar = (d, broken) => broken ? rect(d - .5, -3, 1, 2.75, '#000') + rect(d - .5, .25, 1, 2.75, '#000') : rect(d - .5, -3, 1, 6, '#000'),
        tri = (ang, bits) => `<g transform="translate(18 12) rotate(${ang})">${bar(9.5, bits[0])}${bar(11, bits[1])}${bar(12.5, bits[2])}</g>`;
      out.push(rect(0, 0, 36, 24, '#fff'), `<g transform="rotate(33.69 18 12)"><path d="M12 12A6 6 0 0 1 24 12Z" fill="${R}"/><path d="M12 12A6 6 0 0 0 24 12Z" fill="${B}"/><circle cx="15" cy="12" r="3" fill="${R}"/><circle cx="21" cy="12" r="3" fill="${B}"/></g>`,
        tri(213.69, [0, 0, 0]), tri(33.69, [1, 1, 1]), tri(-33.69, [1, 0, 1]), tri(146.31, [0, 1, 0])); }
  }
  return `<svg viewBox="0 0 ${Wd} ${Ht}" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="none" style="display:block;width:100%;height:100%">${out.join('')}</svg>`;
}
