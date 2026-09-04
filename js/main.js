/* ==========================================================================
   Meltova, The Chocolate Lane
   Vanilla JavaScript, no dependencies. Loaded with defer on every page.

   Sections
     1.  Settings and helpers
     2.  Toast
     3.  Mobile menu
     4.  Header, scroll progress and back to top
     5.  Store (cart and saved list, kept in this browser)
     6.  Cart drawer
     7.  Add to cart, including the photo that flies to the bag
     8.  Saved list hearts
     9.  Reveal on scroll, with stagger
     10. Heading word reveal
     11. Parallax
     12. Reels, category dots, placeholder links
     13. Enquiry form
     14. Marquee
   ========================================================================== */

(function () {
  "use strict";

  /* 1. Settings and helpers =========================================== */

  var INSTAGRAM_URL = "https://www.instagram.com/meltova_thechocolatelane";
  var WHATSAPP_NUMBER = "917337070931";
  var CART_KEY = "meltova.cart.v1";
  var WISH_KEY = "meltova.wishlist.v1";
  var ADDR_KEY = "meltova.delivery.v1";
  var RUPEE = "₹";

  /* Meltova sells bites in three box sizes and nothing else. A bite line in
     the box carries one of these as its quantity, never a free running count. */
  var BOX_SIZES = [4, 6, 12];

  function nearestBoxSize(n) {
    var best = BOX_SIZES[0];
    for (var i = 0; i < BOX_SIZES.length; i++) {
      if (Math.abs(BOX_SIZES[i] - n) < Math.abs(best - n)) { best = BOX_SIZES[i]; }
    }
    return best;
  }

  var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  function $(sel, root) { return (root || document).querySelector(sel); }
  function $$(sel, root) {
    return Array.prototype.slice.call((root || document).querySelectorAll(sel));
  }
  function money(n) { return RUPEE + n.toLocaleString("en-IN"); }

  /* Storage can throw in private browsing, so every call is wrapped. */
  function readStore(key, fallback) {
    try {
      var raw = window.localStorage.getItem(key);
      return raw ? JSON.parse(raw) : fallback;
    } catch (e) { return fallback; }
  }
  function writeStore(key, value) {
    try { window.localStorage.setItem(key, JSON.stringify(value)); }
    catch (e) { /* nothing to do, the page still works for this visit */ }
  }

  /* 2. Toast ========================================================== */

  var toastEl = null;
  var toastTimer = null;

  function toast(message) {
    if (!toastEl) {
      toastEl = document.createElement("div");
      toastEl.className = "toast";
      toastEl.setAttribute("role", "status");
      toastEl.setAttribute("aria-live", "polite");
      document.body.appendChild(toastEl);
    }
    toastEl.textContent = message;
    void toastEl.offsetWidth;
    toastEl.classList.add("is-on");
    window.clearTimeout(toastTimer);
    toastTimer = window.setTimeout(function () {
      toastEl.classList.remove("is-on");
    }, 2800);
  }

  /* 3. Mobile menu ==================================================== */

  var burger = $(".hamburger");
  var drawer = $("#mobilenav");

  if (burger && drawer) {
    burger.addEventListener("click", function () {
      var open = burger.getAttribute("aria-expanded") === "true";
      burger.setAttribute("aria-expanded", String(!open));
      drawer.classList.toggle("is-open", !open);
    });
    window.addEventListener("resize", function () {
      if (window.innerWidth > 900 && drawer.classList.contains("is-open")) {
        drawer.classList.remove("is-open");
        burger.setAttribute("aria-expanded", "false");
      }
    });
  }

  /* 4. Header, scroll progress and back to top ======================== */

  var header = $(".site-header");
  var progress = $(".scroll-progress i");
  var toTop = $(".to-top");
  var parallaxItems = $$("[data-parallax]");
  var ticking = false;

  function onScrollFrame() {
    var y = window.scrollY || window.pageYOffset;

    if (header) {
      header.classList.toggle("is-stuck", y > 8);
      header.classList.toggle("is-slim", y > 220);
    }

    if (progress) {
      var max = document.documentElement.scrollHeight - window.innerHeight;
      progress.style.transform = "scaleX(" + (max > 0 ? Math.min(y / max, 1) : 0) + ")";
    }

    if (toTop) { toTop.classList.toggle("is-on", y > 700); }

    if (!reduceMotion) {
      for (var i = 0; i < parallaxItems.length; i++) {
        var el = parallaxItems[i];
        var box = el.getBoundingClientRect();
        if (box.bottom < -200 || box.top > window.innerHeight + 200) { continue; }
        var speed = parseFloat(el.getAttribute("data-parallax")) || 0.1;
        var mid = box.top + box.height / 2 - window.innerHeight / 2;
        el.style.transform = "translate3d(0," + (-mid * speed).toFixed(2) + "px,0)";
      }
    }
    ticking = false;
  }

  function requestScroll() {
    if (ticking) { return; }
    ticking = true;
    window.requestAnimationFrame(onScrollFrame);
  }

  window.addEventListener("scroll", requestScroll, { passive: true });
  window.addEventListener("resize", requestScroll);
  requestScroll();

  if (toTop) {
    toTop.addEventListener("click", function () {
      window.scrollTo({ top: 0, behavior: reduceMotion ? "auto" : "smooth" });
    });
  }

  /* 4c. Box size chips =============================================== */

  /* The radios carry the meaning and the keyboard behaviour. The class is
     painted here as well, because a plain ":checked + label" rule is not
     repainted reliably by every engine when the choice changes. */
  function paintChips(group) {
    $$(".chip__input", group).forEach(function (input) {
      var label = group.querySelector('label[for="' + input.id + '"]');
      if (label) { label.classList.toggle("is-on", input.checked); }
    });
  }

  $$(".card .chips").forEach(function (group) {
    paintChips(group);
    group.addEventListener("change", function () { paintChips(group); });
  });

  /* 5. Store ========================================================== */

  var cart = readStore(CART_KEY, []);
  if (!Array.isArray(cart)) { cart = []; }

  cart = cart.filter(function (line) {
    return line && line.id && line.price > 0;
  });
  var tidied = false;
  cart.forEach(function (line) {
    var was = line.qty;
    if (typeof line.box !== "boolean") { line.box = line.unit === "per piece"; tidied = true; }
    line.qty = line.box ? nearestBoxSize(line.qty) : Math.max(1, line.qty | 0);
    if (line.qty !== was) { tidied = true; }
  });
  if (tidied) { writeStore(CART_KEY, cart); }

  var wishlist = readStore(WISH_KEY, []);
  if (!Array.isArray(wishlist)) { wishlist = []; }

  function cartCount() {
    return cart.reduce(function (n, line) { return n + line.qty; }, 0);
  }
  function cartTotal() {
    return cart.reduce(function (n, line) { return n + line.qty * line.price; }, 0);
  }

  function saveCart() {
    writeStore(CART_KEY, cart);
    paintCart();
  }

  /* 6. Your box: totals, the minimum, and the two steps ================ */

  /* ==================================================================
     OWNER SETTINGS. Change a price here and the whole box follows.
     ================================================================== */
  var MIN_ORDER = 399;   /* nothing smaller than this can be sent */
  var SHIP_FEE  = 99;    /* flat, anywhere in India */
  var FREE_OVER = 999;   /* delivery is free at this and above. Below it, the
                            flat SHIP_FEE applies. */
  var COLD_PACK = 99;    /* optional, keeps the chocolate firm in warm weather */

  var cartEl = $("#cart");
  var backdrop = $(".cart-backdrop");
  var itemsEl = $(".cart__items");
  var emptyEl = $(".cart__empty");
  var countEls = $$("[data-cart-count]");
  var openBtn = $("[data-cart-open]");
  var nextBtn = $(".cart__next");
  var backBtn = $(".cart__back");
  var sendBtn = $(".cart__send");
  var coldBox = $("#cold-pack");
  var noteEl = $("[data-ship-note]");
  var deliveryForm = $("#delivery-form");
  var lastFocus = null;

  /* The cold pack starts off on every visit. An address is helpful to
     remember, a charge is not: nobody should open their box and find 99
     rupees added that they did not tick today. */
  var coldWanted = false;

  /* The tick is painted here as well as in CSS. A ":checked + label" rule is
     not repainted reliably by every engine when the state is set from script,
     which would leave an empty box next to a charge. */
  function paintCold() {
    if (!coldBox) { return; }
    coldBox.checked = coldWanted;
    var wrap = coldBox.closest(".coldpack");
    if (wrap) { wrap.classList.toggle("is-on", coldWanted); }
  }
  paintCold();

  function goodsTotal() { return cartTotal(); }
  function shippingCost() { return goodsTotal() >= FREE_OVER ? 0 : SHIP_FEE; }
  function coldCost() { return coldWanted ? COLD_PACK : 0; }
  function grandTotal() { return goodsTotal() + shippingCost() + coldCost(); }
  function shortOfMinimum() { return Math.max(0, MIN_ORDER - goodsTotal()); }

  /* 6a. The delivery details, remembered on this device only =========== */

  var DELIVERY_FIELDS = [
    { id: "d-name", key: "name", ask: "Please tell us your name." },
    { id: "d-phone", key: "phone", ask: "Please add a phone or WhatsApp number.",
      test: function (v) { return v.replace(/[^0-9]/g, "").length >= 10; },
      bad: "That number looks too short. Please check it." },
    { id: "d-address", key: "address", ask: "Please add the full address." },
    { id: "d-city", key: "city", ask: "Please add the city." },
    { id: "d-pin", key: "pin", ask: "Please add the pincode.",
      test: function (v) { return /^[0-9]{6}$/.test(v); },
      bad: "An Indian pincode is six digits." },
    { id: "d-date", key: "date", optional: true },
    { id: "d-note", key: "note", optional: true }
  ];

  function fieldEl(f) { return document.getElementById(f.id); }

  function readDelivery() {
    var out = {};
    DELIVERY_FIELDS.forEach(function (f) {
      var el = fieldEl(f);
      out[f.key] = el ? el.value.trim() : "";
    });
    return out;
  }

  function setFieldError(el, message) {
    var box = el.parentNode.querySelector(".err");
    if (box) { box.textContent = message || ""; }
    el.setAttribute("aria-invalid", message ? "true" : "false");
  }

  function checkDelivery() {
    var firstBad = null;
    DELIVERY_FIELDS.forEach(function (f) {
      var el = fieldEl(f);
      if (!el) { return; }
      var value = el.value.trim();
      var problem = "";
      if (!f.optional && !value) { problem = f.ask; }
      else if (value && f.test && !f.test(value)) { problem = f.bad; }
      setFieldError(el, problem);
      if (problem && !firstBad) { firstBad = el; }
    });
    return firstBad;
  }

  if (deliveryForm) {
    var saved = readStore(ADDR_KEY, {});
    DELIVERY_FIELDS.forEach(function (f) {
      var el = fieldEl(f);
      if (el && saved && typeof saved[f.key] === "string") { el.value = saved[f.key]; }
      if (!el) { return; }
      el.addEventListener("input", function () {
        if (el.getAttribute("aria-invalid") === "true") { setFieldError(el, ""); }
        writeStore(ADDR_KEY, readDelivery());
      });
    });
  }

  /* 6b. The message that lands in WhatsApp ============================= */

  function orderMessage() {
    if (!cart.length) { return "Hi Meltova, I'd like to order"; }

    var lines = ["Hi Meltova, I'd like to order:", ""];
    cart.forEach(function (line) {
      lines.push((line.box ? "Box of " + line.qty + " " : line.qty + " x ") +
                 line.name + " (" + money(line.price) + " " + line.unit + ") = " +
                 money(line.qty * line.price));
    });

    lines.push("");
    lines.push("Subtotal: " + money(goodsTotal()));
    lines.push("Delivery: " + (shippingCost() ? money(shippingCost()) : "free"));
    if (coldWanted) { lines.push("Cold pack: " + money(COLD_PACK)); }
    lines.push("Total: " + money(grandTotal()));

    var d = readDelivery();
    if (d.name || d.address) {
      lines.push("");
      lines.push("Deliver to:");
      if (d.name) { lines.push(d.name); }
      if (d.phone) { lines.push(d.phone); }
      if (d.address) { lines.push(d.address); }
      if (d.city || d.pin) { lines.push((d.city + " " + d.pin).trim()); }
      if (d.date) { lines.push("Needed by: " + d.date); }
      if (d.note) { lines.push("Note: " + d.note); }
    }
    return lines.join("\n");
  }

  /* 6c. Painting ======================================================= */

  function boxPicker(line) {
    return '<fieldset class="boxpick">' +
      '<legend class="sr-only">Box size for ' + line.name + '</legend>' +
      BOX_SIZES.map(function (size) {
        var fid = "cartbox-" + line.id + "-" + size;
        return '<input class="chip__input" type="radio" id="' + fid +
               '" name="cartbox-' + line.id + '" value="' + size + '"' +
               (line.qty === size ? " checked" : "") + '>' +
               '<label class="chip" for="' + fid + '">' + size + '</label>';
      }).join("") +
      '</fieldset>';
  }

  function stepper(line) {
    return '<div class="qty">' +
      '<button type="button" class="qty__btn" data-step="-1" aria-label="One less ' + line.name + '">&#8722;</button>' +
      '<span class="qty__n" aria-label="Quantity">' + line.qty + '</span>' +
      '<button type="button" class="qty__btn" data-step="1" aria-label="One more ' + line.name + '">&#43;</button>' +
      '</div>';
  }

  function paintCart() {
    /* Re-rendering throws away focus, so note where it was and put it back. */
    var focusId = document.activeElement ? document.activeElement.id : "";
    var count = cartCount();

    countEls.forEach(function (el) {
      var was = el.textContent;
      el.textContent = String(count);
      if (was !== String(count) && !reduceMotion) {
        el.classList.remove("is-pop");
        void el.offsetWidth;
        el.classList.add("is-pop");
      }
    });

    if (openBtn) {
      openBtn.setAttribute("aria-label",
        count ? "Your box, " + count + (count === 1 ? " item" : " items") : "Your box, empty");
    }

    if (itemsEl) {
      itemsEl.innerHTML = "";
      cart.forEach(function (line, index) {
        var li = document.createElement("li");
        li.className = "cart-line";
        li.style.setProperty("--i", index);
        li.innerHTML =
          '<img class="cart-line__img" src="assets/img/' + line.img + '" alt="" width="80" height="80">' +
          '<div class="cart-line__body">' +
            '<p class="cart-line__name">' + line.name + '</p>' +
            '<p class="cart-line__meta">' + money(line.price) + ' ' + line.unit + '</p>' +
            (line.box ? boxPicker(line) : stepper(line)) +
          '</div>' +
          '<div class="cart-line__end">' +
            '<p class="cart-line__sum">' + money(line.qty * line.price) + '</p>' +
            '<button type="button" class="cart-line__remove" data-remove aria-label="Remove ' + line.name + '">Remove</button>' +
          '</div>';

        var picker = li.querySelector(".boxpick");
        if (picker) {
          paintChips(picker);
          picker.addEventListener("change", function (e) {
            line.qty = parseInt(e.target.value, 10) || BOX_SIZES[0];
            saveCart();
          });
        }

        li.querySelectorAll("[data-step]").forEach(function (btn) {
          btn.addEventListener("click", function () {
            line.qty += parseInt(btn.getAttribute("data-step"), 10);
            if (line.qty < 1) { cart.splice(cart.indexOf(line), 1); }
            saveCart();
          });
        });
        li.querySelector("[data-remove]").addEventListener("click", function () {
          cart.splice(cart.indexOf(line), 1);
          saveCart();
          toast("Removed from your box.");
        });

        itemsEl.appendChild(li);
      });
    }

    if (focusId) {
      var refocus = document.getElementById(focusId);
      if (refocus) { refocus.focus(); }
    }

    if (emptyEl) { emptyEl.hidden = cart.length > 0; }
    if (cartEl) { cartEl.classList.toggle("is-empty", cart.length === 0); }

    $$("[data-sum-goods]").forEach(function (el) { el.textContent = money(goodsTotal()); });
    $$("[data-sum-ship]").forEach(function (el) {
      el.textContent = shippingCost() ? money(shippingCost()) : "Free";
    });
    $$("[data-sum-cold]").forEach(function (el) { el.textContent = money(COLD_PACK); });
    $$("[data-cold-row]").forEach(function (el) { el.hidden = !coldWanted; });
    $$("[data-sum-total]").forEach(function (el) { el.textContent = money(grandTotal()); });

    var short = shortOfMinimum();
    if (nextBtn) {
      nextBtn.disabled = cart.length === 0 || short > 0;
    }

    if (noteEl) {
      if (!cart.length) {
        noteEl.textContent = "Delivery is " + money(SHIP_FEE) +
          " anywhere in India, and free above " + money(FREE_OVER) + ".";
      } else if (short > 0) {
        noteEl.textContent = "Add " + money(short) + " more of chocolate. The " +
          money(MIN_ORDER) + " minimum is on the chocolate, before delivery.";
      } else if (shippingCost() === 0) {
        noteEl.textContent = "Delivery is free on this order." +
          (coldWanted ? " The cold pack is charged separately." : "");
      } else {
        noteEl.textContent = "Add " + money(FREE_OVER - goodsTotal()) +
          " more and delivery is free.";
      }
      noteEl.classList.toggle("is-warning", short > 0);
    }
  }

  if (coldBox) {
    coldBox.addEventListener("change", function () {
      coldWanted = coldBox.checked;
      paintCold();
      paintCart();
    });
  }

  /* 6d. Opening, closing and stepping ================================== */

  function showStep(name) {
    $$(".cart__step", cartEl).forEach(function (step) {
      step.hidden = step.getAttribute("data-step") !== name;
    });
    var body = $(".cart__step[data-step='" + name + "'] .cart__body", cartEl);
    if (body) { body.scrollTop = 0; }
  }

  if (nextBtn) {
    nextBtn.addEventListener("click", function () {
      if (shortOfMinimum() > 0 || !cart.length) { return; }
      showStep("details");
      var first = $("#d-name");
      if (first) { first.focus(); }
    });
  }

  if (backBtn) {
    backBtn.addEventListener("click", function () {
      showStep("box");
      if (nextBtn) { nextBtn.focus(); }
    });
  }

  if (sendBtn) {
    sendBtn.addEventListener("click", function () {
      if (!cart.length) { return; }
      if (shortOfMinimum() > 0) {
        showStep("box");
        toast("The minimum order is " + money(MIN_ORDER) + ".");
        return;
      }
      var bad = checkDelivery();
      if (bad) {
        bad.focus();
        toast("Please fill the highlighted fields.");
        return;
      }
      writeStore(ADDR_KEY, readDelivery());
      var url = "https://wa.me/" + WHATSAPP_NUMBER +
                "?text=" + encodeURIComponent(orderMessage());
      var win = window.open(url, "_blank", "noopener");
      if (win) { toast("Opening WhatsApp with your order."); }
      else { window.location.href = url; }
    });
  }

  function openCart() {
    if (!cartEl) { return; }
    lastFocus = document.activeElement;
    showStep("box");
    cartEl.classList.add("is-open");
    cartEl.setAttribute("aria-hidden", "false");
    if (backdrop) { backdrop.hidden = false; }
    document.body.classList.add("no-scroll");
    if (openBtn) { openBtn.setAttribute("aria-expanded", "true"); }
    var focusable = $(".cart__close", cartEl);
    if (focusable) { focusable.focus(); }
  }

  function closeCart() {
    if (!cartEl) { return; }
    cartEl.classList.remove("is-open");
    cartEl.setAttribute("aria-hidden", "true");
    if (backdrop) { backdrop.hidden = true; }
    document.body.classList.remove("no-scroll");
    if (openBtn) { openBtn.setAttribute("aria-expanded", "false"); }
    if (lastFocus && lastFocus.focus) { lastFocus.focus(); }
  }

  if (openBtn) { openBtn.addEventListener("click", openCart); }
  $$("[data-cart-close]").forEach(function (el) {
    el.addEventListener("click", closeCart);
  });

  /* Escape closes whichever layer is open, and Tab stays inside the cart. */
  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape") {
      if (cartEl && cartEl.classList.contains("is-open")) { closeCart(); return; }
      if (drawer && drawer.classList.contains("is-open")) {
        drawer.classList.remove("is-open");
        burger.setAttribute("aria-expanded", "false");
        burger.focus();
      }
      return;
    }
    if (e.key !== "Tab" || !cartEl || !cartEl.classList.contains("is-open")) { return; }
    var stops = $$("a[href], button:not([disabled]), input, textarea", cartEl)
      .filter(function (el) { return el.offsetParent !== null; });
    if (!stops.length) { return; }
    var first = stops[0];
    var last = stops[stops.length - 1];
    if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
  });

  /* 7. Add to cart ==================================================== */

  function flyToBag(button) {
    if (reduceMotion || !openBtn) { return; }
    var photo = button.closest(".card").querySelector(".card__media img");
    if (!photo) { return; }

    var from = photo.getBoundingClientRect();
    var to = openBtn.getBoundingClientRect();
    var ghost = document.createElement("span");
    ghost.className = "fly";
    ghost.style.backgroundImage = "url(" + photo.currentSrc + ")";
    ghost.style.left = from.left + "px";
    ghost.style.top = from.top + "px";
    ghost.style.width = from.width + "px";
    ghost.style.height = from.height + "px";
    document.body.appendChild(ghost);

    var dx = to.left + to.width / 2 - (from.left + from.width / 2);
    var dy = to.top + to.height / 2 - (from.top + from.height / 2);

    requestAnimationFrame(function () {
      ghost.style.transform = "translate(" + dx + "px," + dy + "px) scale(.08)";
      ghost.style.opacity = "0.25";
      ghost.style.borderRadius = "50%";
    });
    window.setTimeout(function () { ghost.remove(); }, 900);
  }

  $$(".card__add").forEach(function (button) {
    button.addEventListener("click", function () {
      var id = button.getAttribute("data-id");

      /* A box size chip, where the card has one, says how many pieces to add. */
      var isBox = button.getAttribute("data-box") === "1";
      var holder = button.closest(".card");
      var picked = holder ? holder.querySelector(".chip__input:checked") : null;
      var qty = picked ? (parseInt(picked.value, 10) || 1) : 1;
      if (isBox) { qty = nearestBoxSize(qty); }

      var line = null;
      for (var i = 0; i < cart.length; i++) {
        if (cart[i].id === id) { line = cart[i]; break; }
      }
      if (line) {
        /* A box is one size, so choosing a size sets it rather than piling up.
           A bar or a nut crush box is counted, so those add up. */
        if (isBox) { line.qty = qty; } else { line.qty += qty; }
      } else {
        cart.push({
          id: id,
          name: button.getAttribute("data-name"),
          price: parseInt(button.getAttribute("data-price"), 10),
          unit: button.getAttribute("data-unit"),
          img: button.getAttribute("data-img"),
          box: isBox,
          qty: qty
        });
      }
      flyToBag(button);
      saveCart();

      button.classList.add("is-added");
      window.setTimeout(function () { button.classList.remove("is-added"); }, 1400);
      toast((isBox ? "Box of " + qty + " " : (qty > 1 ? qty + " x " : "")) +
            button.getAttribute("data-name") + " added to your box.");
    });
  });

  /* 8. Saved list ===================================================== */

  var wishCountEls = $$("[data-wish-count]");

  function paintWish() {
    wishCountEls.forEach(function (el) { el.textContent = String(wishlist.length); });
    $$(".card__heart").forEach(function (btn) {
      var on = wishlist.indexOf(btn.getAttribute("data-wish")) !== -1;
      btn.classList.toggle("is-on", on);
      btn.setAttribute("aria-pressed", String(on));
    });
  }

  $$(".card__heart").forEach(function (btn) {
    btn.addEventListener("click", function () {
      var id = btn.getAttribute("data-wish");
      var at = wishlist.indexOf(id);
      if (at === -1) { wishlist.push(id); } else { wishlist.splice(at, 1); }
      writeStore(WISH_KEY, wishlist);
      paintWish();
      if (!reduceMotion) {
        btn.classList.remove("is-beat");
        void btn.offsetWidth;
        btn.classList.add("is-beat");
      }
      toast(at === -1 ? "Saved to your list." : "Removed from your list.");
    });
  });

  var wishOpen = $("[data-wish-open]");
  if (wishOpen) {
    wishOpen.addEventListener("click", function () {
      toast(wishlist.length
        ? wishlist.length + " saved on this device. Add them to your box when you are ready."
        : "Tap a heart on any chocolate to save it here.");
    });
  }

  $$("[data-soon]").forEach(function (el) {
    el.addEventListener("click", function (e) {
      e.preventDefault();
      toast("Coming soon. Use your box and WhatsApp for now.");
    });
  });

  /* 9. Reveal on scroll =============================================== */

  /* 9a. Heading word reveal =========================================== */

  if (!reduceMotion) {
    $$("h1, .head__title").forEach(function (heading) {
      if (heading.querySelector("span")) { return; }
      var words = heading.textContent.trim().split(/\s+/);
      heading.textContent = "";
      words.forEach(function (word, i) {
        var outer = document.createElement("span");
        outer.className = "w";
        var inner = document.createElement("span");
        inner.className = "w__i";
        inner.style.setProperty("--i", i);
        inner.textContent = word;
        outer.appendChild(inner);
        heading.appendChild(outer);
        if (i < words.length - 1) {
          heading.appendChild(document.createTextNode(" "));
        }
      });
      heading.classList.add("is-split");
    });
  }

  var revealTargets = $$(".reveal")
    .concat($$("[data-stagger]"))
    .concat($$(".is-split"));

  $$("[data-stagger]").forEach(function (group) {
    $$(":scope > *", group).forEach(function (child, i) {
      child.style.setProperty("--i", i);
    });
  });

  var io = null;

  /* Anything the visitor has already scrolled past, after a deep link or a
     restored position, is shown at once. The observer alone cannot be trusted
     for that: an element can travel from below the viewport to above it
     without ever crossing a threshold, and would stay invisible. */
  var pending = revealTargets.slice();

  function sweepPassed() {
    for (var i = pending.length - 1; i >= 0; i--) {
      var el = pending[i];
      if (el.classList.contains("is-in")) { pending.splice(i, 1); continue; }
      if (el.getBoundingClientRect().bottom < 0) {
        el.classList.add("is-in");
        if (io) { io.unobserve(el); }
        pending.splice(i, 1);
      }
    }
  }

  if (revealTargets.length) {
    if (reduceMotion || !("IntersectionObserver" in window)) {
      revealTargets.forEach(function (el) { el.classList.add("is-in"); });
      pending = [];
    } else {
      io = new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-in");
            io.unobserve(entry.target);
          }
        });
      }, { rootMargin: "0px 0px -8% 0px", threshold: 0.05 });

      revealTargets.forEach(function (el) { io.observe(el); });

      window.addEventListener("load", sweepPassed);
      window.addEventListener("hashchange", sweepPassed);
      window.addEventListener("scroll", sweepPassed, { passive: true });
      sweepPassed();
    }
  }

  /* 11. Hero entrance ================================================= */

  window.requestAnimationFrame(function () {
    document.body.classList.add("is-ready");
  });

  /* 12. Reels, dots and placeholder links ============================= */

  /* Clips never start on their own. The visitor presses play, and then it runs
     muted and loops. Nothing is downloaded until that press, so a page view
     costs no video data at all. */
  var reels = $$(".reel");

  reels.forEach(function (reel) {
    var video = $(".reel__video", reel);
    var toggle = $(".reel__toggle", reel);
    if (!video || !toggle) { return; }

    var capEl = $(".reel__cap b", reel);
    var caption = capEl ? capEl.textContent : "this clip";

    /* Zero means the visitor has not asked for this clip to run. */
    reel.setAttribute("data-wanted", "0");

    function label(playing) {
      toggle.setAttribute("aria-pressed", String(playing));
      toggle.setAttribute("aria-label",
        (playing ? "Pause the clip, " : "Play the clip, ") + caption);
    }

    function togglePlay() {
      if (video.paused) {
        reel.setAttribute("data-wanted", "1");
        video.play().catch(function () {});
      } else {
        reel.setAttribute("data-wanted", "0");
        video.pause();
      }
    }

    toggle.addEventListener("click", togglePlay);
    /* The whole tile is clickable, not just the small button. */
    video.addEventListener("click", togglePlay);

    video.addEventListener("play", function () { label(true); });
    video.addEventListener("pause", function () { label(false); });
    label(false);
  });

  /* A clip the visitor started pauses when it scrolls away, and picks up again
     when it comes back. A clip they never started is left alone. */
  if (reels.length && "IntersectionObserver" in window) {
    var vio = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        var video = $(".reel__video", entry.target);
        if (!video) { return; }
        if (entry.isIntersecting) {
          if (entry.target.getAttribute("data-wanted") === "1") {
            video.play().catch(function () {});
          }
        } else if (!video.paused) {
          video.pause();
        }
      });
    }, { threshold: 0.25 });
    reels.forEach(function (reel) { vio.observe(reel); });
  }

  var catRow = $(".cats");
  var catDots = $$(".dots i");
  if (catRow && catDots.length) {
    catRow.addEventListener("scroll", function () {
      var max = catRow.scrollWidth - catRow.clientWidth;
      var ratio = max > 0 ? catRow.scrollLeft / max : 0;
      var active = Math.round(ratio * (catDots.length - 1));
      catDots.forEach(function (dot, i) { dot.classList.toggle("is-on", i === active); });
    }, { passive: true });
  }

  $$('a[href^="["]').forEach(function (link) {
    link.addEventListener("click", function (e) {
      e.preventDefault();
      toast("That link is not set up yet.");
    });
  });

  /* 13. Enquiry form ================================================== */

  var form = $("#enquiry-form");

  if (form) {
    var setError = function (input, message) {
      var box = input.parentNode.querySelector(".err");
      if (box) { box.textContent = message || ""; }
      input.setAttribute("aria-invalid", message ? "true" : "false");
    };

    $$("input, textarea", form).forEach(function (input) {
      input.addEventListener("input", function () {
        if (input.getAttribute("aria-invalid") === "true" && input.value.trim()) {
          setError(input, "");
        }
      });
    });

    form.addEventListener("submit", function (e) {
      e.preventDefault();

      var fields = [
        { el: form.elements.name,  label: "Name",      required: true,  ask: "Please tell us your name." },
        { el: form.elements.phone, label: "Phone",     required: true,  ask: "Please add a phone or WhatsApp number." },
        { el: form.elements.city,  label: "City",      required: true,  ask: "Please add the delivery city." },
        { el: form.elements.date,  label: "Needed by", required: false, ask: "" },
        { el: form.elements.order, label: "Order",     required: true,  ask: "Please tell us what you would like." }
      ];

      var firstBad = null;
      fields.forEach(function (f) {
        var value = f.el.value.trim();
        if (f.required && !value) {
          setError(f.el, f.ask);
          if (!firstBad) { firstBad = f.el; }
        } else {
          setError(f.el, "");
        }
      });

      if (firstBad) {
        firstBad.focus();
        toast("Please fill the highlighted fields.");
        return;
      }

      var lines = ["Hi Meltova, I would like to order."];
      fields.forEach(function (f) {
        var value = f.el.value.trim();
        if (value) { lines.push(f.label + ": " + value); }
      });
      if (cart.length) {
        lines.push("");
        lines.push("In my box:");
        cart.forEach(function (line) {
          lines.push((line.box ? "Box of " + line.qty + " " : line.qty + " x ") +
                     line.name + " = " + money(line.qty * line.price));
        });
        lines.push("Estimated total: " + money(cartTotal()));
      }

      var url = "https://wa.me/" + WHATSAPP_NUMBER + "?text=" + encodeURIComponent(lines.join("\n"));
      var win = window.open(url, "_blank", "noopener");
      if (win) { toast("Opening WhatsApp with your enquiry."); }
      else { window.location.href = url; }
    });
  }

  /* 14. Marquee ======================================================= */

  var track = $(".marquee__track");
  if (track && !reduceMotion) {
    track.appendChild(track.firstElementChild.cloneNode(true));
  }

  /* Paint the stored cart and list on first load. */
  paintCart();
  paintWish();
})();
