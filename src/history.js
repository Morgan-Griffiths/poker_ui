import { actionDict,positionDict,streetDict,streetStart } from "./dataTypes";
import {getCards} from "./cards"

export function decodeHistory(gameData,hero,villain) {
    let gameHistory = [];
    const { history, mapping } = gameData;
    const hist = history[0];
    for (var i = 0; i < hist.length; i++) {
      let amount_to_call;
      let last_street_total;
      if (i > 0) {
        amount_to_call = hist[i - 1][mapping.amount_to_call];
        last_street_total = positionDict[hist[i-1][mapping.last_position]] == hist[i-1][mapping.player2_position] ? hist[i-1][mapping.player2_street_total]: hist[i-1][mapping.player1_street_total]
      } else {
        amount_to_call = hist[i][mapping.amount_to_call];
        last_street_total = positionDict[hist[i][mapping.last_position]] == hist[i][mapping.player2_position] ? hist[i][mapping.player2_street_total]: hist[i][mapping.player1_street_total]
      }
      if (positionDict[hist[i][mapping.last_position]] == 'dealer') {
        let displayString = `${streetDict[hist[i][mapping.street]].toUpperCase()}`
        let board = getCards((mapping.board).map(j => hist[i][j])).map(item => item.charAt(0)+item.charAt(1).toLowerCase())
        gameHistory.push(displayString);
        gameHistory.push(`${board}`)
      }
      let displayString = buildString(
        positionDict[hist[i][mapping.last_position]],
        actionDict[hist[i][mapping.last_action]],
        hist[i][mapping.last_aggressive_betsize],
        amount_to_call,
        last_street_total,
        hist[i][mapping.street],
        hist[i][mapping.blind],
        hero,
        villain
      );
      if (displayString != null) {
        gameHistory.push(displayString);
      }
    }
    return gameHistory
  }

export function outcomeStrings(outcome) {
    let hero_outcome_str;
    let villain_outcome_str;
    if (outcome.player1_reward > 0) {
        hero_outcome_str = 'wins'
      } else if (outcome.player1_reward < 0) {
        hero_outcome_str = 'loses'
      } else {
        hero_outcome_str = 'ties'
      }
    if (outcome.player2_reward > 0) {
        villain_outcome_str = 'wins'
      } else if (outcome.player2_reward < 0) {
        villain_outcome_str = 'loses'
      } else {
        villain_outcome_str = 'ties'
      }
    return [`Hero ${hero_outcome_str} ${outcome.player1_reward}`,`Villain ${villain_outcome_str} ${outcome.player2_reward}`];
  }

export function buildString(
    last_position,
    last_action,
    last_betsize,
    amount_to_call,
    last_street_total,
    street,
    blind,
    hero,
    villain
  ) {
    let displayString = null;
    if (last_position === "dealer") {
      if (!(hero.stack == 0 || villain.stack == 0)) {
        displayString = `${streetStart[street]} is first to act`;
      }
    } else if (last_action === "call") {
      displayString = `${last_position} calls ${amount_to_call}`;
    } else if (last_action === "fold") {
      displayString = `${last_position} folds`;
    } else if (last_action === "check") {
      displayString = `${last_position} checks`;
    } else if (last_action === "bet") {
      if (blind) {
        displayString = `${last_position} posts ${last_betsize}`;
      } else {
        displayString = `${last_position} bets ${last_betsize}`;
      }
    } else if (last_action === "raise") {
      if (blind) {
        displayString = `${last_position} posts ${last_betsize + last_street_total}`;
      } else {
        displayString = `${last_position} raises ${last_betsize} to ${last_betsize + last_street_total}`;
      }
    }
    return displayString;
  }