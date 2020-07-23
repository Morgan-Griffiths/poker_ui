<script>
  import { getCards } from "./cards.js";
  import { actions, getAvailActions } from "./actions.js";
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
    stack: 1000,
    dealer: true,
    position: null,
    streetTotal: 0
  };
  export let hero = {
    hand: [],
    stack: 1000,
    dealer: false,
    position: null,
    streetTotal: 0
  };
  export let community = [];
  export let betSize = 0;
  export let maxBet;
  $: maxBet = hero.stack;
  export let allIn;
  $: allIn = betSize === hero.stack ? true : false;
  let showdown;
  export let messageObj = {
    currPlayer: null,
    othPlayer: null,
    pot: null,
    amount: null,
    action: null
  };
  let gameType;
  let gameState;
  let playerStats;
  let street;
  export let availBetsizes = [];

  function getAvailBetsizes(betsize_mask, betsizes) {
    // This is useful for only allowing categorical betsizes, as opposed to continuous.
    // Takes boolean mask array, and betsizes array of nums between 0 and 1.
    // Returns new array of allowable betsizes.
    console.log("betsize_mask,betsizes", betsize_mask, betsizes);
    availBetsizes = new Array(betsize_mask.length);
    for (var i = 0; i < betsize_mask.length; i++) {
      console.log(pot)
      availBetsizes[i] = (betsize_mask[i] * betsizes[i]) * pot;
    }
    console.log("availBetsizes", availBetsizes);
    return availBetsizes;
  }

  function updatePlayers(state) {
    hero.stack = state.hero_stack;
    hero.dealer = state.hero_position == 0 ? true : false;
    hero.position = state.hero_position;
    hero.streetTotal =
      state.hero_position == 0
        ? state.player1_street_total
        : state.player2_street_total;
    villain.position =
      state.hero_position == 0
        ? state.player2_position
        : state.player1_position;
    villain.stack =
      villain.position == 1 ? state.player2_stack : state.player1_stack;
    villain.dealer = state.villain_position == 0 ? true : false;
    villain.streetTotal =
      state.villain_position == 0
        ? state.player2_street_total
        : state.player1_street_total;
  }

  function updateGame(state) {
    street = state.street;
    pot = state.pot;
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
    console.log("playerStats", playerStats);
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
    const { state } = gameState;
    console.log(state)
    playerNumCards = state.hero_cards.length / 2;
    availActions = getAvailActions(state.action_mask);
    hero.hand = await getCards(state.hero_cards);
    community = await getCards(state.board_cards);
    updatePlayers(state);
    updateGame(state);
    availBetsizes = getAvailBetsizes(state.betsize_mask, state.betsizes);
    potClass = "active";
    activeDisplayClass = "active";
    await getStats();
    decodeHistory(state);
  }

  function decodeHistory(gameData) {
    const { history, mapping } = gameData;
    console.log(mapping);
    const gameHistory = history[0];
    for (var i = 0; i < gameHistory.length; i++) {
      gameHistory[i][mapping.last_action];
      gameHistory[i][mapping.last_betsize];
      gameHistory[i][mapping.last_position];
    }
  }

  async function endTurn(action, betSize) {
    action = action.slice(0, 1).toLowerCase() + action.slice(1);
    activeDisplayClass = "inactive";
    const res = await fetch("http://localhost:4000/api/step", {
      method: "POST",
      body: JSON.stringify({
        action,
        betsize: betSize
      })
    });
    let text = await res.text();
    let data = JSON.parse(text);
    console.log("data", data);
    const { state, outcome } = data;
    decodeHistory(state);
    community = await getCards(state.board_cards);
    updatePlayers(state);
    updateGame(state);
    availActions = getAvailActions(state.action_mask);
    availBetsizes = getAvailBetsizes(state.betsize_mask, state.betsizes);
    activeDisplayClass = "active";
    if (state.done) {
      villain.dealer
        ? (villain.hand = await getCards(outcome.player1_hand))
        : (villain.hand = await getCards(outcome.player2_hand));
      //  activeDisplayClass = "inactive";
      await getStats();
      setTimeout(newHand, 10000);
    }
    console.log(villain.hand);
  }

  function setBetAmount(amount) {
    betSize = amount;
  }

  function checkAllIn() {
    if (betSize === hero.stack) {
      allIn = true;
    } else {
      allIn = false;
    }
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
    <div id="bet-options" class="{activeDisplayClass} d-flex flex-wrap">
      {#each availBetsizes as availBet}
        <div on:click={() => setBetAmount(availBet)} class="btn hover-effect">${availBet}</div>
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
                {#if action === 'Bet' || action === 'Raise'}{betSize}{/if}
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
                {#if action === 'Bet' || action === 'Raise'}{betSize}{/if}
              </span>
            </div>
          {/each}
        {/if}
      </div>
    </div>
  {/if}
</div>
