# Meltova, The Chocolate Lane

The website for Meltova, a home based artisan chocolate business in India. Visitors
browse the menu, add chocolates to a box, and send the whole box to WhatsApp in one
message. There is no payment step and no server: the box lives in the visitor's own
browser until they send it.

Plain HTML, CSS and JavaScript. No framework, no build step, no npm install.

## Running it

Double click `index.html`. That is the whole setup. The site runs straight off the
disk in any modern browser.

If you prefer a local address (useful for testing on your phone over the same
Wi-Fi), run one of these from inside this folder:

```bash
python3 -m http.server 8000
```

Then open `http://localhost:8000`.

## Putting it online

Upload this whole folder as it is. No build command, no configuration.

* **Netlify** drag the folder onto the Netlify dashboard, or connect the repository
  and leave the build command empty with the publish directory set to this folder.
* **Vercel** import the project and choose "Other" as the framework preset.
* **GitHub Pages** push the folder to a repository and turn on Pages for the branch.

## What is in the folder

```
index.html          Landing page
story.html          Our Story
menu.html           Full menu with every price
contact.html        Contact details and the enquiry form
css/styles.css      One stylesheet for all four pages
js/main.js          One script for all four pages
assets/img/         Every photo, the logo, the favicon and the link preview image
README.md           This file
```

## Replacing the photos

Every photo lives in `assets/img/`. To swap one, save your own photo over the top
of the existing file **using exactly the same file name**. Nothing else needs to
change. The names map to the menu like this:

| File name | Where it appears |
|---|---|
| `bite-<flavour>.jpg` | The 14 flavoured bites, for example `bite-kunafa.jpg` |
| `bite-rasmalai-box.jpg`, `bite-mango-hearts.jpg`, `bite-rose-flowers.jpg`, `bite-mango-mould.jpg` | The photo row under the flavoured bites on the menu page |
| `plain-dark.jpg`, `plain-milk.jpg`, `plain-white.jpg` | Plain chocolate bites |
| `nut-almond.jpg`, `nut-mixed.jpg` | Exotic nut crush |
| `bar-<flavour>.jpg` | The 6 premium bar fills, for example `bar-nutella.jpg`. The Kunafa and Biscoff bars come in two sizes and share one photo each |
| `cat-plain.jpg`, `cat-flavoured.jpg`, `cat-nuts.jpg`, `cat-bars.jpg`, `cat-custom.jpg` | The five category circles on the home page |
| `hero-right.jpg`, `hero-frame1.jpg`, `hero-frame2.jpg` | The home page hero |
| `real-giftbox.jpg` | Your pink gift box photo. Hero, the Customise a Bar circle, the story page, the testimonial and the Instagram strip |
| `real-bars.jpg` | Your loaded bars photo. Hero, the Premium Bar Fills circle, the Why Meltova panel and the Instagram strip |
| `real-nutbox.jpg` | Your nut topped box photo. The Exotic Nut Crush circle, the story page, the testimonial and the Instagram strip |
| `reel-1.jpg` to `reel-4.jpg` | The still frame shown before each video loads |
| `meltova-logo.jpg` | The logo in the header, the menu page and the footer |
| `favicon.png` | The small icon in the browser tab |
| `og-image.jpg` | The picture shown when someone shares a link |

Photos work best as square or landscape JPEGs about 800 to 1200 pixels wide, saved
at around 70 to 80 percent quality so pages stay fast.

### Where the photos come from

Every photo is Meltova's own. The last stock image, a Pexels photo standing in for
the Biscoff bar, was replaced in September 2026.

**Nine photos are on the small side.** The Rasmalai, Mango, Rose, Strawberry and
Biscoff bar photos added in September 2026, and the four in the photo row under
the flavoured bites, came from the owner's Pages document at 290 to 500 pixels
wide. They are fine on a laptop and a little soft on a sharp phone screen. If
larger versions turn up, save them over these, same file names, and nothing else
needs to change:

`bite-rasmalai.jpg`, `bite-rasmalai-box.jpg`, `bite-mango.jpg`, `bite-mango-hearts.jpg`,
`bite-mango-mould.jpg`, `bite-rose.jpg`, `bite-rose-flowers.jpg`, `bite-strawberry.jpg`,
`bar-biscoff.jpg`

## The videos

The "Watch a batch come together" section plays your four clips, in the order the
chocolate is actually made:

| Tile | File | Was |
|---|---|---|
| Nuts go in first | `assets/video/reel-1.mp4` | video 3 |
| Then the chocolate | `assets/video/reel-2.mp4` | video 4 |
| Filling the bars | `assets/video/reel-3.mp4` | video 1, the one marked Part 1 |
| Into the box | `assets/video/reel-4.mp4` | video 2, the one marked Part 2 |

