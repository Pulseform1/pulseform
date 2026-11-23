import { say, img, sys } from "../generator.js";

const me = (t, o) => say("me", t, o);
const x = (t, o) => say("x", t, o);

export default [
  {
    id: "twist-wrong-number-proposal",
    title: "A wrong number asked me for proposal advice",
    hook: (v, k) => k.pick(["A wrong number asked me to help plan their proposal", "I helped a total stranger plan a proposal", "Wait. That's my sister."]),
    outro: ["Small world.", "Didn't see that coming."],
    vars: (k) => ({ snack: k.pick(["sour mango gummies", "spicy chips", "lemon cookies", "gas station sushi"]), clock: "3:22" }),
    cast: () => [{ id: "me", name: "You", voice: "af_sky" }, { id: "x", name: "Unknown", avatar: "unknown", color: "#4a4f66", voice: "am_michael" }],
    beats: [
      { m: () => [x("hi! is this Bloom & Co? i need 300 red roses by saturday"), me("wrong number sorry")] },
      { m: () => [x("oh no. sorry. i'm panicking. i'm proposing saturday"), me("aw. good luck!!")] },
      { tier: 1, m: () => [x("one question, stranger. is a rooftop too much"), me("depends. does your person like heights"), x("they love sunsets. they hate heights"), me("so... no rooftop")] },
      { tier: 1, m: (v) => [x("picnic?"), me("picnic is perfect. bring their favorite snack"), x(`${v.snack}. they're obsessed`)] },
      { tier: 2, m: () => [me("lol my sister is obsessed with those too"), x("small world haha")] },
      { tier: 2, m: () => [x("last thing. ring. classic or weird"), me("weird. definitely weird"), img("x", "ring", "this one?"), me("ok that's beautiful. they're going to cry")] },
      { tier: 3, m: () => [x("you've helped more than my actual friends"), me("send me how it goes!!")] },
      { m: () => [sys("Saturday"), x("THEY SAID YES", { effect: "flash" }), img("x", "selfie", "")] },
    ],
    pool: [
      () => [x("should i ask the parents first"), me("ask the person first. the parents second. the dog third")],
      () => [x("do you think they'll say yes"), me("i've never met them. but you seem nice. so yes")],
      () => [x("the florist finally called me back. 300 roses is apparently 'a lot'"), me("it is a lot")],
      () => [x("should i write a speech or just wing it"), me("write it. then wing it anyway"), x("that's the best advice i've ever gotten")],
      () => [x("they always say they hate surprises"), me("everyone says that. nobody means it")],
    ],
    keys: [1, 7],
    short: (v) => [x("is this the florist? i'm proposing saturday"), me("wrong number. but good luck!!"), sys("Saturday"), img("x", "selfie", "SHE SAID YES"), me("wait. that's my sister.", { effect: "zoom" })],
    endings: [
      () => [me("WAIT"), me("that's my sister.", { effect: "zoom" }), x("..."), x("are you the sibling who 'never answers unknown numbers'"), me("apparently i do now")],
      () => [me("congrats!!"), x("btw i never had the wrong number"), x("your sister said you're the only one who can keep a secret. so you're our best person", { effect: "zoom" })],
    ],
  },
  {
    id: "twist-roommate-guest",
    title: "My roommate said don't come home",
    hook: (v, k) => k.pick(["My roommate texted 'don't come home before 6'", "'There's someone in your room. Don't be mad.'", "I thought my roommate was hiding a person"]),
    outro: ["Best roommate ever.", "Didn't see that coming."],
    vars: (k) => ({ rm: k.name(), clock: "4:58" }),
    cast: (v) => [{ id: "me", name: "You", voice: "af_sky" }, { id: "x", name: v.rm, avatar: "smile", color: "#5ad96b", voice: "am_puck" }],
    beats: [
      { m: () => [x("hey don't come home before 6. please"), me("why")] },
      { m: () => [x("there's someone here"), me("a date??"), x("not a date. don't be mad")] },
      { tier: 1, m: () => [me("why would i be mad"), x("they're in your room"), me("WHY ARE THEY IN MY ROOM")] },
      { tier: 1, m: () => [x("they wouldn't come out of your room. they like your bed"), me("i'm calling the police"), x("NO no no no")] },
      { tier: 2, m: () => [me("is it a person"), x("define person"), me("i'm coming home"), x("5 more minutes please")] },
      { tier: 2, m: () => [x("they chewed your charger"), me("WHAT"), x("i'll buy you a new one. 2 new ones")] },
      { tier: 3, m: () => [me("i'm outside the door"), x("ok. close your eyes. walk in slowly")] },
      { m: () => [sys("You open the door.", { pause: 0.5 })] },
    ],
    pool: [
      () => [me("is the someone tall"), x("very short. very short and very confused")],
      () => [x("they ate your sock"), me("WHICH SOCK"), x("does it matter")],
      () => [me("do i need to bring anything"), x("paper towels. a lot of paper towels")],
      () => [x("do you have a name you've always liked. like for a... thing"), me("what kind of question is that")],
      () => [x("also they peed on the rug. a little. not a lot")],
    ],
    keys: [1, 7],
    short: () => [x("don't come home before 6"), me("why"), x("someone's in your room. don't be mad"), sys("You open the door.", { pause: 0.4 }), img("x", "dog", "SURPRISE. happy birthday")],
    endings: [
      () => [img("x", "dog", "SURPRISE. happy birthday. his name is whatever you want"), me("I'M CRYING"), x("he's 9 weeks old and he already loves your bed more than you"), me("his name is Charger. in honor of my charger")],
      () => [img("x", "cat", "happy birthday!! she found me at the shelter"), me("you got me a CAT"), x("technically she chose you. she wouldn't leave your bed for 3 hours")],
    ],
  },
  {
    id: "twist-bike-detective",
    title: "The neighborhood detective",
    hook: (v, k) => k.pick(["Someone stole my bike. A 'detective' texted me.", "The neighborhood watch solved my case in 20 minutes", "I finally met the detective who found my bike"]),
    outro: ["Respect the detective.", "Didn't see that coming."],
    vars: (k) => ({ color: k.pick(["teal", "red", "yellow", "silver"]), kid: k.name(), clock: "5:31" }),
    cast: () => [{ id: "me", name: "You", voice: "af_sky" }, { id: "x", name: "Maple St. Watch", avatar: "eye", color: "#2fb7a8", voice: "am_echo" }],
    beats: [
      { m: () => [x("Neighborhood Watch here. You reported a stolen bike?"), me("yes!! from outside my building this morning")] },
      { m: (v) => [x(`${v.color} frame, white seat, sticker on the bell?`), me("how do you know about the sticker")] },
      { tier: 1, m: () => [x("We have eyes everywhere."), me("that's either really cool or really scary")] },
      { tier: 1, m: () => [img("x", "footprints", "Tire tracks. Mud from the creek path."), me("you're actually investigating this")] },
      { tier: 2, m: () => [x("Suspect was seen at the corner store. Bought 4 popsicles."), me("4??"), x("Big appetite. Or accomplices.")] },
      { tier: 2, m: () => [x("Head to the creek bridge. Come alone."), me("is this safe"), x("Very. Bring a snack. For the detective.")] },
      { m: () => [me("ok i'm at the bridge. my bike is here!! and a kid on a scooter?")] },
    ],
    pool: [
      () => [x("Unrelated: your recycling bin is in the wrong spot. The Watch sees everything.")],
      () => [me("how did you get my number"), x("You posted it on 3 telephone poles."), me("...right")],
      () => [x("Suspect has been sighted riding with no hands. Show-off.")],
      () => [x("We interviewed a witness. The witness is a dog. He was not helpful."), me("lmao")],
      () => [x("Case update: the suspect stopped to pet every cat on Elm St."), me("so the thief has a soft side")],
    ],
    keys: [0, 6],
    short: (v) => [x("Maple St. Watch here. Found your bike."), me("you're a neighborhood watch??"), x("Head to the creek bridge."), me("my bike is here. and a kid on a scooter"), x(`That's me. Detective ${v.kid}, age 9. My fee is one popsicle.`)],
    endings: [
      (v) => [x("That's me. I'm the Watch."), x(`Detective ${v.kid}, age 9. I saw the thief, took your bike back, and charged them 4 popsicles.`), me("i owe you so much"), x("My fee is one popsicle. And a 5-star review.")],
      (v) => [x("The kid is the detective. The thief was your little brother."), x("He wanted to fix it for your birthday. The bell sticker was his idea."), me("WAIT", { effect: "zoom" })],
    ],
  },
];
