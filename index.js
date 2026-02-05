// Constants
const UPLEFT = 0;
const UP = 1;
const UPRIGHT = 2;
const RIGHT = 3;
const DOWNRIGHT = 4;
const DOWN = 5;
const DOWNLEFT = 6;
const LEFT = 7;

const DIRECTIONS = [UPLEFT, UP, UPRIGHT, RIGHT, DOWNRIGHT, DOWN, DOWNLEFT, LEFT];

const MAX_LENGTH = 10;

const englishWords = new Set();
const validWordsOnly = new Set();
const valids = new Set();
const wordStarts = new Set();

// Classes
class Letter {
  constructor(ch, index, visit = False) {
    this.char = ch;
    this.pos = index;
    this.visited = visit;
  }

  copyLetter() {
    return new Letter(this.char, this.pos, this.visited)
  }

  markVisited() {
    this.visited = True
  }
}

class Board {
  constructor(lettersArr) {
    this.lb = lettersArr;
  }

  copyBoard() {
    const newArr = [];
    for (let i = 0; i < this.lb.length; i++) {
      newArr.push(this.lb[i].copyLetter());
    }
    return new Board(newArr);
  }

  peekUpperLeft(pos) {
    if (pos % 4 === 0 || pos <= 3) {
      return -1;
    }
    return this.lb[pos - 5];
  }

  peekUp(pos) {
    if (pos <= 3) {
      return -1;
    }
    return this.lb[pos - 4];
  }

  peekUpperRight(pos) {
    if (pos <= 3 || pos % 4 === 3) {
      return -1;
    }
    return this.lb[pos - 3];
  }

  peekRight(pos) {
    if (pos % 4 === 3) {
      return -1;
    }
    return this.lb[pos + 1];
  }

  peekLowerRight(pos) {
    if (pos >= 12 || pos % 4 === 3) {
      return -1;
    }
    return this.lb[pos + 5];
  }

  peekDown(pos) {
    if (pos >= 12) {
      return -1;
    }
    return this.lb[pos + 4];
  }

  peekLowerLeft(pos) {
    if (pos % 4 === 0 || pos >= 12) {
      return -1;
    }
    return this.lb[pos + 3];
  }

  peekLeft(pos) {
    if (pos % 4 === 0) {
      return -1;
    }
    return this.lb[pos - 1];
  }

  visitDirection(pos, dir) {
    const directionDict = {
      0: this.peekUpperLeft.bind(this),
      1: this.peekUp.bind(this),
      2: this.peekUpperRight.bind(this),
      3: this.peekRight.bind(this),
      4: this.peekLowerRight.bind(this),
      5: this.peekDown.bind(this),
      6: this.peekLowerLeft.bind(this),
      7: this.peekLeft.bind(this)
    };

    const visitedLetter = directionDict[dir](pos);
    if (visitedLetter === -1 || visitedLetter.visited) {
      return -1;
    }
    visitedLetter.markVisited();
    return visitedLetter;
  }
}

// Main
document.addEventListener('DOMContentLoaded', function() {
  fetch('words.txt')
  .then(function(response) {
      return response.text();
    })
  .then(function(words) {
      words.split("\n").forEach(word => {
        const strippedWord = word.trim();
        if (strippedWord.length > MAX_LENGTH) {
          return ;
        }
        englishWords.add(strippedWord);
        for (let i = 3; i <= strippedWord.length; i++) {
          wordStarts.add(strippedWord.substring(0, i));
        }
      })
      console.log(englishWords);
    })
})

document.getElementById("submit").onclick = function() {
  layout = "BOARD";

  inputLetters = [];

  let letters = document.getElementById("letters").value;
  letters = letters.toLowerCase();
  
  if (layout == "BOARD") {
    if (letters.length != 16) {
      throw new Error("Not 16 Letters")
    } else {
      for (let i = 0; i < 16; i++) {
        inputLetters.append(letters[i]);
      }
      lettersObjs = [];
      for (let i = 0; i < 16; i++) {
        lettersObjs.append(Letter(inputLetters[i]), i);
      }
      let board = Board(lettersObjs)
    }
  }

  findValidWords(board)

}

function findValidWords(board) {
  board.lb.forEach(letter => {
    letter.markVisited();

    findValidFrom(board, letter.char, letter, 1, letter.pos);

    letter.visited = false;
  });
}

function findValidFrom(board, word, letter, length, pos) {
  if (length >= 3 && !wordStarts.has(word)) {
    return ;
  }
  if (englishWords.has(word) && !validWordsOnly.has(word)) {
    validWordsOnly.add(word);
    const tup = (pos, word)
    valids.add(tup)
  }
  if (length >= MAX_LENGTH) {
    return ;
  }
  for (let dir of DIRECTIONS) {
    const copyBoard = board.copyBoard();
    const neighborLetter = copyBoard.visitDirection(letter.pos, dir);
    if (neighborLetter !== -1) {
      findValidFrom(copyBoard, word + neighborLetter.char, neighborLetter, length + 1, pos)
    }
  }
}
