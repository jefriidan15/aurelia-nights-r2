// Aurelia Nights — stores.js
// The five shops. Each sells one or two things; the spray shop wipes heat
// and repairs, the gun shop sells hardware, the diner and hospital heal,
// and the safehouse saves the game.
(function () {
  'use strict';
  var A = window.Aurelia = window.Aurelia || {};

  A.openShop = function (shop) {
    var G = A.G;
    G.shop = shop;
    G.prevMode = G.mode;
    G.mode = 'shop';
    A.sfx('click');
  };

  A.closeShop = function () {
    var G = A.G;
    G.shop = null;
    G.mode = 'playing';
    A.sfx('click');
  };

  // What this shop offers right now: label, price, whether it can be bought.
  A.shopOffers = function (shop) {
    var G = A.G;
    var p = G.player;
    var c = A.CFG;
    var offers = [];
    if (shop.kind === 'spray') {
      offers.push({
        id: 'spray', label: 'Full respray + repair — wipe wanted, fix car',
        price: c.SPRAY_PRICE,
        can: p.cash >= c.SPRAY_PRICE && (G.wanted > 0 || (A.playerCar() && A.playerCar().hp < c.CAR_HP)),
        note: G.wanted === 0 ? 'No heat to wipe' : 'Wanted ' + G.wanted + ' stars'
      });
    } else if (shop.kind === 'gun') {
      offers.push({
        id: 'pistol', label: 'Pistol' + (p.weapons.pistol ? ' (owned)' : ''),
        price: c.PISTOL_PRICE, can: p.cash >= c.PISTOL_PRICE && !p.weapons.pistol, note: ''
      });
      offers.push({
        id: 'shotgun', label: 'Shotgun' + (p.weapons.shotgun ? ' (owned)' : ''),
        price: c.SHOTGUN_PRICE, can: p.cash >= c.SHOTGUN_PRICE && !p.weapons.shotgun, note: ''
      });
      offers.push({
        id: 'ammo', label: 'Ammo pack (+' + c.AMMO_PACK + ' for current weapon)',
        price: c.AMMO_PRICE, can: p.cash >= c.AMMO_PRICE, note: ''
      });
    } else if (shop.kind === 'diner') {
      offers.push({
        id: 'meal', label: 'Gull special — heal +' + c.DINER_HEAL + ' HP',
        price: c.DINER_PRICE, can: p.cash >= c.DINER_PRICE && p.hp < p.maxHp,
        note: p.hp >= p.maxHp ? 'Already full health' : ''
      });
    } else if (shop.kind === 'hospital') {
      offers.push({
        id: 'treat', label: 'Full treatment — restore all HP',
        price: c.HOSPITAL_PRICE, can: p.cash >= c.HOSPITAL_PRICE && p.hp < p.maxHp,
        note: p.hp >= p.maxHp ? 'Already full health' : ''
      });
    } else if (shop.kind === 'safehouse') {
      offers.push({
        id: 'sleep', label: 'Sleep — save game + heal to full',
        price: 0, can: true, note: 'Free'
      });
    }
    return offers;
  };

  A.buyOffer = function (offerId) {
    var G = A.G;
    var shop = G.shop;
    if (!shop) { return; }
    var p = G.player;
    var c = A.CFG;
    var offers = A.shopOffers(shop);
    var offer = null;
    for (var i = 0; i < offers.length; i++) {
      if (offers[i].id === offerId) { offer = offers[i]; }
    }
    if (!offer || !offer.can) { A.sfx('click'); return; }
    p.cash -= offer.price;
    if (offerId === 'spray') {
      G.wanted = 0;
      G.quietTimer = 0;
      G.decayTimer = 0;
      G.cops = [];
      A.repairCar(A.playerCar());
      A.flash('Fresh paint — heat gone, ride fixed', 2.5);
      A.sfx('heal');
    } else if (offerId === 'pistol') {
      p.weapons.pistol = true;
      p.ammo.pistol += c.AMMO_PACK;
      p.weapon = 'pistol';
      A.flash('Pistol bought (+' + c.AMMO_PACK + ' ammo)', 2);
      A.sfx('cash');
    } else if (offerId === 'shotgun') {
      p.weapons.shotgun = true;
      p.ammo.shotgun += c.AMMO_PACK;
      p.weapon = 'shotgun';
      A.flash('Shotgun bought (+' + c.AMMO_PACK + ' ammo)', 2);
      A.sfx('cash');
    } else if (offerId === 'ammo') {
      p.ammo[p.weapon] += c.AMMO_PACK;
      A.flash('Ammo + ' + c.AMMO_PACK + ' for your ' + p.weapon, 2);
      A.sfx('cash');
    } else if (offerId === 'meal') {
      A.healPlayer(c.DINER_HEAL);
      A.flash('Ate well — +' + c.DINER_HEAL + ' HP', 2);
      A.sfx('heal');
    } else if (offerId === 'treat') {
      A.healPlayer(p.maxHp);
      A.flash('Treated — full health', 2);
      A.sfx('heal');
    } else if (offerId === 'sleep') {
      A.healPlayer(p.maxHp);
      if (A.saveGame()) { A.flash('Saved. You wake up fresh.', 2.5); }
      else { A.flash('Save failed — storage blocked', 2.5); }
      A.sfx('heal');
    }
  };
})();
