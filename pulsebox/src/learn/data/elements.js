/* Chemical elements for the Periodic Table Puzzle: elements 1 to 36 and some well-known heavier ones.
   Each: z (atomic number), sym, name (US spelling: aluminum, sulfur), group (1-18; 0 for uranium, an actinide in the f-block),
   period, cat (category key, see ECAT), state at room temperature (about 20 °C), latin (where the symbol comes from a Latin name). */
const ECAT = { alkali: ['alkali metal', '#ff6b6b'], alkaline: ['alkaline earth metal', '#ffa94d'], transition: ['transition metal', '#ffd43b'],
  post: ['post-transition metal', '#8ce99a'], metalloid: ['metalloid', '#38d9a9'], nonmetal: ['reactive nonmetal', '#4dabf7'], halogen: ['halogen', '#748ffc'],
  noble: ['noble gas', '#da77f2'], actinide: ['actinide', '#f783ac'] };
const ELEMENTS = `1 H Hydrogen 1 1 nonmetal gas
2 He Helium 18 1 noble gas
3 Li Lithium 1 2 alkali solid
4 Be Beryllium 2 2 alkaline solid
5 B Boron 13 2 metalloid solid
6 C Carbon 14 2 nonmetal solid
7 N Nitrogen 15 2 nonmetal gas
8 O Oxygen 16 2 nonmetal gas
9 F Fluorine 17 2 halogen gas
10 Ne Neon 18 2 noble gas
11 Na Sodium 1 3 alkali solid natrium
12 Mg Magnesium 2 3 alkaline solid
13 Al Aluminum 13 3 post solid
14 Si Silicon 14 3 metalloid solid
15 P Phosphorus 15 3 nonmetal solid
16 S Sulfur 16 3 nonmetal solid
17 Cl Chlorine 17 3 halogen gas
18 Ar Argon 18 3 noble gas
19 K Potassium 1 4 alkali solid kalium
20 Ca Calcium 2 4 alkaline solid
21 Sc Scandium 3 4 transition solid
22 Ti Titanium 4 4 transition solid
23 V Vanadium 5 4 transition solid
24 Cr Chromium 6 4 transition solid
25 Mn Manganese 7 4 transition solid
26 Fe Iron 8 4 transition solid ferrum
27 Co Cobalt 9 4 transition solid
28 Ni Nickel 10 4 transition solid
29 Cu Copper 11 4 transition solid cuprum
30 Zn Zinc 12 4 transition solid
31 Ga Gallium 13 4 post solid
32 Ge Germanium 14 4 metalloid solid
33 As Arsenic 15 4 metalloid solid
34 Se Selenium 16 4 nonmetal solid
35 Br Bromine 17 4 halogen liquid
36 Kr Krypton 18 4 noble gas
47 Ag Silver 11 5 transition solid argentum
50 Sn Tin 14 5 post solid stannum
53 I Iodine 17 5 halogen solid
54 Xe Xenon 18 5 noble gas
78 Pt Platinum 10 6 transition solid
79 Au Gold 11 6 transition solid aurum
80 Hg Mercury 12 6 transition liquid hydrargyrum
82 Pb Lead 14 6 post solid plumbum
86 Rn Radon 18 6 noble gas
92 U Uranium 0 7 actinide solid`.split('\n').map(l => { const [z, sym, name, group, period, cat, state, latin] = l.trim().split(' ');
  return { z: +z, sym, name, group: +group, period: +period, cat, state, latin: latin || '' }; });
