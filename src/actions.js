export const actionDict = {
    0: "check",
    1: "fold",
    2: "call",
    3: "bet",
    4: "raise",
    5: "unopened"
};

export function getAvailActions(mask) {
    return mask.reduce((carry, value, index) => {
        if (value === 1) {
            carry.push(actionDict[index]);
        }
        return carry;
    }, []);
}