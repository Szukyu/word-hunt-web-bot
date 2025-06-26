// Constants
export const UPLEFT = 0;
export const UP = 1;
export const UPRIGHT = 2;
export const RIGHT = 3;
export const DOWNRIGHT = 4;
export const DOWN = 5;
export const DOWNLEFT = 6;
export const LEFT = 7;

export const DIRECTIONS = [UPLEFT, UP, UPRIGHT, RIGHT, DOWNRIGHT, DOWN, DOWNLEFT, LEFT];

export const MAX_LENGTH = 10;

// Letter Class
export class Letter {
  constructor(ch, index, visit = false) {
    this.char = ch;
    this.pos = index;
    this.visited = visit;
  }

  copyLetter() {
    return new Letter(this.char, this.pos, this.visited);
  }

  markVisited() {
    this.visited = true;
  }
}

// 4 X 4 Board Class
export class Board {
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
      [UPLEFT]: this.peekUpperLeft.bind(this),
      [UP]: this.peekUp.bind(this),
      [UPRIGHT]: this.peekUpperRight.bind(this),
      [RIGHT]: this.peekRight.bind(this),
      [DOWNRIGHT]: this.peekLowerRight.bind(this),
      [DOWN]: this.peekDown.bind(this),
      [DOWNLEFT]: this.peekLowerLeft.bind(this),
      [LEFT]: this.peekLeft.bind(this)
    };

    const visitedLetter = directionDict[dir](pos);
    if (visitedLetter === -1 || visitedLetter.visited) {
      return -1;
    }
    visitedLetter.markVisited();
    return visitedLetter;
  }
}

// 5 x 5 Board Class
export class Boarder {
  constructor(lettersArr) {
    this.lb = lettersArr;
  }

  copyBoard() {
    const newArr = []
    for (let i = 0; i < this.lb.length; i++) {
      newArr.push(this.lb[i].copyLetter());
    }
    return new Boarder(newArr);
  }

  peekUpperLeft(pos) {
    if (pos % 5 === 0 || pos < 5) {
      return -1;
    }
    return this.lb[pos - 6];
  }

  peekUp(pos) {
    if (pos < 5) {
      return -1;
    }
    return this.lb[pos - 5];
  }

  peekUpperRight(pos) {
    if (pos < 5 || pos % 5 === 4) {
      return -1;
    }
    return this.lb[pos - 4];
  }

  peekRight(pos) {
    if (pos % 5 === 4) {
      return -1;
    }
    return this.lb[pos + 1];
  }

  peekLowerRight(pos) {
    if (pos >= 20 || pos % 5 === 4) {
      return -1;
    }
    return this.lb[pos + 6];
  }

  peekDown(pos) {
    if (pos >= 20) {
      return -1;
    }
    return this.lb[pos + 5];
  }

  peekLowerLeft(pos) {
    if (pos % 5 === 0 || pos >= 20) {
      return -1;
    }
    return this.lb[pos + 4];
  }

  peekLeft(pos) {
    if (pos % 5 === 0) {
      return -1;
    }
    return this.lb[pos - 1];
  }

  visitDirection(pos, dir) {
    const directionDict = {
      [UPLEFT]: this.peekUpperLeft.bind(this),
      [UP]: this.peekUp.bind(this),
      [UPRIGHT]: this.peekUpperRight.bind(this),
      [RIGHT]: this.peekRight.bind(this),
      [DOWNRIGHT]: this.peekLowerRight.bind(this),
      [DOWN]: this.peekDown.bind(this),
      [DOWNLEFT]: this.peekLowerLeft.bind(this),
      [LEFT]: this.peekLeft.bind(this)
    };

    const visitedLetter = directionDict[dir](pos);
    if (visitedLetter === -1 || visitedLetter.visited) {
      return -1;
    }
    visitedLetter.markVisited();
    return visitedLetter;
  }
}

// Donut Board Class
export class Donut {
  constructor(lettersArr) {
    this.lb = lettersArr;
  }

  copyBoard() {
    const newArr = []
    for (let i = 0; i < this.lb.length; i++) {
      newArr.push(this.lb[i].copyLetter());
    }
    return new Donut(newArr);
  }

  peekUpperLeft(pos) {
    if (pos <= 4 || pos === 8 || pos === 12 || pos === 15) {
      return -1;
    } else if (pos === 9 || pos === 16) {
      return this.lb[pos - 6];
    } else {
      return this.lb[pos - 5];
    }
  }

  peekUp(pos) {
    if (pos <= 3 || pos % 7 === 0) {
      return -1;
    } else if (pos === 8 || pos === 9 || pos === 15 || pos === 16) {
      return this.lb[pos - 5];
    } else {
      return this.lb[pos - 4];
    }
  }

  peekUpperRight(pos) {
    if (pos < 3 || pos === 6 || pos === 7 || pos === 11 || pos === 13 || pos === 16) {
      return -1;
    } else if (pos === 8 || pos === 9 || pos === 14 || pos === 15) {
      return this.lb[pos - 4];
    } else {
      return this.lb[pos - 3];
    }
  }

  peekRight(pos) {
    if (pos === 2 || pos === 7 || pos === 9 || pos === 11 || pos === 16 || pos === 19) {
      return -1;
    } else {
      return this.lb[pos + 1];
    }
  }

  peekLowerRight(pos) {
    if (pos === 4 || pos === 7 || pos === 11 || pos >= 15) {
      return -1;
    } else if (pos === 3 || pos === 10) {
      return this.lb[pos + 6];
    } else {
      return this.lb[pos + 5];
    }
  }

  peekDown(pos) {
    if (pos === 5 || pos === 12 || pos >= 16) {
      return -1;
    } else if (pos === 3 || pos === 4 || pos === 10 || pos === 11) {
      return this.lb[pos + 5];
    } else {
      return this.lb[pos + 4];
    }
  }

  peekLowerLeft(pos) {
    if (pos === 3 || pos === 8 || pos === 13 || pos >= 17 || pos % 6 === 0) {
      return -1;
    } else if (pos === 4 || pos === 5 || pos === 10 || pos === 11) {
      return this.lb[pos + 4];
    } else {
      return this.lb[pos + 3];
    }
  }

  peekLeft(pos) {
    if (pos === 0 || pos === 3 || pos === 8 || pos === 10 || pos === 12 || pos === 17) {
      return -1;
    } else {
      return this.lb[pos - 1];
    }
  }

  visitDirection(pos, dir) {
    const directionDict = {
      [UPLEFT]: this.peekUpperLeft.bind(this),
      [UP]: this.peekUp.bind(this),
      [UPRIGHT]: this.peekUpperRight.bind(this),
      [RIGHT]: this.peekRight.bind(this),
      [DOWNRIGHT]: this.peekLowerRight.bind(this),
      [DOWN]: this.peekDown.bind(this),
      [DOWNLEFT]: this.peekLowerLeft.bind(this),
      [LEFT]: this.peekLeft.bind(this)
    };

    const visitedLetter = directionDict[dir](pos);
    if (visitedLetter === -1 || visitedLetter.visited) {
      return -1;
    }
    visitedLetter.markVisited();
    return visitedLetter;
  }
}
