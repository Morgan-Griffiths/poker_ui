<script>
  let playerName = "Alex Lewis";
  let bankRoll = 100000;
  let dealerHand = ["7D", "10H", "QS", "9H", "AD"];
  let playerHand = ["5D", "JD", "QH", "2D", "AS"];
  let community = ["AH", "KD", "JS", "2H", "7D"];
  let pot = 0;
  let showdown = false;
  let firstAction = false;
  let raiseActive = false;
  let raiseAmount = 0;
  let max = bankRoll;

  function activateRaise() {
	  raiseActive = !raiseActive;
  }
</script>

<div id="table">
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
    {#if raiseActive}
		<div id="raise-slider">
			<input type=range min=0 max={max} bind:value={raiseAmount} />
		</div>
	{/if}
    <div class="actions d-flex align-center">
      <div class="btn hover-effect">
        <span>Fold</span>
      </div>
      <div class="btn hover-effect">
        <span>Check</span>
      </div>
    </div>
    <div id="player-info">
      <p>{playerName}</p>
      <hr />
      <p>${bankRoll}</p>
    </div>
	<div class="actions d-flex align-center">
      {#if !firstAction}
		<div class="btn hover-effect" on:click={activateRaise}>
			<span>Raise</span>
		</div>
		<div class="btn hover-effect">
        	<span>Call</span>
      	</div>
	  {/if}
	  {#if firstAction}
		<div class="btn hover-effect">
			<span>Bet</span>
		</div>
	  {/if}
    </div>
  </div>
</div>
