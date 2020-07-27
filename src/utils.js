
export function onlyUnique(value, index, self) { 
    if (value > 0) {
      return self.indexOf(value) === index;
    }
  }

export function linespace(startValue, stopValue, cardinality) {
    var arr = [];
    var step = (stopValue - startValue) / (cardinality - 1);
    for (var i = 0; i < cardinality; i++) {
      arr.push(startValue + (step * i));
    }
    return arr;
  }