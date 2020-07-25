const cards = [
  "2C",
  "2D",
  "2H",
  "2S",
  "3C",
  "3D",
  "3H",
  "3S",
  "4C",
  "4D",
  "4H",
  "4S",
  "5C",
  "5D",
  "5H",
  "5S",
  "6C",
  "6D",
  "6H",
  "6S",
  "7C",
  "7D",
  "7H",
  "7S",
  "8C",
  "8D",
  "8H",
  "8S",
  "9C",
  "9D",
  "9H",
  "9S",
  "10C",
  "10D",
  "10H",
  "10S",
  "JC",
  "JD",
  "JH",
  "JS",
  "QC",
  "QD",
  "QH",
  "QS",
  "KC",
  "KD",
  "KH",
  "KS",
  "AC",
  "AD",
  "AH",
  "AS",
];

export function getCards(array) {
  return array.reduce((carry, value, index) => {
    let rank;
    let suit;
    if ((index + 1) % 2 !== 0) {
      rank = value;
      if (rank != 0) {
        suit = array[index + 1];
        let cardIndex = (rank - 2) * 4 + suit;
        carry.push(cards[cardIndex]);
      }
    }
    return carry;
  }, []);
}
