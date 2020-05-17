<script>
  import { shuffle } from "./cards.js";
  let game = null;
  let playerName = null;
  let playerNumCards = null;
  let playerHandWidth = 160;
  let pokerBotHandWidth = 100;
  let pokerBotBank = 1000;
  let playerBank = 1000;
  let pokerBotHand = [];
  let playerHand = [];
  let community = [];
  let pot = 0;
  let potClass = "";
  let showdown = false;
  let firstAction = true;
  let pokerBotBet = 32;
  let betAmount = 0;
  let maxBet = playerBank;
  let playerTurn = false;
  let playerActions = "inactive";
  let action = "";

  function setName() {
    let value = document.getElementById("player-name").value;
    playerName = value;
  }

  function setGame(name) {
    game = name;
    if (game === "texas") {
      playerNumCards = 2;
      setHandWidth();
    }
    if (game === "omaha5") {
      playerNumCards = 5;
      setHandWidth();
    }
    if (firstAction) {
      action = "Bet";
    } else {
      action = "Raise";
    }
    let deck = shuffle();
    deal(deck);
    setTimeout(() => {
      potClass = "active";
    }, 100);
  }

  function setHandWidth(numCards) {
    playerHandWidth = playerNumCards * 100 + 60;
    pokerBotHandWidth = playerNumCards * 60 + 40;
  }

  function deal(deck) {
    for (let i = 0; i < playerNumCards; i++) {
      playerHand.push(deck[i]);
      pokerBotHand.push(deck[i + 1]);
    }
    setTimeout(function() {
      toggleTurn();
    }, 200);
  }

  function toggleTurn() {
    playerTurn = !playerTurn;
    if (playerTurn) {
      playerActions = "active";
    } else {
      playerActions = "inactive";
    }
  }

  function checkAllIn() {
    if (betAmount === playerBank) {
      action = "Go All In";
    } else {
      if (firstAction) {
        action = "Bet";
      } else {
        action = "Raise";
      }
    }
  }

  function fold() {}
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
        {#each pokerBotHand as card}
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
      <div id="poker-bot-info" class="d-flex column">
        <p>Morgan's Poker Bot</p>
        <hr />
        <p>${pokerBotBank}</p>
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
        {#each community as card}
          <div class="card-container">
            <img src="images/cards/{card}.png" alt={card} />
          </div>
        {/each}
      </div>
    </div>
    <div class="container no-margin-bottom">
      <div id="player" class="hand" style="width: {playerHandWidth}px">
        {#each playerHand as card}
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
            bind:value={betAmount}
            on:input={checkAllIn} />
          <span>${maxBet}</span>
        </div>
      </div>
      <div class="left {playerActions} actions d-flex align-center">
        <div class="btn hover-effect" on:click={fold}>
          <span>Fold</span>
        </div>
        <div class="btn hover-effect">
          <span>Check</span>
        </div>
      </div>
      <div id="player-info" class="d-flex column">
        <p>{playerName}</p>
        <hr />
        <p>${playerBank}</p>
      </div>
      <div class="right {playerActions} actions d-flex align-center">
        {#if !firstAction}
          <div class="btn hover-effect">
            <span>Call {pokerBotBet}</span>
          </div>
          <div class="btn hover-effect">
            <span>{action} {betAmount}</span>
          </div>
        {:else}
          <div class="btn hover-effect">
            <span>{action} {betAmount}</span>
          </div>
        {/if}
      </div>
    </div>
  {/if}
</div>
