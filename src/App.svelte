<script>
  import { getCards } from "./cards.js";
  import { actionDict, getAvailActions } from "./actions.js";
  import ActionDialog from "./ActionDialog.svelte";

  export let game = null;
  export let playerName = null;
  let playerNumCards;
  export let availActions = [];
  export let leftAvailActions, rightAvailActions;
  $: leftAvailActions =
    availActions.length > 2
      ? availActions.slice(0, 2)
      : availActions.slice(0, 1);
  $: rightAvailActions =
    availActions.length > 2 ? availActions.slice(2) : availActions.slice(1);
  export let pokerBotHandWidth;
  $: pokerBotHandWidth = playerNumCards * 60 + 40;
  export let heroHandWidth;
  $: heroHandWidth = playerNumCards * 100 + 60;
  export let pot = 0;
  let potClass;
  let heroTurn;
  export let activeDisplayClass = "inactive";
  export let villain = {
    hand: [],
    stack: 100,
    dealer: true,
    position: null,
    streetTotal: 0
  };
  export let hero = {
    hand: [],
    stack: 100,
    dealer: false,
    position: null,
    streetTotal: 0
  };
  export let community = [];
  export let betSize = 0;
  export let maxBet;
  $: maxBet = hero.stack;
  export let allIn;
  $: allIn = (hero.stack == 0 || villain.stack == 0)
  let showdown;
  export let messageObj = {
    currPlayer: null,
    othPlayer: null,
    pot: null,
    amount: null,
    action: null
  };
  export let autoNextHand = true;
  export let autoNextHandDisplay = 'inactive';
  let gameType;
  let gameState;
  let done;
  let playerStats = {'results':0,'bb_per_hand':0,'total_hands':0}
  let street;
  export let availBetsizes = [];
  export let gameHistory = [];
  let positionDict = { 0: "SB", 1: "BB", 2: "dealer" };
  let streetStart = { 0: "SB", 1: "BB", 2: "BB", 3: "BB" };
  let streetDict = {0:'preflop',1:'flop',2:'turn',3:'river'}

  function onlyUnique(value, index, self) { 
    if (value > 0) {
      return self.indexOf(value) === index;
    }
  }

  function checkbox() {
    autoNextHand = !autoNextHand
    autoNextHandDisplay = autoNextHand == true ? 'inactive' : 'active'
    if (done) {
      newHand()
    }
  }

  function getAvailBetsizes(betsize_mask, betsizes, last_action) {
    // Takes boolean mask array, and betsizes array of nums between 0 and 1.
    // Returns new array of allowable betsizes or raise sizes.
    availBetsizes = new Array(betsize_mask.length);
    if (last_action == 3 || last_action == 4) {
      for (var i = 0; i < betsize_mask.length; i++) {
        let max_raise = Math.min((2 * villain.streetTotal) + (pot - hero.streetTotal),(hero.stack + hero.streetTotal))
        let previous_bet = villain.streetTotal - hero.streetTotal
        let min_raise = Math.min(Math.max((previous_bet * 2),2),hero.stack)
        let betsize_value = (betsizes[i] * max_raise)
        let betsize = Math.min(Math.max(min_raise,betsize_value),hero.stack)
        availBetsizes[i] = betsize * betsize_mask[i]
        console.log('min_raise',min_raise)
      }
    } else {
      for (var i = 0; i < betsize_mask.length; i++) {
        availBetsizes[i] = Math.min(Math.max(betsize_mask[i] * betsizes[i] * pot,1),hero.stack);
      }
    }
    availBetsizes = availBetsizes.filter( onlyUnique )
    setBetAmount(Math.min(...availBetsizes))
    return availBetsizes;
  }

  function updatePlayers(state) {
    hero.stack = state.hero_stack;
    hero.dealer = state.hero_position == 0 ? true : false;
    hero.position = state.hero_position;
    hero.streetTotal = state.hero_street_total
    villain.position = state.villain_position
    villain.stack = state.villain_stack
    villain.dealer = state.villain_position == 0 ? true : false;
    villain.streetTotal = state.villain_street_total
  }

  function updateGame(state) {
    street = state.street;
    pot = state.pot;
    betSize = 0;
  }

  function setDone(bool) {
    done = bool
  }

  async function setName() {
    let value = document.getElementById("hero-name").value;
    playerName = value;
    const res = await fetch("http://localhost:4000/api/player/name", {
      method: "POST",
      body: JSON.stringify({
        name: playerName
      })
    });
  }

  async function getStats() {
    const res = await fetch("http://localhost:4000/api/player/stats");
    let text = await res.text();
    playerStats = JSON.parse(text);
  }

  async function setGame(name) {
    game = name;
    gameType = name;
    newHand();
  }

  async function newHand() {
    villain.hand = [];
    const res = await fetch("http://localhost:4000/api/reset");
    let text = await res.text();
    gameState = JSON.parse(text);
    const { state, outcome } = gameState;
    setDone(state.done)
    console.log('gameState',gameState.state.last_aggressive_betsize)
    playerNumCards = state.hero_cards.length / 2;
    availActions = getAvailActions(state.action_mask);
    hero.hand = await getCards(state.hero_cards);
    community = await getCards(state.board_cards);
    updatePlayers(state);
    updateGame(state);
    availBetsizes = getAvailBetsizes(state.betsize_mask, state.betsizes, state.last_action);
    decodeHistory(state);
    potClass = "active";
    activeDisplayClass = "active";
    await getStats();
    if (state.done) {
      activeDisplayClass = "inactive";
      outcomeStrings(outcome)
      if (autoNextHand) {
        newHand();
      }
    }
  }

  function outcomeStrings(outcome) {
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
    gameHistory.push(`Hero ${hero_outcome_str} ${outcome.player1_reward}`);
    gameHistory.push(`Villain ${villain_outcome_str} ${outcome.player2_reward}`);
  }

  function buildString(
    last_position,
    last_action,
    last_betsize,
    amount_to_call,
    last_street_total,
    street,
    blind
  ) {
    let displayString = null;
    if (last_position === "dealer") {
      if (!(hero.stack == 0 || villain.stack == 0)) {
        console.log('not allin')
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

  function decodeHistory(gameData) {
    gameHistory = [];
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
        hist[i][mapping.blind]
      );
      if (displayString != null) {
        gameHistory.push(displayString);
      }
    }
  }

  async function endTurn(action, betSize) {
    const res = await fetch("http://localhost:4000/api/step", {
      method: "POST",
      body: JSON.stringify({
        action,
        betsize: betSize+hero.streetTotal
      })
    });
    let text = await res.text();
    let gameState = JSON.parse(text);
    action = action.slice(0, 1).toLowerCase() + action.slice(1);
    activeDisplayClass = "inactive";
    if (action === "call") {
      betSize = gameState.state.last_betsize;
    }
    const { state, outcome } = gameState;
    setDone(state.done)
    console.log('done',gameState.state.done)
    community = await getCards(state.board_cards);
    updatePlayers(state);
    updateGame(state);
    decodeHistory(state);
    availActions = getAvailActions(state.action_mask);
    availBetsizes = getAvailBetsizes(state.betsize_mask, state.betsizes, state.last_action);
    activeDisplayClass = "active";
    if (state.done) {
      activeDisplayClass = "inactive";
      let displayString
      console.log('history',state.history[0])
      console.log('state',state)
      console.log('outcome',outcome)
      if (state.last_action == 2 || state.last_action == 0 || state.last_action == 5) {
        villain.hand = await getCards(outcome.player2_hand);
        gameHistory.push(`Showdown`);
      }
      outcomeStrings(outcome)
      await getStats();
      if (autoNextHand) {
        newHand();
      }
    }
  }

  function setBetAmount(amount) {
    betSize = amount;
  }
</script>

<div id="table">
  {#if !game && !playerName}
    <div class="container text-center">
      <h1>Enter Your Name</h1>
      <div id="name-field">
        <input type="text" id="hero-name" />
      </div>
      <div class="btn-wrapper">
        <div class="btn hover-effect" on:click={setName}>Play</div>
      </div>
    </div>
  {:else if !game && playerName}
    <div class="container text-center">
      <h1>Pick A Game</h1>
      <ul id="game-menu">
        <li on:click={() => setGame('omaha')}>
          <div class="btn hover-effect">Omaha</div>
        </li>
      </ul>
    </div>
  {:else}
    <div id="history">
      <h2>History</h2>
      <hr />
      <div id="history-content">
        {#each gameHistory as step}
          <div>{step}</div>
        {/each}
    </div>
  </div>
  <div id="stats">
    <h2>Stats</h2>
    <hr>
      <table id="stats-content">
        <tr><td>total_hands</td> <td class="text-right">{playerStats.total_hands}</td></tr>
        <tr><td>winnings</td> <td class="text-right">{playerStats.results}</td></tr>
        <tr><td>bb per hand</td> <td class="text-right">{playerStats.bb_per_hand.toFixed(2)}</td></tr>
        <tr><td>SB</td> <td class="text-right">{playerStats.SB}</td></tr>
        <tr><td>BB</td> <td class="text-right">{playerStats.BB}</td></tr>
      </table>
    </div>
    <div>
    <label id='nextHand-checkbox'>
      <h2>AutoNextHand</h2>
      <input type=checkbox checked={autoNextHand} on:click={() => checkbox()}>
    </label>
  </div>
    <div id='nextHandButton' class="{autoNextHandDisplay} d-flex">
      {#if !autoNextHand}
        <div on:click={() => newHand()} class="btn hover-effect">
          Next Hand
        </div>
      {/if}
    </div>
    <div class="container no-margin-bottom">
      <div id="villian" class="hand" style="width: {pokerBotHandWidth}px">
        {#if villain.hand.length === 0}
          {#each Array(playerNumCards) as _}
            <div class="card-container">
              <img src="images/cards/card_back.png" alt="Card Back" />
            </div>
          {/each}
        {:else}
          {#each villain.hand as card}
            <div class="card-container">
              <img src="images/cards/{card}.png" alt={card} />
            </div>
          {/each}
        {/if}
      </div>
    </div>
    <div class="container no-margin-bottom no-margin-top">
      <div id="villian-info" class="d-flex column">
        <div class="d-flex justify-center" style="margin-bottom: 8px">
          Morgan's Poker Bot
          {#if villain.dealer}
            <div class="dealer-chip">D</div>
          {/if}
        </div>
        <hr />
        <p>${villain.stack}</p>
      </div>
      <div class="{activeDisplayClass} street-total">
        <span>${villain.streetTotal}</span>
      </div>
    </div>
    <div class="container">
      <div id="pot" class={potClass}>
        <img
          src="images/poker-chip.png"
          alt="Poker Chip"
          height="105%"
          style="margin-right:10px" />
        <span>${pot}</span>
      </div>
      <div id="community" class="hand">
        <ActionDialog {messageObj} />
        {#each community as card}
          <div class="card-container">
            <img src="images/cards/{card}.png" alt={card} />
          </div>
        {/each}
      </div>
    </div>
    <div class="container no-margin-bottom">
      <div class="{activeDisplayClass} street-total">
        <span>${hero.streetTotal}</span>
      </div>
      <div id="hero" class="hand" style="width: {heroHandWidth}px">
        {#each hero.hand as card}
          <div class="card-container">
            <img src="images/cards/{card}.png" alt={card} />
          </div>
        {/each}
      </div>
    </div>
    <div id="bet-options" class="{activeDisplayClass} d-flex">
      {#each availBetsizes as availBet}
        {#if availBet > 0}
          <div on:click={() => setBetAmount(availBet)} class="btn hover-effect">
            ${availBet}
          </div>
        {/if}
      {/each}
    </div>
    <div class="container d-flex justify-center flex-wrap no-margin-top">
      <!-- <div
        id="bet-slider"
        class="{activeDisplayClass} d-flex justify-center flex-wrap">
        <div class="input-wrapper d-flex justify-center">
          <span>$0</span>
          <input
            type="range"
            min="0"
            max={maxBet}
            step="1"
            bind:value={betSize}
            on:input={checkAllIn} />
          <span>${maxBet}</span>
        </div>
      </div> -->
      <div class="left {activeDisplayClass} actions d-flex align-center">
        {#if availActions}
          {#each leftAvailActions as action}
            <div
              class="btn hover-effect"
              on:click={() => endTurn(action, betSize)}>
              <span>
                {action}
                {#if action === 'bet' || action === 'raise'}{betSize}{:else if action === 'call'}{villain.streetTotal - hero.streetTotal}{/if}
              </span>
            </div>
          {/each}
        {/if}
      </div>
      <div id="hero-info" class="d-flex column">
        <div class="d-flex justify-center" style="margin-bottom: 8px">
          {playerName}
          {#if hero.dealer}
            <div class="dealer-chip">D</div>
          {/if}
        </div>
        <hr />
        <p>${hero.stack}</p>
      </div>
      <div class="right {activeDisplayClass} actions d-flex align-center">
        {#if availActions}
          {#each rightAvailActions as action}
            <div
              class="btn hover-effect"
              on:click={() => endTurn(action, betSize)}>
              <span>
                {action}
                {#if action === 'bet' || action === 'raise'}{betSize}{:else if action === 'call'}{villain.streetTotal - hero.streetTotal}{/if}
              </span>
            </div>
          {/each}
        {/if}
      </div>
    </div>
  {/if}
</div>
