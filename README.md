# Five Letters

A Wordle-style word game in plain HTML, CSS and JavaScript. It has no build step and no dependencies.

## Play

Open `index.html` in a browser.

- Guess the 5-letter word in 6 tries. Green means the letter is in the right spot, yellow means it's in the word but in the wrong spot, and gray means it's not in the word.
- **Daily** mode gives one shared word per day. **Practice** mode gives unlimited random words.
- Once the daily word is done, a countdown shows when the next one arrives, and **Keep playing** switches to Practice. Practice never gives you that day's daily word.
- Daily and Practice stats are kept separately in your browser's localStorage. The daily streak only continues if you solve the daily word on consecutive days.
- After your 5th missed guess, a hint reveals one letter of the answer.
- **Share** copies your result grid to the clipboard (with 💡 if you used the hint).

## Files

- `index.html`: page layout
- `style.css`: styles, animations and dark mode
- `app.js`: game logic, keyboard, stats and sharing
- `words.js`: the 538 common words used as answers
- `guesses.js`: 8,636 more five-letter words accepted as guesses, from the public-domain ENABLE word list
