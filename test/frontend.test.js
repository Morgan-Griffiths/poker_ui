import app from '../src/App.svelte'
import { getAvailBetsizes } from '../src/actions'
import '@testing-library/jest-dom/extend-expect'
import { render, fireEvent, act } from '@testing-library/svelte'
import { writable, get } from "svelte/store";
import userEvent from '@testing-library/user-event'
import html from "svelte-htm";

test('testAvailableBetsizes', () => {
  let hero = {
    hand: [],
    stack: 4,
    dealer: false,
    position: 1,
    streetTotal: 1
  };
  let villain = {
    hand: [],
    stack: 4,
    dealer: true,
    position: 0,
    streetTotal: 1
  };
  let pot = 2
  const betsize_mask = [1,0,0,0,1]
  const betsizes = [0.5,1]
  const last_action = 2
  const betsize = getAvailBetsizes(betsize_mask,betsizes,last_action,hero,pot)
  // expect(2 + 2).toBe(4);
});

test("write into an input", async () => {
  const text = writable();
  // const { getByRole,getByText,getByTestId,getByLabelText } = render(app);
  const { getByRole } = render(html`<input bind:value=${text} />`);
  const input = getByRole('textbox');

  await userEvent.type(input, 'some text');
  expect(get(text)).toBe('some text');

  await act(() => text.set('another text'));
  expect(input).toHaveValue('another text');
  // const input = getByRole('textbox');
  // console.log(input)
  // await userEvent.type(input, "Morgan");
  // // const element = getByTestId("hero-name");
  // // console.log(element)
  // await fireEvent.click(increment)
  // expect(get(text)).toBe("Morgan");

  // await act(() => text.set("Bilbo"));
  // expect(input).toHaveValue("Bilbo");
});

it('it works', async () => {
  const { getByText, getByTestId } = render(app)
  expect(getByText('Enter Your Name')).toBeInTheDocument()
  const nameField = getByText('Enter Your Name')

  // Using await when firing events is unique to the svelte testing library because
  // we have to wait for the next `tick` so that Svelte flushes all pending state changes.
  // await fireEvent.click(nameField)

  // expect(button).toHaveTextContent('Button Clicked')
  // const name = getByText('Enter Your Name')
  // const increment = getByText('id="name-field"')
  // const decrement = getByText('decrement')
  // const counter = getByTestId('counter-value')

  // await fireEvent.click(increment)
  // await fireEvent.click(increment)
  // await fireEvent.click(increment)
  // await fireEvent.click(decrement)

  // expect(counter.textContent).toBe('2')

  // // with jest-dom
  // expect(counter).toHaveTextContent('2')
})