// Aurelia Nights — config.js
// World constants, seeded RNG, districts, prices and job definitions.
// Everything here is original work written for this build.
window.AN = window.AN || {};
(function () {
  var AN = window.AN;

  // ---- world size ----
  AN.WORLD_W = 3600;
  AN.WORLD_H = 2600;
  AN.ROAD_W = 96;

  // ---- seeded random (mulberry32) ----
  AN.makeRng = function (seed) {
    var s = seed >>> 0;
    return function () {
      s = (s + 0x6D2B79F5) >>> 0;
      var t = s;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  };
  AN.rng = AN.makeRng(20261119);
  AN.rand = function (a, b) { return a + AN.rng() * (b - a); };
  AN.randInt = function (a, b) { return Math.floor(AN.rand(a, b + 1)); };
  AN.pick = function (arr) { return arr[Math.floor(AN.rng() * arr.length)]; };
  AN.clamp = function (v, a, b) { return v < a ? a : v > b ? b : v; };
  AN.dist = function (x1, y1, x2, y2) {
    var dx = x2 - x1, dy = y2 - y1;
    return Math.sqrt(dx * dx + dy * dy);
  };
  AN.angTo = function (x1, y1, x2, y2) { return Math.atan2(y2 - y1, x2 - x1); };
  AN.wrapAngle = function (a) {
    while (a > Math.PI) a -= Math.PI * 2;
    while (a < -Math.PI) a += Math.PI * 2;
    return a;
  };

  // ---- districts ----
  AN.DISTRICTS = [
    { name: "Old Town", x: 0, y: 0, w: 1300, h: 1200, ground: "#3a3f4a", label: "#8b93a7" },
    { name: "Downtown", x: 1300, y: 0, w: 1000, h: 1200, ground: "#33363f", label: "#98a0b5" },
    { name: "Marina", x: 2300, y: 0, w: 1300, h: 1200, ground: "#2f3d46", label: "#7fb3c8" },
    { name: "Little Vesper", x: 0, y: 1200, w: 1300, h: 900, ground: "#40382f", label: "#c2a878" },
    { name: "Midtown", x: 1300, y: 1200, w: 1500, h: 900, ground: "#38343c", label: "#a89ec2" },
    { name: "The Docks", x: 2800, y: 1200, w: 800, h: 1400, ground: "#2e2a26", label: "#b08d5a" }
  ];

  // ---- roads ----
  AN.ROAD_X = [300, 800, 1300, 1800, 2300, 2800, 3300];
  AN.ROAD_Y = [300, 750, 1200, 1650, 2100];

  // ---- key places (all on/near roads) ----
  AN.PLACES = {
    playerStart: { x: 900, y: 900 },
    safehouse: { x: 700, y: 640, name: "Rosa's Flat", kind: "safehouse" },
    chopShop: { x: 3150, y: 2220, name: "Big Sal's Chop Shop", kind: "chop" },
    bank: { x: 1800, y: 1120, name: "Port Aurelia Bank", kind: "bank" },
    gunShop: { x: 1300, y: 830, name: "Iron & Oak", kind: "gun" },
    sprayShop: { x: 2300, y: 1730, name: "Lola's Spray Shop", kind: "spray" },
    diner: { x: 800, y: 1730, name: "The Golden Gull", kind: "diner" },
    hospital: { x: 1800, y: 380, name: "St. Aurelia General", kind: "hospital" },
    pier: { x: 3350, y: 2380, name: "Pier 9", kind: "pier" },
    crateSpot: { x: 3380, y: 2440, name: "Vesper Crate", kind: "crate" },
    airfield: { x: 3300, y: 300, name: "North Airfield", kind: "airfield" },
    vault: { x: 1800, y: 1120, name: "Bank Vault", kind: "vault" }
  };

  // ---- prices ----
  AN.PRICE = {
    pistol: 150,
    shotgun: 400,
    ammo: 25,
    spray: 100,
    dinerMeal: 20,
    hospital: 50
  };

  // ---- story jobs ----
  AN.JOBS = [
    {
      id: 1, name: "Grand Theft Aurelia", pay: 400,
      brief: "Steal a car off the street and deliver it to Big Sal's Chop Shop in The Docks.",
      hint: "Walk up to a car and press E to steal it, then drive to the yellow marker."
    },
    {
      id: 2, name: "Heat Wave", pay: 600,
      brief: "Get the heat up to 3 stars, then survive 60 seconds without getting busted.",
      hint: "Steal cars and make noise to raise stars. Stay moving and stay alive."
    },
    {
      id: 3, name: "Pier 9 Shootout", pay: 900,
      brief: "Clear out the 6 Vesper guards on Pier 9 and grab the crate.",
      hint: "Buy a shotgun at Iron & Oak first. Aim with the mouse, click to fire."
    },
    {
      id: 4, name: "The Vault Job", pay: 1500,
      brief: "Hold the bank vault for 20 seconds, then escape to Rosa's Flat.",
      hint: "Stand inside the vault ring. Cops will come — hold your ground, then run."
    },
    {
      id: 5, name: "Four-Star Run", pay: 2000,
      brief: "At 4 stars, hit all 3 checkpoints across the city within 150 seconds.",
      hint: "Raise the heat to 4 stars first, then follow the markers. Drive fast."
    },
    {
      id: 6, name: "Lockdown", pay: 3500,
      brief: "Survive 90 seconds at 5 stars, then reach the North Airfield.",
      hint: "Maximum heat. Keep moving, use the spray shop only if you can lose them first."
    }
  ];

  AN.CAR_COLORS = ["#c0392b", "#2980b9", "#27ae60", "#f39c12", "#8e44ad", "#16a085",
    "#d35400", "#7f8c8d", "#e74c3c", "#2c3e50", "#e67e22", "#1abc9c"];
  AN.PED_COLORS = ["#e74c3c", "#3498db", "#2ecc71", "#f1c40f", "#9b59b6", "#e67e22",
    "#1abc9c", "#fd79a8", "#00cec9", "#6c5ce7"];
  AN.BUILDING_COLORS = ["#4a4f5c", "#55503f", "#3f4a55", "#5c4a4a", "#464a3f", "#4f4258"];
})();
