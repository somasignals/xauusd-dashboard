import { useState, useEffect, useRef, useCallback } from "react";

// ─── CONFIG — swap PROVIDER here to change AI backend ────────────────────────
const API_ENDPOINT = "/api/analyze"; // points to api/analyze.js on Vercel

// ─── THEME ────────────────────────────────────────────────────────────────────
const C = {
  gold:"#D4AF37",green:"#4CAF50",red:"#EF5350",blue:"#5C9EE8",
  orange:"#FF9800",purple:"#9C6FE4",bg:"#07080a",card:"#0d0e10",
  border:"#1a1b1e",dim:"#555",muted:"#888",text:"#e0e0e0",
};

// ─── WINDOWS ──────────────────────────────────────────────────────────────────
const WINDOWS = [
  {id:"asian",     name:"Asian",      short:"ASN", wib:"09:30–11:00",tier:"D",color:C.purple,vol:1,emoji:"🌏"},
  {id:"pre_london",name:"Pre-London", short:"PRE", wib:"13:00–14:30",tier:"A",color:C.green, vol:5,emoji:"⭐"},
  {id:"london",    name:"London",     short:"LON", wib:"15:00–16:30",tier:"B",color:C.gold,  vol:4,emoji:"🇬🇧"},
  {id:"ny",        name:"NY+COMEX",   short:"NY",  wib:"20:00–21:30",tier:"A",color:C.blue,  vol:5,emoji:"🗽"},
  {id:"late",      name:"Late London",short:"LATE",wib:"22:00–23:00",tier:"D",color:C.orange,vol:2,emoji:"⚠️"},
];

const SCHEDULE = [
  {wib:"06:00",label:"Bangun + Calendar",type:"prep",   desc:"Cek Forex Factory — tandai news merah hari ini."},
  {wib:"06:30",label:"Bias Harian",      type:"prep",   desc:"Baca berita gold overnight. Naik atau turun? Tentukan bias SELL/BUY."},
  {wib:"09:30",label:"🌏 Asian (AVOID)",type:"danger",  desc:"Data lo: WR ~10–15%. Hampir selalu loss. Skip kecuali trend H4 sangat jelas. Max 1 trade, lot 0.01, SL 20+ pips wajib."},
  {wib:"12:00",label:"⚡ Chart Prep",   type:"prime",   desc:"WAJIB buka chart. H4→H1→15M. Mark semua swing high/low dan S/R levels."},
  {wib:"13:00",label:"⭐ Pre-London",   type:"window",  desc:"WINDOW TERBAIK. Jan 27: +$30. Mar 10: +$30. Mar 16: +$20. Frankfurt aktif, institutional positioning. Max 2 trade."},
  {wib:"15:00",label:"🇬🇧 London Open",type:"window",  desc:"Tunggu 15–20 menit. Lihat apakah London break up/down dari Asian range. Entry di pullback."},
  {wib:"19:30",label:"Pre-NY Prep",     type:"prep",   desc:"Cek US news jam 20:00–21:30. Ada NFP/CPI/FOMC? Jangan entry 15 menit sebelum."},
  {wib:"20:00",label:"🗽 NY+COMEX",    type:"window",  desc:"Volume tertinggi global. COMEX open 20:30 inject momentum. Follow direction London."},
  {wib:"22:00",label:"⚠️ Late London", type:"danger",  desc:"LAST RESORT ONLY. 3+ losses dari data lo di jam ini. Lot -50%, SL 20+ pips, berhenti 23:00."},
  {wib:"23:00",label:"🔴 HARD STOP",   type:"stop",    desc:"Tutup semua posisi. Tidak ada alasan trading setelah ini."},
  {wib:"23:15",label:"Journal",         type:"close",   desc:"Screenshot + alasan entry + emosi. 5 menit per trade."},
];

