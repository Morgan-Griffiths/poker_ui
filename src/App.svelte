<script>
  import { getCards } from "./cards";
  import { decodeHistory, outcomeStrings } from "./history";
  import { getAvailActions, getAvailBetsizes } from "./actions";
  import { Position, Action } from "./dataTypes";
  import Chart from "chart.js";
  let game = null;
  let playerName = null;
  let playerNumCards;
  $: pokerBotHandWidth = playerNumCards * 60 + 40;
  $: heroHandWidth = playerNumCards * 100 + 60;
  let availActions = [];
  $: leftAvailActions =
    availActions.length > 2
      ? availActions.slice(0, 2)
      : availActions.slice(0, 1);
  $: rightAvailActions =
    availActions.length > 2 ? availActions.slice(2) : availActions.slice(1);
  let pot = 0;
  let potClass;
  let heroTurn;
  let activeDisplayClass = "inactive";
  let villain = {
    hand: [],
    stack: 100,
    dealer: true,
    position: null,
    streetTotal: 0
  };
  let hero = {
    hand: [],
    stack: 100,
    dealer: false,
    position: null,
    streetTotal: 0
  };
  $: maxBet = hero.stack;
  $: allIn = hero.stack == 0 || villain.stack == 0;
  let community = [];
  let betSize = 0;
  let APIServer = IsProd ? "/api" : "http://localhost:4000/api";
  let gameType;
  let gameState;
  let done = true;
  let playerStats = { results: 0, bb_per_hand: 0, total_hands: 0 };
  let street;
  let settingsDialog = false;
  let autoNextHand = true;
  let fourColorCards = true;
  $: deckType = fourColorCards ? "4_color_cards" : "cards";
  $: settingsElements = [
    {
      name: "Auto Next Hand",
      type: "checkbox",
      checked: autoNextHand,
      func: () => toggleAutoNext()
    },
    {
      name: "Four Color Deck",
      type: "checkbox",
      checked: fourColorCards,
      func: () => {
        fourColorCards = !fourColorCards;
      }
    }
  ];
  let dispVillHand = false;
  let dispVillOut = false;
  $: settingsAdvanced = [
    {
      name: "Show Villain Hand",
      type: "checkbox",
      checked: dispVillHand,
      func: () => toggleDispVillHand()
    },
    {
      name: "Display Villain Outputs",
      type: "checkbox",
      checked: dispVillOut,
      func: () => showBotOutputs()
    }
  ];
  let availBetsizes = [];
  let gameHistory = [];

  function toggleAutoNext() {
    autoNextHand = !autoNextHand;
    if (done) {
      newHand();
    }
  }

  async function toggleDispVillHand() {
    dispVillHand = !dispVillHand;
    if (dispVillHand && !IsProd) {
      villain.hand = await getCards(gameState.state.villain_cards); 
    } else {
      villain.hand = [];
    }
  }

  function showBotOutputs() {
    dispVillOut = !dispVillOut;
    if (dispVillOut && !IsProd) {
      getBotOutputs();
    }
  }

  async function getBotOutputs() {
    const res = await fetch(`${APIServer}/model/outputs`);
    let text = await res.text();
    let parsedText = JSON.parse(text);
    let actionProbsData = parsedText.action_probs[0].map(val => (val * 100).toFixed(2));
    let qValuesData = parsedText.q_values[0].map(val => (val * 100).toFixed(2));
    let actionProbsEl = document.getElementById("villain-action-probs").getContext("2d");
    let qValuesEl = document.getElementById("villain-q-values").getContext("2d");
    let labels = ["Check", "Fold", "Call", "B/R #1", "B/R #2"];
    buildChart(actionProbsEl, labels, "Action %", actionProbsData, [255, 99, 132]);
    buildChart(qValuesEl, labels, "Q Values", qValuesData, [255, 206, 86]);
  }

  function buildChart(elem, labels, title, data, colorArr) {
    let bGColor = `rgba( ${colorArr.join(", ")} , .2)`;
    let borderColor = `rgba( ${colorArr.join(", ")} , 1)`
    new Chart(elem, {
        type: "bar",
        data: {
          labels: labels,
          datasets: [
            {
              label: title,
              data: data,
              backgroundColor: bGColor,
              borderColor: borderColor,
              borderWidth: 1
            }
          ]
        },
        options: {
          scales: {
            yAxes: [
              {
                ticks: {
                  beginAtZero: true,
                  max: 100,
                  min: 0
                }
              }
            ]
          }
        }
      });
  }

  function updatePlayers(state) {
    hero.stack = state.hero_stack;
    hero.dealer = state.hero_position == Position.SB ? true : false;
    hero.position = state.hero_position;
    hero.streetTotal = state.hero_street_total;
    villain.position = state.villain_position;
    villain.stack = state.villain_stack;
    villain.dealer = state.villain_position == Position.SB ? true : false;
    villain.streetTotal = state.villain_street_total;
  }

  function updateGame(state) {
    street = state.street;
    pot = state.pot;
    betSize = 0;
  }

  function updateHistory(outcome) {
    let strings = outcomeStrings(outcome);
    for (let event of strings) {
      gameHistory.push(event);
    }
    gameHistory = gameHistory;
  }

  function setDone(bool) {
    done = bool;
  }

  async function setName() {
    let value = document.getElementById("hero-name").value;
    playerName = value;
    const res = await fetch(`${APIServer}/player/name`, {
      method: "POST",
      body: JSON.stringify({
        name: playerName
      })
    });
  }

  async function getStats() {
    const res = await fetch(`${APIServer}/player/stats`);
    let text = await res.text();
    playerStats = JSON.parse(text);
  }

  async function setGame(name) {
    game = name;
    gameType = name;
    newHand();
  }

  function setBetAmount(amount) {
    betSize = amount;
  }
  async function newHand() {
    villain.hand = [];
    const res = await fetch(`${APIServer}/reset`);
    let text = await res.text();
    gameState = JSON.parse(text);
    const { state, outcome } = gameState;
    setDone(state.done);
    playerNumCards = state.hero_cards.length / 2;
    availActions = getAvailActions(state.action_mask);
    hero.hand = await getCards(state.hero_cards);
    community = await getCards(state.board_cards);
    updatePlayers(state);
    updateGame(state);
    availBetsizes = getAvailBetsizes(
      state.betsize_mask,
      state.betsizes,
      state.last_action,
      hero,
      villain,
      pot
    );
    setBetAmount(Math.min(...availBetsizes));
    setGameHistory({ state, hero, villain });
    potClass = "active";
    activeDisplayClass = "active";
    await getStats();
    if (state.done) {
      activeDisplayClass = "inactive";
      updateHistory(outcome);
      if (autoNextHand) {
        newHand();
      }
    }
  }

  async function endTurn(action, betSize) {
    const res = await fetch(`${APIServer}/step`, {
      method: "POST",
      body: JSON.stringify({
        action,
        betsize: betSize
      })
    });
    let text = await res.text();
    let gameState = JSON.parse(text);
    action = action.slice(0, 1).toLowerCase() + action.slice(1);
    activeDisplayClass = "inactive";
    if (dispVillOut) {
      getBotOutputs();
    }
    if (action === "call") {
      betSize = gameState.state.last_betsize;
    }
    const { state, outcome } = gameState;
    setDone(state.done);
    community = await getCards(state.board_cards);
    updatePlayers(state);
    updateGame(state);
    setGameHistory({ state, hero, villain });
    availActions = getAvailActions(state.action_mask);
    availBetsizes = getAvailBetsizes(
      state.betsize_mask,
      state.betsizes,
      state.last_action,
      hero,
      villain,
      pot
    );
    setBetAmount(Math.min(...availBetsizes));
    activeDisplayClass = "active";
    if (state.done) {
      activeDisplayClass = "inactive";
      if (
        state.last_action == Action.call ||
        state.last_action == Action.check ||
        state.last_action == Action.unopened
      ) {
        villain.hand = await getCards(outcome.player2_hand);
        setGameHistory(null, "Showdown");
      }
      updateHistory(outcome);
      await getStats();
      if (autoNextHand) {
        newHand();
      }
    }
  }

  async function setGameHistory(payload, event) {
    if (payload) {
      let { state, hero, villain } = payload;
      gameHistory = await decodeHistory(state, hero, villain);
    } else {
      gameHistory.push(event);
    }
    if (document.getElementById("history-content")) {
      document.getElementById(
        "history-content"
      ).scrollTop = document.getElementById("history-content").scrollHeight;
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
      <hr />
      <table id="stats-content">
        <tr>
          <td>Total Hands</td>
          <td class="text-right">{playerStats.total_hands}</td>
        </tr>
        <tr>
          <td>Winnings</td>
          <td class="text-right">{playerStats.results}</td>
        </tr>
        <tr>
          <td>BB per hand</td>
          <td class="text-right">{playerStats.bb_per_hand.toFixed(2)}</td>
        </tr>
        <tr>
          <td>SB</td>
          <td class="text-right">{playerStats.SB}</td>
        </tr>
        <tr>
          <td>BB</td>
          <td class="text-right">{playerStats.BB}</td>
        </tr>
      </table>
    </div>
    <div id="settings">
      <i
        class="material-icons icon-hover"
        on:click={() => {
          settingsDialog = !settingsDialog;
        }}>
        settings
      </i>
    </div>
    {#if settingsDialog == true}
      <div id="settings-dialog">
        <h2>Settings</h2>
        <hr />
        <div
          id="settings-dialog-content"
          class="field-container d-flex flex-wrap">
          {#each settingsElements as setting}
            <div class="setting d-flex align-center">
              {setting.name}
              <input
                type={setting.type}
                checked={setting.checked}
                on:click={setting.func} />
            </div>
          {/each}
          {#if !IsProd}
            {#each settingsAdvanced as setting}
              <div class="setting d-flex align-center">
                {setting.name}
                <input
                  type={setting.type}
                  checked={setting.checked}
                  on:click={setting.func} />
              </div>
            {/each}
          {/if}
        </div>
      </div>
    {/if}
    {#if dispVillOut}
      <div id="villain-output">
        <h2>Villian Output</h2>
        <hr />
        <canvas id="villain-action-probs" width="400" height="300" />
        <canvas id="villain-q-values" width="400" height="300" />
      </div>
    {/if}
    <div id="next-hand">
      <div on:click={() => newHand()} class="btn hover-effect">Next Hand</div>
    </div>
    <div class="container no-margin-bottom">
      <div id="villain" class="hand" style="width: {pokerBotHandWidth}px">
        {#if villain.hand.length === 0}
          {#each Array(playerNumCards) as _}
            <div class="card-container">
              <img src="images/{deckType}/card_back.png" alt="Card Back" />
            </div>
          {/each}
        {:else}
          {#each villain.hand as card}
            <div class="card-container">
              <img src="images/{deckType}/{card}.png" alt={card} />
            </div>
          {/each}
        {/if}
      </div>
    </div>
    <div class="container no-margin-bottom no-margin-top">
      <div id="villain-info" class="d-flex column">
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
        {#each community as card}
          <div class="card-container">
            <img src="images/{deckType}/{card}.png" alt={card} />
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
            <img src="images/{deckType}/{card}.png" alt={card} />
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
                {#if action === 'bet' || action === 'raise'}
                  {betSize}
                {:else if action === 'call'}
                  {villain.streetTotal - hero.streetTotal}
                {/if}
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
                {#if action === 'bet' || action === 'raise'}
                  {betSize}
                {:else if action === 'call'}
                  {villain.streetTotal - hero.streetTotal}
                {/if}
              </span>
            </div>
          {/each}
        {/if}
      </div>
    </div>
  {/if}
</div>
