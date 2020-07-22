const actions = [
    'Check',
    'Fold',
    'Call',
    'Bet',
    'Raise'
];

export function getAvailActions(mask) {
    return mask.reduce((carry, value, index) => {
        if (value === 1) {
            carry.push(actions[index]);
        }
        return carry;
    }, []);
}