// ─── ALL 82 TRADES (Jan 7 – Mar 17, 2026) ────────────────────────────────────
const SEED_TRADES = [
  {id:1,  date:"2026-01-07",time:"03:57",direction:"BUY", entryPrice:"4466.68",exitPrice:"4461.33",stopLoss:"4461.68",takeProfit:"",        lotSize:"0.01",status:"LOSS",      session:"Outside",    emotion:"Calm",      strategy:"",             notes:"Jan 7 overnight"},
  {id:2,  date:"2026-01-07",time:"04:38",direction:"BUY", entryPrice:"4475.65",exitPrice:"4475.65",stopLoss:"4475.65",takeProfit:"",        lotSize:"0.01",status:"BREAKEVEN", session:"Outside",    emotion:"Calm",      strategy:"",             notes:""},
  {id:3,  date:"2026-01-07",time:"04:47",direction:"SELL",entryPrice:"4477.31",exitPrice:"4477.43",stopLoss:"4477.31",takeProfit:"",        lotSize:"0.02",status:"LOSS",      session:"Outside",    emotion:"Calm",      strategy:"",             notes:"Tight SL 0.12 pts — spread loss"},
  {id:4,  date:"2026-01-07",time:"07:31",direction:"SELL",entryPrice:"4476.42",exitPrice:"4466.03",stopLoss:"4476.42",takeProfit:"",        lotSize:"0.01",status:"WIN",       session:"Pre-London", emotion:"Calm",      strategy:"Trend Follow", notes:"+10.39"},
  {id:5,  date:"2026-01-07",time:"11:01",direction:"BUY", entryPrice:"4456.04",exitPrice:"4466.59",stopLoss:"",        takeProfit:"4540.00",lotSize:"0.01",status:"WIN",       session:"Outside",    emotion:"Calm",      strategy:"",             notes:"+10.55"},
  {id:6,  date:"2026-01-08",time:"07:39",direction:"BUY", entryPrice:"4424.33",exitPrice:"4424.92",stopLoss:"",        takeProfit:"",        lotSize:"0.01",status:"WIN",       session:"Pre-London", emotion:"Calm",      strategy:"",             notes:"Small win +0.59"},
  {id:7,  date:"2026-01-08",time:"08:00",direction:"BUY", entryPrice:"4418.45",exitPrice:"4428.58",stopLoss:"4415.00",takeProfit:"",        lotSize:"0.01",status:"WIN",       session:"London",     emotion:"Calm",      strategy:"Breakout",     notes:"+10.13"},
  {id:8,  date:"2026-01-08",time:"08:10",direction:"SELL",entryPrice:"4418.04",exitPrice:"4422.11",stopLoss:"4422.00",takeProfit:"",        lotSize:"0.01",status:"LOSS",      session:"London",     emotion:"Calm",      strategy:"",             notes:"Counter-trend"},
  {id:9,  date:"2026-01-08",time:"08:18",direction:"SELL",entryPrice:"4421.36",exitPrice:"4421.36",stopLoss:"4421.36",takeProfit:"",        lotSize:"0.01",status:"BREAKEVEN", session:"London",     emotion:"Calm",      strategy:"",             notes:""},
  {id:10, date:"2026-01-08",time:"09:08",direction:"SELL",entryPrice:"4433.73",exitPrice:"4438.12",stopLoss:"4438.00",takeProfit:"",        lotSize:"0.01",status:"LOSS",      session:"London",     emotion:"Calm",      strategy:"",             notes:"SL tight 4.39 pts"},
  {id:11, date:"2026-01-08",time:"12:20",direction:"BUY", entryPrice:"4430.04",exitPrice:"4424.00",stopLoss:"4424.00",takeProfit:"4467.00", lotSize:"0.01",status:"LOSS",      session:"Outside",    emotion:"Calm",      strategy:"",             notes:""},
  {id:12, date:"2026-01-08",time:"14:05",direction:"BUY", entryPrice:"4424.18",exitPrice:"4414.00",stopLoss:"4414.00",takeProfit:"",        lotSize:"0.01",status:"LOSS",      session:"NY",         emotion:"Calm",      strategy:"",             notes:""},
  {id:13, date:"2026-01-08",time:"20:08",direction:"BUY", entryPrice:"4417.12",exitPrice:"4455.00",stopLoss:"4455.00",takeProfit:"4500.00", lotSize:"0.01",status:"WIN",       session:"NY",         emotion:"Calm",      strategy:"Trend Follow", notes:"BEST trade +$37.88 — held 6+ hours"},
  {id:14, date:"2026-01-09",time:"04:53",direction:"BUY", entryPrice:"4467.58",exitPrice:"4467.00",stopLoss:"4467.00",takeProfit:"4500.00", lotSize:"0.01",status:"LOSS",      session:"Asian",      emotion:"Calm",      strategy:"",             notes:"Asian session loss"},
  {id:15, date:"2026-01-09",time:"08:41",direction:"BUY", entryPrice:"4464.25",exitPrice:"4474.63",stopLoss:"4464.25",takeProfit:"4500.00", lotSize:"0.01",status:"WIN",       session:"London",     emotion:"Calm",      strategy:"Breakout",     notes:"+10.38"},
  {id:16, date:"2026-01-09",time:"12:45",direction:"BUY", entryPrice:"4468.39",exitPrice:"4468.39",stopLoss:"4468.39",takeProfit:"",        lotSize:"0.02",status:"BREAKEVEN", session:"Outside",    emotion:"Calm",      strategy:"",             notes:""},
  {id:17, date:"2026-01-09",time:"14:33",direction:"BUY", entryPrice:"4468.89",exitPrice:"4463.89",stopLoss:"4463.89",takeProfit:"4474.00", lotSize:"0.02",status:"LOSS",      session:"NY",         emotion:"Calm",      strategy:"",             notes:""},
  {id:18, date:"2026-01-09",time:"15:34",direction:"BUY", entryPrice:"4463.17",exitPrice:"4482.80",stopLoss:"",        takeProfit:"4500.00", lotSize:"0.01",status:"WIN",       session:"Late London",emotion:"Calm",      strategy:"Trend Follow", notes:"+19.63"},
  {id:19, date:"2026-01-12",time:"01:19",direction:"SELL",entryPrice:"4526.91",exitPrice:"4531.98",stopLoss:"4531.91",takeProfit:"4500.00", lotSize:"0.02",status:"LOSS",      session:"Outside",    emotion:"Calm",      strategy:"",             notes:""},
  {id:20, date:"2026-01-12",time:"02:32",direction:"SELL",entryPrice:"4547.24",exitPrice:"4574.21",stopLoss:"",        takeProfit:"4405.00", lotSize:"0.02",status:"LOSS",      session:"Asian",      emotion:"Calm",      strategy:"",             notes:"⚠️ NO SL — biggest loss -$53.94"},
  {id:21, date:"2026-01-26",time:"02:19",direction:"BUY", entryPrice:"5037.21",exitPrice:"5033.88",stopLoss:"5034.21",takeProfit:"",        lotSize:"0.01",status:"LOSS",      session:"Outside",    emotion:"Calm",      strategy:"",             notes:""},
  {id:22, date:"2026-01-26",time:"03:12",direction:"SELL",entryPrice:"5051.01",exitPrice:"5054.00",stopLoss:"5054.00",takeProfit:"",        lotSize:"0.01",status:"LOSS",      session:"Asian",      emotion:"Calm",      strategy:"",             notes:"Asian session"},
  {id:23, date:"2026-01-26",time:"03:15",direction:"SELL",entryPrice:"5056.17",exitPrice:"5059.58",stopLoss:"",        takeProfit:"",        lotSize:"0.01",status:"LOSS",      session:"Asian",      emotion:"Calm",      strategy:"",             notes:"No SL"},
  {id:24, date:"2026-01-26",time:"08:45",direction:"SELL",entryPrice:"5094.63",exitPrice:"5098.33",stopLoss:"5097.63",takeProfit:"5004.80", lotSize:"0.01",status:"LOSS",      session:"London",     emotion:"Calm",      strategy:"",             notes:""},
  {id:25, date:"2026-01-26",time:"11:49",direction:"BUY", entryPrice:"5091.61",exitPrice:"5087.45",stopLoss:"5088.00",takeProfit:"",        lotSize:"0.01",status:"LOSS",      session:"Outside",    emotion:"Calm",      strategy:"",             notes:"Counter-trend BUY in downtrend"},
  {id:26, date:"2026-01-27",time:"10:13",direction:"SELL",entryPrice:"5100.74",exitPrice:"5085.74",stopLoss:"5085.74",takeProfit:"5060.95", lotSize:"0.01",status:"WIN",       session:"Outside",    emotion:"Calm",      strategy:"Trend Follow", notes:"+15.00"},
  {id:27, date:"2026-01-27",time:"12:33",direction:"SELL",entryPrice:"5098.57",exitPrice:"5083.24",stopLoss:"5088.50",takeProfit:"5083.24", lotSize:"0.01",status:"WIN",       session:"Outside",    emotion:"Calm",      strategy:"Trend Follow", notes:"+15.33"},
  {id:28, date:"2026-01-27",time:"12:46",direction:"BUY", entryPrice:"5085.45",exitPrice:"5082.00",stopLoss:"5082.00",takeProfit:"",        lotSize:"0.01",status:"LOSS",      session:"Outside",    emotion:"Calm",      strategy:"",             notes:"BUY in downtrend"},
  {id:29, date:"2026-01-28",time:"03:40",direction:"SELL",entryPrice:"5201.07",exitPrice:"5203.50",stopLoss:"5203.50",takeProfit:"5187.88", lotSize:"0.01",status:"LOSS",      session:"Asian",      emotion:"Calm",      strategy:"",             notes:"Asian — tight SL"},
  {id:30, date:"2026-01-28",time:"07:07",direction:"SELL",entryPrice:"5247.04",exitPrice:"5252.47",stopLoss:"5252.00",takeProfit:"",        lotSize:"0.01",status:"LOSS",      session:"Pre-London", emotion:"FOMO",      strategy:"",             notes:"SELL into uptrend"},
  {id:31, date:"2026-01-28",time:"07:24",direction:"SELL",entryPrice:"5258.50",exitPrice:"5260.25",stopLoss:"5260.00",takeProfit:"",        lotSize:"0.01",status:"LOSS",      session:"Pre-London", emotion:"FOMO",      strategy:"",             notes:"FOMO — 2nd attempt"},
  {id:32, date:"2026-01-28",time:"10:26",direction:"SELL",entryPrice:"5298.96",exitPrice:"5298.96",stopLoss:"5298.96",takeProfit:"5248.19", lotSize:"0.01",status:"BREAKEVEN", session:"Outside",    emotion:"Calm",      strategy:"",             notes:""},
  {id:33, date:"2026-01-29",time:"01:00",direction:"SELL",entryPrice:"5420.32",exitPrice:"5424.82",stopLoss:"5423.49",takeProfit:"5371.49", lotSize:"0.01",status:"LOSS",      session:"Outside",    emotion:"Calm",      strategy:"",             notes:"Overnight sell"},
  {id:34, date:"2026-01-29",time:"17:04",direction:"BUY", entryPrice:"5448.39",exitPrice:"5441.52",stopLoss:"5443.00",takeProfit:"5577.87", lotSize:"0.01",status:"LOSS",      session:"Late London",emotion:"Calm",      strategy:"",             notes:"BUY at ATH — no structure"},
  {id:35, date:"2026-01-30",time:"08:29",direction:"BUY", entryPrice:"5161.28",exitPrice:"5157.19",stopLoss:"5158.65",takeProfit:"5195.17", lotSize:"0.01",status:"LOSS",      session:"London",     emotion:"Anxious",   strategy:"",             notes:"BUY in downtrend — 1st attempt Jan29-30 crash"},
  {id:36, date:"2026-01-30",time:"08:45",direction:"BUY", entryPrice:"5153.26",exitPrice:"5150.93",stopLoss:"5151.12",takeProfit:"5204.59", lotSize:"0.01",status:"LOSS",      session:"London",     emotion:"Anxious",   strategy:"",             notes:"BUY — 2nd attempt"},
  {id:37, date:"2026-01-30",time:"09:35",direction:"BUY", entryPrice:"5120.83",exitPrice:"5118.83",stopLoss:"5118.83",takeProfit:"5216.49", lotSize:"0.01",status:"LOSS",      session:"Late London",emotion:"Anxious",   strategy:"",             notes:"BUY — 3rd attempt"},
  {id:38, date:"2026-01-30",time:"10:33",direction:"BUY", entryPrice:"5113.61",exitPrice:"5098.35",stopLoss:"5111.02",takeProfit:"5173.23", lotSize:"0.01",status:"LOSS",      session:"Outside",    emotion:"Anxious",   strategy:"",             notes:"BUY 4th attempt — -$15.26"},
  {id:39, date:"2026-02-02",time:"02:23",direction:"BUY", entryPrice:"4880.95",exitPrice:"4876.14",stopLoss:"",        takeProfit:"",        lotSize:"0.01",status:"LOSS",      session:"Outside",    emotion:"Calm",      strategy:"",             notes:"No SL"},
  {id:40, date:"2026-02-03",time:"11:43",direction:"BUY", entryPrice:"4918.64",exitPrice:"4919.68",stopLoss:"",        takeProfit:"",        lotSize:"0.01",status:"WIN",       session:"Outside",    emotion:"Calm",      strategy:"",             notes:"Small win +1.04"},
  {id:41, date:"2026-02-03",time:"12:30",direction:"SELL",entryPrice:"4918.53",exitPrice:"4921.00",stopLoss:"4921.00",takeProfit:"",        lotSize:"0.01",status:"LOSS",      session:"Outside",    emotion:"Calm",      strategy:"",             notes:""},
  {id:42, date:"2026-02-03",time:"13:03",direction:"SELL",entryPrice:"4917.40",exitPrice:"4899.37",stopLoss:"4897.00",takeProfit:"",        lotSize:"0.01",status:"WIN",       session:"NY",         emotion:"Calm",      strategy:"Trend Follow", notes:"+18.03"},
  {id:43, date:"2026-02-03",time:"13:17",direction:"BUY", entryPrice:"4903.36",exitPrice:"4900.55",stopLoss:"",        takeProfit:"",        lotSize:"0.01",status:"LOSS",      session:"NY",         emotion:"FOMO",      strategy:"",             notes:"Counter BUY after SELL win — FOMO"},
  {id:44, date:"2026-02-03",time:"14:20",direction:"SELL",entryPrice:"4932.70",exitPrice:"4910.75",stopLoss:"4932.75",takeProfit:"4715.00", lotSize:"0.01",status:"WIN",       session:"NY",         emotion:"Disciplined",strategy:"Trend Follow", notes:"+21.95 — best Feb 3"},
  {id:45, date:"2026-02-04",time:"03:23",direction:"SELL",entryPrice:"5038.41",exitPrice:"5042.00",stopLoss:"5042.00",takeProfit:"",        lotSize:"0.01",status:"LOSS",      session:"Asian",      emotion:"Calm",      strategy:"",             notes:"Asian loss"},
  {id:46, date:"2026-02-04",time:"03:28",direction:"BUY", entryPrice:"5045.32",exitPrice:"5034.94",stopLoss:"5035.00",takeProfit:"",        lotSize:"0.01",status:"LOSS",      session:"Asian",      emotion:"Calm",      strategy:"",             notes:"Revenge BUY 5 min after loss"},
  {id:47, date:"2026-02-04",time:"08:06",direction:"BUY", entryPrice:"5080.28",exitPrice:"5064.44",stopLoss:"",        takeProfit:"",        lotSize:"0.01",status:"LOSS",      session:"London",     emotion:"FOMO",      strategy:"",             notes:"⚠️ NO SL — -$15.84"},
  {id:48, date:"2026-02-04",time:"17:31",direction:"BUY", entryPrice:"4948.85",exitPrice:"4940.05",stopLoss:"",        takeProfit:"",        lotSize:"0.01",status:"LOSS",      session:"Late London",emotion:"Fearful",   strategy:"",             notes:"No SL"},
  {id:49, date:"2026-02-05",time:"01:59",direction:"SELL",entryPrice:"5022.71",exitPrice:"5011.63",stopLoss:"5022.70",takeProfit:"",        lotSize:"0.01",status:"WIN",       session:"Outside",    emotion:"Calm",      strategy:"Trend Follow", notes:"+11.08"},
  {id:50, date:"2026-02-05",time:"16:23",direction:"SELL",entryPrice:"4818.53",exitPrice:"4822.00",stopLoss:"4822.00",takeProfit:"",        lotSize:"0.01",status:"LOSS",      session:"Late London",emotion:"Calm",      strategy:"",             notes:""},
  {id:51, date:"2026-02-06",time:"06:03",direction:"SELL",entryPrice:"4824.94",exitPrice:"4825.07",stopLoss:"4825.00",takeProfit:"",        lotSize:"0.01",status:"LOSS",      session:"Pre-London", emotion:"Calm",      strategy:"",             notes:"⚠️ SL 0.06 pts — spread loss, never viable"},
  {id:52, date:"2026-02-06",time:"06:16",direction:"SELL",entryPrice:"4824.57",exitPrice:"4824.74",stopLoss:"4824.60",takeProfit:"",        lotSize:"0.01",status:"LOSS",      session:"Pre-London", emotion:"Calm",      strategy:"",             notes:"⚠️ SL 0.03 pts — spread loss"},
  {id:53, date:"2026-02-06",time:"06:21",direction:"SELL",entryPrice:"4818.05",exitPrice:"4820.00",stopLoss:"4820.00",takeProfit:"",        lotSize:"0.01",status:"LOSS",      session:"Pre-London", emotion:"Anxious",   strategy:"",             notes:"4th trade same day — overtrading"},
  {id:54, date:"2026-02-06",time:"07:17",direction:"SELL",entryPrice:"4823.81",exitPrice:"4826.86",stopLoss:"4826.00",takeProfit:"",        lotSize:"0.01",status:"LOSS",      session:"Pre-London", emotion:"Anxious",   strategy:"",             notes:"5th trade same day"},
  {id:55, date:"2026-02-09",time:"04:05",direction:"BUY", entryPrice:"4978.81",exitPrice:"4977.96",stopLoss:"4978.81",takeProfit:"",        lotSize:"0.01",status:"LOSS",      session:"Asian",      emotion:"Calm",      strategy:"",             notes:"Asian — SL at entry"},
  {id:56, date:"2026-02-09",time:"05:16",direction:"BUY", entryPrice:"5020.38",exitPrice:"5017.57",stopLoss:"",        takeProfit:"",        lotSize:"0.01",status:"LOSS",      session:"Outside",    emotion:"Calm",      strategy:"",             notes:"No SL"},
  {id:57, date:"2026-02-09",time:"07:41",direction:"SELL",entryPrice:"5032.96",exitPrice:"5037.83",stopLoss:"5036.61",takeProfit:"",        lotSize:"0.01",status:"LOSS",      session:"Pre-London", emotion:"Calm",      strategy:"",             notes:""},
  {id:58, date:"2026-02-09",time:"07:49",direction:"BUY", entryPrice:"5029.96",exitPrice:"5024.54",stopLoss:"",        takeProfit:"",        lotSize:"0.01",status:"LOSS",      session:"Pre-London", emotion:"FOMO",      strategy:"",             notes:"Immediate counter trade"},
  {id:59, date:"2026-02-09",time:"11:40",direction:"BUY", entryPrice:"5013.54",exitPrice:"5013.54",stopLoss:"5013.54",takeProfit:"",        lotSize:"0.01",status:"BREAKEVEN", session:"Outside",    emotion:"Calm",      strategy:"",             notes:""},
  {id:60, date:"2026-02-09",time:"11:54",direction:"BUY", entryPrice:"5008.84",exitPrice:"5005.66",stopLoss:"5005.66",takeProfit:"",        lotSize:"0.01",status:"LOSS",      session:"Outside",    emotion:"Calm",      strategy:"",             notes:"7 trades Feb 9 — overtrading"},
  {id:61, date:"2026-02-09",time:"13:54",direction:"SELL",entryPrice:"5015.61",exitPrice:"5017.94",stopLoss:"5017.54",takeProfit:"4959.00", lotSize:"0.01",status:"LOSS",      session:"NY",         emotion:"Calm",      strategy:"",             notes:""},
  {id:62, date:"2026-02-10",time:"05:15",direction:"BUY", entryPrice:"5025.40",exitPrice:"5022.59",stopLoss:"5023.16",takeProfit:"",        lotSize:"0.01",status:"LOSS",      session:"Outside",    emotion:"Calm",      strategy:"",             notes:""},
  {id:63, date:"2026-03-04",time:"02:39",direction:"BUY", entryPrice:"5123.11",exitPrice:"5123.89",stopLoss:"",        takeProfit:"",        lotSize:"0.01",status:"WIN",       session:"Outside",    emotion:"Calm",      strategy:"",             notes:"Small win +0.78"},
  {id:64, date:"2026-03-06",time:"15:37",direction:"SELL",entryPrice:"5129.66",exitPrice:"5126.69",stopLoss:"",        takeProfit:"",        lotSize:"0.01",status:"WIN",       session:"Late London",emotion:"Calm",      strategy:"",             notes:"+2.97"},
  {id:65, date:"2026-03-09",time:"04:32",direction:"BUY", entryPrice:"5079.46",exitPrice:"5087.83",stopLoss:"",        takeProfit:"5087.83", lotSize:"0.01",status:"WIN",       session:"Asian",      emotion:"Calm",      strategy:"",             notes:"+8.37"},
  {id:66, date:"2026-03-09",time:"12:55",direction:"SELL",entryPrice:"5088.31",exitPrice:"5096.62",stopLoss:"5096.62",takeProfit:"",        lotSize:"0.01",status:"LOSS",      session:"NY",         emotion:"Calm",      strategy:"",             notes:"SELL against bounce"},
  {id:67, date:"2026-03-10",time:"05:07",direction:"SELL",entryPrice:"5172.13",exitPrice:"5172.00",stopLoss:"5172.00",takeProfit:"",        lotSize:"0.01",status:"BREAKEVEN", session:"Pre-London", emotion:"Calm",      strategy:"",             notes:"BE — SL at entry"},
  {id:68, date:"2026-03-10",time:"05:45",direction:"SELL",entryPrice:"5171.46",exitPrice:"5163.08",stopLoss:"5171.00",takeProfit:"5141.00", lotSize:"0.01",status:"WIN",       session:"Pre-London", emotion:"Disciplined",strategy:"Trend Follow", notes:"+8.38 — good SL/TP"},
  {id:69, date:"2026-03-10",time:"06:22",direction:"BUY", entryPrice:"5155.04",exitPrice:"5165.75",stopLoss:"5154.00",takeProfit:"",        lotSize:"0.01",status:"WIN",       session:"Pre-London", emotion:"Disciplined",strategy:"Support/Resistance",notes:"+10.71 — bounce from support"},
  {id:70, date:"2026-03-10",time:"12:02",direction:"SELL",entryPrice:"5190.87",exitPrice:"5179.85",stopLoss:"5191.00",takeProfit:"",        lotSize:"0.01",status:"WIN",       session:"NY",         emotion:"Calm",      strategy:"Trend Follow", notes:"+11.02"},
  {id:71, date:"2026-03-10",time:"15:18",direction:"SELL",entryPrice:"5204.01",exitPrice:"5207.87",stopLoss:"5207.43",takeProfit:"",        lotSize:"0.01",status:"LOSS",      session:"Late London",emotion:"Calm",      strategy:"",             notes:"SL 3.42 pts — too tight"},
  {id:72, date:"2026-03-11",time:"16:14",direction:"SELL",entryPrice:"5186.51",exitPrice:"5190.12",stopLoss:"5190.00",takeProfit:"",        lotSize:"0.01",status:"LOSS",      session:"Late London",emotion:"Calm",      strategy:"",             notes:"SL 3.49 pts — still too tight"},
  {id:73, date:"2026-03-11",time:"21:20",direction:"SELL",entryPrice:"5176.61",exitPrice:"5176.50",stopLoss:"5176.50",takeProfit:"5130.00", lotSize:"0.01",status:"BREAKEVEN", session:"Outside",    emotion:"Calm",      strategy:"",             notes:""},
  {id:74, date:"2026-03-12",time:"15:21",direction:"SELL",entryPrice:"5183.15",exitPrice:"5171.79",stopLoss:"",        takeProfit:"5171.79", lotSize:"0.01",status:"WIN",       session:"Late London",emotion:"Calm",      strategy:"Trend Follow", notes:"+11.36"},
  {id:75, date:"2026-03-12",time:"17:01",direction:"BUY", entryPrice:"5142.54",exitPrice:"5137.03",stopLoss:"5137.03",takeProfit:"",        lotSize:"0.01",status:"LOSS",      session:"Outside",    emotion:"Calm",      strategy:"",             notes:"BUY in downtrend"},
  {id:76, date:"2026-03-13",time:"04:46",direction:"BUY", entryPrice:"5118.70",exitPrice:"5114.70",stopLoss:"5114.70",takeProfit:"",        lotSize:"0.01",status:"LOSS",      session:"Asian",      emotion:"Calm",      strategy:"",             notes:"Asian session loss"},
  {id:77, date:"2026-03-13",time:"13:57",direction:"SELL",entryPrice:"5095.11",exitPrice:"5101.27",stopLoss:"",        takeProfit:"",        lotSize:"0.01",status:"LOSS",      session:"NY",         emotion:"Calm",      strategy:"",             notes:"No SL"},
  {id:78, date:"2026-03-16",time:"07:23",direction:"SELL",entryPrice:"5022.63",exitPrice:"5012.60",stopLoss:"5022.63",takeProfit:"5002.00", lotSize:"0.02",status:"WIN",       session:"Pre-London", emotion:"Disciplined",strategy:"Trend Follow", notes:"+20.06 — best March trade"},
  {id:79, date:"2026-03-16",time:"07:30",direction:"BUY", entryPrice:"5010.42",exitPrice:"5006.80",stopLoss:"5006.80",takeProfit:"",        lotSize:"0.02",status:"LOSS",      session:"Pre-London", emotion:"Greedy",    strategy:"",             notes:"⚠️ 7 min after win — revenge BUY"},
  {id:80, date:"2026-03-16",time:"11:57",direction:"BUY", entryPrice:"4983.31",exitPrice:"4975.63",stopLoss:"4975.63",takeProfit:"",        lotSize:"0.01",status:"LOSS",      session:"NY",         emotion:"Fearful",   strategy:"",             notes:"BUY below $5000 — catching knife"},
  {id:81, date:"2026-03-17",time:"05:53",direction:"SELL",entryPrice:"5027.31",exitPrice:"5030.06",stopLoss:"5030.06",takeProfit:"",        lotSize:"0.01",status:"LOSS",      session:"Pre-London", emotion:"Calm",      strategy:"",             notes:"Move already exhausted"},
  {id:82, date:"2026-03-17",time:"07:16",direction:"SELL",entryPrice:"5033.23",exitPrice:"5042.98",stopLoss:"5042.98",takeProfit:"",        lotSize:"0.01",status:"LOSS",      session:"Pre-London", emotion:"Anxious",   strategy:"",             notes:"Late entry after missed move"},
];

