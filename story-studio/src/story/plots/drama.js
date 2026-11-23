import { say, img, sys } from "../generator.js";

const me = (t, o) => say("me", t, o);
const x = (t, o) => say("x", t, o);

export default [
  {
    id: "drama-playlist",
    title: "My best friend's secret playlist",
    hook: (v, k) => k.pick([`Why does my best friend have a playlist named after my partner?`, "I found my best friend's secret playlist", "47 songs. Made 3 months ago. Named after my partner."]),
    outro: ["What would you do?", "Would you believe them?"],
    vars: (k) => ({ f: k.name(), p: k.name(), clock: "10:16" }),
    cast: (v) => [{ id: "me", name: "You", voice: "af_sky" }, { id: "x", name: v.f, avatar: "star", color: "#ff5c8a", voice: "af_bella" }],
    beats: [
      { m: (v) => [me(`why do you have a playlist called "${v.p} 🤍"`), x("what"), x("where did you see that")] },
      { m: () => [me("it popped up on the speaker. 47 songs. made three months ago"), x("it's not what it looks like")] },
      { tier: 1, m: () => [me("that's what people say when it's exactly what it looks like"), x("can we please talk in person")] },
      { tier: 1, m: () => [me("no. explain now"), x("i can't do this over text"), me("you were at my place EVERY weekend")] },
      { tier: 2, m: () => [me("i saw you two at the mall last friday. i didn't say anything"), x("you SAW that??"), me("so it's true")] },
      { tier: 2, m: () => [me("i told you everything about us. everything"), x("i know. that's why i needed your help without you knowing")] },
      { tier: 3, m: (v) => [me("help with WHAT"), x(`${v.p} wanted it to be a surprise`), x("i can't believe i'm doing this over text")] },
      { m: (v) => [x(`the playlist is every song from your first year together. ${v.p} asked me to help pick them`), x("we were at the mall looking at rings.", { effect: "zoom", pause: 0.4 })] },
    ],
    pool: [
      () => [x("you remember the song from the gas station at 2am? it's track one"), me("don't make me cry while i'm mad at you")],
      () => [me("you told me you were at the dentist on friday"), x("i was at the jeweler. it's basically a dentist for rings")],
      (v) => [me(`does ${v.p} know i saw the playlist`), x("no and they will NEVER know")],
      () => [me("you've been weird for weeks. you stopped sending me memes"), x("because every meme reminded me of the secret")],
      () => [me("you hid your phone screen at dinner. TWICE"), x("i was texting the jeweler!!")],
    ],
    keys: [1, 7],
    short: (v) => [me(`why do you have a playlist named after ${v.p}`), x("it's not what it looks like"), me("it's exactly what it looks like"), x(`${v.p} asked me to help. it's every song from your first year. we were looking at rings.`, { effect: "zoom" }), me("rings??")],
    endings: [
      () => [me("rings."), me("RINGS??"), x("act surprised on saturday or i'm dead"), me("i'm crying. i'm sorry i yelled"), x("make it up to me. i get a speech at the wedding")],
      (v) => [me("so you were helping"), x("yeah."), x(`and somewhere in all of it i fell for ${v.p}. i'm sorry. you deserved to hear it from me before saturday`, { effect: "heartbeat" })],
    ],
  },
  {
    id: "drama-sister-dress",
    title: "My sister ruined my dress",
    hook: (v, k) => k.pick(["My sister borrowed my dress. Again.", "We were fighting about a dress. Then she told me the truth.", "I didn't know my sister was paying my rent"]),
    outro: ["Hug your sister.", "Would you forgive her?"],
    vars: (k) => ({ s: k.name(), clock: "6:48" }),
    cast: (v) => [{ id: "me", name: "You", voice: "af_sky" }, { id: "x", name: v.s, avatar: "flower", color: "#c95cff", voice: "af_heart" }],
    beats: [
      { m: () => [me("did you take my green dress"), x("borrowed"), me("without asking. AGAIN")] },
      { m: () => [x("you weren't even using it"), me("i was using it saturday. for the interview dinner")] },
      { tier: 1, m: () => [x("ok... about that"), img("x", "photo-blur", "there was a tiny incident"), me("is that WINE"), x("it's mostly grape juice")] },
      { tier: 1, m: () => [me("that dress was $180. i saved for two months"), x("i know"), me("no you don't. you never have to save for anything")] },
      { tier: 2, m: () => [x("wow"), x("you really think everything is easy for me"), me("mom pays your phone, your car, your everything")] },
      { m: () => [x("mom stopped paying for my stuff in january."), me("since when")] },
      { m: () => [x("since i started paying YOUR rent.", { effect: "zoom", pause: 0.4 }), me("what are you talking about. i pay my rent")] },
      { tier: 2, m: () => [x("your landlord raised it in december. you never noticed because i've been covering the difference"), x("i didn't want you to quit the internship")] },
    ],
    pool: [
      () => [x("you remember when you sold your bike to fix my phone"), me("that was years ago"), x("i didn't forget")],
      () => [me("i got the internship offer extended btw"), x("i know. that's why i didn't want you to quit")],
      () => [me("does mom know"), x("mom thinks i'm bad with money. let her")],
      () => [me("you always do this. you take things and act like it's nothing"), x("i took a dress. you took mom's whole attention for 22 years but ok")],
      () => [x("remember when you drove 3 hours to get me when my car died"), me("yeah"), x("so let me do something for once")],
    ],
    keys: [5, 6],
    short: (v) => [me("you ruined my $180 dress"), x("i'll pay for it"), me("with what. mom's money?"), x("mom stopped paying for me in january. i've been paying YOUR rent since december.", { effect: "zoom" }), me("...what")],
    endings: [
      () => [me("why didn't you tell me"), x("because you'd never accept it. you're stubborn. like dad"), me("i'm so sorry about the dress thing"), x("already bought you a new one. it's on your bed. it's green")],
      () => [me("i'm paying you back. every cent"), x("ok. start with $180"), me("lmao fair"), x("and you're coming to my birthday dinner. wear something nice. NOT green")],
    ],
  },
  {
    id: "drama-confessions",
    title: "Someone posted my secret",
    hook: (v, k) => k.pick(["Someone posted my secret on the confessions page", "I only told ONE person. Then it was online.", "I accused my best friend. I was wrong."]),
    outro: ["Real friends do this.", "Would you forgive them?"],
    vars: (k) => ({ f: k.name(), poster: k.name(), clock: "8:20" }),
    cast: (v) => [{ id: "me", name: "You", voice: "af_sky" }, { id: "x", name: v.f, avatar: "smile", color: "#4fa3ff", voice: "am_echo" }],
    beats: [
      { m: () => [me("did you post my secret on the confessions page"), x("what secret"), me("the one i told ONLY YOU")] },
      { m: () => [img("me", "phone-screen", '"someone in junior class failed out of honors and is lying to their parents"'), x("that could be anyone")] },
      { tier: 1, m: () => [me("there are 4 honors kids in our class. and i told you the details on friday"), x("i didn't post it")] },
      { tier: 1, m: () => [me("then who did"), x("why would i ever do that to you")] },
      { tier: 2, m: () => [me("everyone is staring at me in the hallway. my mom saw it"), x("i'm so sorry"), me("sorry means you did it")] },
      { m: () => [x("i didn't. but i know who did."), me("who"), x("give me one hour.")] },
      { m: () => [sys("1 hour later"), x("check the page now")] },
    ],
    pool: [
      () => [me("my mom wants to talk tonight"), x("then talk to her tonight. the truth is better than the rumor")],
      () => [x("people are already forgetting. tomorrow it'll be someone else's drama"), me("that's grim but true")],
      () => [me("the honors teacher emailed me"), x("what did they say"), me("'my door is open'. i'm scared")],
      () => [me("you're the only person i trust and you're the only person who knew"), x("i know how it looks")],
      () => [x("did you tell anyone at lunch on friday"), me("no. i told YOU at lunch on friday"), x("at lunch. in the cafeteria. ok. hold on")],
    ],
    keys: [1, 5],
    short: (v) => [me("you posted my secret on the confessions page"), x("i didn't. give me one hour"), sys("1 hour later"), img("me", "phone-screen", '"The honors post was about ME." - posted by your friend'), me("you took the blame for me??")],
    endings: [
      (v) => [img("me", "phone-screen", '"The honors post was about ME. I lied to my parents, not anyone else."'), me("you posted a fake confession... saying it was YOU??"), x("now nobody's looking at you"), me("but now they're looking at you"), x("i can handle it. you couldn't. that's what friends do", { effect: "zoom" })],
      (v) => [img("me", "phone-screen", `"I posted the honors thing. It wasn't mine to share. I'm sorry. - ${v.poster}"`), me(`${v.poster}?? from chem?`), x(`${v.poster} sat behind us at lunch and heard everything. i made them take it down`), me("i'm so sorry i blamed you"), x("make it up to me. tell your parents tonight. i'll come with you")],
    ],
  },
];
