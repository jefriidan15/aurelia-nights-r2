// Aurelia Nights — settings.js
// All tuning constants for the game live here. Nothing in this file reads
// the network or touches storage; it only declares numbers and names.
(function () {
  'use strict';
  var A = window.Aurelia = window.Aurelia || {};

  A.CFG = {
    WORLD_W: 3600,
    WORLD_H: 2600,
    VIEW_W: 1280,
    VIEW_H: 800,
    HARBOUR_Y: 1700,
    ROAD_HALF: 45,

    // Movement
    WALK_SPEED: 175,
    SPRINT_SPEED: 285,
    PLAYER_RADIUS: 14,
    PLAYER_HP: 100,

    // Driving
    CAR_ACCEL: 300,
    CAR_BRAKE: 520,
    CAR_MAX_SPEED: 430,
    CAR_REVERSE_MAX: 140,
    CAR_TURN: 2.6,
    CAR_HP: 100,

    // Traffic & population
    TRAFFIC_COUNT: 16,
    PARKED_COUNT: 8,
    PED_COUNT: 30,
    PICKUP_COUNT: 12,

    // Combat
    PISTOL_DMG: 34,
    PISTOL_RATE: 0.22,
    PISTOL_RANGE: 560,
    PISTOL_BULLET_SPEED: 950,
    SHOTGUN_DMG: 13,
    SHOTGUN_PELLETS: 6,
    SHOTGUN_RATE: 0.85,
    SHOTGUN_RANGE: 380,
    SHOTGUN_BULLET_SPEED: 820,
    SHOTGUN_SPREAD: 0.34,

    // Police
    MAX_WANTED: 5,
    COP_HP: 100,
    COP_FOOT_SPEED: 205,
    COP_ARREST_TIME: 2.0,
    COP_SHOT_DMG: 6,
    WANTED_DECAY_QUIET: 12,
    WANTED_DECAY_STEP: 8,

    // Economy
    PICKUP_MIN: 25,
    PICKUP_MAX: 75,
    SPRAY_PRICE: 100,
    PISTOL_PRICE: 150,
    SHOTGUN_PRICE: 400,
    AMMO_PRICE: 25,
    AMMO_PACK: 24,
    DINER_PRICE: 20,
    DINER_HEAL: 30,
    HOSPITAL_PRICE: 150,

    // Day / night — one full cycle lasts DAY_LENGTH seconds.
    DAY_LENGTH: 240,
    NIGHT_START: 0.78,
    NIGHT_END: 0.22,

    // Save
    SAVE_KEY: 'aurelia-nights-save-v7'
  };

  // The six story jobs. Payouts are part of the bounty spec and must stay exact.
  A.MISSIONS = [
    {
      name: 'Grand Theft Aurelia', pay: 400,
      blurb: 'Boost a ride and drop it at the Marina. No questions asked.',
      steps: [
        { kind: 'steal', label: 'Steal a car — walk up to one and press E' },
        { kind: 'drive', x: 3050, y: 500, r: 100, label: 'Drive the car to the Marina drop-off' }
      ]
    },
    {
      name: 'Heat Wave', pay: 600,
      blurb: 'A package is waiting at Pier 9. The law will be watching.',
      steps: [
        { kind: 'goto', x: 2900, y: 1200, r: 70, label: 'Pick up the package at Pier 9' },
        { kind: 'deliver', x: 400, y: 1100, r: 80, label: 'Deliver it to Little Vesper — stay hot' }
      ]
    },
    {
      name: 'Pier 9 Shootout', pay: 900,
      blurb: 'The Docks crew skimmed the boss. Clear the pier, take the stash.',
      steps: [
        { kind: 'goto', x: 2900, y: 1900, r: 90, label: 'Get to Pier 9' },
        { kind: 'clear', count: 6, cx: 2900, cy: 1950, r: 230, label: 'Take out the Pier 9 crew' },
        { kind: 'goto', x: 2950, y: 2080, r: 70, label: 'Grab the stash on the pier' }
      ]
    },
    {
      name: 'The Vault Job', pay: 1500,
      blurb: 'Downtown bank, twelve seconds on the vault, then vanish.',
      steps: [
        { kind: 'goto', x: 1800, y: 700, r: 80, label: 'Reach the Downtown bank' },
        { kind: 'hold', x: 1800, y: 700, r: 95, secs: 12, label: 'Crack the vault — stay inside the zone' },
        { kind: 'goto', x: 550, y: 1400, r: 80, label: 'Escape to Rosa\u2019s Flat' }
      ]
    },
    {
      name: 'Four-Star Run', pay: 2000,
      blurb: 'Four stars, one harbour run. Make them regret the chase.',
      steps: [
        { kind: 'wanted', n: 4, label: 'Get to 4 stars — cause chaos' },
        { kind: 'drive', x: 3200, y: 300, r: 100, label: 'Outrun them to the Marina escape' }
      ]
    },
    {
      name: 'Lockdown', pay: 3500,
      blurb: 'Five stars. Ninety seconds in Midtown. Then the boat leaves.',
      steps: [
        { kind: 'survive', secs: 90, cx: 1800, cy: 1300, r: 280, label: 'Survive the lockdown in Midtown' },
        { kind: 'goto', x: 2900, y: 2250, r: 90, label: 'Reach the harbour extraction' }
      ]
    }
  ];

  // The five shops of Port Aurelia.
  A.SHOPS = [
    { id: 'spray', name: 'Lola\u2019s Spray Shop', kind: 'spray', x: 620, y: 480, color: '#ff7ad9',
      desc: 'Fresh paint, clean plates. Wipes your wanted level and repairs your ride.' },
    { id: 'gun', name: 'Iron & Oak', kind: 'gun', x: 1820, y: 480, color: '#ffb347',
      desc: 'Guns and ammo. No licence, no questions.' },
    { id: 'diner', name: 'The Golden Gull', kind: 'diner', x: 2420, y: 980, color: '#7dff9e',
      desc: 'Hot food, hot coffee. Patches you up a little.' },
    { id: 'hospital', name: 'St. Aurelia General', kind: 'hospital', x: 1220, y: 1420, color: '#ff6b6b',
      desc: 'Full treatment. Walk out good as new.' },
    { id: 'safehouse', name: 'Rosa\u2019s Flat', kind: 'safehouse', x: 580, y: 1420, color: '#8ecbff',
      desc: 'Your place. Sleep to save the game and heal up.' }
  ];

  // District rectangles: name, bounds, ground tint, label colour.
  A.DISTRICTS = [
    { name: 'Old Town', x: 0, y: 0, w: 1200, h: 900, ground: '#3a3f4a', label: '#9aa3b2' },
    { name: 'Downtown', x: 1200, y: 0, w: 1200, h: 900, ground: '#41454f', label: '#a8b0c0' },
    { name: 'Marina', x: 2400, y: 0, w: 1200, h: 900, ground: '#39424e', label: '#93a8bd' },
    { name: 'Little Vesper', x: 0, y: 900, w: 1200, h: 800, ground: '#46403a', label: '#b0a58f' },
    { name: 'Midtown', x: 1200, y: 900, w: 1200, h: 800, ground: '#3f3f46', label: '#a3a3b5' },
    { name: 'The Docks', x: 2400, y: 900, w: 1200, h: 800, ground: '#3d4038', label: '#a9b08d' }
  ];

  // Avenue / street centre lines. Roads are 90px wide.
  A.AVENUES = [600, 1200, 1800, 2400, 3000];
  A.STREETS = [450, 900, 1350, 1700, 2150];
  A.ROAD_HALF = 45;

  // Harbour: everything south of HARBOUR_Y is water except the pier.
  A.HARBOUR_Y = 1700;
  A.PIER = { x: 2800, y: 1700, w: 200, h: 520 };
})();