const STORAGE_KEY = "xauusd-v5";
const MAX_TRADES  = 3;
const MAX_LOSS    = 20;
const STRATEGIES  = ["Breakout","Range Trade","Trend Follow","News Play","Support/Resistance","EMA Crossover","Other"];
const SESSIONS    = ["Outside","Asian","Pre-London","London","NY","Late London","London/NY Overlap"];
const EMOTIONS    = ["Calm","Confident","Anxious","FOMO","Greedy","Fearful","Disciplined"];
const emptyForm   = {date:new Date().toISOString().slice(0,10),time:"",direction:"BUY",entryPrice:"",stopLoss:"",takeProfit:"",exitPrice:"",lotSize:"0.01",status:"OPEN",session:"Pre-London",strategy:"",emotion:"Calm",notes:""};

// ─── UTILS ────────────────────────────────────────────────────────────────────
const getWIB  = () => new Date(new Date().toLocaleString("en-US",{timeZone:"Asia/Jakarta"}));
const wibMins = d  => d.getHours()*60+d.getMinutes();
const fmtMins = m  => { const h=Math.floor(Math.abs(m)/60),min=Math.abs(m)%60; return h>0?`${h}j ${min}m`:`${min}m`; };
const todayStr = () => getWIB().toISOString().slice(0,10);

function getActiveWindow(mins) {
  return WINDOWS.find(w=>{const[s,e]=w.wib.split("–").map(t=>{const[h,m]=t.trim().split(":").map(Number);return h*60+m;});return mins>=s&&mins<e;})||null;
}
function getNextWindow(mins) {
  const all=WINDOWS.map(w=>{const[h,m]=w.wib.split("–")[0].trim().split(":").map(Number);return{...w,s:h*60+m};});
  return all.find(w=>w.s>mins)||all[0];
}
function pnl(t) {
  if(!t.exitPrice||!t.entryPrice||!t.lotSize) return null;
  const d=t.direction==="BUY"?parseFloat(t.exitPrice)-parseFloat(t.entryPrice):parseFloat(t.entryPrice)-parseFloat(t.exitPrice);
  return (d*parseFloat(t.lotSize)*100).toFixed(2);
}
function rrCalc(t) {
  if(!t.entryPrice||!t.stopLoss||!t.takeProfit) return null;
  const risk=Math.abs(parseFloat(t.entryPrice)-parseFloat(t.stopLoss));
  const reward=Math.abs(parseFloat(t.takeProfit)-parseFloat(t.entryPrice));
  return risk===0?null:(reward/risk).toFixed(2);
}
function getLotSuggestion(balance,slPips) {
  if(!balance||!slPips) return null;
  const risk=parseFloat(balance)*0.01;
  const lot=risk/(parseFloat(slPips)*100);
  return Math.max(0.01,Math.floor(lot/0.01)*0.01).toFixed(2);
}

// ─── MINI COMPONENTS ──────────────────────────────────────────────────────────
const Tag=({children,color=C.gold,sm})=>(<span style={{background:`${color}18`,color,border:`1px solid ${color}33`,borderRadius:4,padding:sm?"1px 6px":"2px 8px",fontSize:sm?9:10,fontWeight:700,letterSpacing:1,textTransform:"uppercase",whiteSpace:"nowrap"}}>{children}</span>);
const Dot=({color,pulse})=>(<div style={{width:8,height:8,borderRadius:"50%",background:color,boxShadow:`0 0 8px ${color}`,flexShrink:0,animation:pulse?"pulse 2s infinite":"none"}}/>);
const Card=({children,style={},accent})=>(<div style={{background:C.card,border:`1px solid ${accent||C.border}`,borderRadius:14,padding:"14px 16px",...style}}>{children}</div>);
const Spinner=({color=C.gold})=>(<div style={{width:16,height:16,border:`2px solid ${color}33`,borderTopColor:color,borderRadius:"50%",animation:"spin 0.8s linear infinite"}}/>);
const VolBar=({level,color})=>(<div style={{display:"flex",gap:3}}>{[1,2,3,4,5].map(i=><div key={i} style={{width:6,height:6,borderRadius:1,background:i<=level?color:"#1a1a1a"}}/>)}</div>);

const SIGNAL_CFG={
  "SETUP VALID":{color:C.green, emoji:"🟢",desc:"Kriteria terpenuhi — cek MT5, cari engulfing 5M"},
  "WATCH":      {color:C.orange,emoji:"👁️", desc:"Kondisi membaik — pantau, belum entry"},
  "WAIT":       {color:C.gold,  emoji:"⏳",desc:"Setup belum terbentuk — tunggu"},
  "NO TRADE":   {color:C.red,   emoji:"🔴",desc:"Kondisi tidak mendukung — jangan entry"},
  "LOADING":    {color:C.dim,   emoji:"⏳",desc:"Menganalisa..."},
};

function SLModal({onConfirm,onCancel}) {
  return (
    <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.88)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:1000,padding:20}}>
      <div style={{background:"#0f1012",border:`2px solid ${C.red}55`,borderRadius:16,padding:24,maxWidth:340,width:"100%"}}>
        <div style={{fontSize:32,textAlign:"center",marginBottom:10}}>⚠️</div>
        <div style={{color:C.red,fontWeight:700,fontSize:15,textAlign:"center",marginBottom:8}}>STOP — SL BELUM DISET!</div>
        <div style={{color:C.muted,fontSize:11,lineHeight:1.8,marginBottom:18,textAlign:"center"}}>
          Jan 12 (no SL) = <strong style={{color:C.red}}>-$53.94</strong>. Feb 4 (no SL) = <strong style={{color:C.red}}>-$15.84</strong>.<br/>Pasang SL <strong style={{color:C.gold}}>min 15 pips</strong> sebelum entry.
        </div>
        <div style={{display:"flex",gap:10}}>
          <button onClick={onCancel} style={{flex:1,background:`${C.gold}10`,border:`1px solid ${C.gold}44`,color:C.gold,borderRadius:10,padding:10,fontSize:12,fontWeight:700,cursor:"pointer"}}>← Set SL Dulu</button>
          <button onClick={onConfirm} style={{flex:1,background:`${C.red}10`,border:`1px solid ${C.red}44`,color:C.red,borderRadius:10,padding:10,fontSize:11,cursor:"pointer"}}>Tetap lanjut</button>
        </div>
      </div>
    </div>
  );
}

