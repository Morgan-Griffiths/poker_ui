<script>
  import { shuffle } from "./cards.js";
  import ActionDialog from "./ActionDialog.svelte";
  export let game = null;
  export let playerName = null;
  let playerNumCards;
  export let pokerBotHandWidth;
  $: pokerBotHandWidth = playerNumCards * 60 + 40;
  export let playerHandWidth;
  $: playerHandWidth = playerNumCards * 100 + 60;
  let firstAction;
  export let pot = 0;
  let potClass;
  let playerTurn;
  export let playerActions;
  $: playerActions = playerTurn ? 'active' : 'inactive';
  export let pokerBot = {
    hand: [],
    bank: 1000,
    dealer: true
  };
  export let player = {
    hand: [],
    bank: 1000,
    dealer: false
  };
  export let community = [];
  export let betAmount = 0;
  export let maxBet;
  $: maxBet = player.bank;
  export let allIn;
  $: allIn = betAmount === player.bank ? true : false;
  let showdown;
  export let messageObj = {
    currPlayer: null,
    othPlayer: null,
    pot: null,
    amount: null,
    action: null
  };

  function setName() {
    let value = document.getElementById("player-name").value;
    playerName = value;
  }

  function setGame(name) {
    game = name;
    if (game === "texas") {
      playerNumCards = 2;
    }
    if (game === "omaha5") {
      playerNumCards = 5;
    }
    init();
  }

  function init() {
    calculateBlind();
    let deck = shuffle();
    deal(deck);
    setTimeout(() => {
      playerTurn = true;
      potClass = "active";
      firstAction = true;
    }, 100);
  }

  function calculateBlind() {
    if (player.dealer) {
      pokerBot.bank -= 25;
    } else {
      player.bank -= 25;
    }
    pot += 25;
    maxBet = player.bank;
    return;
  }

  function deal(deck) {
    let card = 0;
    for (let i = 0; i < playerNumCards; i++) {
      player.hand.push(deck[card]);
      card++;
      pokerBot.hand.push(deck[card]);
      card++;
    }
  }

  function toggleTurn() {
    playerTurn = !playerTurn;
    if (!playerTurn) {
      playerActions = "inactive";
    } else {
      playerActions = "active";
    }
  }

  function reset() {
    pokerBot.hand = [];
    player.hand = [];
    community = [];
    pot = 0;
    pokerBot.dealer = !pokerBot.dealer;
    player.dealer = !player.dealer;
    if (pokerBot.dealer) {
      playerTurn = true;
      playerActions = "active";
    } else {
      playerTurn = false;
      playerActions = "inactive";
    }
    calculateBlind();
    let deck = shuffle();
    deal(deck);
  }

  function fold(bot) {
    if (bot) {
      messageObj.currPlayer = "Poker Bot";
      messageObj.othPlayer = playerName;
      player.bank += pot;
    } else {
      messageObj.currPlayer = playerName;
      messageObj.othPlayer = "Poker Bot";
      pokerBot.bank += pot;
    }
    messageObj.pot = pot;
    messageObj.action = "fold";
    reset();
  }

  function endTurn(action) {
    if (action === "check") {
      toggleTurn();
    }
    setTimeout(getPokerBotAction, 2000);
  }

  async function getPokerBotAction() {
    let max;
    let actions = [];
    if (firstAction) {
      max = 3;
      actions = ["fold", "check", "bet"];
    } else {
      max = 4;
      actions = ["fold", "check", "call", "raise"];
    }
    let randomIndex = Math.floor(Math.random() * Math.floor(max));
    let action = actions[randomIndex];
    console.log(action)
    // if (action === "fold") {
    //   fold(true)
    // } else {
    //   endTurn(action)
    // }
  }
</script>

<div id="table">
  {#if !game && !playerName}
    <div class="container text-center">
      <h1>Enter Your Name</h1>
      <div id="name-field">
        <input type="text" id="player-name" />
      </div>
      <div class="btn-wrapper">
        <div class="btn hover-effect" on:click={setName}>Play</div>
      </div>
    </div>
  {:else if !game && playerName}
    <div class="container text-center">
      <h1>Pick A Game</h1>
      <ul id="game-menu">
        <li on:click={() => setGame('texas')}>
          <div class="btn hover-effect">Texas Hold 'Em</div>
        </li>
        <li on:click={() => setGame('omaha5')}>
          <div class="btn hover-effect">Omaha 5 Card</div>
        </li>
      </ul>
    </div>
  {:else}
    <div class="container no-margin-bottom">
      <div id="poker-bot" class="hand" style="width: {pokerBotHandWidth}px">
        {#each pokerBot.hand as card}
          {#if !showdown}
            <div class="card-container">
              <img src="images/cards/card_back.png" alt="Card Back" />
            </div>
          {/if}
          {#if showdown}
            <div class="card-container">
              <img src="images/cards/{card}.png" alt={card} />
            </div>
          {/if}
        {/each}
      </div>
    </div>
    <div class="container no-margin-bottom no-margin-top">
      <div
        id="poker-bot-info"
        class="d-flex column"
        on:click={getPokerBotAction}>
        <div class="d-flex justify-center" style="margin-bottom: 8px">
          Morgan's Poker Bot
          {#if pokerBot.dealer}
            <div class="dealer-chip">D</div>
          {/if}
        </div>
        <hr />
        <p>${pokerBot.bank}</p>
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
      <div id="player" class="hand" style="width: {playerHandWidth}px">
        {#each player.hand as card}
          <div class="card-container">
            <img src="images/cards/{card}.png" alt={card} />
          </div>
        {/each}
      </div>
    </div>
    <div class="container d-flex justify-center flex-wrap no-margin-top">
      <div
        id="bet-slider"
        class="{playerActions} d-flex justify-center flex-wrap">
        <div class="input-wrapper d-flex justify-center">
          <span>$0</span>
          <input
            type="range"
            min="0"
            max={maxBet}
            step="25"
            bind:value={betAmount} />
          <span>${maxBet}</span>
        </div>
      </div>
      <div class="left {playerActions} actions d-flex align-center">
        <div class="btn hover-effect" on:click={() => fold(false)}>
          <span>Fold</span>
        </div>
        <div class="btn hover-effect" on:click={() => endTurn('check')}>
          <span>Check</span>
        </div>
      </div>
      <div id="player-info" class="d-flex column">
        <div class="d-flex justify-center" style="margin-bottom: 8px">
          {playerName}
          {#if player.dealer}
            <div class="dealer-chip">D</div>
          {/if}
        </div>
        <hr />
        <p>${player.bank}</p>
      </div>
      <div class="right {playerActions} actions d-flex align-center">
        {#if !firstAction}
          <div class="btn hover-effect" on:click={() => endTurn('call')}>
            <span>Call</span>
          </div>
          <div class="btn hover-effect" on:click={() => endTurn('raise')}>
            <span>
              {#if allIn}Go All In!{:else}Raise {betAmount}{/if}
            </span>
          </div>
        {:else}
          <div class="btn hover-effect" on:click={() => endTurn('bet')}>
            <span>
              {#if allIn}Go All In!{:else}Bet {betAmount}{/if}
            </span>
          </div>
        {/if}
      </div>
    </div>
  {/if}
</div>
