import React, { useState, useEffect } from 'react';

export default function AgentPortal() {
  const [wallet, setWallet] = useState(0);
  const [earnings, setEarnings] = useState(0);
  const [dailySalary, setDailySalary] = useState(0);
  const [teamVolume, setTeamVolume] = useState(0);
  const [rank, setRank] = useState('Silver Agent');

  return (
    <div className="bg-zinc-950 text-white p-6 rounded-[3rem] border border-white/5 space-y-6">
      <header className="text-center font-black text-2xl">BARCA-LIVE AGENT SYSTEM</header>

      <div className="bg-zinc-900 rounded-lg p-5 border border-white/5 space-y-2">
        <h2 className="text-blue-400 font-bold text-lg">Live Earning Dashboard</h2>
        <p>Wallet Balance: $<span id="wallet">{wallet}</span></p>
        <p>Total Earnings: $<span id="earnings">{earnings}</span></p>
        <p>Daily Salary: $<span id="dailySalary">{dailySalary}</span></p>
        <p>Team Volume: <span id="teamVolume">{teamVolume}</span></p>
        <p className="font-bold text-xl" id="rank">{rank}</p>
        <div id="notificationArea" className="text-green-500"></div>
      </div>
      
      {/* Continue adding other sections... */}
    </div>
  );
}