// ─── MAIN APP ─────────────────────────────────────────────────────────────────
export default function XAUDashboard() {
  const [tab,setTab]                   = useState("dashboard");
  const [wib,setWib]                   = useState(getWIB());
  const [signal,setSignal]             = useState(null);
  const [analysis,setAnalysis]         = useState(null);
  const [levels,setLevels]             = useState(null);
  const [loading,setLoading]           = useState(false);
  const [lastCheck,setLastCheck]       = useState(null);
  const [trades,setTrades]             = useState([]);
  const [loaded,setLoaded]             = useState(false);
  const [form,setForm]                 = useState(emptyForm);
  const [showForm,setShowForm]         = useState(false);
  const [editId,setEditId]             = useState(null);
  const [filterStatus,setFilterStatus] = useState("ALL");
  const [chat,setChat]                 = useState([]);
  const [chatInput,setChatInput]       = useState("");
  const [chatLoading,setChatLoading]   = useState(false);
  const [lot,setLot]                   = useState("0.03");
  const [slPips,setSlPips]             = useState("20");
  const [balance,setBalance]           = useState("");
  const [expandedW,setExpandedW]       = useState({});
  const [customLevels,setCustomLevels] = useState({resistance:["","",""],support:["","",""]});
  const [livePrice,setLivePrice]       = useState(null);
  const [liveMeta,setLiveMeta]         = useState(null);
  const [liveTrend,setLiveTrend]       = useState(null);
  const [liveTime,setLiveTime]         = useState(null);
  const [livePriceLoading,setLivePriceLoading] = useState(false);
  const [showSLModal,setShowSLModal]   = useState(false);
  const [pendingSave,setPendingSave]   = useState(null);
  const [apiError,setApiError]         = useState(null);
  const chatEnd = useRef(null);

  useEffect(()=>{ const t=setInterval(()=>setWib(getWIB()),1000); return()=>clearInterval(t); },[]);
  useEffect(()=>{ if(chatEnd.current) chatEnd.current.scrollIntoView({behavior:"smooth"}); },[chat]);
  useEffect(()=>{
    (async()=>{
      try { const r=await window.storage.get(STORAGE_KEY); setTrades(r?.value?JSON.parse(r.value):SEED_TRADES); }
      catch { setTrades(SEED_TRADES); }
      setLoaded(true);
    })();
  },[]);
  useEffect(()=>{ if(loaded) window.storage.set(STORAGE_KEY,JSON.stringify(trades)).catch(()=>{}); },[trades,loaded]);

  // ─ Derived state ─
  const mins      = wibMins(wib);
  const activeWin = getActiveWindow(mins);
  const nextWin   = getNextWindow(mins);
  const nextMins  = nextWin.wib.split("–")[0].trim().split(":").map(Number);
  const untilNext = (nextMins[0]*60+nextMins[1])>mins?(nextMins[0]*60+nextMins[1])-mins:(24*60-mins)+(nextMins[0]*60+nextMins[1]);
  const today           = todayStr();
  const todayTrades     = trades.filter(t=>t.date===today&&t.status!=="OPEN");
  const dailyCount      = trades.filter(t=>t.date===today).length;
  const dailyPnL        = todayTrades.reduce((s,t)=>s+(parseFloat(pnl(t))||0),0);
  const isLimitReached  = dailyCount>=MAX_TRADES;
  const isLossBreached  = dailyPnL<=-MAX_LOSS;
  const closed          = trades.filter(t=>t.status!=="OPEN");
  const wins            = closed.filter(t=>t.status==="WIN");
  const losses          = closed.filter(t=>t.status==="LOSS");
  const totalPnl        = closed.reduce((s,t)=>s+(parseFloat(pnl(t))||0),0);
  const winRate         = closed.length?((wins.length/closed.length)*100).toFixed(0):0;
  const trendBias       = analysis?.bias;
  const trendColor      = {BULLISH:C.green,BEARISH:C.red,SIDEWAYS:C.orange}[analysis?.trend]||C.dim;
  const biasColor       = {SELL:C.red,BUY:C.green,NEUTRAL:C.dim}[trendBias]||C.dim;
  const sigCfg          = SIGNAL_CFG[signal]||SIGNAL_CFG["WAIT"];
  const suggestedLot    = getLotSuggestion(balance,slPips);
  const lotN  = parseFloat(lot)||0.03;
  const slN   = parseFloat(slPips)||20;
  const tpN   = (slN*1.5).toFixed(0);
  const winD  = (lotN*parseFloat(tpN)*100).toFixed(2);
  const lossD = (lotN*slN*100).toFixed(2);

  // ─ Build signal prompt ─
  const buildSignalPrompt = useCallback(()=>{
    const timeStr=wib.toLocaleTimeString("id-ID",{hour:"2-digit",minute:"2-digit"});
    const dateStr=wib.toLocaleDateString("id-ID",{weekday:"long",day:"numeric",month:"long",year:"numeric"});
    const win=activeWin?`ACTIVE: ${activeWin.name} (Tier ${activeWin.tier})`:`Outside trading windows. Next: ${nextWin.name} in ${fmtMins(untilNext)}`;
    const custom=[...customLevels.resistance.filter(Boolean),...customLevels.support.filter(Boolean)];
    const anchor=livePrice?`CONFIRMED CURRENT PRICE: $${livePrice} (from live fetch — use as anchor)`:"Search for current price and use it as anchor";
    return `You are an expert XAU/USD (Gold) trading signal analyst for an Indonesian retail forex trader. WIB = UTC+7.

TODAY: ${timeStr} WIB — ${dateStr}
${anchor}
WINDOW: ${win}
CUSTOM LEVELS: ${custom.length?custom.join(", "):"none set"}

TRADER RULES:
- PRIMARY windows: 13:00–14:30 WIB (Pre-London, BEST) and 20:00–21:30 WIB (NY+COMEX)
- SECONDARY: 15:00–16:30 WIB (London Open)
- AVOID: 09:30–11:00 WIB (Asian — historical WR only 10–15% for this trader)
- SELL only if H1/15M shows lower highs + lower lows
- BUY only if H1/15M shows higher highs + higher lows
- Entry only after 5M engulfing CLOSE at key level
- SL minimum 15 pips (20 during news/Asian)
- TP = 1.5× SL
- No entry 15 min before/after high-impact news
- Stop after 2 consecutive losses in a day

Using the real-time web data provided above, return ONLY a valid JSON object with NO markdown fences, NO extra text:
{
  "signal": "SETUP VALID" or "WATCH" or "WAIT" or "NO TRADE",
  "price": "current XAU/USD price as string",
  "priceChange": "+X.XX or -X.XX",
  "pctChange": "X.XX%",
  "trend": "BULLISH" or "BEARISH" or "SIDEWAYS",
  "bias": "SELL" or "BUY" or "NEUTRAL",
  "windowNote": "brief note about current session suitability in Indonesian",
  "newsAlert": "high-impact USD news in next 3 hours, or null",
  "newsTime": "WIB time if applicable, or null",
  "resistanceLevels": [{"price":"XXXX.XX","strength":"STRONG or MEDIUM or WEAK","note":"why"}],
  "supportLevels":    [{"price":"XXXX.XX","strength":"STRONG or MEDIUM or WEAK","note":"why"}],
  "liquidityZones":   [{"price":"XXXX.XX","type":"BUY SIDE or SELL SIDE","note":"description"}],
  "suggestedEntry": "XXXX.XX or null",
  "suggestedSL":    "XXXX.XX or null",
  "suggestedTP":    "XXXX.XX or null",
  "reasoning": "2–3 sentences analysis in bahasa gaul Indonesian",
  "action": "specific action right now in Indonesian (1–2 sentences)",
  "marketContext": "what is driving gold today in Indonesian (1–2 sentences)"
}`;
  },[wib,activeWin,nextWin,untilNext,customLevels,livePrice]);

  // ─ API call helper ─
  const callApi = async(type, messages, system=null) => {
    const res = await fetch(API_ENDPOINT, {
      method:"POST",
      headers:{"Content-Type":"application/json"},
      body:JSON.stringify({type, messages, system}),
    });
    if(!res.ok) throw new Error(`API error ${res.status}`);
    const data = await res.json();
    if(data.error) throw new Error(data.error);
    return data.text || "";
  };

  // ─ Fetch live price ─
  const fetchLivePrice = async () => {
    setLivePriceLoading(true); setApiError(null);
    try {
      const text = await callApi("price", [{
        role:"user",
        content:`Search for the current live XAU/USD gold spot price right now. Return ONLY valid JSON, no markdown: {"price":"XXXX.XX","change":"+/-X.XX","pct":"X.XX%","trend":"BULLISH or BEARISH or SIDEWAYS","high24h":"XXXX.XX","low24h":"XXXX.XX"}`
      }]);
      const m = text.match(/\{[\s\S]*?\}/);
      if(m) {
        const p = JSON.parse(m[0]);
        setLivePrice(p.price);
        setLiveMeta({change:p.change, pct:p.pct, high:p.high24h, low:p.low24h});
        setLiveTrend(p.trend);
        setLiveTime(new Date());
      }
    } catch(e) { setApiError(`Price fetch error: ${e.message}`); }
    setLivePriceLoading(false);
  };

  // ─ Fetch full signal + levels ─
  const fetchSignal = async () => {
    setLoading(true); setSignal("LOADING"); setApiError(null);
    try {
      const text = await callApi("signal", [{role:"user",content:buildSignalPrompt()}]);
      // Clean any markdown fences
      const clean = text.replace(/```json|```/g,"").trim();
      const m = clean.match(/\{[\s\S]*\}/);
      if(m) {
        const p = JSON.parse(m[0]);
        setSignal(p.signal||"WAIT");
        setAnalysis(p);
        if(p.resistanceLevels||p.supportLevels) setLevels(p);
        if(p.price) { setLivePrice(p.price); setLiveMeta({change:p.priceChange,pct:p.pctChange,high:null,low:null}); setLiveTrend(p.trend); setLiveTime(new Date()); }
        setLastCheck(new Date());
      } else {
        setSignal("WAIT");
        setAnalysis({reasoning:text.slice(0,300), action:"Coba refresh lagi.", marketContext:""});
      }
    } catch(e) {
      setSignal("WAIT");
      setAnalysis({reasoning:`Error: ${e.message}`, action:"Cek koneksi internet dan coba lagi.", marketContext:""});
      setApiError(e.message);
    }
    setLoading(false);
  };

  // ─ Chat ─
  const sendChat = async () => {
    if(!chatInput.trim()||chatLoading) return;
    const msg = chatInput.trim(); setChatInput(""); setChat(h=>[...h,{role:"user",content:msg}]); setChatLoading(true);
    const sys = `Kamu adalah trading assistant XAU/USD untuk trader Indonesia. Waktu: ${wib.toLocaleTimeString("id-ID")} WIB. Harga gold saat ini: ${livePrice?`$${livePrice}`:"unknown (user belum refresh)"}. Signal: ${signal||"belum dicek"}. Trend: ${analysis?.trend||"unknown"}. Rules: SL min 15 pips, TP 1.5×SL, trade hanya Pre-London 13:00-14:30 WIB atau NY 20:00-21:30 WIB. AVOID Asian session (WR 10%). Max 3 trade per hari. Jawab bahasa gaul Indonesia, langsung to the point, max 4 kalimat kecuali diminta lebih panjang.`;
    try {
      const history = chat.slice(-6).map(m=>({role:m.role,content:m.content}));
      const text = await callApi("chat", [...history,{role:"user",content:msg}], sys);
      setChat(h=>[...h,{role:"assistant",content:text||"Hmm, coba lagi."}]);
    } catch(e) { setChat(h=>[...h,{role:"assistant",content:`Error: ${e.message}. Coba lagi.`}]); }
    setChatLoading(false);
  };

  // ─ Journal save with SL enforcer ─
  const attemptSave = () => {
    if(!form.entryPrice||!form.date) return;
    if(!form.stopLoss&&(form.status==="WIN"||form.status==="LOSS")) { setPendingSave({...form}); setShowSLModal(true); return; }
    doSave(form);
  };
  const doSave = f => {
    if(editId!==null) { setTrades(t=>t.map(tr=>tr.id===editId?{...f,id:editId}:tr)); setEditId(null); }
    else setTrades(t=>[...t,{...f,id:Date.now()}]);
    setForm(emptyForm); setShowForm(false); setShowSLModal(false); setPendingSave(null);
  };
  const deleteTrade = id => setTrades(t=>t.filter(tr=>tr.id!==id));
  const editTrade   = t  => { setForm(t); setEditId(t.id); setShowForm(true); };
  const inp = f => setForm(p=>({...p,...f}));

  const IS={background:"rgba(255,255,255,0.04)",border:`1px solid ${C.gold}25`,borderRadius:8,color:C.text,padding:"8px 11px",fontSize:13,outline:"none",boxSizing:"border-box",width:"100%",fontFamily:"'JetBrains Mono',monospace"};
  const LS={color:C.dim,fontSize:10,letterSpacing:1.5,textTransform:"uppercase",marginBottom:4};
  const filtered = trades.filter(t=>filterStatus==="ALL"||t.status===filterStatus);
  const TABS=[["dashboard","📡 Signal"],["levels","🎯 Levels"],["journal","📋 Journal"],["plan","🪟 Plan"],["schedule","⏰ Jadwal"],["chat","💬 AI"]];

  return (
    <div style={{minHeight:"100vh",background:C.bg,color:C.text,fontFamily:"'DM Sans',sans-serif",paddingBottom:70}}>
      <link href="https://fonts.googleapis.com/css2?family=Playfair+Display:wght@700&family=DM+Sans:wght@300;400;500;600&family=JetBrains+Mono:wght@400;600&display=swap" rel="stylesheet"/>
      <style>{`@keyframes pulse{0%,100%{opacity:1}50%{opacity:0.4}} @keyframes spin{to{transform:rotate(360deg)}} @keyframes fadeIn{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:translateY(0)}} ::-webkit-scrollbar{width:3px} ::-webkit-scrollbar-thumb{background:#2a2a2a;border-radius:2px}`}</style>

      {showSLModal&&<SLModal onConfirm={()=>doSave(pendingSave)} onCancel={()=>{setShowSLModal(false);setPendingSave(null);}}/>}

      {/* ── HEADER ── */}
      <div style={{background:`linear-gradient(180deg,#0f1012 0%,${C.bg} 100%)`,borderBottom:`1px solid ${C.border}`,padding:"13px 18px"}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10}}>
          <div style={{display:"flex",alignItems:"center",gap:10}}>
            <Dot color={activeWin?activeWin.color:C.dim} pulse={!!activeWin}/>
            <div>
              <div style={{display:"flex",alignItems:"center",gap:8}}>
                <span style={{color:C.gold,fontFamily:"'Playfair Display',serif",fontSize:17}}>XAU/USD</span>
                <span style={{color:C.dim,fontSize:11}}>Dashboard</span>
              </div>
              <div style={{color:C.dim,fontSize:10,marginTop:1}}>{activeWin?`🟢 ${activeWin.emoji} ${activeWin.name} aktif`:`⏸ Next: ${nextWin.emoji} ${nextWin.name} (${fmtMins(untilNext)})`}</div>
            </div>
          </div>
          <div style={{textAlign:"right"}}>
            <div style={{fontFamily:"'JetBrains Mono',monospace",fontSize:17,fontWeight:600,color:C.text}}>{wib.toLocaleTimeString("id-ID",{hour:"2-digit",minute:"2-digit",second:"2-digit"})}</div>
            <div style={{color:C.dim,fontSize:9}}>WIB · {wib.toLocaleDateString("id-ID",{weekday:"short",day:"numeric",month:"short"})}</div>
          </div>
        </div>

        {/* Daily stats */}
        <div style={{display:"flex",gap:8,marginBottom:10}}>
          <div style={{flex:1,background:`${isLimitReached?C.red:C.gold}10`,border:`1px solid ${isLimitReached?C.red:C.gold}33`,borderRadius:8,padding:"6px 10px"}}>
            <div style={{color:C.dim,fontSize:8,letterSpacing:1}}>TRADE HARI INI</div>
            <div style={{color:isLimitReached?C.red:C.gold,fontFamily:"'JetBrains Mono',monospace",fontSize:15,fontWeight:700}}>{dailyCount}<span style={{color:C.dim,fontSize:10}}>/{MAX_TRADES}</span></div>
            {isLimitReached&&<div style={{color:C.red,fontSize:8,marginTop:1}}>🔴 LIMIT!</div>}
          </div>
          <div style={{flex:1,background:`${isLossBreached?C.red:dailyPnL>0?C.green:C.dim}10`,border:`1px solid ${isLossBreached?C.red:dailyPnL>0?C.green:C.dim}33`,borderRadius:8,padding:"6px 10px"}}>
            <div style={{color:C.dim,fontSize:8,letterSpacing:1}}>P&L HARI INI</div>
            <div style={{color:isLossBreached?C.red:dailyPnL>0?C.green:C.muted,fontFamily:"'JetBrains Mono',monospace",fontSize:15,fontWeight:700}}>${dailyPnL.toFixed(2)}</div>
            {isLossBreached&&<div style={{color:C.red,fontSize:8,marginTop:1}}>🔴 STOP!</div>}
          </div>
          <div style={{flex:1,background:"rgba(255,255,255,0.02)",border:`1px solid ${C.border}`,borderRadius:8,padding:"6px 10px"}}>
            <div style={{color:C.dim,fontSize:8,letterSpacing:1}}>OVERALL WR</div>
            <div style={{color:parseFloat(winRate)>=40?C.green:C.red,fontFamily:"'JetBrains Mono',monospace",fontSize:15,fontWeight:700}}>{winRate}%</div>
            <div style={{color:C.dim,fontSize:8}}>{wins.length}W/{losses.length}L</div>
          </div>
        </div>

        {/* Trend lock */}
        {trendBias&&trendBias!=="NEUTRAL"&&(
          <div style={{background:`${trendBias==="SELL"?C.red:C.green}10`,border:`1px solid ${trendBias==="SELL"?C.red:C.green}33`,borderRadius:8,padding:"7px 12px",display:"flex",alignItems:"center",gap:8,marginBottom:8}}>
            <span>🔒</span>
            <div style={{color:trendBias==="SELL"?C.red:C.green,fontSize:11,fontWeight:700}}>TREND {trendBias==="SELL"?"BEARISH — hindari BUY":"BULLISH — hindari SELL"}</div>
          </div>
        )}

        {/* API Error */}
        {apiError&&(
          <div style={{background:"rgba(239,83,80,0.08)",border:`1px solid ${C.red}33`,borderRadius:8,padding:"7px 12px",marginBottom:8,fontSize:10,color:C.red}}>
            ⚠️ {apiError} — Cek koneksi internet atau coba lagi.
          </div>
        )}

        {/* Window strip */}
        <div style={{display:"flex",gap:4}}>
          {WINDOWS.map(w=>{
            const[sh,sm]=w.wib.split("–")[0].trim().split(":").map(Number);
            const[eh,em]=w.wib.split("–")[1].trim().split(":").map(Number);
            const isNow=mins>=sh*60+sm&&mins<eh*60+em;
            const isPast=mins>=eh*60+em;
            return(<div key={w.id} style={{flex:1,background:isNow?`${w.color}18`:"rgba(255,255,255,0.02)",border:`1px solid ${isNow?w.color:C.border}`,borderRadius:8,padding:"5px 3px",textAlign:"center",opacity:isPast&&!isNow?0.3:1,transition:"all 0.3s"}}>
              <div style={{fontSize:10}}>{w.emoji}</div>
              <div style={{color:isNow?w.color:C.dim,fontSize:8,fontFamily:"'JetBrains Mono',monospace",marginTop:1}}>{w.wib.split("–")[0].trim()}</div>
              <Tag color={w.color} sm>{w.tier}</Tag>
            </div>);
          })}
        </div>
      </div>

      {/* ── TABS ── */}
      <div style={{display:"flex",borderBottom:`1px solid ${C.border}`,background:"#0a0b0d",overflowX:"auto"}}>
        {TABS.map(([id,label])=>(
          <button key={id} onClick={()=>setTab(id)} style={{background:"none",border:"none",borderBottom:tab===id?`2px solid ${C.gold}`:"2px solid transparent",color:tab===id?C.gold:C.dim,padding:"10px 12px",fontSize:11,fontWeight:tab===id?600:400,cursor:"pointer",letterSpacing:0.3,whiteSpace:"nowrap",flexShrink:0}}>{label}</button>
        ))}
      </div>

      <div style={{padding:"16px 18px"}}>

        {/* ════ DASHBOARD ════ */}
        {tab==="dashboard"&&(
          <div style={{animation:"fadeIn 0.3s ease"}}>
            <button onClick={fetchSignal} disabled={loading} style={{width:"100%",padding:"12px",marginBottom:12,background:loading?"rgba(212,175,55,0.05)":`linear-gradient(135deg,${C.gold},#B8962E)`,border:loading?`1px solid ${C.gold}33`:"none",color:loading?C.gold:"#0a0a0c",borderRadius:12,fontSize:13,fontWeight:700,cursor:loading?"not-allowed":"pointer",display:"flex",alignItems:"center",justifyContent:"center",gap:10}}>
              {loading?<><Spinner/>Analysing market...</>:"🔄 Refresh Signal & Analisa"}
            </button>
            {lastCheck&&<div style={{color:C.dim,fontSize:10,textAlign:"center",marginBottom:12}}>Last update: {lastCheck.toLocaleTimeString("id-ID")} WIB</div>}

            {signal&&signal!=="LOADING"&&(
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:12}}>
                <Card accent={`${sigCfg.color}33`} style={{display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",padding:"16px 12px"}}>
                  <div style={{fontSize:26,marginBottom:6}}>{sigCfg.emoji}</div>
                  <div style={{color:sigCfg.color,fontFamily:"'JetBrains Mono',monospace",fontSize:11,fontWeight:800,letterSpacing:1,marginBottom:4}}>{signal}</div>
                  <div style={{color:C.dim,fontSize:9,textAlign:"center",lineHeight:1.4}}>{sigCfg.desc}</div>
                </Card>
                <Card>
                  <div style={{color:C.dim,fontSize:9,letterSpacing:2,textTransform:"uppercase",marginBottom:5}}>XAU/USD</div>
                  <div style={{fontFamily:"'JetBrains Mono',monospace",fontSize:20,fontWeight:700,color:C.text,marginBottom:4}}>{analysis?.price?`$${analysis.price}`:"—"}</div>
                  {analysis?.priceChange&&<div style={{color:analysis.priceChange.startsWith("+")?C.green:C.red,fontSize:11,fontFamily:"'JetBrains Mono',monospace",marginBottom:7}}>{analysis.priceChange} ({analysis.pctChange})</div>}
                  <div style={{display:"flex",gap:5,flexWrap:"wrap"}}>
                    {analysis?.trend&&<Tag color={trendColor}>{analysis.trend}</Tag>}
                    {analysis?.bias&&<Tag color={biasColor}>{analysis.bias}</Tag>}
                  </div>
                </Card>
              </div>
            )}

            {analysis?.newsAlert&&(
              <div style={{background:"rgba(239,83,80,0.07)",border:`1px solid ${C.red}33`,borderRadius:10,padding:"10px 14px",marginBottom:10,display:"flex",gap:8}}>
                <span style={{fontSize:14,flexShrink:0}}>⚠️</span>
                <div><div style={{color:C.red,fontSize:10,fontWeight:700,marginBottom:2}}>NEWS {analysis.newsTime?`· ${analysis.newsTime} WIB`:""}</div><div style={{color:C.muted,fontSize:11,lineHeight:1.6}}>{analysis.newsAlert}</div></div>
              </div>
            )}

            {analysis?.suggestedEntry&&signal==="SETUP VALID"&&(
              <Card accent={`${C.green}33`} style={{marginBottom:10}}>
                <div style={{color:C.green,fontSize:10,fontWeight:700,letterSpacing:1,marginBottom:10}}>✅ SUGGESTED SETUP</div>
                <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:8}}>
                  {[{l:"Entry",v:`$${analysis.suggestedEntry}`,c:C.text},{l:"SL",v:`$${analysis.suggestedSL}`,c:C.red},{l:"TP",v:`$${analysis.suggestedTP}`,c:C.green}].map(x=>(
                    <div key={x.l} style={{textAlign:"center",background:"rgba(255,255,255,0.03)",borderRadius:8,padding:"8px 4px"}}>
                      <div style={{color:C.dim,fontSize:9,letterSpacing:1,textTransform:"uppercase",marginBottom:3}}>{x.l}</div>
                      <div style={{color:x.c,fontFamily:"'JetBrains Mono',monospace",fontSize:12,fontWeight:700}}>{x.v}</div>
                    </div>
                  ))}
                </div>
                <div style={{color:C.dim,fontSize:9,marginTop:8}}>⚠️ Konfirmasi 5M candle di MT5 sebelum entry</div>
              </Card>
            )}

            {analysis?.reasoning&&<Card style={{marginBottom:10}}><div style={{color:C.gold,fontSize:9,letterSpacing:2,textTransform:"uppercase",marginBottom:6}}>Analisa</div><div style={{color:C.muted,fontSize:12,lineHeight:1.8}}>{analysis.reasoning}</div></Card>}
            {analysis?.action&&<Card accent={`${C.gold}22`} style={{marginBottom:10}}><div style={{color:C.dim,fontSize:9,letterSpacing:2,textTransform:"uppercase",marginBottom:5}}>Action</div><div style={{color:C.text,fontSize:12,lineHeight:1.7,fontWeight:500}}>{analysis.action}</div></Card>}
            {analysis?.marketContext&&<div style={{color:C.dim,fontSize:11,lineHeight:1.6,padding:"4px 0"}}>🌐 {analysis.marketContext}</div>}
            {!signal&&<div style={{textAlign:"center",padding:"40px 0",color:C.dim,fontSize:13}}>Tap <strong style={{color:C.gold}}>🔄 Refresh</strong> untuk real-time signal & levels.</div>}
          </div>
        )}

        {/* ════ LEVELS ════ */}
        {tab==="levels"&&(
          <div style={{animation:"fadeIn 0.3s ease"}}>
            {/* Live price ticker */}
            <div style={{background:`linear-gradient(135deg,#0f1a12,#0a0c0e)`,border:`1px solid ${C.green}33`,borderRadius:14,padding:"14px 16px",marginBottom:12}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:8}}>
                <div>
                  <div style={{color:C.dim,fontSize:9,letterSpacing:2,textTransform:"uppercase",marginBottom:4}}>XAU/USD LIVE</div>
                  <div style={{display:"flex",alignItems:"baseline",gap:10}}>
                    <span style={{color:C.text,fontFamily:"'JetBrains Mono',monospace",fontSize:26,fontWeight:800}}>{livePrice?`$${livePrice}`:"—"}</span>
                    {liveMeta?.change&&<span style={{color:liveMeta.change.startsWith("+")?C.green:C.red,fontSize:12,fontFamily:"'JetBrains Mono',monospace",fontWeight:600}}>{liveMeta.change} ({liveMeta.pct})</span>}
                  </div>
                  {liveTrend&&<div style={{marginTop:5,display:"flex",gap:6}}><Tag color={{BULLISH:C.green,BEARISH:C.red,SIDEWAYS:C.orange}[liveTrend]||C.dim}>{liveTrend}</Tag>{liveTime&&<span style={{color:C.dim,fontSize:9,alignSelf:"center"}}>{liveTime.toLocaleTimeString("id-ID",{hour:"2-digit",minute:"2-digit"})} WIB</span>}</div>}
                </div>
                <button onClick={fetchLivePrice} disabled={livePriceLoading} style={{background:livePriceLoading?"rgba(76,175,80,0.05)":"rgba(76,175,80,0.12)",border:`1px solid ${C.green}44`,color:C.green,borderRadius:10,padding:"8px 14px",fontSize:11,fontWeight:700,cursor:livePriceLoading?"not-allowed":"pointer",display:"flex",alignItems:"center",gap:6,flexShrink:0}}>
                  {livePriceLoading?<Spinner color={C.green}/>:"⚡"}{livePriceLoading?"...":"Update Price"}
                </button>
              </div>
              {livePrice&&liveMeta?.high&&liveMeta?.low&&(()=>{
                const lo=parseFloat(liveMeta.low),hi=parseFloat(liveMeta.high),cur=parseFloat(livePrice);
                const pct=Math.min(Math.max(((cur-lo)/(hi-lo))*100,2),98);
                return(<div><div style={{display:"flex",justifyContent:"space-between",marginBottom:4}}><span style={{color:C.dim,fontSize:9}}>24h Low: <span style={{color:C.red}}>${liveMeta.low}</span></span><span style={{color:C.dim,fontSize:9}}>24h High: <span style={{color:C.green}}>${liveMeta.high}</span></span></div><div style={{background:"#1a1a1a",borderRadius:4,height:5,position:"relative"}}><div style={{background:`linear-gradient(90deg,${C.red},${C.green})`,width:"100%",height:"100%",borderRadius:4,opacity:0.25}}/><div style={{position:"absolute",top:-2,left:`${pct}%`,width:9,height:9,borderRadius:"50%",background:C.gold,border:"2px solid #0a0a0c",transform:"translateX(-50%)",boxShadow:`0 0 6px ${C.gold}`}}/></div></div>);
              })()}
              {!livePrice&&<div style={{color:C.dim,fontSize:11,textAlign:"center",padding:"4px 0"}}>Tap ⚡ <strong style={{color:C.green}}>Update Price</strong> untuk fetch harga live</div>}
            </div>

            <button onClick={fetchSignal} disabled={loading} style={{width:"100%",padding:"11px",marginBottom:12,background:loading?"rgba(212,175,55,0.05)":`linear-gradient(135deg,${C.gold},#B8962E)`,border:loading?`1px solid ${C.gold}33`:"none",color:loading?C.gold:"#0a0a0c",borderRadius:10,fontSize:12,fontWeight:700,cursor:loading?"not-allowed":"pointer",display:"flex",alignItems:"center",justifyContent:"center",gap:8}}>
              {loading?<><Spinner/>Analysing...</>:"🔄 Update S/R + Entry + SL/TP"}
            </button>

            {livePrice&&<div style={{background:"rgba(212,175,55,0.04)",border:`1px solid ${C.gold}18`,borderRadius:8,padding:"7px 12px",marginBottom:10,fontSize:10,color:C.dim}}>📌 Anchor: <strong style={{color:C.gold,fontFamily:"'JetBrains Mono',monospace"}}>${livePrice}</strong>{lastCheck&&<span> · Updated {lastCheck.toLocaleTimeString("id-ID",{hour:"2-digit",minute:"2-digit"})} WIB</span>}</div>}

            {levels?(
              <>
                <Card style={{marginBottom:10}}>
                  <div style={{display:"flex",justifyContent:"space-between",marginBottom:10}}><div style={{color:C.red,fontWeight:700,fontSize:11,letterSpacing:1}}>🔴 RESISTANCE</div>{livePrice&&<span style={{color:C.dim,fontSize:9}}>dari ${livePrice}</span>}</div>
                  {(levels.resistanceLevels||[]).map((r,i)=>{const dist=livePrice?parseFloat(r.price)-parseFloat(livePrice):null;return(<div key={i} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"8px 0",borderBottom:i<(levels.resistanceLevels.length-1)?`1px solid ${C.border}`:"none"}}>
                    <div><div style={{display:"flex",gap:6,alignItems:"center",marginBottom:2}}><span style={{color:C.red,fontFamily:"'JetBrains Mono',monospace",fontSize:14,fontWeight:700}}>${r.price}</span><Tag color={r.strength==="STRONG"?C.red:r.strength==="MEDIUM"?C.orange:C.dim}>{r.strength}</Tag></div><div style={{color:C.dim,fontSize:10}}>{r.note}</div></div>
                    {dist!==null&&<div style={{textAlign:"right",flexShrink:0,marginLeft:8}}><div style={{color:C.dim,fontSize:8}}>jarak</div><div style={{color:C.red,fontSize:11,fontFamily:"'JetBrains Mono',monospace",fontWeight:600}}>+{Math.abs(dist).toFixed(1)}</div></div>}
                  </div>);})}
                </Card>
                <Card style={{marginBottom:10}}>
                  <div style={{display:"flex",justifyContent:"space-between",marginBottom:10}}><div style={{color:C.green,fontWeight:700,fontSize:11,letterSpacing:1}}>🟢 SUPPORT</div>{livePrice&&<span style={{color:C.dim,fontSize:9}}>dari ${livePrice}</span>}</div>
                  {(levels.supportLevels||[]).map((s,i)=>{const dist=livePrice?parseFloat(s.price)-parseFloat(livePrice):null;return(<div key={i} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"8px 0",borderBottom:i<(levels.supportLevels.length-1)?`1px solid ${C.border}`:"none"}}>
                    <div><div style={{display:"flex",gap:6,alignItems:"center",marginBottom:2}}><span style={{color:C.green,fontFamily:"'JetBrains Mono',monospace",fontSize:14,fontWeight:700}}>${s.price}</span><Tag color={s.strength==="STRONG"?C.green:s.strength==="MEDIUM"?C.orange:C.dim}>{s.strength}</Tag></div><div style={{color:C.dim,fontSize:10}}>{s.note}</div></div>
                    {dist!==null&&<div style={{textAlign:"right",flexShrink:0,marginLeft:8}}><div style={{color:C.dim,fontSize:8}}>jarak</div><div style={{color:C.green,fontSize:11,fontFamily:"'JetBrains Mono',monospace",fontWeight:600}}>{Math.abs(dist).toFixed(1)}</div></div>}
                  </div>);})}
                </Card>
                {analysis?.suggestedEntry&&(
                  <Card accent={`${C.blue}33`} style={{marginBottom:10}}>
                    <div style={{color:C.blue,fontSize:10,fontWeight:700,letterSpacing:1,marginBottom:10}}>📐 ENTRY · SL · TP{livePrice&&<span style={{color:C.dim,fontWeight:400}}> · anchor ${livePrice}</span>}</div>
                    <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:8,marginBottom:8}}>
                      {[{l:"Entry",v:`$${analysis.suggestedEntry}`,c:C.text},{l:"SL",v:`$${analysis.suggestedSL}`,c:C.red},{l:"TP",v:`$${analysis.suggestedTP}`,c:C.green}].map(x=>(
                        <div key={x.l} style={{textAlign:"center",background:"rgba(255,255,255,0.03)",borderRadius:8,padding:"8px 4px"}}><div style={{color:C.dim,fontSize:9,letterSpacing:1,textTransform:"uppercase",marginBottom:3}}>{x.l}</div><div style={{color:x.c,fontFamily:"'JetBrains Mono',monospace",fontSize:12,fontWeight:700}}>{x.v}</div></div>
                      ))}
                    </div>
                    {analysis.suggestedSL&&analysis.suggestedTP&&(()=>{const e=parseFloat(analysis.suggestedEntry||livePrice);const sl=parseFloat(analysis.suggestedSL);const tp=parseFloat(analysis.suggestedTP);const slP=Math.abs(e-sl).toFixed(1);const tpP=Math.abs(tp-e).toFixed(1);const rr=(Math.abs(tp-e)/Math.abs(e-sl)).toFixed(2);return(<div style={{display:"flex",gap:14,padding:"8px 0 0",borderTop:`1px solid ${C.border}`,fontSize:10,color:C.dim}}><span>Risk: <strong style={{color:C.red}}>{slP} pts</strong></span><span>Reward: <strong style={{color:C.green}}>{tpP} pts</strong></span><span>R:R: <strong style={{color:C.gold}}>1:{rr}</strong></span></div>)})()}
                  </Card>
                )}
                {levels.liquidityZones?.length>0&&(
                  <Card>
                    <div style={{color:C.purple,fontWeight:700,fontSize:11,letterSpacing:1,marginBottom:10}}>💧 LIQUIDITY ZONES</div>
                    {levels.liquidityZones.map((lz,i)=>{const dist=livePrice?parseFloat(lz.price)-parseFloat(livePrice):null;return(<div key={i} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"7px 0",borderBottom:i<levels.liquidityZones.length-1?`1px solid ${C.border}`:"none"}}><div style={{display:"flex",gap:7,alignItems:"center"}}><Tag color={lz.type==="BUY SIDE"?C.green:C.red}>{lz.type}</Tag><span style={{color:C.text,fontFamily:"'JetBrains Mono',monospace",fontSize:12,fontWeight:600,marginRight:7}}>${lz.price}</span><span style={{color:C.dim,fontSize:10}}>{lz.note}</span></div>{dist!==null&&<span style={{color:dist>0?C.red:C.green,fontSize:10,fontFamily:"'JetBrains Mono',monospace"}}>{dist>0?"+":""}{dist.toFixed(1)}</span>}</div>);})}
                  </Card>
                )}
              </>
            ):(
              <div style={{textAlign:"center",padding:"30px 0",color:C.dim,fontSize:12,lineHeight:2}}>{livePrice?<>Anchor: <strong style={{color:C.gold}}>${livePrice}</strong><br/>Tap <strong style={{color:C.gold}}>🔄 Update S/R</strong> untuk get levels.</>:<>Tap ⚡ <strong style={{color:C.green}}>Update Price</strong> dulu,<br/>lalu <strong style={{color:C.gold}}>🔄 Update S/R</strong>.</>}</div>
            )}

            {/* Custom levels */}
            <div style={{marginTop:20,borderTop:`1px solid ${C.border}`,paddingTop:16}}>
              <div style={{color:C.gold,fontFamily:"'Playfair Display',serif",fontSize:13,marginBottom:12}}>✏️ Custom Levels Lo</div>
              {["resistance","support"].map(type=>(
                <div key={type} style={{marginBottom:12}}>
                  <div style={{color:type==="resistance"?C.red:C.green,fontSize:10,letterSpacing:1.5,textTransform:"uppercase",marginBottom:7,fontWeight:600}}>{type}</div>
                  {customLevels[type].map((v,i)=>(<div key={i} style={{display:"flex",gap:7,marginBottom:6}}><input type="number" value={v} onChange={e=>setCustomLevels(l=>{const u={...l};u[type]=[...u[type]];u[type][i]=e.target.value;return u;})} placeholder="Level..." style={{...IS,flex:1,fontSize:12}}/><button onClick={()=>setCustomLevels(l=>({...l,[type]:l[type].filter((_,j)=>j!==i)}))} style={{background:"none",border:`1px solid ${C.red}33`,color:C.red,borderRadius:7,padding:"0 11px",cursor:"pointer",fontSize:15}}>×</button></div>))}
                  <button onClick={()=>setCustomLevels(l=>({...l,[type]:[...l[type],""]})) } style={{background:`${type==="resistance"?C.red:C.green}08`,border:`1px solid ${type==="resistance"?C.red:C.green}22`,color:type==="resistance"?C.red:C.green,borderRadius:7,padding:"6px 12px",fontSize:10,cursor:"pointer",width:"100%"}}>+ Add Level</button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ════ JOURNAL ════ */}
        {tab==="journal"&&(
          <div style={{animation:"fadeIn 0.3s ease"}}>
            {(isLimitReached||isLossBreached)&&(
              <div style={{background:"rgba(239,83,80,0.08)",border:`1px solid ${C.red}44`,borderRadius:10,padding:"10px 14px",marginBottom:12}}>
                <div style={{color:C.red,fontWeight:700,fontSize:12,marginBottom:4}}>{isLossBreached?"🔴 DAILY LOSS LIMIT TERCAPAI":"🔴 MAKSIMAL TRADE HARI INI"}</div>
                <div style={{color:C.dim,fontSize:11}}>{isLossBreached?`P&L hari ini $${dailyPnL.toFixed(2)} ≤ -$${MAX_LOSS}. Berhenti hari ini.`:`${dailyCount}/${MAX_TRADES} trade. Berhenti untuk hari ini.`}</div>
              </div>
            )}
            <button onClick={()=>{setShowForm(!showForm);setEditId(null);setForm(emptyForm);}} style={{width:"100%",padding:"10px",marginBottom:12,background:showForm?"rgba(212,175,55,0.08)":`linear-gradient(135deg,${C.gold},#B8962E)`,border:showForm?`1px solid ${C.gold}33`:"none",color:showForm?C.gold:"#0a0a0c",borderRadius:10,fontSize:12,fontWeight:700,cursor:"pointer"}}>
              {showForm?"✕ Cancel":"+ Log Trade Baru"}
            </button>

            {showForm&&(
              <Card style={{marginBottom:14}}>
                <div style={{color:C.gold,fontFamily:"'Playfair Display',serif",fontSize:14,marginBottom:14}}>{editId!==null?"✏️ Edit":"📝 Log Trade"}</div>
                <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(140px,1fr))",gap:10}}>
                  {[{l:"Date",k:"date",t:"date"},{l:"Time (MT)",k:"time",t:"time"},{l:"Entry",k:"entryPrice",t:"number",p:"5020.00"},{l:"Exit",k:"exitPrice",t:"number",p:"SL atau TP"},{l:"Lot Size",k:"lotSize",t:"number",p:"0.01"}].map(f=>(<div key={f.k}><div style={LS}>{f.l}</div><input type={f.t} value={form[f.k]} placeholder={f.p||""} onChange={e=>inp({[f.k]:e.target.value})} style={IS}/></div>))}
                  <div>
                    <div style={LS}>Stop Loss <span style={{color:C.red}}>*</span></div>
                    <input type="number" value={form.stopLoss} placeholder="Min 15 pips!" onChange={e=>inp({stopLoss:e.target.value})} style={{...IS,borderColor:!form.stopLoss&&(form.status==="WIN"||form.status==="LOSS")?C.red:`${C.gold}25`}}/>
                    {!form.stopLoss&&<div style={{color:C.red,fontSize:9,marginTop:3}}>⚠️ SL wajib!</div>}
                  </div>
                  <div><div style={LS}>Take Profit</div><input type="number" value={form.takeProfit} placeholder="Optional" onChange={e=>inp({takeProfit:e.target.value})} style={IS}/></div>
                  <div>
                    <div style={LS}>Direction</div>
                    <div style={{display:"flex",gap:6}}>
                      {["BUY","SELL"].map(d=>(<button key={d} onClick={()=>inp({direction:d})} style={{flex:1,padding:"8px 0",borderRadius:8,border:"none",cursor:"pointer",fontWeight:700,fontSize:12,background:form.direction===d?(d==="BUY"?C.green:C.red):"rgba(255,255,255,0.05)",color:form.direction===d?"#fff":"#555"}}>
                        {d}{trendBias&&((trendBias==="SELL"&&d==="BUY")||(trendBias==="BUY"&&d==="SELL"))&&<span style={{fontSize:8,display:"block"}}>⚠️ vs trend</span>}
                      </button>))}
                    </div>
                  </div>
                  <div><div style={LS}>Status</div><select value={form.status} onChange={e=>inp({status:e.target.value})} style={IS}>{["OPEN","WIN","LOSS","BREAKEVEN"].map(s=><option key={s}>{s}</option>)}</select></div>
                  <div><div style={LS}>Session</div><select value={form.session} onChange={e=>inp({session:e.target.value})} style={IS}>{SESSIONS.map(s=><option key={s}>{s}</option>)}</select></div>
                  <div><div style={LS}>Strategy</div><select value={form.strategy} onChange={e=>inp({strategy:e.target.value})} style={IS}><option value="">Select...</option>{STRATEGIES.map(s=><option key={s}>{s}</option>)}</select></div>
                  <div><div style={LS}>Emotion</div><select value={form.emotion} onChange={e=>inp({emotion:e.target.value})} style={IS}>{EMOTIONS.map(s=><option key={s}>{s}</option>)}</select></div>
                </div>
                <div style={{marginTop:10}}><div style={LS}>Notes</div><textarea value={form.notes} onChange={e=>inp({notes:e.target.value})} rows={2} style={{...IS,resize:"vertical"}}/></div>
                <button onClick={attemptSave} style={{marginTop:12,background:`linear-gradient(135deg,${C.gold},#B8962E)`,border:"none",color:"#0a0a0c",borderRadius:10,padding:"10px 24px",fontSize:13,fontWeight:700,cursor:"pointer"}}>{editId!==null?"Update":"Save Trade"}</button>
              </Card>
            )}

            <div style={{display:"flex",gap:5,marginBottom:12,flexWrap:"wrap"}}>
              {["ALL","OPEN","WIN","LOSS","BREAKEVEN"].map(f=>(<button key={f} onClick={()=>setFilterStatus(f)} style={{background:filterStatus===f?"rgba(212,175,55,0.15)":"transparent",border:filterStatus===f?`1px solid ${C.gold}`:`1px solid ${C.border}`,color:filterStatus===f?C.gold:C.dim,borderRadius:20,padding:"4px 11px",fontSize:10,fontWeight:600,cursor:"pointer"}}>{f} ({f==="ALL"?trades.length:trades.filter(t=>t.status===f).length})</button>))}
            </div>

            <div style={{display:"flex",flexDirection:"column",gap:7}}>
              {filtered.slice().reverse().map(trade=>{
                const p=pnl(trade),r=rrCalc(trade);
                const sc={WIN:C.green,LOSS:C.red,OPEN:C.gold,BREAKEVEN:C.dim}[trade.status]||C.dim;
                return(<div key={trade.id} style={{background:"rgba(255,255,255,0.02)",border:`1px solid ${sc}22`,borderRadius:12,padding:"11px 14px"}}>
                  <div style={{display:"flex",justifyContent:"space-between",flexWrap:"wrap",gap:6}}>
                    <div style={{display:"flex",gap:6,alignItems:"center",flexWrap:"wrap"}}>
                      <Tag color={trade.direction==="BUY"?C.green:C.red}>{trade.direction}</Tag>
                      <Tag color={sc}>{trade.status}</Tag>
                      <span style={{color:C.dim,fontSize:10}}>{trade.date} {trade.time}</span>
                      {trade.session&&<span style={{color:"#3a3a3a",fontSize:10}}>📍{trade.session}</span>}
                    </div>
                    <div style={{display:"flex",gap:5}}>
                      <button onClick={()=>editTrade(trade)} style={{background:"none",border:`1px solid ${C.border}`,color:C.dim,borderRadius:6,padding:"2px 8px",fontSize:10,cursor:"pointer"}}>Edit</button>
                      <button onClick={()=>deleteTrade(trade.id)} style={{background:"none",border:`1px solid ${C.red}33`,color:C.red,borderRadius:6,padding:"2px 8px",fontSize:10,cursor:"pointer"}}>Del</button>
                    </div>
                  </div>
                  <div style={{display:"flex",flexWrap:"wrap",gap:12,marginTop:8}}>
                    <div><span style={{color:C.dim,fontSize:10}}>Entry </span><span style={{fontFamily:"'JetBrains Mono',monospace",fontSize:12,fontWeight:600}}>${trade.entryPrice}</span></div>
                    {trade.stopLoss&&<div><span style={{color:C.dim,fontSize:10}}>SL </span><span style={{color:C.red,fontFamily:"'JetBrains Mono',monospace",fontSize:11}}>${trade.stopLoss}</span></div>}
                    {trade.takeProfit&&<div><span style={{color:C.dim,fontSize:10}}>TP </span><span style={{color:C.green,fontFamily:"'JetBrains Mono',monospace",fontSize:11}}>${trade.takeProfit}</span></div>}
                    {trade.exitPrice&&<div><span style={{color:C.dim,fontSize:10}}>Exit </span><span style={{fontFamily:"'JetBrains Mono',monospace",fontSize:11}}>${trade.exitPrice}</span></div>}
                    <div><span style={{color:C.dim,fontSize:10}}>Lots </span><span style={{fontSize:11}}>{trade.lotSize}</span></div>
                    {r&&<div><span style={{color:C.dim,fontSize:10}}>R:R </span><span style={{color:C.gold,fontWeight:700,fontSize:11}}>1:{r}</span></div>}
                    {p!==null&&<div><span style={{color:C.dim,fontSize:10}}>P&L </span><span style={{color:parseFloat(p)>=0?C.green:C.red,fontWeight:700,fontFamily:"'JetBrains Mono',monospace",fontSize:12}}>${p}</span></div>}
                  </div>
                  {trade.notes&&<div style={{marginTop:7,color:"#3a3a3a",fontSize:10,borderLeft:`2px solid ${C.border}`,paddingLeft:8}}>{trade.notes}</div>}
                </div>);
              })}
            </div>
          </div>
        )}

        {/* ════ PLAN ════ */}
        {tab==="plan"&&(
          <div style={{animation:"fadeIn 0.3s ease"}}>
            <Card style={{marginBottom:14,background:"rgba(92,158,232,0.04)",border:`1px solid ${C.blue}22`}}>
              <div style={{color:C.blue,fontFamily:"'Playfair Display',serif",fontSize:13,marginBottom:12}}>📊 Insight 82 Trade (Jan 7 – Mar 17, 2026)</div>
              {[
                {e:"📉",t:`Real Win Rate: ${winRate}%`,b:"Dari 82 trade, win rate lo 28%. Butuh R:R minimal 1:2 untuk tetap profitable konsisten."},
                {e:"🚫",t:"Asian Session AVOID (WR ~10%)",b:"Hampir semua trade Asian lo loss. Jan 12 (no SL, Asian) = -$53.94. Feb 4 Asian = dua loss. Window ini tidak cocok dengan gaya trading lo."},
                {e:"🔴",t:"NO SL = Bencana",b:"Jan 12 (no SL) = -$53.94. Feb 4 (no SL) = -$15.84. Feb 9 = -$5.42. Total loss dari trade tanpa SL = -$75+ dalam 3 bulan."},
                {e:"📈",t:"Best Pattern: 2–3 Trade SELL, Pre-London",b:"Jan 27: +$30. Mar 10: +$30. Feb 3 NY: +$40. Semua hari terbaik = 2–3 trade, searah trend, session prime."},
                {e:"⚠️",t:"Overtrading = Net Loss",b:"Feb 9: 7 trade = net -$19. Feb 6: 5 trade = net -$5. Jan 8: 8 trade = net loss. >3 trade/hari selalu minus."},
              ].map((ins,i)=>(<div key={i} style={{display:"flex",gap:10,marginBottom:10,paddingBottom:10,borderBottom:i<4?`1px solid ${C.border}`:"none"}}><span style={{fontSize:16,flexShrink:0}}>{ins.e}</span><div><div style={{color:C.text,fontSize:12,fontWeight:600,marginBottom:3}}>{ins.t}</div><div style={{color:C.dim,fontSize:11,lineHeight:1.6}}>{ins.b}</div></div></div>))}
            </Card>

            {WINDOWS.map(w=>{
              const isActive=!!activeWin&&activeWin.id===w.id;const isExp=expandedW[w.id];
              const WD={
                asian:{src:"Data lo: WR ~10–15%. Hampir selalu loss. Window ini tidak cocok dengan style lo.",rules:["Hanya masuk kalau trend H4 sangat jelas (5+ candle searah)","SL wajib min 20 pips — volume rendah tapi spiky","Max 1 trade, lot 0.01","Skip kalau ada news Asia (China PMI, RBA)","Tidak ada setup 20 menit pertama? Close MT5."]},
                pre_london:{src:"WINDOW TERBAIK LO. Jan 27: +$30. Mar 10: multiple wins. Mar 16: +$20. Frankfurt aktif, institutional positioning.",rules:["WAJIB monitor jam ini — primary window","Mark levels dari H4 sebelum 12:00 WIB","15M trend harus jelas sebelum entry","5M engulfing CLOSE wajib — bukan mid-candle","SL min 15 pips, TP 1.5× SL","Max 2 trade"]},
                london:{src:"Solid. Sering ada fake spike di awal. Butuh lebih sabar dari Pre-London.",rules:["Tunggu 15–20 menit setelah 15:00 sebelum consider entry","London break up atau down dari Asian range?","Entry di pullback setelah direction establish","SL di luar Asian range yang di-break"]},
                ny:{src:"Volume tertinggi global. Feb 3: +$18 + +$22. Mar 10: +$11. COMEX open 20:30 inject momentum.",rules:["Cek US news sebelum 20:00 WIB","NFP/CPI/FOMC: jangan entry 15 menit sebelum","COMEX open 20:30 sering bikin acceleration","Follow direction yang London set","Hard stop 22:00 WIB"]},
                late:{src:"3+ losses dari data lo di jam ini. Mar 10, Mar 11, Mar 12 semua loss setelah 22:00 WIB.",rules:["HANYA kalau belum ada trade hari ini","HANYA continuation setup — bukan reversal","Lot -50% dari normal","SL min 20 pips","Hard stop 23:30 WIB"]},
              }[w.id]||{};
              return(<div key={w.id} style={{background:isActive?`${w.color}08`:C.card,border:`1px solid ${isActive?w.color:C.border}`,borderRadius:14,overflow:"hidden",marginBottom:10}}>
                <div onClick={()=>setExpandedW(e=>({...e,[w.id]:!e[w.id]}))} style={{padding:"12px 14px",cursor:"pointer",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                  <div style={{display:"flex",alignItems:"center",gap:10}}>
                    <span style={{fontSize:18}}>{w.emoji}</span>
                    <div>
                      <div style={{display:"flex",gap:7,alignItems:"center",marginBottom:3,flexWrap:"wrap"}}>
                        <span style={{color:w.color,fontSize:13,fontWeight:600}}>{w.name}</span>
                        <Tag color={{A:C.green,B:C.gold,C:C.purple,D:C.red}[w.tier]}>{w.tier==="A"?"PRIMARY":w.tier==="B"?"SOLID":w.tier==="C"?"COND":"AVOID"}</Tag>
                        {isActive&&<Tag color={w.color}>AKTIF</Tag>}
                      </div>
                      <div style={{color:C.dim,fontSize:10,fontFamily:"'JetBrains Mono',monospace"}}>{w.wib} WIB</div>
                    </div>
                  </div>
                  <div style={{display:"flex",flexDirection:"column",alignItems:"flex-end",gap:5}}><VolBar level={w.vol} color={w.color}/><span style={{color:C.dim,fontSize:12}}>{isExp?"▲":"▼"}</span></div>
                </div>
                {isExp&&WD.src&&(<div style={{borderTop:`1px solid ${w.color}18`,padding:"12px 14px",animation:"fadeIn 0.2s ease"}}>
                  <div style={{background:`${w.color}07`,borderRadius:8,padding:"8px 11px",marginBottom:10,color:C.muted,fontSize:11,lineHeight:1.7}}>{WD.src}</div>
                  {WD.rules?.map((r,i)=>(<div key={i} style={{display:"flex",gap:8,marginBottom:7}}><div style={{width:18,height:18,borderRadius:"50%",background:`${w.color}15`,color:w.color,fontSize:9,fontWeight:800,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>{i+1}</div><span style={{color:C.dim,fontSize:11,lineHeight:1.5}}>{r}</span></div>))}
                </div>)}
              </div>);
            })}

            {/* Lot Validator */}
            <Card style={{marginTop:6}}>
              <div style={{color:C.gold,fontFamily:"'Playfair Display',serif",fontSize:13,marginBottom:14}}>💰 Kalkulator Lot & Risk</div>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:12}}>
                <div><div style={LS}>Balance ($)</div><input type="number" value={balance} onChange={e=>setBalance(e.target.value)} placeholder="Contoh: 200" style={IS}/></div>
                <div><div style={LS}>SL (pips)</div><input type="number" value={slPips} onChange={e=>setSlPips(e.target.value)} step="1" min="15" style={IS}/></div>
              </div>
              {balance&&suggestedLot&&(<div style={{background:"rgba(76,175,80,0.06)",border:`1px solid ${C.green}22`,borderRadius:8,padding:"10px 14px",marginBottom:12}}>
                <div style={{color:C.green,fontSize:11,fontWeight:700,marginBottom:4}}>💡 1% Risk Rule</div>
                <div style={{color:C.muted,fontSize:11,lineHeight:1.7}}>Balance: <strong style={{color:C.text}}>${balance}</strong> · 1% risk: <strong style={{color:C.text}}>${(parseFloat(balance)*0.01).toFixed(2)}</strong><br/>Rekomendasi lot: <strong style={{color:C.gold,fontFamily:"'JetBrains Mono',monospace",fontSize:14}}>{suggestedLot}</strong> lots</div>
              </div>)}
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:10}}>
                <div><div style={LS}>Lot Dipakai</div><input type="number" value={lot} onChange={e=>setLot(e.target.value)} step="0.01" style={IS}/></div>
                <div><div style={LS}>TP (1.5×SL)</div><input type="number" value={tpN} readOnly style={{...IS,opacity:0.5}}/></div>
              </div>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:8,marginBottom:10}}>
                {[{l:"Win",v:`$${winD}`,c:C.green},{l:"Loss",v:`-$${lossD}`,c:C.red},{l:"R:R",v:"1:1.5",c:C.gold}].map(x=>(<div key={x.l} style={{textAlign:"center",background:"rgba(255,255,255,0.02)",borderRadius:8,padding:"8px 4px"}}><div style={{color:C.dim,fontSize:9,textTransform:"uppercase",marginBottom:3}}>{x.l}</div><div style={{color:x.c,fontFamily:"'JetBrains Mono',monospace",fontSize:14,fontWeight:600}}>{x.v}</div></div>))}
              </div>
              <div style={{color:C.dim,fontSize:10,lineHeight:1.9}}>Target $30 = <strong style={{color:C.green}}>{Math.ceil(30/parseFloat(winD))} wins</strong> · Target $50 = <strong style={{color:C.green}}>{Math.ceil(50/parseFloat(winD))} wins</strong> · Max loss/hari = <strong style={{color:C.red}}>${(parseFloat(lossD)*2).toFixed(2)}</strong></div>
            </Card>
          </div>
        )}

        {/* ════ SCHEDULE ════ */}
        {tab==="schedule"&&(
          <div style={{animation:"fadeIn 0.3s ease"}}>
            {SCHEDULE.map((s,i)=>{
              const[sh,sm]=s.wib.split(":").map(Number);const sMins=sh*60+sm;
              const isNow=mins>=sMins&&mins<sMins+90;const isPast=mins>sMins+90;
              const col={prep:"#888",check:C.purple,prime:C.gold,window:C.green,danger:C.orange,stop:C.red,close:C.dim}[s.type]||C.dim;
              return(<div key={i} style={{display:"flex",gap:0,opacity:isPast?0.4:1}}>
                <div style={{display:"flex",flexDirection:"column",alignItems:"center",width:28,flexShrink:0}}>
                  <div style={{width:9,height:9,borderRadius:"50%",marginTop:17,background:isNow?col:"#1a1a1a",border:`2px solid ${isNow?col:"#2a2a2a"}`,boxShadow:isNow?`0 0 6px ${col}`:"none",zIndex:1}}/>
                  {i<SCHEDULE.length-1&&<div style={{width:1,flex:1,background:"#161618",minHeight:16}}/>}
                </div>
                <div style={{flex:1,marginBottom:6,marginLeft:9,background:isNow?`${col}08`:"rgba(255,255,255,0.015)",border:`1px solid ${isNow?col+"30":"#ffffff05"}`,borderRadius:10,padding:"10px 13px"}}>
                  <div style={{display:"flex",alignItems:"center",gap:7,marginBottom:4,flexWrap:"wrap"}}>
                    <span style={{fontFamily:"'JetBrains Mono',monospace",color:isNow?col:C.dim,fontSize:11,fontWeight:600}}>{s.wib}</span>
                    <span style={{color:isNow?col:"#aaa",fontSize:11,fontWeight:isNow?600:400}}>{s.label}</span>
                    {isNow&&<Tag color={col} sm>SEKARANG</Tag>}
                  </div>
                  <div style={{color:C.dim,fontSize:11,lineHeight:1.6}}>{s.desc}</div>
                </div>
              </div>);
            })}
          </div>
        )}

        {/* ════ CHAT ════ */}
        {tab==="chat"&&(
          <div style={{animation:"fadeIn 0.3s ease",display:"flex",flexDirection:"column",height:"70vh"}}>
            <div style={{color:C.dim,fontSize:10,textAlign:"center",marginBottom:10,letterSpacing:1}}>TANYA APAPUN SOAL MARKET ATAU STRATEGI</div>
            <div style={{flex:1,overflowY:"auto",display:"flex",flexDirection:"column",gap:10,marginBottom:12,paddingRight:2}}>
              {chat.length===0&&(<div style={{textAlign:"center",color:"#2a2a2a",padding:"16px 0",fontSize:12}}>
                <div style={{marginBottom:12,color:C.dim}}>Tanya langsung:</div>
                <div style={{display:"flex",flexDirection:"column",gap:7}}>
                  {["Gold lagi di mana sekarang?","Support resistance terkuat hari ini?","Ada setup valid SELL sekarang?","SL TP kalau entry di harga sekarang?","Ada news apa hari ini?"].map(q=>(<button key={q} onClick={()=>setChatInput(q)} style={{background:`${C.gold}06`,border:`1px solid ${C.gold}18`,borderRadius:8,color:C.muted,padding:"8px 12px",fontSize:11,cursor:"pointer",textAlign:"left"}}>{q}</button>))}
                </div>
              </div>)}
              {chat.map((m,i)=>(<div key={i} style={{display:"flex",justifyContent:m.role==="user"?"flex-end":"flex-start",animation:"fadeIn 0.2s ease"}}>
                <div style={{maxWidth:"87%",background:m.role==="user"?`${C.gold}12`:"rgba(255,255,255,0.03)",border:m.role==="user"?`1px solid ${C.gold}28`:`1px solid ${C.border}`,borderRadius:m.role==="user"?"12px 12px 4px 12px":"12px 12px 12px 4px",padding:"10px 13px",color:m.role==="user"?C.gold:"#ccc",fontSize:12,lineHeight:1.7}}>{m.content}</div>
              </div>))}
              {chatLoading&&<div style={{display:"flex",justifyContent:"flex-start"}}><div style={{background:"rgba(255,255,255,0.03)",border:`1px solid ${C.border}`,borderRadius:"12px 12px 12px 4px",padding:"10px 14px",display:"flex",gap:4}}>{[0,1,2].map(i=><div key={i} style={{width:6,height:6,borderRadius:"50%",background:C.gold,animation:`pulse 1.2s ease ${i*0.2}s infinite`}}/>)}</div></div>}
              <div ref={chatEnd}/>
            </div>
            <div style={{display:"flex",gap:8}}>
              <input value={chatInput} onChange={e=>setChatInput(e.target.value)} onKeyDown={e=>e.key==="Enter"&&!e.shiftKey&&sendChat()} placeholder="Tanya soal market, setup, level..." style={{...IS,flex:1,padding:"11px 14px"}}/>
              <button onClick={sendChat} disabled={chatLoading||!chatInput.trim()} style={{background:chatLoading||!chatInput.trim()?`${C.gold}08`:`linear-gradient(135deg,${C.gold},#B8962E)`,border:"none",borderRadius:10,padding:"0 18px",cursor:chatLoading||!chatInput.trim()?"not-allowed":"pointer",color:chatLoading||!chatInput.trim()?C.gold:"#0a0a0c",fontSize:18,fontWeight:700}}>→</button>
            </div>
          </div>
        )}
      </div>
      <div style={{padding:"0 18px 14px"}}><div style={{color:"#1e1e1e",fontSize:10,textAlign:"center"}}>⚠️ Bukan financial advice. Konfirmasi di MT5 sebelum entry. Powered by Groq (free) + Tavily (free).</div></div>
    </div>
  );
}