**Nothing plays on its own.** Each tile shows a still frame with a play button,
and it stays that way until somebody presses it:

* A clip downloads nothing at all until it is played. Opening the page costs no
  video data, however far down the visitor scrolls.
* Clicking anywhere on the tile plays it, not just the small button. Clicking
  again pauses it. Only the clip you press starts, the other three stay still.
* It runs **muted** and loops.
* A clip you started pauses when it scrolls off screen and picks up again when it
  comes back. One you never started is left alone.

**To swap a clip**, save the new file over the old one with the same name, then
replace its poster picture at `assets/img/reel-1.jpg` and so on. The poster is the
still frame shown before the video loads. To change a caption, edit the
`<figcaption class="reel__cap">` line for that tile in `index.html`.

Note on size: `reel-1.mp4` is the longest at 54 seconds and about 9 MB. Trimming it
to 15 seconds or so would make that part of the page lighter, if you ever want to.

## Everything the owner still needs to fill in

Each item below appears in the code inside square brackets, with a `TODO owner`
comment next to it. Search the file for the text in the first column.

| Placeholder | File | What it is |
|---|---|---|
| `[2 days]` | `contact.html` | Notice needed for a regular box |
| `[7 days]` | `contact.html` | Notice needed for weddings, festivals and bulk |
| `[courier]` | `contact.html` | The courier used for shipping |
| `[2 to 4 days]` | `contact.html` | Usual delivery time |
| `[Which cities you pause for in peak summer]` | `contact.html` | The zones you stop shipping to in the hottest weeks |
| `[Facebook URL]` | every page | The Facebook page address |
| `[YouTube URL]` | every page | The YouTube channel address |
| `[https://your-domain.com]` | every page | The live web address, used in the link preview tags |

One more item is not in brackets but still needs replacing: the customer quote from
**Nisha Verma** on the home page is a sample. Swap it for a real review, and change
the two photos beside it if you like. It is marked with a comment in `index.html`.

## Changing the box sizes

The sizes live in two places, and both must agree:

1. `BOX_SIZES` near the top of `js/main.js`, written as numbers: `[4, 6, 12]`.
2. The three buttons on each bite card in `menu.html` and `index.html`. Search for
   `class="chips"` to find them.

Also update the wording in the menu page hero, the "Mix any of these" line above
the flavoured bites, the Custom Gift Boxes card, and the "Can I mix flavours in one
box?" answer on the contact page.

## The bar sizes

The Kunafa and Biscoff bars come in two sizes, a full bar at ₹599 (260 to 280 g)
and a small bar at ₹269. Both sit on one card with a Full or Small switch, the
same control as the 4, 6 and 12 on the bite cards. Each size goes into the box as
its own line, so a customer can order one of each.

The two prices live on the switch itself. On each bar card in `menu.html` and
`index.html`, search for `chips--size`: every option carries `data-id`,
`data-name`, `data-price` and `data-unit`. Change the number in `data-price`, and
change the price written in the line just above the switch too, so the page reads
right before the script runs. To add a third size, copy one option and give it a
new `id`, `for` and `data-id`.

## Changing a price

Prices are written directly in `menu.html` and on the home page. Search for the
chocolate's name and edit the number next to `&#8377;`, which is the rupee symbol.
If you change a price, update the "Prices last updated" line at the bottom of
`menu.html` too. A visitor who saved a box before the change sees the new price
the next time they open a page that shows that chocolate.

## The WhatsApp links

Every order button opens WhatsApp with a message already written, using the
click to chat address `https://wa.me/917337070931?text=...`. The number `91` at the
front is the country code for India.

If the WhatsApp number ever changes, it appears in three places:

1. `js/main.js`, in the `WHATSAPP_NUMBER` line near the top.
2. Inside every `wa.me` link in the four HTML files.
3. As readable text in the footer and on the contact page.

The quickest way is a find and replace for `917337070931` across the whole folder,
then a second one for `7337070931` to catch the text version.

## Your box, the cart

Every chocolate has an **Add to cart** button. What the visitor adds is collected on
a page of its own, **cart.html**, reached from the bag icon in the header. It was a
slide out panel before, which left the chocolates squeezed between a fixed heading
and the totals. A page gives the list room, and keeps the running total beside it
on a card that follows you down the screen.

**Bites are sold in boxes of 4, 6 or 12. Those are the only sizes.** Every bite
card, on the menu and on the home page, carries that choice as a small row of
three buttons. Pick a size, press Add to cart, and one box of that size goes in.
They are radio buttons underneath, so they work with a keyboard and a screen reader.

