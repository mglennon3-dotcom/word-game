# Five Letters

A Wordle-style word game in plain HTML, CSS and JavaScript. It has no build step and no dependencies.

## Play

Open `index.html` in a browser.

- Guess the 5-letter word in 6 tries. Green means the letter is in the right spot, yellow means it's in the word but in the wrong spot, and gray means it's not in the word.
- **Daily** mode gives one shared word per day. **Practice** mode gives unlimited random words.
- Your stats and streaks are saved in your browser's localStorage.
- **Share** copies your result grid to the clipboard.

## Files

- `index.html`: page layout
- `style.css`: styles, animations and dark mode
- `app.js`: game logic, keyboard, stats and sharing
- `words.js`: the word list (answers and allowed guesses)
