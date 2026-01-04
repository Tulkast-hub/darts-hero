import React from "react";
import { useNavigate } from "react-router-dom";
import RankBadge from "./RankBadge";

type Props = {
  keyName: string;
  title: string;
  blurb: string;
  tier: "Bronze"|"Silver"|"Gold"|"Platinum"|"Diamond";
  level: number;
  xpWin: number;
  xpLose: number;
};

export default function DrillCard({keyName, title, blurb, tier, level, xpWin, xpLose}:Props){
  const nav = useNavigate();
  return (
    <div className="drill-card" style={{borderColor: "var(--rank-"+tier.toLowerCase()+")"}} onClick={()=>nav("/drill/"+keyName)}>
      <div className="drill-head">
        <strong>{title}</strong>
        <RankBadge tier={tier} level={level} />
      </div>
      <p className="muted">{blurb}</p>
      <div className="drill-meta">
        <span className="pill">+{xpWin} XP</span>
        <span className="pill lose">−{xpLose} XP</span>
      </div>
    </div>
  );
}