Press Add to cart again and a second box of the same size goes in. Once a
chocolate is in the box, its Add to cart button turns into a small counter, minus
and plus, showing how many are in the box at the size that is picked. Minus on
the last one takes it out and the button comes back. The same flavour can sit in
the box at two sizes, a box of 12 and a box of 4 say, each on its own line.

Bars, nut crush boxes and the stick box are sold one at a time, not by the piece.
Those have no size buttons, and their counter counts single items.

In the cart every line has the same minus and plus counter. A bite line also has
the size picker, and moving a line to a size that is already in the box folds the
two lines into one. From there they can remove a line, tick the cold pack, and
see the full total with delivery.

### The ordering rules

| Rule | Value |
|---|---|
| Minimum order | ₹399 |
| Delivery | ₹140 flat, anywhere in India, for parcels up to 2 kg. Heavier and bulk parcels are quoted by hand |
| Free delivery | none, ₹140 is added to every order |
| Cold pack | ₹99, optional, ticked by the customer |

Below ₹399 the Continue button is switched off and the panel says how much more
is needed. The note under the total also tells the customer how much further to go
for free delivery, which nudges the order up on its own.

Free delivery is worked out on the chocolate alone. The cold pack is an add on,
so it is still charged on a free delivery order.

**To change any of these four numbers**, edit the block marked `OWNER SETTINGS`
near the middle of `js/main.js`:

```js
var MIN_ORDER = 399;
var SHIP_FEE  = 140;
var FREE_OVER = null;
var COLD_PACK = 99;
```

Then update the wording in the "Is there a minimum order?" answer on
`contact.html` so the page and the code agree.

### Delivery details

Pressing Continue carries you down to the delivery section, which asks for name, phone,
full address, city, pincode, the date it is needed and any note. Name, phone,
address, city and pincode are required. The pincode must be six digits and the
phone at least ten, and both are checked before anything is sent.

The details are saved in that visitor's own browser, so a returning customer does
not retype their address. The single button at the bottom, **Send this order on WhatsApp**, opens
WhatsApp with the whole order already written out, like this:

```
Hi Meltova, I'd like to order:

2 x Box of 12 Kunafa bites (₹40 per piece) = ₹960
2 x Biscoff bar (₹599 per bar) = ₹1,198

Subtotal: ₹2,158
Delivery: ₹140
Cold pack: ₹99
Total: ₹2,397

Deliver to:
Anita Sharma
9876543210
Flat 4B, 12 MG Road
Mumbai 400001
Needed by: 14 October
Note: Please add a message card
```

A few things worth knowing:

* The box is saved in the visitor's own browser, so it survives moving between
  pages and closing the tab. Nothing is sent anywhere until they press the button.
* Nothing is charged on the site. You confirm the date and take payment in the
  WhatsApp conversation.
* A box saved before the sizes changed is tidied up on the next visit. Anything
  that is no longer a real size is moved to the nearest one that is, and a line
  saved before boxes could be counted becomes one box of that size.
* The heart on each card saves a chocolate to a private list, also in that
  visitor's browser. The count shows on the heart icon in the header.
* The account icon is still decoration and says "coming soon" when tapped.

To change the wording of the panel, edit the `<aside class="cart">` block, which
sits near the bottom of all four HTML files. To change the WhatsApp message the
panel builds, edit the `cartMessage` function in `js/main.js`.

## The enquiry form

The form on `contact.html` never sends anything to a server. On submit it checks
the required fields, builds a WhatsApp message out of the answers, and opens
WhatsApp in a new tab. If the visitor already has chocolates in their box, those
lines are added to the same message. That is why the site needs no hosting plan and
no database.

## Notes on how it was built

* **Colours and fonts** are defined once at the top of `css/styles.css` as custom
  properties, so the whole site can be re-tinted from one place.
* **Fonts** are Cormorant Garamond for headings, Great Vibes for the gold script
  lines and Jost for body text, loaded from Google Fonts.
* **Accessibility.** Every image has alt text, every form field has a label, the
  menu and form work with a keyboard, focus outlines are visible, tap targets are
  at least 44 pixels on phones, and all text colours meet WCAG AA contrast.
* **Motion.** The rotating badge, the scrolling trust strip and the fade in effects
  all switch off for visitors who have "reduce motion" turned on in their system
  settings.
* **Video.** The four kitchen clips are click to play, muted, and download
  nothing until played.
* **Animation.** Sections rise into view as you scroll, headings arrive word by
  word, photos in the split sections wipe upward, the hero photo and the wide
  photo bands drift slowly behind their text, product photos zoom with a soft
  shine on hover, the category circles change shape gently, and a thin gold line
  under the header tracks reading progress. All of it uses transforms only, so it
  stays smooth, and all of it switches off under "reduce motion".
* **Nothing is stored off the device.** The box and the saved list use the
  browser's own storage. There is no account, no tracking and no server.
