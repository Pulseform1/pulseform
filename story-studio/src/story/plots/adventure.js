import { say, img, sys } from "../generator.js";

const me = (t, o) => say("me", t, o);
const x = (t, o) => say("x", t, o);

export default [
  {
    id: "adventure-dads-map",
    title: "My dad's old map",
    hook: (v, k) => k.pick(["I found my dad's old treasure map from when he was 12", "My dad's childhood map led somewhere real", "We followed a 30-year-old map into the woods"]),
    outro: ["Would you dig it up?", "Part 2?"],
    vars: (k) => ({ f: k.name(), tree: k.pick(["the split oak", "the lightning tree", "the old maple"]), clock: "2:20" }),
    cast: (v) => [{ id: "me", name: "You", voice: "af_sky" }, { id: "x", name: v.f, avatar: "star", color: "#5ad96b", voice: "am_puck" }],
    beats: [
      { m: () => [me("i found a map in the attic. my dad drew it when he was 12"), img("me", "map", "'TREASURE. DO NOT TELL MOM'"), x("we are going. obviously")] },
      { m: () => [me("it starts at the creek behind the school"), x("bringing snacks and a shovel")] },
      { tier: 1, m: (v) => [me(`next clue says '30 steps from ${v.tree}'`), x("whose steps. a 12 year old's steps?"), me("...good point. small steps")] },
      { tier: 1, m: () => [img("x", "forest", "is this the tree"), me("there's an X carved in it. that's dad's handwriting X")] },
      { tier: 2, m: () => [x("ok i'm digging"), x("hit something metal!!"), img("x", "treasure", "a lunchbox. a LUNCHBOX")] },
      { tier: 2, m: () => [me("open it"), x("baseball cards, a cassette tape, and a letter with your name on it")] },
      { m: () => [me("my name?? he was 12. i didn't exist"), x("it says 'to my kid, whoever you are'", { effect: "zoom" })] },
    ],
    pool: [
      () => [x("there's a frog guarding the creek"), me("we pay the toll and move on")],
      () => [me("the map has a drawing of a bear with a crown"), x("so we're looking for a king bear"), me("or he just liked bears")],
      () => [x("we lost the trail. the tree with the X is gone"), me("look for a stump"), x("found it!!")],
      () => [x("there's a sign that says private property"), me("it also says 1987 on it. i think the rules expired")],
      () => [me("the creek is higher than i thought"), x("i'll carry the snacks. you carry the dignity")],
      () => [x("why is there a rope swing here"), me("dad mentioned a rope swing once. he said he broke his arm on it"), x("so we're not using the rope swing")],
    ],
    keys: [0, 6],
    short: () => [me("found my dad's treasure map from when he was 12"), x("we're going. obviously"), img("x", "treasure", "a lunchbox!!"), x("there's a letter. it says 'to my kid, whoever you are'", { effect: "zoom" }), me("i'm crying in the woods")],
    endings: [
      () => [x("'if you're reading this, i hope i'm a good dad. if i'm not, show me this letter.'"), me("i'm crying in the woods"), x("are you going to show him"), me("i'm going to show him and then make him take us back here")],
      () => [x("there's a second map inside the letter"), img("x", "map", "'PART 2: THE REAL TREASURE'"), me("dad what did you DO", { effect: "shake" })],
    ],
  },
  {
    id: "adventure-road-trip",
    title: "The road trip detour",
    hook: (v, k) => k.pick(["Our GPS sent us down a road that isn't on any map", "Road trip group chat: 'why does the GPS say 0 miles left'", "We took the detour. Best decision of our lives."]),
    outro: ["Would you take the detour?", "Tag your road trip crew."],
    vars: (k) => ({ a: k.name(), b: k.name(), town: k.pick(["Lantern Creek", "Hollow Pines", "Marrow Bend", "Sunbury"]), clock: "6:12", chatTitle: "road trip 🚗" }),
    cast: (v) => [{ id: "me", name: "You", voice: "af_sky" }, { id: "a", name: v.a, color: "#ffb02e", voice: "am_puck" }, { id: "b", name: v.b, color: "#4fa3ff", voice: "af_bella" }],
    beats: [
      { m: (v) => [say("a", "why does the GPS say 0 miles left. we're in a corn field"), say("b", "i told you not to take the detour")] },
      { m: (v) => [me(`there's a sign. '${v.town}, pop. 12'`), say("a", "12??")] },
      { tier: 1, m: () => [img("b", "house", "every house has the porch light on. it's 6pm"), me("that's either very welcoming or very creepy")] },
      { tier: 1, m: () => [say("a", "there's music coming from the town square"), say("b", "we are NOT going to the town square"), me("we're going to the town square")] },
      { m: () => [say("b", "ok everyone in this town is waving at us", { effect: "zoom" }), say("a", "they're waving like they've been waiting for us")] },
      { tier: 2, m: () => [me("someone just handed me a lantern and said 'you're just in time'"), say("b", "in time for WHAT")] },
      { tier: 3, m: () => [say("a", "they're setting up long tables. there's pie. so much pie"), me("ok i'm staying forever")] },
    ],
    pool: [
      () => [say("b", "the general store only sells lanterns and pie"), me("perfect store")],
      () => [say("a", "someone just asked if we're 'this year's travelers'"), say("b", "that sentence is so scary")],
      () => [me("there's a statue of a man holding a GPS in the town square"), say("a", "a hero")],
      () => [say("b", "my phone has no signal and also the clock stopped"), say("a", "mine says 6:12 too"), me("it's been 6:12 for an hour")],
      () => [say("a", "a dog just walked by wearing a tiny vest that says MAYOR"), me("respect")],
    ],
    keys: [1, 4],
    short: (v) => [say("a", "GPS says 0 miles left. we're in a corn field"), me(`sign says ${v.town}, pop. 12`), say("b", "everyone here is waving at us like they were waiting", { effect: "zoom" }), say("a", "they gave us pie and made us citizens"), me("population 15 now")],
    endings: [
      (v) => [say("b", "ok it's a festival. they do it once a year for whoever gets lost on the detour"), say("a", "they gave us pie, a map back to the highway, and honorary citizenship"), me(`we are citizens of ${v.town} now. population 15`)],
      (v) => [me("the lady with the pie said 'the last travelers stayed 40 years'"), say("a", "lol"), say("b", "she wasn't laughing"), sys("The lanterns all go out at once.", { effect: "darken" })],
    ],
  },
  {
    id: "adventure-escaped-dog",
    title: "Chasing my dog across the whole town",
    hook: (v, k) => k.pick([`${v.dog} escaped and I chased them across the whole town`, "My dog had a secret life. I followed it.", "Where does my dog go every day at 3 PM?"]),
    outro: ["Follow your dog.", "Tag a dog that would do this."],
    vars: (k) => ({ dog: k.pick(["Pickles", "Bandit", "Moose", "Lulu", "Ziggy"]), f: k.name(), clock: "3:04" }),
    cast: (v) => [{ id: "me", name: "You", voice: "af_sky" }, { id: "x", name: v.f, avatar: "dog", color: "#ffb02e", voice: "am_echo" }],
    beats: [
      { m: (v) => [me(`${v.dog} got out. i'm chasing them down main street`), x("i'm in the car. which way")] },
      { m: (v) => [me("past the bakery. they're not even running. they're WALKING. like they have somewhere to be")] },
      { tier: 1, m: (v) => [x(`the bakery guy just waved at ${v.dog}. like he knows them`), me("he gave them a croissant??")] },
      { tier: 1, m: () => [img("x", "map", "the route so far. this is a loop"), me("they do this every day. i've been at work. i didn't know")] },
      { m: (v) => [me(`${v.dog} just went into the old fire station`), x("on my way. don't go in alone", { effect: "zoom" })] },
      { tier: 2, m: () => [me("i'm going in alone"), x("of course you are")] },
      { tier: 3, m: () => [me("there's a guy in here. retired firefighter. he's sitting with like 6 dogs"), x("6??")] },
    ],
    pool: [
      (v) => [x(`the mail carrier just high fived ${v.dog}`), me("how does my dog have this many friends")],
      () => [me("they stopped to look both ways before crossing the street"), x("better than most people")],
      () => [x("the ice cream truck slowed down for them. like they're a regular")],
      (v) => [x(`a kid on a bike just said hi to ${v.dog} by NAME`), me("my dog is more popular than me")],
      () => [me("they stopped at the park and sat on the same bench as an old lady. she shared her sandwich"), x("this is a daily route. this is a whole life")],
    ],
    keys: [4],
    short: (v) => [me(`${v.dog} escaped. they're WALKING. like they have plans`), x("follow them!!"), me("they went into the old fire station"), me("there's a retired firefighter here with 6 dogs. they all visit him at 3"), x("i'm crying")],
    endings: [
      (v) => [me(`he says every dog in the neighborhood visits him at 3. ${v.dog} has been coming for a year`), me("he lost his own dog last spring. they keep him company"), x("i'm crying in the car"), me(`we're coming back tomorrow. ${v.dog} insisted`)],
      (v) => [me(`he says ${v.dog} isn't my dog`), me("he says i'm THEIR person. they picked me at the shelter on purpose", { effect: "zoom" }), x("ok that's the sweetest thing i've ever heard")],
    ],
  },
];
