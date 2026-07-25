const ADJECTIVES = [
  'brave', 'calm', 'clever', 'cosmic', 'eager', 'gentle', 'jolly', 'lucky',
  'mellow', 'nimble', 'plucky', 'quiet', 'rapid', 'sunny', 'swift', 'witty',
];

const ANIMALS = [
  'otter', 'falcon', 'panda', 'lynx', 'heron', 'koala', 'fox', 'orca',
  'ibex', 'wren', 'moth', 'yak', 'newt', 'crane', 'seal', 'toad',
];

const ROOM_WORDS = [
  'harbor', 'meadow', 'summit', 'lagoon', 'canyon', 'aurora', 'ember',
  'willow', 'cobalt', 'zephyr', 'cedar', 'marble', 'quartz', 'nimbus',
];

function pick<T>(list: T[]): T {
  return list[Math.floor(Math.random() * list.length)];
}

export function randomName(): string {
  const a = pick(ADJECTIVES);
  return `${a.charAt(0).toUpperCase()}${a.slice(1)} ${pick(ANIMALS).replace(/^\w/, (c) => c.toUpperCase())}`;
}

export function randomRoom(): string {
  return `${pick(ROOM_WORDS)}-${pick(ROOM_WORDS)}-${Math.floor(100 + Math.random() * 900)}`;
}
