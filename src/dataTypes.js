
export const positionDict = { 1: "SB", 2: "BB", 3: "dealer" };
export const Position = { "SB" : 1, "BB":2, "dealer":3 };
export const Suits = {
    'LOW':1,
    'HIGH':5
}
export const Ranks = {
    'LOW':2,
    'HIGH':15
}
export const actionIndex = {
    0: "check",
    1: "fold",
    2: "call",
    3: "bet",
    4: "raise",
    5: "unopened"
};
// With zero padding, actions are offset by 1
export const actionOffset = {
    1: "check",
    2: "fold",
    3: "call",
    4: "bet",
    5: "raise",
    6: "unopened"
};
export const Action = {
    "check" :1,
    "fold" :2,
    "call" :3,
    "bet" :4,
    "raise" :5,
    "unopened" :6,
    "offset" : 1
};
// With zero padding, blinds are offset by 1
export const Blind = {
    'POSTED' : 2,
    'NO_BLIND' : 1,
    'PADDING' : 0
}
// With zero padding, Streets are offset by 1
export const streetStart = { 1: "SB", 2: "BB", 3: "BB", 4: "BB" };
export const streetDict = {1:'preflop',2:'flop',3:'turn',4:'river'}