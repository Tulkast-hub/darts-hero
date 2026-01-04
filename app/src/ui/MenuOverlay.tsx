import React from "react";
import { Link, useNavigate } from "react-router-dom";
import { logout } from "../api";
import { useAuthStore } from "../auth/useAuthStore";
import { useXpStore } from "../xp/useXpStore";

export default function MenuOverlay({open,onClose}:{open:boolean; onClose:()=>void}){
  const status = useAuthStore((s) => s.status);
  const setGuest = useAuthStore((s) => s.setGuest);
  const navigate = useNavigate();

  async function onLogout() {
    try {
      await logout();
    } finally {
      // Clear local XP cache on logout so another user on the same device doesn't see it.
      useXpStore.getState().setState({
        totalXp: 0,
        categoryXp: { scoring: 0, finishing: 0, doubles: 0, bull: 0, other: 0 },
        drillXp: {},
      } as any);
      setGuest();
      onClose();
      navigate("/login", { replace: true });
    }
  }

  return (
    <div className={"overlay " + (open ? "open":"")} onClick={onClose}>
      <div className="overlay-panel" onClick={e=>e.stopPropagation()}>
        <h3>Menu</h3>
        <nav className="menu-links">
          <Link to="/stats" onClick={onClose}>Stats</Link>
          <Link to="/profile" onClick={onClose}>Profile</Link>
          <Link to="/rewards" onClick={onClose}>Rewards</Link>
        </nav>
        <div style={{ display: "grid", gap: 8, marginTop: 10 }}>
          {status === "authed" && (
            <button className="btn outline" onClick={onLogout}>Log out</button>
          )}
          <button className="btn outline" onClick={onClose}>Close</button>
        </div>
      </div>
    </div>
  );
}
