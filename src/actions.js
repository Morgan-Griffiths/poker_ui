import { onlyUnique, linespace } from "./utils.js";
import { actionIndex, Action } from "./dataTypes";

export function getAvailActions(mask) {
    return mask.reduce((carry, value, index) => {
        if (value === 1) {
            carry.push(actionIndex[index]);
        } 
        return carry;
    }, []);
}

export function getAvailBetsizes(betsize_mask, betsizes, last_action, hero, villain, pot) {
    // Takes boolean mask array, and betsizes array of nums between 0 and 1.
    // Returns new array of allowable betsizes or raise sizes.
    let availBetsizes = new Array(betsize_mask.length);
    if (last_action == Action.bet || last_action == Action.raise || last_action == Action.call) {
      let max_raise = Math.min((2 * villain.streetTotal) + pot - hero.streetTotal,hero.stack + hero.streetTotal)
      let previous_bet = Math.min(Math.max(villain.streetTotal - hero.streetTotal,1),hero.stack + hero.streetTotal)
      let min_raise = previous_bet * 2
      let possible_sizes = linespace(min_raise,max_raise,betsize_mask.length)
        for (var i = 0; i < betsize_mask.length; i++) {
          availBetsizes[i] = possible_sizes[i] * betsize_mask[i]
        }
    } else {
      for (var i = 0; i < betsize_mask.length; i++) {
        availBetsizes[i] = Math.min(Math.max(betsize_mask[i] * betsizes[i] * pot,1),hero.stack);
      }
    }
    availBetsizes = availBetsizes.filter( onlyUnique )
    return availBetsizes.sort((a, b) => a - b);;
  }