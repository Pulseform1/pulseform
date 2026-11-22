/* Word Scramble: target words by tier, as 'Category: word word ...'. Checked against a large English word-frequency
   list: none of these words has a common anagram, so a scramble can only ever spell its target. */
const SCRAMBLE = [
  // 4 to 5 letters
  ['Animal: frog duck fish moth camel sheep panda koala eagle mouse tiger whale squid',
   'Food: pizza apple honey salad juice rice milk cake candy',
   'Home: chair clock couch towel fork sofa desk',
   'Body: hand foot mouth thumb ankle neck tooth brain',
   'Nature: river plant grass beach storm',
   'Music: drum piano flute song band',
   'Transport: train truck bike taxi'],
  // 6 to 7 letters
  ['Animal: rabbit turtle monkey donkey giraffe penguin dolphin octopus hamster ostrich gorilla buffalo',
   'Food: cheese carrot tomato banana cookie muffin noodle pickle potato waffle pancake popcorn pumpkin',
   'Nature: island canyon meadow valley glacier volcano rainbow thunder',
   'Home: pillow mirror carpet blanket curtain',
   'Job: doctor dentist plumber',
   'Music: guitar violin trumpet',
   'Transport: rocket bicycle scooter tractor',
   'School: pencil crayon'],
  // 8 to 10 letters
  ['Animal: elephant kangaroo crocodile butterfly flamingo porcupine squirrel hedgehog jellyfish alligator scorpion tortoise',
   'Food: sandwich broccoli pineapple spaghetti blueberry chocolate cucumber strawberry watermelon',
   'Nature: mountain waterfall hurricane avalanche lightning earthquake',
   'Science: telescope skeleton astronaut dinosaur satellite microscope',
   'Transport: helicopter submarine motorcycle',
   'Music: saxophone xylophone trombone clarinet harmonica',
   'Home: umbrella backpack calendar',
   'Sports: baseball basketball skateboard volleyball marathon']
].map(t => t.flatMap(line => { const [cat, ws] = line.split(': '); return ws.split(' ').map(w => [w, cat]); }));
