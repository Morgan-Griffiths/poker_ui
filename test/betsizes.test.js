import app from '../src/App.svelte'
import { getAvailBetsizes } from '../src/actions'
import '@testing-library/jest-dom/extend-expect'
import { render, fireEvent, act } from '@testing-library/svelte'
import { writable, get } from "svelte/store";
import userEvent from '@testing-library/user-event'
import html from "svelte-htm";

var ACTION_MASKS = {
  call:[1,0,0,0,1],
  bet:[0,1,1,0,1],
  raise:[0,1,1,0,1],
  check:[1,0,0,1,0],
}

test('BBraiseVsSbCall', () => {
  let hero = {
    hand: [],
    stack: 1,
    dealer: false,
    position: 1,
    streetTotal: 1
  };
  let villain = {
    hand: [],
    stack: 1,
    dealer: true,
    position: 0,
    streetTotal: 1
  };
  let pot = 2
  let betsize_mask = [1,0]
  let betsizes = [0.5,1]
  let last_action = 2
  let betsize = getAvailBetsizes(betsize_mask,betsizes,last_action,hero,villain,pot)
  expect(betsize).not.toBeNaN();
  expect(betsize).toEqual([2]);
  hero = {
    hand: [],
    stack: 2,
    dealer: false,
    position: 1,
    streetTotal: 1
  };
  villain = {
    hand: [],
    stack: 2,
    dealer: true,
    position: 0,
    streetTotal: 1
  };
  pot = 2
  betsize_mask = [1,1]
  betsizes = [0.5,1]
  last_action = 2
  betsize = getAvailBetsizes(betsize_mask,betsizes,last_action,hero,villain,pot)
  expect(betsize).not.toBeNaN();
  expect(betsize).toEqual([2,3]);
});

test('SBraiseVsBlind', () => {
  let hero = {
    hand: [],
    stack: 1.5,
    dealer: true,
    position: 0,
    streetTotal: 0.5
  };
  let villain = {
    hand: [],
    stack: 1,
    dealer: false,
    position: 1,
    streetTotal: 1
  };
  let pot = 1.5
  let betsize_mask = [1,0]
  let betsizes = [0.5,1]
  let last_action = 4
  let betsize = getAvailBetsizes(betsize_mask,betsizes,last_action,hero,villain,pot)
  expect(betsize).not.toBeNaN();
  expect(betsize).toEqual([2]);
  hero = {
    hand: [],
    stack: 2.5,
    dealer: true,
    position: 0,
    streetTotal: 0.5
  };
  villain = {
    hand: [],
    stack: 2,
    dealer: false,
    position: 1,
    streetTotal: 1
  };
  pot = 1.5
  betsize_mask = [1,1]
  betsizes = [0.5,1]
  last_action = 4
  betsize = getAvailBetsizes(betsize_mask,betsizes,last_action,hero,villain,pot)
  expect(betsize).not.toBeNaN();
  expect(betsize).toEqual([2,3]);
});

test('raiseVsBet', () => {
  let hero = {
    hand: [],
    stack: 5,
    dealer: true,
    position: 0,
    streetTotal: 0
  };
  let villain = {
    hand: [],
    stack: 4,
    dealer: false,
    position: 1,
    streetTotal: 1
  };
  let pot = 2
  let betsize_mask = [1,1]
  let betsizes = [0.5,1]
  let last_action = 3
  let betsize = getAvailBetsizes(betsize_mask,betsizes,last_action,hero,villain,pot)
  expect(betsize).not.toBeNaN();
  expect(betsize).toEqual([2,4]);
  hero = {
    hand: [],
    stack: 3,
    dealer: true,
    position: 0,
    streetTotal: 0
  };
  villain = {
    hand: [],
    stack: 2,
    dealer: false,
    position: 1,
    streetTotal: 1
  };
  pot = 2
  betsize_mask = [1,1]
  betsizes = [0.5,1]
  last_action = 3
  betsize = getAvailBetsizes(betsize_mask,betsizes,last_action,hero,villain,pot)
  expect(betsize).not.toBeNaN();
  expect(betsize).toEqual([2,3]);
  hero = {
    hand: [],
    stack: 2,
    dealer: true,
    position: 0,
    streetTotal: 0
  };
  villain = {
    hand: [],
    stack: 1,
    dealer: false,
    position: 1,
    streetTotal: 1
  };
  pot = 2
  betsize_mask = [1,0]
  betsizes = [0.5,1]
  last_action = 3
  betsize = getAvailBetsizes(betsize_mask,betsizes,last_action,hero,villain,pot)
  expect(betsize).not.toBeNaN();
  expect(betsize).toEqual([2]);
  hero = {
    hand: [],
    stack: 6,
    dealer: true,
    position: 0,
    streetTotal: 0
  };
  villain = {
    hand: [],
    stack: 4.5,
    dealer: false,
    position: 1,
    streetTotal: 1.5
  };
  pot = 3
  betsize_mask = [1,1]
  betsizes = [0.5,1]
  last_action = 3
  betsize = getAvailBetsizes(betsize_mask,betsizes,last_action,hero,villain,pot)
  expect(betsize).not.toBeNaN();
  expect(betsize).toEqual([3,6]);
});

test('Bet', () => {
  let hero = {
    hand: [],
    stack: 5,
    dealer: true,
    position: 0,
    streetTotal: 0
  };
  let villain = {
    hand: [],
    stack: 5,
    dealer: false,
    position: 1,
    streetTotal: 0
  };
  let pot = 1
  let betsize_mask = [1,0]
  let betsizes = [0.5,1]
  let last_action = 0
  let betsize = getAvailBetsizes(betsize_mask,betsizes,last_action,hero,villain,pot)
  expect(betsize).not.toBeNaN();
  expect(betsize).toEqual([1]);
  hero = {
    hand: [],
    stack: 5,
    dealer: true,
    position: 0,
    streetTotal: 0
  };
  villain = {
    hand: [],
    stack: 5,
    dealer: false,
    position: 1,
    streetTotal: 0
  };
  pot = 2
  betsize_mask = [1,1]
  betsizes = [0.5,1]
  last_action = 0
  betsize = getAvailBetsizes(betsize_mask,betsizes,last_action,hero,villain,pot)
  expect(betsize).not.toBeNaN();
  expect(betsize).toEqual([1,2]);
  hero = {
    hand: [],
    stack: 5,
    dealer: true,
    position: 0,
    streetTotal: 0
  };
  villain = {
    hand: [],
    stack: 5,
    dealer: false,
    position: 1,
    streetTotal: 0
  };
  pot = 5
  betsize_mask = [1,1]
  betsizes = [0.5,1]
  last_action = 0
  betsize = getAvailBetsizes(betsize_mask,betsizes,last_action,hero,villain,pot)
  expect(betsize).not.toBeNaN();
  expect(betsize).toEqual([2.5,5]);
});