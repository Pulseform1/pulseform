// Opening book. NAMES label positions (longest matching prefix wins).
// COURSES are full lines the trainer drills, with the plan behind them.
(function (root) {
  var NAMES = [
    ["B00", "King's Pawn Opening", "e4"],
    ["C20", "Open Game", "e4 e5"],
    ["C40", "King's Knight Opening", "e4 e5 Nf3"],
    ["C44", "King's Knight Opening: Normal Variation", "e4 e5 Nf3 Nc6"],
    ["C50", "Italian Game", "e4 e5 Nf3 Nc6 Bc4"],
    ["C50", "Italian Game: Giuoco Piano", "e4 e5 Nf3 Nc6 Bc4 Bc5"],
    ["C53", "Italian Game: Giuoco Pianissimo", "e4 e5 Nf3 Nc6 Bc4 Bc5 c3 Nf6 d3"],
    ["C55", "Italian Game: Two Knights Defense", "e4 e5 Nf3 Nc6 Bc4 Nf6"],
    ["C57", "Two Knights Defense: Fried Liver Setup", "e4 e5 Nf3 Nc6 Bc4 Nf6 Ng5"],
    ["C60", "Ruy Lopez", "e4 e5 Nf3 Nc6 Bb5"],
    ["C65", "Ruy Lopez: Berlin Defense", "e4 e5 Nf3 Nc6 Bb5 Nf6"],
    ["C70", "Ruy Lopez: Morphy Defense", "e4 e5 Nf3 Nc6 Bb5 a6"],
    ["C68", "Ruy Lopez: Exchange Variation", "e4 e5 Nf3 Nc6 Bb5 a6 Bxc6"],
    ["C84", "Ruy Lopez: Closed", "e4 e5 Nf3 Nc6 Bb5 a6 Ba4 Nf6 O-O Be7"],
    ["C44", "Scotch Game", "e4 e5 Nf3 Nc6 d4"],
    ["C42", "Petrov's Defense", "e4 e5 Nf3 Nf6"],
    ["C41", "Philidor Defense", "e4 e5 Nf3 d6"],
    ["C30", "King's Gambit", "e4 e5 f4"],
    ["C33", "King's Gambit Accepted", "e4 e5 f4 exf4"],
    ["C25", "Vienna Game", "e4 e5 Nc3"],
    ["B20", "Sicilian Defense", "e4 c5"],
    ["B27", "Sicilian Defense", "e4 c5 Nf3"],
    ["B50", "Sicilian Defense: Modern Variations", "e4 c5 Nf3 d6"],
    ["B54", "Sicilian Defense: Open", "e4 c5 Nf3 d6 d4 cxd4 Nxd4"],
    ["B56", "Sicilian Defense: Classical", "e4 c5 Nf3 d6 d4 cxd4 Nxd4 Nf6 Nc3"],
    ["B90", "Sicilian Defense: Najdorf Variation", "e4 c5 Nf3 d6 d4 cxd4 Nxd4 Nf6 Nc3 a6"],
    ["B70", "Sicilian Defense: Dragon Variation", "e4 c5 Nf3 d6 d4 cxd4 Nxd4 Nf6 Nc3 g6"],
    ["B30", "Sicilian Defense: Old Sicilian", "e4 c5 Nf3 Nc6"],
    ["B40", "Sicilian Defense: French Variation", "e4 c5 Nf3 e6"],
    ["B22", "Sicilian Defense: Alapin Variation", "e4 c5 c3"],
    ["B23", "Sicilian Defense: Closed", "e4 c5 Nc3"],
    ["B21", "Sicilian Defense: Smith-Morra Gambit", "e4 c5 d4 cxd4 c3"],
    ["C00", "French Defense", "e4 e6"],
    ["C01", "French Defense", "e4 e6 d4 d5"],
    ["C02", "French Defense: Advance Variation", "e4 e6 d4 d5 e5"],
    ["C03", "French Defense: Tarrasch Variation", "e4 e6 d4 d5 Nd2"],
    ["C10", "French Defense: Paulsen Variation", "e4 e6 d4 d5 Nc3"],
    ["C15", "French Defense: Winawer Variation", "e4 e6 d4 d5 Nc3 Bb4"],
    ["C11", "French Defense: Classical Variation", "e4 e6 d4 d5 Nc3 Nf6"],
    ["C13", "French Defense: Classical, Burn/Main Line", "e4 e6 d4 d5 Nc3 Nf6 Bg5 Be7"],
    ["C14", "French Defense: Classical, Steinitz Variation", "e4 e6 d4 d5 Nc3 Nf6 Bg5 Be7 e5 Nfd7"],
    ["B10", "Caro-Kann Defense", "e4 c6"],
    ["B12", "Caro-Kann Defense", "e4 c6 d4 d5"],
    ["B12", "Caro-Kann Defense: Advance Variation", "e4 c6 d4 d5 e5"],
    ["B15", "Caro-Kann Defense: Main Line", "e4 c6 d4 d5 Nc3 dxe4 Nxe4"],
    ["B18", "Caro-Kann Defense: Classical Variation", "e4 c6 d4 d5 Nc3 dxe4 Nxe4 Bf5"],
    ["B01", "Scandinavian Defense", "e4 d5"],
    ["B01", "Scandinavian Defense: Main Line", "e4 d5 exd5 Qxd5 Nc3 Qa5"],
    ["B07", "Pirc Defense", "e4 d6 d4 Nf6 Nc3 g6"],
    ["B06", "Modern Defense", "e4 g6"],
    ["B02", "Alekhine Defense", "e4 Nf6"],
    ["A40", "Queen's Pawn Opening", "d4"],
    ["D00", "Queen's Pawn Game", "d4 d5"],
    ["D02", "London System", "d4 d5 Bf4"],
    ["D02", "London System", "d4 d5 Nf3 Nf6 Bf4"],
    ["A46", "London System", "d4 Nf6 Bf4"],
    ["D06", "Queen's Gambit", "d4 d5 c4"],
    ["D30", "Queen's Gambit Declined", "d4 d5 c4 e6"],
    ["D35", "Queen's Gambit Declined", "d4 d5 c4 e6 Nc3 Nf6"],
    ["D53", "Queen's Gambit Declined: Orthodox Setup", "d4 d5 c4 e6 Nc3 Nf6 Bg5 Be7"],
    ["D20", "Queen's Gambit Accepted", "d4 d5 c4 dxc4"],
    ["D10", "Slav Defense", "d4 d5 c4 c6"],
    ["D15", "Slav Defense: Main Line", "d4 d5 c4 c6 Nf3 Nf6 Nc3"],
    ["D17", "Slav Defense: Czech Variation", "d4 d5 c4 c6 Nf3 Nf6 Nc3 dxc4 a4 Bf5"],
    ["A45", "Indian Defense", "d4 Nf6"],
    ["A50", "Indian Defense", "d4 Nf6 c4"],
    ["E60", "King's Indian Defense", "d4 Nf6 c4 g6"],
    ["E70", "King's Indian Defense: Normal Variation", "d4 Nf6 c4 g6 Nc3 Bg7 e4 d6"],
    ["E92", "King's Indian Defense: Classical Variation", "d4 Nf6 c4 g6 Nc3 Bg7 e4 d6 Nf3 O-O Be2 e5"],
    ["E97", "King's Indian Defense: Mar del Plata", "d4 Nf6 c4 g6 Nc3 Bg7 e4 d6 Nf3 O-O Be2 e5 O-O Nc6"],
    ["D80", "Grünfeld Defense", "d4 Nf6 c4 g6 Nc3 d5"],
    ["E20", "Nimzo-Indian Defense", "d4 Nf6 c4 e6 Nc3 Bb4"],
    ["E12", "Queen's Indian Defense", "d4 Nf6 c4 e6 Nf3 b6"],
    ["A57", "Benko Gambit", "d4 Nf6 c4 c5 d5 b5"],
    ["A80", "Dutch Defense", "d4 f5"],
    ["A10", "English Opening", "c4"],
    ["A20", "English Opening: King's English", "c4 e5"],
    ["A22", "English Opening: King's English, Two Knights", "c4 e5 Nc3 Nf6"],
    ["A29", "English Opening: Reversed Dragon", "c4 e5 Nc3 Nf6 g3 d5 cxd5 Nxd5 Bg2 Nb6"],
    ["A04", "Zukertort Opening", "Nf3"],
    ["A09", "Réti Opening", "Nf3 d5 c4"],
    ["A01", "Nimzo-Larsen Attack", "b3"],
    ["A00", "Hungarian Opening", "g3"]
  ];

  var COURSES = [
    { id: "italian", side: "w", eco: "C53", name: "Italian Game", sub: "Giuoco Pianissimo",
      moves: "e4 e5 Nf3 Nc6 Bc4 Bc5 c3 Nf6 d3 d6 O-O O-O",
      plan: "Aim the bishop at f7, then build slowly with c3 and d3 so a later d4 lands with support. Castle early and look for Re1, Nbd2-f1-g3 to swing pieces toward the king.",
      notes: { 4: "The bishop eyes f7, the weakest square near Black's king.", 6: "c3 prepares d4 and gives the bishop a retreat on c2.", 8: "d3 holds e4 calmly. The fight comes later.", 10: "Castle first, then reroute the b1 knight via d2 and f1." } },
    { id: "ruy", side: "w", eco: "C84", name: "Ruy Lopez", sub: "Closed Variation",
      moves: "e4 e5 Nf3 Nc6 Bb5 a6 Ba4 Nf6 O-O Be7 Re1 b5 Bb3 d6 c3 O-O",
      plan: "Pressure the knight that defends e5. Keep the light-squared bishop on the a2-g8 diagonal, play c3 and d4, and slowly squeeze the center.",
      notes: { 4: "Bb5 attacks the defender of e5.", 6: "Keep the bishop: retreat to a4, not take on c6.", 8: "Castle before taking anything. e5 can't really be won yet.", 10: "Re1 protects e4 and frees the f1 square for a knight.", 12: "The bishop settles on b3, still aimed at f7.", 14: "c3 builds for d4 and makes a home for the bishop." } },
    { id: "qgd", side: "w", eco: "D53", name: "Queen's Gambit", sub: "Declined, Orthodox",
      moves: "d4 d5 c4 e6 Nc3 Nf6 Bg5 Be7 e3 O-O Nf3 h6 Bh4",
      plan: "Offer the c-pawn to pull Black's d-pawn out of the center. Pin the f6 knight, develop smoothly, and later aim for a minority attack with b4-b5.",
      notes: { 2: "c4 challenges d5. It isn't a real gambit; Black can't keep the pawn.", 4: "Nc3 adds a second attacker to d5.", 6: "Bg5 pins the knight that defends d5.", 8: "e3 opens the way for the f1 bishop.", 12: "Keep the pin with Bh4 rather than swapping." } },
    { id: "london", side: "w", eco: "D02", name: "London System", sub: "Main setup",
      moves: "d4 d5 Bf4 Nf6 e3 e6 Nf3 c5 c3 Nc6 Nbd2 Bd6 Bg3 O-O Bd3",
      plan: "A system you can play against almost anything: d4, Bf4, e3, Nf3, c3, Nbd2, Bd3. Rock-solid pyramid of pawns, then attack on the kingside with Ne5 and Qf3 or h4.",
      notes: { 2: "Get the dark bishop out before e3 locks it in.", 8: "c3 keeps the d4 pawn safe from ...c5 pressure.", 12: "Bg3 keeps the bishop rather than trading it for ...Bd6.", 14: "Bd3 aims at h7. Your setup is complete." } },
    { id: "english", side: "w", eco: "A29", name: "English Opening", sub: "Reversed Dragon",
      moves: "c4 e5 Nc3 Nf6 g3 d5 cxd5 Nxd5 Bg2 Nb6 Nf3 Nc6 O-O",
      plan: "Fight for d5 from the flank. Fianchetto the bishop so it rakes the long diagonal, and use the c-file and queenside pawn pushes (a4, b4) for play.",
      notes: { 4: "g3 prepares Bg2, the key piece of this opening.", 6: "Trade the c-pawn for Black's center pawn.", 8: "The bishop on g2 hits the knight and the long diagonal." } },
    { id: "najdorf", side: "b", eco: "B90", name: "Sicilian Defense", sub: "Najdorf Variation",
      moves: "e4 c5 Nf3 d6 d4 cxd4 Nxd4 Nf6 Nc3 a6",
      plan: "Trade your c-pawn for White's d-pawn to get an extra center pawn and the half-open c-file. ...a6 keeps knights and bishops off b5 and prepares ...e5 or ...b5.",
      notes: { 1: "c5 fights for d4 without mirroring White.", 3: "d6 controls e5 and frees the c8 bishop.", 5: "Trade on d4: two center pawns against one.", 7: "Nf6 hits e4 and forces Nc3.", 9: "The Najdorf move: ...a6 takes b5 away from White's pieces." } },
    { id: "french", side: "b", eco: "C14", name: "French Defense", sub: "Classical, Steinitz",
      moves: "e4 e6 d4 d5 Nc3 Nf6 Bg5 Be7 e5 Nfd7 Bxe7 Qxe7",
      plan: "Build a solid e6-d5 chain and strike the base of White's center with ...c5 and ...f6. Your light-squared bishop is the problem piece; plan ...b6 and ...Ba6 or trade it.",
      notes: { 1: "e6 prepares ...d5 with full support.", 3: "Challenge e4 right away.", 5: "Nf6 adds pressure on e4.", 7: "Break the pin with ...Be7.", 9: "The knight retreats; ...c5 comes next to hit d4." } },
    { id: "carokann", side: "b", eco: "B18", name: "Caro-Kann Defense", sub: "Classical Variation",
      moves: "e4 c6 d4 d5 Nc3 dxe4 Nxe4 Bf5 Ng3 Bg6 h4 h6 Nf3 Nd7",
      plan: "Like the French but your light bishop gets out first: ...Bf5 before ...e6. Solid pawn structure, few weaknesses, and a good endgame.",
      notes: { 1: "c6 supports ...d5 without blocking the c8 bishop.", 5: "Trade in the center to free your game.", 7: "Bf5: the bishop escapes before ...e6.", 9: "Keep the bishop alive on g6.", 11: "...h6 gives the bishop a hole on h7 if h5 comes.", 13: "Nd7 stops Ne5 and prepares ...Ngf6." } },
    { id: "kid", side: "b", eco: "E97", name: "King's Indian Defense", sub: "Mar del Plata",
      moves: "d4 Nf6 c4 g6 Nc3 Bg7 e4 d6 Nf3 O-O Be2 e5 O-O Nc6",
      plan: "Let White build a big center, then hit it with ...e5. After d5 the knight goes to e7 and you storm the kingside with ...f5, ...f4, ...g5.",
      notes: { 1: "Nf6 controls e4 and keeps options open.", 3: "Fianchetto: the bishop will rule the long diagonal.", 7: "d6 prepares the key break ...e5.", 9: "King safety first.", 11: "Strike the center now.", 13: "Pressure d4. If d5, go ...Ne7 and ...f5." } },
    { id: "slav", side: "b", eco: "D17", name: "Slav Defense", sub: "Czech Variation",
      moves: "d4 d5 c4 c6 Nf3 Nf6 Nc3 dxc4 a4 Bf5",
      plan: "Hold d5 with ...c6, keep the light bishop free, then take on c4 when it costs White time. Develop the bishop to f5 before ...e6.",
      notes: { 1: "Meet d4 with ...d5 for a share of the center.", 3: "c6 defends d5 and keeps the c8 bishop free.", 7: "Take the pawn now that White has spent a move on Nc3.", 9: "Bishop out to f5 before ...e6 locks it in." } },
    { id: "scandi", side: "b", eco: "B01", name: "Scandinavian Defense", sub: "Main Line",
      moves: "e4 d5 exd5 Qxd5 Nc3 Qa5 d4 Nf6 Nf3 c6 Bc4 Bf5",
      plan: "Hit e4 on move one. Your queen comes out early but finds a safe spot on a5; then a solid ...c6, ...Bf5, ...e6 setup.",
      notes: { 1: "Challenge e4 immediately.", 3: "Recapture with the queen.", 5: "a5 is safe and pins the c3 knight.", 9: "c6 gives the queen a retreat and builds a solid wall." } }
  ];

  // What to do once the book runs out. Goal tests: piece@square[|square],
  // uppercase = White, lowercase = Black. A goal counts once it has been reached.
  var STRATEGY = {
    italian: {
      structure: "Slow center: your e4-d3-c3 against Black's e5-d6. Nobody has broken through yet, so maneuvering decides who gets the better version of d3-d4.",
      plans: [
        "Play Re1 and h3, then take the knight on a tour: Nbd2, Nf1, Ng3. From g3 it eyes f5 and h5 near Black's king.",
        "Push a4 so your bishop can drop back to a2 and stay alive if Black plays ...Na5.",
        "When your pieces are ready, strike with d3-d4. With c3 already played, you can recapture with a pawn."
      ],
      pieces: ["Bishop on b3 or a2, aimed at f7", "Rook on e1 behind the e-pawn", "Knight on g3, heading for f5", "Dark bishop on g5 or e3"],
      watch: ["...Bg4 pinning your f3 knight: h3 first takes that square away.", "...Na5 hunting your bishop: answer with Bb3 or Ba2, not a passive retreat.", "...d5 breaking out. Don't let Black open the center before you've castled and connected rooks."],
      goals: [["Castle kingside", "K@g1"], ["Rook to e1", "R@e1"], ["Play h3", "P@h3"], ["Knight to g3", "N@g3"], ["Bishop on b3 or a2", "B@b3|a2"], ["Break with d4", "P@d4"]]
    },
    ruy: {
      structure: "Classic Closed Spanish: your e4 and soon d4 against Black's e5-d6 chain. The center stays tense and you squeeze slowly.",
      plans: [
        "Play h3 to stop ...Bg4, then d4 to build a big pawn center.",
        "Route the b1 knight via d2 and f1 to g3 for kingside play.",
        "If Black plays ...Na5, tuck the bishop on c2 where it still points at the kingside."
      ],
      pieces: ["Bishop on b3 or c2", "Knights on f3 and g3", "Rook on e1", "Queen on e2 or d3 later"],
      watch: ["...Bg4 pinning the f3 knight before you've played h3.", "...Na5 trading off your best bishop.", "...exd4 then ...c5 pressure on your center if d4 comes too early."],
      goals: [["Play h3", "P@h3"], ["Build with d4", "P@d4"], ["Bishop to c2", "B@c2"], ["Knight to g3", "N@g3"]]
    },
    qgd: {
      structure: "Queen's Gambit structure. After cxd5 exd5 you get the Carlsbad structure: your a- and b-pawns against Black's three.",
      plans: [
        "Finish development: Rc1, Bd3, O-O.",
        "Trade on d5 and start a minority attack: b4, then b5 to give Black a weak c-pawn.",
        "If Black is passive, prepare e3-e4 for a big center instead."
      ],
      pieces: ["Rook on c1 on the half-open file", "Bishop on d3 aimed at h7", "Knight on e5 or c3 eyeing d5", "Dark bishop keeping the pin"],
      watch: ["...Ne4 trades pieces and frees Black. Be ready to trade bishops on e7.", "...dxc4 as soon as your bishop leaves f1, winning a tempo.", "...c5 breaks that hit your d4 pawn."],
      goals: [["Castle kingside", "K@g1"], ["Rook to c1", "R@c1"], ["Bishop to d3", "B@d3"], ["Minority attack: b4", "P@b4"]]
    },
    london: {
      structure: "London pyramid: c3, d4, e3. Very solid. Your play comes on the kingside, where your bishops point.",
      plans: [
        "Castle, then plant a knight on e5. Support it with f4 for a Stonewall-style attack.",
        "Bring the queen to e2 or f3 and prepare e3-e4 to open lines.",
        "Against kingside castling, try h4-h5 or Qf3-h3 to attack."
      ],
      pieces: ["Knight on e5 outpost", "Bishops on d3 and g3", "Queen on e2 or f3", "Rook on e1 behind the e-pawn"],
      watch: ["...Qb6 hitting b2: answer with Qb3 or Qc2.", "...c4 gaining space and kicking your d3 bishop.", "...Nh5 trying to trade off your dark bishop."],
      goals: [["Castle kingside", "K@g1"], ["Knight to e5", "N@e5"], ["Queen to e2 or f3", "Q@e2|f3"], ["Support with f4", "P@f4"]]
    },
    english: {
      structure: "A Sicilian with colors reversed and an extra tempo. Black has the center; you have the long diagonal and the c-file.",
      plans: [
        "Play d3, Be3 and Rc1 to pressure c7 and the knights.",
        "Push a4-a5 to kick the b6 knight away from the center.",
        "Use b4-b5 to dislodge the c6 knight and weaken e5."
      ],
      pieces: ["Bishop on g2 on the long diagonal", "Rook on c1", "Bishop on e3 facing the b6 knight", "Knight jumping to a4 or c5"],
      watch: ["Black's big kingside push: ...f5, ...Be6, ...Qd7 and ...Bh3.", "...e4 hitting your f3 knight if you leave it loose.", "Don't trade the g2 bishop. It defends your king."],
      goals: [["Play d3", "P@d3"], ["Bishop to e3", "B@e3"], ["Rook to c1", "R@c1"], ["Push a4 or a5", "P@a4|a5"]]
    },
    najdorf: {
      structure: "Open Sicilian: your two center pawns (d6, e7) against White's one (e4), and the half-open c-file.",
      plans: [
        "Pick a center setup: ...e5 (claim space and hit d4) or ...e6 (a flexible Scheveningen).",
        "Expand on the queenside with ...b5 and ...Bb7, then hit e4.",
        "Use the c-file: ...Nbd7, ...Rc8 and ...Qc7. Look for an exchange sacrifice on c3."
      ],
      pieces: ["Bishop on b7 hitting e4, or e6 controlling d5", "Queen on c7", "Rook on c8", "Knight on d7 heading to c5 or b6"],
      watch: ["After ...e5, the d5 square is a hole. Keep it covered with ...Be6 or ...Nb6.", "Sacrifices on e6 or d5 when your king is still in the center.", "White's pawn storm with f4, g4 and g5. Strike back in the center with ...d5 or ...b4."],
      goals: [["Choose ...e5 or ...e6", "p@e5|e6"], ["Expand with ...b5", "p@b5"], ["Rook to c8", "r@c8"], ["Castle kingside", "k@g8"]]
    },
    french: {
      structure: "French chain: your e6-d5 against White's d4-e5. Attack the base of White's chain, d4, and later e5.",
      plans: [
        "Hit d4 with ...c5, ...Nc6 and ...Qb6. That puts three attackers on it.",
        "Undermine e5 with ...f6 once your king is safe.",
        "Grab queenside space with ...a6 and ...b5."
      ],
      pieces: ["Knight on c6 pressing d4", "Queen on b6 or e7", "Light bishop to d7, or swapped off via ...b6 and ...Ba6", "Rook on c8 or f8"],
      watch: ["Your c8 bishop is boxed in. Plan how to free or trade it.", "f4-f5 breaks that open lines toward your king.", "Nb5 jumping into c7 or d6."],
      goals: [["Strike with ...c5", "p@c5"], ["Knight to c6", "n@c6"], ["Castle", "k@g8|c8"], ["Undermine with ...f6", "p@f6"]]
    },
    carokann: {
      structure: "Classical Caro-Kann: a rock-solid c6-e6 shell. White has more space and you have no weaknesses.",
      plans: [
        "Finish development with ...Ngf6, ...e6, ...Bd6 or ...Be7, and ...Qc7.",
        "With White's h-pawn advanced, castling queenside is often safer.",
        "Free your game with ...c5 or ...e5 once your pieces are out."
      ],
      pieces: ["Bishop on g6, then h7 after h5", "Queen on c7", "Knights on f6 and d7", "King on c8 or g8"],
      watch: ["h4-h5 cramping your bishop: keep ...h6 and the h7 retreat ready.", "Sacrifices on e6 or f7 while your king is uncastled.", "Ne5 landing in your camp. ...Nd7 keeps it away."],
      goals: [["Knight to f6", "n@f6"], ["Play ...e6", "p@e6"], ["Queen to c7", "q@c7"], ["Castle", "k@c8|g8"], ["Free with ...c5", "p@c5"]]
    },
    kid: {
      structure: "King's Indian with a locked center after d5: White attacks the queenside, you attack the kingside. Whoever is faster wins.",
      plans: [
        "After d5, play ...Ne7, then ...Nd7 or ...Ne8 to free the f-pawn.",
        "Pawn storm: ...f5, ...f4, ...g5, ...g4.",
        "Bring the rook to f7 and the bishop to f8 to cover your queenside while you attack."
      ],
      pieces: ["Knight on e7 heading to g6", "Bishop on g7, sometimes rerouted to h6", "Rook on f7 or f8", "Queen on e8 for the attack"],
      watch: ["White's c5 break and Nb5 aiming at c7.", "Don't open the f-file before your pieces are ready to use it.", "Bg5 pins on your f6 knight."],
      goals: [["Knight to e7", "n@e7"], ["Break with ...f5", "p@f5"], ["Push ...f4", "p@f4"], ["Storm with ...g5", "p@g5"]]
    },
    slav: {
      structure: "Slav: a solid c6-d5 center with your light bishop outside the pawn chain. White will win back the c4 pawn; you get easy development.",
      plans: [
        "Develop with ...e6, ...Bb4 and ...O-O, then ...Nbd7.",
        "Free your position with ...c5 or ...e5.",
        "Trade your light bishop on d3 or g6 when White chases it."
      ],
      pieces: ["Bishop on f5 or g6", "Bishop on b4 pinning the c3 knight", "Knight on d7", "Queen on e7 or c7"],
      watch: ["Nh4 or Ne5 hunting your f5 bishop.", "e2-e4 with tempo on your bishop.", "Don't grab more pawns. Development matters more."],
      goals: [["Play ...e6", "p@e6"], ["Bishop to b4", "b@b4"], ["Castle kingside", "k@g8"], ["Knight to d7", "n@d7"]]
    },
    scandi: {
      structure: "Scandinavian: you traded off White's e-pawn early. Build a c6-e6 shell and develop smoothly.",
      plans: [
        "Play ...e6, ...Nbd7 and ...Bb4 or ...Be7, then castle.",
        "Drop the queen back to c7 when White starts hitting a5.",
        "Use ...Nb6 and ...Nbd5 to grab central squares."
      ],
      pieces: ["Queen on a5, later c7", "Bishop on f5 or g6", "Knight on d7, then b6 or f6", "Bishop on b4 or e7"],
      watch: ["Bd2 with a discovered attack on your queen via Nd5.", "Ne5 plus g4 trapping your f5 bishop.", "b4 kicking your queen when it runs short of squares."],
      goals: [["Play ...e6", "p@e6"], ["Knight to d7", "n@d7"], ["Develop the dark bishop", "b@b4|e7|d6"], ["Castle", "k@g8|c8"]]
    }
  };
  COURSES.forEach(function (c) { c.strategy = STRATEGY[c.id]; });

  root.OPENINGS = { NAMES: NAMES, COURSES: COURSES };
})(typeof window !== "undefined" ? window : globalThis);
