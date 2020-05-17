<script>
  export let messageObj = {
    currPlayer: null,
    othPlayer: null,
    pot: null,
    amount: null,
    action: null
  };

  let messages = {};

  const setTimer = () => {
    messages = setMessages(messageObj);
    setTimeout(function() {
        messageObj = {
            playerName: null,
            pokerBot: false,
            pot: null,
            amount: null,
            action: null
        }
    }, 3000);
  }

  function setMessages(obj) {
    return {
        fold: `${obj.currPlayer} has folded, ${obj.othPlayer} wins ${obj.pot}`,
        check: `${obj.currPlayer} has checked, ${obj.othPlayer}'s turn`,
        call: `${obj.currPlayer} has called, ${obj.othPlayer}'s turn`,
        raise: `${obj.currPlayer} has raised ${obj.amount}, ${obj.othPlayer}'s turn`,
        bet: `${obj.currPlayer} has bet ${obj.amount}, ${obj.othPlayer}'s turn`
    }
  };
</script>

<style scoped>
  #action-dialog {
    height: 30px;
    width: 500px;
    font-size: 22px;
    line-height: 30px;
    background-color: rgba(0, 0, 0, 0.6);
    border: 2px solid white;
    border-radius: 6px;
    position: absolute;
    left: 0;
    right: 0;
    top: 0;
    bottom: 0;
  }
</style>

{#if messageObj.action}
  <div id="action-dialog" class="container" on:load={setTimer()}>
    {messages[messageObj.action]}
  </div>
{/if}
