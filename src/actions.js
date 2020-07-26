import { onlyUnique } from "./utils.js";
import { actionDict } from "./dataTypes";

export function getAvailActions(mask) {
    return mask.reduce((carry, value, index) => {
        if (value === 1) {
            carry.push(actionDict[index]);
        }
        return carry;
    }, []);
}

export function getAvailBetsizes(betsize_mask, betsizes, last_action, hero, villain, pot) {
    // Takes boolean mask array, and betsizes array of nums between 0 and 1.
    // Returns new array of allowable betsizes or raise sizes.
    console.log(betsize_mask, betsizes, last_action, hero, villain, pot)
    let availBetsizes = new Array(betsize_mask.length);
    if (last_action == 3 || last_action == 4) {
      for (var i = 0; i < betsize_mask.length; i++) {
        let max_raise = Math.min((2 * villain.streetTotal) + (pot - hero.streetTotal),(hero.stack + hero.streetTotal))
        let previous_bet = Math.max(villain.streetTotal - hero.streetTotal,1)
        let min_raise = Math.min(Math.max((previous_bet * 2),1),hero.stack)
        let betsize_value = (betsizes[i] * max_raise)
        let betsize = Math.min(Math.max(min_raise,betsize_value),hero.stack)
        availBetsizes[i] = betsize * betsize_mask[i]
        console.log('previous_bet',previous_bet)
        console.log('betsize',betsize)
        console.log('min_raise',min_raise)
      }
    } else {
      for (var i = 0; i < betsize_mask.length; i++) {
        availBetsizes[i] = Math.min(Math.max(betsize_mask[i] * betsizes[i] * pot,1),hero.stack);
      }
    }
    availBetsizes = availBetsizes.filter( onlyUnique )
    return availBetsizes;
  }