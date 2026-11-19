// Aurelia Nights — stores.js
// The five shops. The spray shop wipes heat and repairs the car, the
// gun shop sells hardware and ammo, the diner and the hospital heal,
// and the safehouse saves the game and heals for free. Every offer
// reports whether it can be bought right now, so the shop screen
// never sells the player something useless.
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

  // This shop's offers right now: label, price, and whether it is
  // actually buyable given cash, health, heat and ownership.
  A.shopOffers = function (shop) {
    var G = A.G, p = G.player, c = A.CFG;
    var car = A.playerCar();
    var fullHp = p.hp >= p.maxHp;
    if (shop.kind === 'spray') {
      return [{
        id: 'spray', label: 'Full respray + repair — wipe wanted, fix car',
        price: c.SPRAY_PRICE,
        can: p.cash >= c.SPRAY_PRICE && (G.wanted > 0 || (car && car.hp < c.CAR_HP)),
        note: G.wanted === 0 ? 'No heat to wipe' : 'Wanted ' + G.wanted + ' stars'
      }];
    }
    if (shop.kind === 'gun') {
      return [
        { id: 'pistol', label: 'Pistol' + (p.weapons.pistol ? ' (owned)' : ''),
          price: c.PISTOL_PRICE, can: p.cash >= c.PISTOL_PRICE && !p.weapons.pistol, note: '' },
        { id: 'shotgun', label: 'Shotgun' + (p.weapons.shotgun ? ' (owned)' : ''),
          price: c.SHOTGUN_PRICE, can: p.cash >= c.SHOTGUN_PRICE && !p.weapons.shotgun, note: '' },
        { id: 'ammo', label: 'Ammo pack (+' + c.AMMO_PACK + ' for current weapon)',
          price: c.AMMO_PRICE, can: p.cash >= c.AMMO_PRICE, note: '' }
      ];
    }
    if (shop.kind === 'diner') {
      return [{
        id: 'meal', label: 'Gull special — heal +' + c.DINER_HEAL + ' HP',
        price: c.DINER_PRICE, can: p.cash >= c.DINER_PRICE && !fullHp,
        note: fullHp ? 'Already full health' : ''
      }];
    }
    if (shop.kind === 'hospital') {
      return [{
        id: 'treat', label: 'Full treatment — restore all HP',
        price: c.HOSPITAL_PRICE, can: p.cash >= c.HOSPITAL_PRICE && !fullHp,
        note: fullHp ? 'Already full health' : ''
      }];
    }
    if (shop.kind === 'safehouse') {
      return [{ id: 'sleep', label: 'Sleep — save game + heal to full', price: 0, can: true, note: 'Free' }];
    }
    return [];
  };

  function findOffer(offers, id) {
    for (var i = 0; i < offers.length; i++) {
      if (offers[i].id === id) { return offers[i]; }
    }
    return null;
  }

  A.buyOffer = function (offerId) {
    var G = A.G, shop = G.shop;
    if (!shop) { return; }
    var p = G.player, c = A.CFG;
    var offer = findOffer(A.shopOffers(shop), offerId);
    if (!offer || !offer.can) { A.sfx('click'); return; }
    p.cash -= offer.price;

    if (offerId === 'spray') {
      G.wanted = 0; G.quietTimer = 0; G.decayTimer = 0; G.cops = [];
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
      A.flash(A.saveGame() ? 'Saved. You wake up fresh.' : 'Save failed — storage blocked', 2.5);
      A.sfx('heal');
    }
  };
})();
