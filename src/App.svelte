<script>
  let game = null;
  let playerName = null;
  let bankRoll = 1000;
  let dealerHand = ["7D", "10H", "QS", "9H", "AD"];
  let playerHand = ["5D", "JD", "QH", "2D", "AS"];
  let community = ["AH", "KD", "JS", "2H", "7D"];
  let pot = 0;
  let showdown = false;
  let firstAction = false;
  let dealerBet = 32;
  let betAmount = 0;
  let maxBet = bankRoll;
  let playerTurn = false;
  let playerActions = "inactive";

  function setName() {
    let value = document.getElementById('player-name').value;
    playerName = value;
  }

  function setGame(name) {
    game = name;
  }

  function toggleTurn() {
    playerTurn = !playerTurn;
    if (playerTurn) {
      playerActions = "active";
    } else {
      playerActions = "inactive";
    }
  }
</script>

<div id="table">
  {#if !game && !playerName}
  <div class="container text-center">
      <h1>Enter Your Name</h1>
      <div id="name-field">
        <input type="text" id="player-name"/>
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
    <div class="container">
      <div id="dealer" class="hand">
        {#each dealerHand as card}
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
    <div class="container">
      <div id="community" class="hand">
        {#each community as card}
          <div class="card-container">
            <img src="images/cards/{card}.png" alt={card} />
          </div>
        {/each}
      </div>
      <span id="pot">${pot}</span>
    </div>
    <div class="container">
      <div id="player" class="hand">
        {#each playerHand as card}
          <div class="card-container">
            <img src="images/cards/{card}.png" alt={card} />
          </div>
        {/each}
      </div>
    </div>
    <div class="container d-flex justify-center flex-wrap">
      <div
        id="bet-slider"
        class="{playerActions} d-flex justify-center flex-wrap">
        <div class="input-wrapper d-flex justify-center">
          <span>$0</span>
          <input type="range" min="0" max={maxBet} bind:value={betAmount} />
          <span>${maxBet}</span>
        </div>
      </div>
      <div class="left {playerActions} actions d-flex align-center">
        <div class="btn hover-effect">
          <span>Fold</span>
        </div>
        <div class="btn hover-effect">
          <span>Check</span>
        </div>
      </div>
      <div id="player-info" class="d-flex column" on:click={toggleTurn}>
        <p>{playerName}</p>
        <hr />
        <p>${bankRoll}</p>
      </div>
      <div class="right {playerActions} actions d-flex align-center">
        {#if !firstAction}
          <div class="btn hover-effect">
            <span>Call {dealerBet}</span>
          </div>
          <div class="btn hover-effect">
            <span>Raise {betAmount}</span>
          </div>
        {/if}
        {#if firstAction}
          <div class="btn hover-effect">
            <span>Bet {betAmount}</span>
          </div>
        {/if}
      </div>
    </div>
  {/if}
</div>
