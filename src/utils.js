
export function onlyUnique(value, index, self) { 
    if (value > 0) {
      return self.indexOf(value) === index;
    }
  }