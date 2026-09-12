/* ==========================================================================
   Meltova, The Chocolate Lane
   Billing desk. Runs on admin.html only.

   What this file does, in order:
     1. Owner settings, the passcode and the product list
     2. Small helpers
     3. The sign in gate
     4. The form, its product lines and the saved draft
     5. The bill, drawn on a canvas
     6. Download and copy

   The bill you see on the page and the bill that lands in the PNG are the same
   drawing. There is no second layout in HTML to keep in step, so the picture
   the customer receives is always the picture the desk showed.
   ========================================================================== */

(function () {
  "use strict";

  /* 1. Owner settings ==================================================== */

  /* THE PASSCODE. Only the SHA-256 fingerprint of the passcode is stored here,
     never the passcode itself. The one below belongs to:

         meltova@2026

     To change it, open this page in the browser, press F12 for the console and
     run:   meltovaHash("your new passcode")
     Copy the line it prints over PASS_HASH and save this file.

     Read this honestly: admin.html is a plain file on a plain web host, so this
     gate hides the desk, it does not guard it. Anyone who knows the address can
     read the page source. Keep the address private, and if the bills ever need
     real protection, put the page behind a host level login (Cloudflare Access,
     Netlify Identity or similar). */
  var PASS_SALT = "meltova-admin-v1:";
  var PASS_HASH = "2b14443372e91ea839d76dd96ed9575e4911c411a75a7e555717d33152cf2ad1";

  var SHIP_FEE = 140;    /* the flat delivery charge the shop starts from */

  /* What the Download button saves. A JPG at this quality looks the same as a
     PNG on any screen and comes out near a tenth of the size, which matters
     when the bill travels over mobile data. For a lossless file, set IMG_TYPE
     to "image/png"; the quality setting is then ignored. */
  var IMG_TYPE = "image/jpeg";
  var IMG_QUAL = 0.95;
  var MAX_LINES = 25;    /* a bill longer than this stops being readable */

  /* The chocolates, as menu.html lists them.

     This copy is the fallback. On every load the desk reads menu.html itself and
     takes the prices from there, so a price changed on the menu reaches the bill
     with nothing to remember and nothing to edit twice. The copy below only
     stands in when that read fails.

     Anything not on the list can still be typed into a product box by hand. */
  var CATALOGUE = [
    { name: "Plain Dark Chocolate",  price: 20,  unit: "per piece" },
    { name: "Plain Milk Chocolate",  price: 20,  unit: "per piece" },
    { name: "Plain White Chocolate", price: 20,  unit: "per piece" },
    { name: "Caramel bites",         price: 30,  unit: "per piece" },
    { name: "Coconut bites",         price: 30,  unit: "per piece" },
    { name: "Date bites",            price: 30,  unit: "per piece" },
    { name: "Dry Fruits bites",      price: 30,  unit: "per piece" },
    { name: "Mango bites",           price: 30,  unit: "per piece" },
    { name: "Oreo bites",            price: 30,  unit: "per piece" },
    { name: "Paan bites",            price: 30,  unit: "per piece" },
    { name: "Pista bites",           price: 30,  unit: "per piece" },
    { name: "Rasmalai bites",        price: 30,  unit: "per piece" },
    { name: "Rose bites",            price: 30,  unit: "per piece" },
    { name: "Strawberry bites",      price: 30,  unit: "per piece" },
    { name: "Biscoff bites",         price: 40,  unit: "per piece" },
    { name: "Kunafa bites",          price: 40,  unit: "per piece" },
    { name: "Nutella bites",         price: 40,  unit: "per piece" },
    { name: "Customised bites",      price: 50,  unit: "per piece" },
    { name: "Big Bites",             price: 69,  unit: "per piece" },
    { name: "Almond Crush",          price: 219, unit: "per box" },
    { name: "Mixed Nut Crush",       price: 249, unit: "per box" },
    { name: "Small Biscoff bar",     price: 269, unit: "per small bar" },
    { name: "Small Kunafa bar",      price: 269, unit: "per small bar" },
    { name: "Modak box of 11",       price: 299, unit: "per box" },
    { name: "Caramel bar",           price: 399, unit: "per bar" },
    { name: "Chocolate Stick Box",   price: 399, unit: "per box" },
    { name: "Dry Fruits bar",        price: 399, unit: "per bar" },
    { name: "Nutella bar",           price: 399, unit: "per bar" },
    { name: "Oreo bar",              price: 399, unit: "per bar" },
    { name: "Biscoff bar",           price: 599, unit: "per bar, 260 to 280 g" },
    { name: "Kunafa bar",            price: 599, unit: "per bar, 260 to 280 g" }
  ];

  var LOOKUP = {};

  function applyCatalogue(list) {
    CATALOGUE = list;
    LOOKUP = {};
    CATALOGUE.forEach(function (p) { LOOKUP[p.name.toLowerCase()] = p; });
    if (started) buildDatalist();
  }

  applyCatalogue(CATALOGUE);

  /* menu.html sits beside index.html, which the brand mark already links to, so
     its address is worked out from that link rather than written out here. */
  function menuURL() {
    var brand = document.querySelector(".brand");
    try { return new URL("menu.html", brand ? brand.href : location.href).href; }
    catch (e) { return "../menu.html"; }
  }

  function syncCatalogue() {
    if (!window.fetch || !window.DOMParser) return;

    fetch(menuURL()).then(function (r) {
      return r.ok ? r.text() : Promise.reject(new Error(String(r.status)));
    }).then(function (html) {
      var doc = new DOMParser().parseFromString(html, "text/html");
      var found = {};

      $$("[data-name][data-price]", doc).forEach(function (el) {
        var name  = (el.getAttribute("data-name") || "").trim();
        var price = parseInt(el.getAttribute("data-price"), 10);
        var unit  = (el.getAttribute("data-unit") || "").trim();
        if (!name || !isFinite(price) || price < 0) return;

        /* One chocolate can sit on several buttons. The first that carries a
           unit wins; the others only repeat the price. */
        if (!found[name] || (!found[name].unit && unit)) {
          found[name] = { name: name, price: price, unit: unit };
        }
      });

      var list = Object.keys(found).map(function (k) { return found[k]; });
      if (list.length < 5) return;        /* the page is not what we expected */

      list.sort(function (a, b) { return a.price - b.price || a.name.localeCompare(b.name); });
      applyCatalogue(list);
    })["catch"](function () {
      /* No menu, no matter. The list written above stands. */
    });
  }

  /* 2. Small helpers ===================================================== */

  var RUPEE = "₹";
  var $  = function (sel, root) { return (root || document).querySelector(sel); };
  var $$ = function (sel, root) {
    return Array.prototype.slice.call((root || document).querySelectorAll(sel));
  };

  /* Prices are grouped the Indian way, so 120000 reads as 1,20,000. */
  function money(n) {
    var v = Math.round(Number(n) || 0);
    return RUPEE + v.toLocaleString("en-IN");
  }

  function num(v) {
    var n = parseFloat(v);
    return isFinite(n) && n > 0 ? n : 0;
  }

  function esc(s) {
    return String(s == null ? "" : s);
  }

  function today() {
    var M = ["January", "February", "March", "April", "May", "June", "July",
             "August", "September", "October", "November", "December"];
    var d = new Date();
    return d.getDate() + " " + M[d.getMonth()] + " " + d.getFullYear();
  }

  /* The bill number reads BILL_STAMP, then the day and month, then the order
     that bill takes on that day. The second bill of 12 September is
     MLT-1209-02.

     The desk keeps a small tally in this browser: the day, and how many bills
     have gone out on it. A bill takes the next number when it is started, and
     the tally only moves once the bill has actually been downloaded or copied,
     so a bill begun and abandoned costs no number.

     Two things worth knowing. The tally lives in this browser only, so billing
     from a second device, or clearing the browser data, starts the day at 01
     again. And the bill number stays an ordinary box, so any number can be
     typed over it, and a number typed by hand moves the tally with it. */
  var COUNT_KEY  = "meltova-admin-billcount";
  var BILL_STAMP = "MLT";

  function dayStamp() {
    var d = new Date();
    var pad = function (n) { return (n < 10 ? "0" : "") + n; };
    return pad(d.getDate()) + pad(d.getMonth() + 1);
  }

  function readCount() {
    try { return JSON.parse(localStorage.getItem(COUNT_KEY)) || {}; }
    catch (e) { return {}; }
  }

  function issued(day) {
    var n = parseInt(readCount()[day], 10);
    return isFinite(n) && n > 0 ? n : 0;
  }

  function autoBillNo() {
    var day = dayStamp();
    var seq = issued(day) + 1;
    return BILL_STAMP + "-" + day + "-" + (seq < 10 ? "0" + seq : String(seq));
  }

  /* Run once a bill has really gone out. A number for another day, or a number
     no higher than the tally already holds, leaves the tally where it is, so
     saving the same bill twice does not skip a number. */
  function commitBillNo(text) {
    var day = dayStamp();
    var m = /^([A-Za-z]+)-(\d{4})-(\d+)$/.exec(String(text).trim());
    if (!m || m[2] !== day) return;

    var seq = parseInt(m[3], 10);
    if (!isFinite(seq) || seq <= issued(day)) return;

    var c = {};
    c[day] = seq;                  /* older days are of no further use */
    try { localStorage.setItem(COUNT_KEY, JSON.stringify(c)); } catch (e) {}
  }

  /* 3. The sign in gate ================================================== */

  var GATE_KEY = "meltova-admin-open";

  function sha256(text) {
    var bytes = new TextEncoder().encode(text);
    return crypto.subtle.digest("SHA-256", bytes).then(function (buf) {
      return Array.prototype.map.call(new Uint8Array(buf), function (b) {
        return ("0" + b.toString(16)).slice(-2);
      }).join("");
    });
  }

  /* Handy at the console when the passcode needs changing. */
  window.meltovaHash = function (pass) {
    return sha256(PASS_SALT + String(pass)).then(function (h) {
      console.log('PASS_HASH = "' + h + '";');
      return h;
    });
  };

  var gate      = $("[data-gate]");
  var workspace = $("[data-workspace]");
  var lockBtn   = $("[data-lock]");

  function openDesk() {
    gate.hidden = true;
    workspace.hidden = false;
    lockBtn.hidden = false;
    startDesk();
  }

  function lockDesk() {
    try { sessionStorage.removeItem(GATE_KEY); } catch (e) {}
    window.location.reload();
  }

  function initGate() {
    var form = $("[data-login]");
    var input = $("#admin-pass");
    var errEl = $("[data-login-err]");

    /* The Lock button is wired first. A reload of an already open session takes
       the early exit below, and until this moved up, Lock came back dead. */
    lockBtn.addEventListener("click", lockDesk);

    var already = false;
    try { already = sessionStorage.getItem(GATE_KEY) === "1"; } catch (e) {}
    if (already) { openDesk(); return; }

    input.focus();

    form.addEventListener("submit", function (ev) {
      ev.preventDefault();
      errEl.textContent = "";

      if (!window.crypto || !crypto.subtle) {
        errEl.textContent = "This browser cannot check the passcode. Open the page over https or on localhost.";
        return;
      }

      sha256(PASS_SALT + input.value).then(function (h) {
        if (h === PASS_HASH) {
          try { sessionStorage.setItem(GATE_KEY, "1"); } catch (e) {}
          openDesk();
        } else {
          errEl.textContent = "That passcode is not right.";
          input.value = "";
          input.focus();
          var card = $(".gate__card");
          card.classList.remove("is-wrong");
          void card.offsetWidth;          /* restart the shake */
          card.classList.add("is-wrong");
        }
      });
    });
  }

  /* 4. The form ========================================================== */

  var DRAFT_KEY = "meltova-admin-draft";
  var linesEl, formEl, started = false;

  var rowSeq = 0;

  function rowHTML(errId) {
    return '' +
      '<div class="lineitem__grid">' +
        '<div class="field field--name">' +
          '<label>Product <span class="req" aria-hidden="true">*</span></label>' +
          '<input type="text" data-f="name" list="product-list" placeholder="Oreo bites" autocomplete="off" required aria-required="true" aria-describedby="' + errId + '">' +
        '</div>' +
        '<div class="field">' +
          '<label>Qty <span class="req" aria-hidden="true">*</span></label>' +
          '<input type="number" data-f="qty" min="1" step="1" inputmode="numeric" placeholder="4" required aria-required="true" aria-describedby="' + errId + '">' +
        '</div>' +
        '<div class="field">' +
          '<label>Rate ' + RUPEE + ' <span class="req" aria-hidden="true">*</span></label>' +
          '<input type="number" data-f="rate" min="0" step="1" inputmode="numeric" placeholder="30" required aria-required="true" aria-describedby="' + errId + '">' +
        '</div>' +
        '<div class="field">' +
          '<label>Unit</label>' +
          '<input type="text" data-f="unit" placeholder="per piece" autocomplete="off">' +
        '</div>' +
        '<p class="lineitem__err" id="' + errId + '"></p>' +
        '<p class="lineitem__amt"><span>Amount</span><b data-amount>' + money(0) + '</b></p>' +
      '</div>' +
      '<button type="button" class="lineitem__del" data-del aria-label="Remove this product">&#215;</button>';
  }

  function addRow(values) {
    if (linesEl.children.length >= MAX_LINES) return null;
    var li = document.createElement("li");
    li.className = "lineitem";
    li.innerHTML = rowHTML("lineerr-" + (++rowSeq));
    linesEl.appendChild(li);

    if (values) {
      $('[data-f="name"]', li).value = esc(values.name);
      $('[data-f="qty"]',  li).value = values.qty  ? values.qty  : "";
      $('[data-f="rate"]', li).value = values.rate ? values.rate : "";
      $('[data-f="unit"]', li).value = esc(values.unit);
    }
    refreshDelButtons();
    return li;
  }

  function refreshDelButtons() {
    var rows = $$(".lineitem", linesEl);
    rows.forEach(function (r) {
      $("[data-del]", r).disabled = rows.length === 1;
    });
  }

  /* A product picked off the list fills its own rate and unit. A rate the admin
     has typed over is left alone, so a special price for one customer survives
     a change of product name. */
  function fillFromCatalogue(row) {
    var nameEl = $('[data-f="name"]', row);
    var rateEl = $('[data-f="rate"]', row);
    var unitEl = $('[data-f="unit"]', row);
    var hit = LOOKUP[nameEl.value.trim().toLowerCase()];
    if (!hit) return;
    if (rateEl.dataset.touched !== "1") rateEl.value = hit.price;
    if (unitEl.dataset.touched !== "1") unitEl.value = hit.unit;
  }

  /* What the desk will not send out.

     Product, quantity and rate are needed on every line that has been started.
     A customer cannot check a bill that does not say how many of a thing were
     bought, or what each one cost.

     Three boxes stay optional on purpose. The unit, because not every line
     carries a "per piece" phrase and the reference bill leaves it off a one off
     item. The customer name and phone, because a bill handed over the counter
     often has neither. The closing line, because it is decoration.

     Delivery has to be filled, but 0 is a perfectly good answer for a pickup. */

  var showErrors = false;   /* set once the admin has tried to send a bill */

  function setErr(el, msg) {
    var field = el.closest(".field");
    var p = field ? $(".err", field) : null;
    if (p) p.textContent = msg || "";
    mark(el, !!msg);
  }

  function mark(el, isBad) {
    if (isBad) el.setAttribute("aria-invalid", "true");
    else el.removeAttribute("aria-invalid");
  }

  /* "a name, a quantity and a rate" */
  function listOut(parts) {
    if (parts.length < 2) return parts[0] || "";
    return parts.slice(0, -1).join(", ") + " and " + parts[parts.length - 1];
  }

  /* A spare row nobody has touched is not a mistake, it is just a spare row. */
  function rowIsBlank(row) {
    return ["name", "qty", "rate", "unit"].every(function (f) {
      return $('[data-f="' + f + '"]', row).value.trim() === "";
    });
  }

  function validate(quiet) {
    var bad = [];

    function check(el, ok, msg) {
      if (!quiet) setErr(el, ok ? "" : msg);
      if (!ok) bad.push(el);
      return ok;
    }

    check($("#b-no"),   $("#b-no").value.trim()   !== "", "A bill number is needed.");
    check($("#b-date"), $("#b-date").value.trim() !== "", "A date is needed.");

    var shipRaw = $("#b-ship").value.trim();
    var ship = parseFloat(shipRaw);
    check($("#b-ship"), shipRaw !== "" && isFinite(ship) && ship >= 0,
          "Enter the delivery charge. Put 0 if there is none.");

    var filled = 0;
    $$(".lineitem", linesEl).forEach(function (row) {
      var nameEl = $('[data-f="name"]', row);
      var qtyEl  = $('[data-f="qty"]',  row);
      var rateEl = $('[data-f="rate"]', row);

      var errEl = $(".lineitem__err", row);

      if (rowIsBlank(row)) {
        if (!quiet) {
          mark(nameEl, false); mark(qtyEl, false); mark(rateEl, false);
          errEl.textContent = "";
          row.classList.remove("is-bad");
        }
        return;
      }
      filled++;

      var q = parseFloat(qtyEl.value);
      var r = parseFloat(rateEl.value);
      var miss = [];

      if (nameEl.value.trim() === "")             { bad.push(nameEl); miss.push("a name"); }
      if (!isFinite(q) || q < 1)                  { bad.push(qtyEl);  miss.push(qtyEl.value.trim() === "" ? "a quantity" : "a quantity of 1 or more"); }
      if (rateEl.value.trim() === "" || !isFinite(r) || r < 0) { bad.push(rateEl); miss.push("a rate"); }

      if (!quiet) {
        mark(nameEl, miss.indexOf("a name") > -1);
        mark(qtyEl,  !isFinite(q) || q < 1);
        mark(rateEl, rateEl.value.trim() === "" || !isFinite(r) || r < 0);
        errEl.textContent = miss.length ? "This line needs " + listOut(miss) + "." : "";
        row.classList.toggle("is-bad", miss.length > 0);
      }
    });

    if (filled === 0) {
      var firstRow = $(".lineitem", linesEl);
      if (firstRow) {
        var firstName = $('[data-f="name"]', firstRow);
        bad.push(firstName);
        if (!quiet) {
          mark(firstName, true);
          $(".lineitem__err", firstRow).textContent = "Add at least one product.";
          firstRow.classList.add("is-bad");
        }
      }
    }

    return bad;
  }

  /* Called by the two buttons. Anything missing is pointed at and named, and
     nothing leaves the desk. */
  function ready() {
    showErrors = true;
    var bad = validate(false);
    if (!bad.length) return true;

    bad[0].focus();
    say(bad.length === 1
          ? "One box still needs filling. It is marked below."
          : bad.length + " boxes still need filling. They are marked below.",
        "is-bad");
    return false;
  }

  function readForm() {
    var meta = {};
    $$("[data-meta]", formEl).forEach(function (el) {
      meta[el.getAttribute("data-meta")] = el.value.trim();
    });

    var items = [];
    $$(".lineitem", linesEl).forEach(function (row) {
      var name = $('[data-f="name"]', row).value.trim();
      var qty  = num($('[data-f="qty"]',  row).value);
      var rate = num($('[data-f="rate"]', row).value);
      var unit = $('[data-f="unit"]', row).value.trim();
      var amount = Math.round(qty * rate);

      $("[data-amount]", row).textContent = money(amount);

      /* A line with no name is a line the admin has not filled yet. It stays on
         the form and stays off the bill. */
      if (name) items.push({ name: name, qty: qty, rate: rate, unit: unit, amount: amount });
    });

    var subtotal = items.reduce(function (n, it) { return n + it.amount; }, 0);
    var shipping = Math.round(num(meta.shipping));

    return {
      no: meta.no || "",
      date: meta.date || "",
      customer: meta.customer || "",
      phone: meta.phone || "",
      thanks: meta.thanks || "",
      items: items,
      subtotal: subtotal,
      shipping: shipping,
      total: subtotal + shipping
    };
  }

  function saveDraft(data) {
    try {
      localStorage.setItem(DRAFT_KEY, JSON.stringify({
        no: data.no, date: data.date, customer: data.customer, phone: data.phone,
        thanks: data.thanks, shipping: $("#b-ship").value,
        rows: $$(".lineitem", linesEl).map(function (row) {
          return {
            name: $('[data-f="name"]', row).value,
            qty:  $('[data-f="qty"]',  row).value,
            rate: $('[data-f="rate"]', row).value,
            unit: $('[data-f="unit"]', row).value
          };
        })
      }));
    } catch (e) {}
  }

  function loadDraft() {
    var raw = null;
    try { raw = localStorage.getItem(DRAFT_KEY); } catch (e) {}
    if (!raw) return null;
    try { return JSON.parse(raw); } catch (e) { return null; }
  }

  function fillDefaults() {
    $("#b-no").value    = autoBillNo();
    $("#b-date").value  = today();
    $("#b-ship").value  = SHIP_FEE;
    $("#b-thanks").value = "We truly appreciate your support. You just made our day sweeter!";
  }

  function buildDatalist() {
    var dl = $("#product-list");
    dl.innerHTML = CATALOGUE.map(function (p) {
      return '<option value="' + p.name + '">' + money(p.price) + " " + p.unit + "</option>";
    }).join("");
  }

  /* 5. The bill, drawn on a canvas ======================================= */

  var W     = 840;   /* logical width. The PNG comes out at W * SCALE across */
  var PAD   = 66;
  var SCALE = 2;

  var COL = {
    ink:   "#f3e8d6",   /* the cream the headings and figures sit in */
    dim:   "#c9b697",
    gold:  "#c69a4c",
    goldL: "#e0bd77",
    rule:  "rgba(198, 154, 76, .26)",
    faint: "rgba(232, 206, 158, .14)"
  };

  var canvas = null, ctx = null, logo = null, logoReady = false;

  /* Tracked text. Canvas has a letterSpacing property, but not in every browser
     the shop might open this on, so the letters are placed one by one. */
  function trackedWidth(text, sp) {
    var w = 0;
    for (var i = 0; i < text.length; i++) w += ctx.measureText(text[i]).width + sp;
    return w - (text.length ? sp : 0);
  }

  function tracked(text, x, y, sp, align, dry) {
    ctx.textAlign = "left";          /* the offset below assumes it */
    var w = trackedWidth(text, sp);
    var cx = align === "center" ? x - w / 2 : align === "right" ? x - w : x;
    if (!dry) {
      for (var i = 0; i < text.length; i++) {
        ctx.fillText(text[i], cx, y);
        cx += ctx.measureText(text[i]).width + sp;
      }
    }
    return w;
  }

  function wrap(text, maxW) {
    var words = String(text).split(/\s+/);
    var lines = [], line = "";
    for (var i = 0; i < words.length; i++) {
      var next = line ? line + " " + words[i] : words[i];
      if (ctx.measureText(next).width > maxW && line) { lines.push(line); line = words[i]; }
      else line = next;
    }
    if (line) lines.push(line);
    return lines;
  }

  function hairline(y, x1, x2, colour, width, dry) {
    if (dry) return;
    ctx.strokeStyle = colour;
    ctx.lineWidth = width || 1;
    ctx.beginPath();
    ctx.moveTo(x1, y + 0.5);
    ctx.lineTo(x2, y + 0.5);
    ctx.stroke();
  }

  function heart(cx, cy, s) {
    ctx.beginPath();
    ctx.moveTo(cx, cy + s * 0.95);
    ctx.bezierCurveTo(cx - s * 1.5, cy - s * 0.25, cx - s * 0.62, cy - s * 1.25, cx, cy - s * 0.32);
    ctx.bezierCurveTo(cx + s * 0.62, cy - s * 1.25, cx + s * 1.5, cy - s * 0.25, cx, cy + s * 0.95);
    ctx.closePath();
    ctx.fill();
  }

  /* A cocoa leaf: two curves meeting at the stem, with a rib down the middle. */
  function leaf(x, y, len, wide, ang) {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(ang);
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.quadraticCurveTo(len * 0.45, -wide, len, 0);
    ctx.quadraticCurveTo(len * 0.45,  wide, 0, 0);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(len * 0.06, 0);
    ctx.lineTo(len * 0.9, 0);
    ctx.stroke();
    ctx.restore();
  }

  /* The sprays of cocoa leaves in the two bottom corners. */
  function spray(x, y, dir, H) {
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(dir, 1);
    ctx.strokeStyle = "rgba(198, 154, 76, .26)";
    ctx.lineWidth = 1.1;
    ctx.lineCap = "round";

    var CX = 62, CY = -14, EX = 118, EY = -78;   /* the stem, as a curve */
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.quadraticCurveTo(CX, CY, EX, EY);
    ctx.stroke();

    var at = function (t) {
      var mt = 1 - t;
      return {
        x: 2 * mt * t * CX + t * t * EX,
        y: 2 * mt * t * CY + t * t * EY
      };
    };
    var spots = [0.14, 0.34, 0.54, 0.74, 0.92];
    for (var i = 0; i < spots.length; i++) {
      var p = at(spots[i]);
      leaf(p.x, p.y, 40 - i * 3, 12, i % 2 === 0 ? -1.15 : -0.02);
    }
    ctx.restore();
  }

  /* One pass over the bill. With dry set to true nothing is painted, the pass
     only adds up how tall the bill needs to be. Both passes walk the same code,
     so the height can never drift away from the drawing. */
  function paint(d, dry) {
    var y = 0;
    var cx = W / 2;
    var qtyX = W - PAD - 196;      /* centre of the Qty column */
    var amtX = W - PAD;            /* right edge of the Amount column */
    var nameMax = qtyX - 74 - PAD;

    y += 52;

    /* Logo */
    if (!dry) {
      if (logoReady) {
        ctx.save();
        ctx.beginPath();
        ctx.arc(cx, y + 44, 44, 0, Math.PI * 2);
        ctx.closePath();
        ctx.clip();
        ctx.drawImage(logo, cx - 44, y + 44 - 44, 88, 88);
        ctx.restore();
      }
      ctx.strokeStyle = "rgba(198, 154, 76, .55)";
      ctx.lineWidth = 1.4;
      ctx.beginPath();
      ctx.arc(cx, y + 44, 46, 0, Math.PI * 2);
      ctx.stroke();
    }
    y += 88 + 26;

    /* MELTOVA */
    ctx.fillStyle = "#ffffff";
    ctx.font = '600 38px "Cormorant Garamond", Georgia, serif';
    ctx.textBaseline = "alphabetic";
    tracked("MELTOVA", cx, y + 28, 9.5, "center", dry);
    y += 28 + 14;

    /* The Chocolate Lane */
    ctx.fillStyle = COL.gold;
    ctx.font = '400 11px "Jost", Helvetica, Arial, sans-serif';
    tracked("THE CHOCOLATE LANE", cx, y + 8, 3.4, "center", dry);
    y += 8 + 30;

    /* Gold rule with a diamond in the middle */
    if (!dry) {
      hairline(y, PAD, cx - 16, COL.rule, 1, dry);
      hairline(y, cx + 16, W - PAD, COL.rule, 1, dry);
      ctx.fillStyle = COL.gold;
      ctx.save();
      ctx.translate(cx, y + 0.5);
      ctx.rotate(Math.PI / 4);
      ctx.fillRect(-3.4, -3.4, 6.8, 6.8);
      ctx.restore();
    }
    y += 34;

    /* Bill number, date, customer */
    var left = [];
    if (d.no) left.push("Bill " + d.no);
    if (d.customer) left.push("For " + d.customer);
    if (d.phone) left.push(d.phone);
    if (left.length || d.date) {
      ctx.font = '300 14px "Jost", Helvetica, Arial, sans-serif';
      ctx.fillStyle = COL.dim;
      if (!dry) {
        ctx.textAlign = "left";
        ctx.fillText(left.join("   ·   "), PAD, y + 11);
        ctx.textAlign = "right";
        ctx.fillText(d.date, amtX, y + 11);
        ctx.textAlign = "left";
      }
      y += 11 + 30;
    }

    /* ORDER BILL */
    ctx.fillStyle = COL.ink;
    ctx.font = '700 34px "Cormorant Garamond", Georgia, serif';
    tracked("ORDER BILL", PAD, y + 26, 2.6, "left", dry);
    y += 26 + 26;

    /* Column headings */
    ctx.font = '400 15px "Jost", Helvetica, Arial, sans-serif';
    ctx.fillStyle = COL.dim;
    if (!dry) {
      ctx.textAlign = "left";   ctx.fillText("Product", PAD, y + 12);
      ctx.textAlign = "center"; ctx.fillText("Qty.", qtyX, y + 12);
      ctx.textAlign = "right";  ctx.fillText("Amount", amtX, y + 12);
      ctx.textAlign = "left";
    }
    y += 12 + 16;
    hairline(y, PAD, W - PAD, COL.rule, 1, dry);

    /* The lines */
    if (!d.items.length) {
      y += 30;
      ctx.font = '300 16px "Jost", Helvetica, Arial, sans-serif';
      ctx.fillStyle = COL.dim;
      if (!dry) ctx.fillText("No products added yet.", PAD, y + 12);
      y += 12 + 30;
      hairline(y, PAD, W - PAD, COL.rule, 1, dry);
    }

    for (var i = 0; i < d.items.length; i++) {
      var it = d.items[i];
      y += 22;
      var rowTop = y;

      ctx.font = '600 24px "Cormorant Garamond", Georgia, serif';
      var nameLines = wrap(it.name, nameMax);
      var nameH = nameLines.length * 28;

      var sub = "";
      if (it.rate > 0) {
        sub = "(" + money(it.rate) + (it.unit ? " " + it.unit : "") + ")";
      } else if (it.unit) {
        sub = "(" + it.unit + ")";
      }
      var blockH = nameH + (sub ? 24 : 0);

      if (!dry) {
        ctx.fillStyle = COL.ink;
        ctx.font = '600 24px "Cormorant Garamond", Georgia, serif';
        ctx.textAlign = "left";
        for (var k = 0; k < nameLines.length; k++) {
          ctx.fillText(nameLines[k], PAD, rowTop + 20 + k * 28);
        }
        if (sub) {
          ctx.font = '300 14px "Jost", Helvetica, Arial, sans-serif';
          ctx.fillStyle = COL.dim;
          ctx.fillText(sub, PAD, rowTop + nameH + 13);
        }

        /* Qty and Amount sit on the middle of the whole line, the way the two
           columns line up on a printed bill. */
        var mid = rowTop + blockH / 2 + 7;
        ctx.font = '300 20px "Jost", Helvetica, Arial, sans-serif';
        ctx.fillStyle = COL.ink;
        ctx.textAlign = "center";
        ctx.fillText(String(it.qty || ""), qtyX, mid);
        ctx.textAlign = "right";
        ctx.fillText(money(it.amount), amtX, mid);
        ctx.textAlign = "left";
      }

      y = rowTop + blockH + 22;
      hairline(y, PAD, W - PAD, COL.rule, 1, dry);
    }

    /* Subtotal and delivery */
    y += 26;
    var sums = [["Subtotal", d.subtotal]];
    if (d.shipping > 0) sums.push(["Delivery", d.shipping]);
    for (var s = 0; s < sums.length; s++) {
      ctx.font = '300 17px "Jost", Helvetica, Arial, sans-serif';
      if (!dry) {
        ctx.fillStyle = COL.ink;
        ctx.textAlign = "left";
        ctx.fillText(sums[s][0], PAD, y + 13);
        ctx.textAlign = "right";
        ctx.fillText(money(sums[s][1]), amtX, y + 13);
        ctx.textAlign = "left";
      }
      y += 13 + 18;
    }

    y += 8;
    hairline(y, PAD, W - PAD, "rgba(198, 154, 76, .5)", 1, dry);

    /* TOTAL */
    y += 30;
    ctx.fillStyle = COL.ink;
    ctx.font = '700 32px "Cormorant Garamond", Georgia, serif';
    tracked("TOTAL", PAD, y + 24, 2.4, "left", dry);
    ctx.font = '500 30px "Jost", Helvetica, Arial, sans-serif';
    ctx.fillStyle = COL.goldL;
    tracked(money(d.total), amtX, y + 23, 0.5, "right", dry);
    y += 24 + 42;

    /* Heart divider */
    if (!dry) {
      hairline(y, cx - 120, cx - 22, COL.rule, 1, dry);
      hairline(y, cx + 22, cx + 120, COL.rule, 1, dry);
      ctx.fillStyle = COL.gold;
      heart(cx, y - 2, 8);
    }
    y += 34;

    /* Thank you */
    ctx.fillStyle = COL.goldL;
    ctx.font = '400 34px "Great Vibes", cursive';
    if (!dry) {
      ctx.textAlign = "center";
      ctx.fillText("Thank you", cx, y + 26);
      ctx.textAlign = "left";
    }
    y += 26 + 16;

    if (d.thanks) {
      ctx.font = '500 19px "Cormorant Garamond", Georgia, serif';
      ctx.fillStyle = COL.dim;
      var tl = wrap(d.thanks, W - PAD * 2 - 60);
      if (!dry) {
        ctx.textAlign = "center";
        for (var t = 0; t < tl.length; t++) ctx.fillText(tl[t], cx, y + 15 + t * 26);
        ctx.textAlign = "left";
      }
      y += 15 + (tl.length - 1) * 26 + 26;
    }

    /* Contact strip */
    y += 20;
    ctx.font = '300 12px "Jost", Helvetica, Arial, sans-serif';
    ctx.fillStyle = "rgba(201, 182, 151, .8)";
    tracked("meltova.in   ·   WhatsApp 7337070931   ·   @meltova_thechocolatelane",
            cx, y + 9, 1.4, "center", dry);
    y += 9 + 52;

    return Math.ceil(y);
  }

  /* The background, the frame and the corner leaves. Painted first, under
     everything the paint pass draws. */
  function background(H) {
    ctx.fillStyle = "#15100b";
    ctx.fillRect(0, 0, W, H);

    var g1 = ctx.createRadialGradient(W * 0.5, 0, 0, W * 0.5, 0, W * 0.9);
    g1.addColorStop(0, "rgba(198, 154, 76, .17)");
    g1.addColorStop(1, "rgba(198, 154, 76, 0)");
    ctx.fillStyle = g1;
    ctx.fillRect(0, 0, W, H);

    var g2 = ctx.createRadialGradient(W * 0.06, H, 0, W * 0.06, H, W * 0.95);
    g2.addColorStop(0, "rgba(138, 106, 74, .30)");
    g2.addColorStop(1, "rgba(138, 106, 74, 0)");
    ctx.fillStyle = g2;
    ctx.fillRect(0, 0, W, H);

    spray(34, H - 30, 1, H);
    spray(W - 34, H - 30, -1, H);

    ctx.strokeStyle = COL.faint;
    ctx.lineWidth = 1;
    ctx.strokeRect(22.5, 22.5, W - 45, H - 45);
  }

  function draw(d) {
    /* Pass one measures, pass two paints. */
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    var H = paint(d, true);

    canvas.width  = W * SCALE;
    canvas.height = H * SCALE;
    canvas.style.aspectRatio = W + " / " + H;

    ctx.setTransform(SCALE, 0, 0, SCALE, 0, 0);
    ctx.textBaseline = "alphabetic";
    ctx.textAlign = "left";
    background(H);
    paint(d, false);
  }

  /* 6. Download and copy ================================================= */

  function fileName(d) {
    var stub = d.no || d.customer || "order";
    var ext = IMG_TYPE === "image/png" ? ".png" : ".jpg";
    return "meltova-bill-" + stub.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") + ext;
  }

  function toBlob(type, quality) {
    return new Promise(function (resolve, reject) {
      canvas.toBlob(function (b) { b ? resolve(b) : reject(new Error("no blob")); },
                    type || IMG_TYPE, quality === undefined ? IMG_QUAL : quality);
    });
  }

  function say(msg, kind) {
    var el = $("[data-status]");
    el.textContent = msg;
    el.classList.remove("is-good", "is-bad");
    if (kind) el.classList.add(kind);
  }

  /* 7. Wiring ============================================================ */

  var current = null;

  function rerender() {
    current = readForm();
    validate(!showErrors);
    draw(current);
    $("[data-live-total]").textContent = money(current.total);
    $("[data-a11y]").textContent =
      current.items.length + " products, subtotal " + money(current.subtotal) +
      ", delivery " + money(current.shipping) + ", total " + money(current.total) + ".";
    saveDraft(current);
  }

  function startDesk() {
    if (started) return;
    started = true;

    formEl  = $("[data-bill]");
    linesEl = $("[data-lines]");
    canvas  = $("[data-canvas]");
    ctx     = canvas.getContext("2d");

    buildDatalist();
    syncCatalogue();

    var draft = loadDraft();
    if (draft) {
      $("#b-no").value     = esc(draft.no);
      $("#b-date").value   = esc(draft.date);
      $("#b-name").value   = esc(draft.customer);
      $("#b-phone").value  = esc(draft.phone);
      $("#b-ship").value   = esc(draft.shipping);
      $("#b-thanks").value = esc(draft.thanks);
      (draft.rows && draft.rows.length ? draft.rows : [null]).forEach(function (r) { addRow(r); });
    } else {
      fillDefaults();
      addRow(null);
    }

    /* Every keystroke anywhere on the form redraws the bill. */
    formEl.addEventListener("input", function (ev) {
      var f = ev.target.getAttribute("data-f");
      if (f === "rate" || f === "unit") ev.target.dataset.touched = "1";
      if (f === "name") fillFromCatalogue(ev.target.closest(".lineitem"));
      rerender();
    });

    formEl.addEventListener("change", function (ev) {
      if (ev.target.getAttribute("data-f") === "name") {
        fillFromCatalogue(ev.target.closest(".lineitem"));
        rerender();
      }
    });

    $("[data-add]").addEventListener("click", function () {
      var row = addRow(null);
      if (!row) { say("A bill holds " + MAX_LINES + " products at most.", "is-bad"); return; }
      $('[data-f="name"]', row).focus();
      rerender();
    });

    linesEl.addEventListener("click", function (ev) {
      var btn = ev.target.closest("[data-del]");
      if (!btn || btn.disabled) return;
      btn.closest(".lineitem").remove();
      refreshDelButtons();
      rerender();
    });

    $("[data-clear]").addEventListener("click", function () {
      if (!window.confirm("Clear the whole form and start a fresh bill?")) return;
      try { localStorage.removeItem(DRAFT_KEY); } catch (e) {}
      linesEl.innerHTML = "";
      showErrors = false;
      fillDefaults();
      $("#b-name").value = "";
      $("#b-phone").value = "";
      $$("[data-meta]", formEl).forEach(function (el) { setErr(el, ""); });
      addRow(null);
      rerender();
      say("Ready for bill " + $("#b-no").value + ".", "is-good");
    });

    $("[data-download]").addEventListener("click", function () {
      if (!ready()) return;
      toBlob().then(function (blob) {
        var url = URL.createObjectURL(blob);
        var a = document.createElement("a");
        a.href = url;
        a.download = fileName(current);
        document.body.appendChild(a);
        a.click();
        a.remove();
        window.setTimeout(function () { URL.revokeObjectURL(url); }, 4000);
        commitBillNo(current.no);
        say("Saved as " + fileName(current) + ", " + Math.max(1, Math.round(blob.size / 1024)) +
            " KB. The next bill today will be " + autoBillNo() + ".", "is-good");
      })["catch"](function () {
        say("The image could not be saved. Try again.", "is-bad");
      });
    });

    $("[data-copy]").addEventListener("click", function () {
      if (!ready()) return;
      if (!navigator.clipboard || !window.ClipboardItem) {
        say("This browser cannot copy images. Use Download instead.", "is-bad");
        return;
      }
      toBlob("image/png").then(function (blob) {
        return navigator.clipboard.write([new ClipboardItem({ "image/png": blob })]);
      }).then(function () {
        commitBillNo(current.no);
        say("Bill copied. Paste it straight into WhatsApp. The next bill today will be " +
            autoBillNo() + ".", "is-good");
      })["catch"](function () {
        say("Copying was blocked. Use Download instead.", "is-bad");
      });
    });

    /* The logo and the web fonts both arrive after the first draw, so the bill
       is drawn again once each of them lands. */
    /* The logo drawn on the bill is the same file the header already shows, so
       its address is taken from that image. Writing the path out again here
       would break the moment this page moves to another folder. */
    var brandMark = $(".brand__mark");
    logo = new Image();
    logo.onload = function () { logoReady = true; rerender(); };
    logo.onerror = function () { logoReady = false; };
    logo.src = brandMark ? brandMark.src : "../assets/img/meltova-logo.jpg";

    rerender();

    if (document.fonts && document.fonts.ready) {
      Promise.all([
        document.fonts.load('600 38px "Cormorant Garamond"'),
        document.fonts.load('700 34px "Cormorant Garamond"'),
        document.fonts.load('400 34px "Great Vibes"'),
        document.fonts.load('300 17px "Jost"'),
        document.fonts.load('400 15px "Jost"')
      ])["catch"](function () {})
       .then(function () { return document.fonts.ready; })
       .then(function () { rerender(); });
    }
  }

  /* Go ==================================================================== */
  initGate();

})();
