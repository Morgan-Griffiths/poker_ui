<script>
  import { getCards } from "./cards.js";
  import { getAvailActions } from "./actions.js";
  import ActionDialog from "./ActionDialog.svelte";
  export let game = null;
  export let playerName = null;
  let playerNumCards;
  let availActions;
  export let pokerBotHandWidth;
  $: pokerBotHandWidth = playerNumCards * 60 + 40;
  export let heroHandWidth;
  $: heroHandWidth = playerNumCards * 100 + 60;
  export let pot = 0;
  let potClass;
  let heroTurn;
  export let heroActiveClass = "inactive";
  export let villain = {
    hand: [],
    bank: 1000,
    dealer: true
  };
  export let hero = {
    hand: [],
    bank: 1000,
    dealer: false
  };
  export let community = [];
  export let betSize = 0;
  export let maxBet;
  $: maxBet = hero.bank;
  export let allIn;
  $: allIn = betSize === hero.bank ? true : false;
  let showdown;
  export let messageObj = {
    currPlayer: null,
    othPlayer: null,
    pot: null,
    amount: null,
    action: null
  };

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

  async function setGame(name) {
    game = name;
    const res = await fetch("http://localhost:4000/api/reset");
    let text = await res.text();
    let data = JSON.parse(text);
    const { state } = data;
    playerNumCards = state.hero_cards.length / 2;
    availActions = getAvailActions(state.action_mask);
    hero.hand = await getCards(state.hero_cards);
    hero.bank = state.hero_stack;
    hero.dealer = state.hero_position == 0 ? true : false;
    villain.bank = state.villain_stack;
    villain.dealer = state.villain_position == 0 ? true : false;
    pot = state.pot;
    potClass = "active";
    heroActiveClass = "active";
  }

  function divideActions(side) {
    if (availActions.length > 2) {
      if (side === "left") {
        return availActions.slice(0, 2);
      }
      return availActions.slice(2);
    } else {
      if (side === "left") {
        return availActions.slice(0, 1);
      }
      return availActions.slice(1);
    }
  }

  async function endTurn(action, betSize) {
    action = action.slice(0, 1).toLowerCase() + action.slice(1);
    heroActiveClass = "inactive";
    messageObj.currPlayer = playerName;
    messageObj.othPlayer = 'PokerBot';
    messageObj.action = action;
    if (betSize > 0) {
      messageObj.amount = betSize;
    } else {
      if (action === 'fold') {
        messageObj.amount = pot;
      }
      messageObj.amount = null;
    }
    messageObj.action = action;
    const res = await fetch("http://localhost:4000/api/step", {
      method: "POST",
      body: JSON.stringify({
        action,
        betsize: betSize
      })
    });
    let text = await res.text();
    let data = JSON.parse(text);
    const { state } = data;
    setTimeout(function(){
      console.log(state)
      // messageObj.currPlayer = 'PokerBot';
      // messageObj.othPlayer = playerName;
      // messageObj.action = `${state.action}s`;
      // betSize > 0 ? messageObj.amount = betSize : messageObj.amount = null;
      // messageObj.action = state.action;
      availActions = getAvailActions(state.action_mask);
      pot = state.pot;
      villain.bank = state.villain_stack;
      heroActiveClass = "active";
    }, 3000);
  }

  function checkAllIn() {
    if (betSize === hero.bank) {
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
        <p>${villain.bank}</p>
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
      <div id="hero" class="hand" style="width: {heroHandWidth}px">
        {#each hero.hand as card}
          <div class="card-container">
            <img src="images/cards/{card}.png" alt={card} />
          </div>
        {/each}
      </div>
    </div>
    <div class="container d-flex justify-center flex-wrap no-margin-top">
      <div
        id="bet-slider"
        class="{heroActiveClass} d-flex justify-center flex-wrap">
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
      </div>
      <div class="left {heroActiveClass} actions d-flex align-center">
        {#if availActions}
          {#each divideActions('left') as action}
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
        <p>${hero.bank}</p>
      </div>
      <div class="right {heroActiveClass} actions d-flex align-center">
        {#if availActions}
          {#each divideActions('right') as action}
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
