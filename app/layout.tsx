// ...existing code...
import React from "react";
import Sidebar from "../components/Sidebar";
import "./globals.css";
import Sandbox from "../components/Sandbox";
import StatisticsPanel from "../components/StatisticsPanel";
import dynamic from "next/dynamic";

interface Props {
  children: React.ReactNode;
}

export default function Layout({ children }: Props) {
  const channelKey = process.env.NEXT_PUBLIC_CHANNEL_IO_PLUGIN_KEY;
  return (
    <html lang="ko">
      <body>
        <div className="app-root">
          <div className="app-body">
            <Sidebar />
            <div className="content-area">
              <div className="page-grid">
                <aside className="left-column">
                  <div className="small-box">
                    <StatisticsPanel />
                  </div>
                  <div className="small-box">
                    <Sandbox />
                  </div>
                </aside>
                <section className="right-column">
                  <div className="big-box">{children}</div>
                </section>
              </div>
            </div>
          </div>
        </div>
      </body>
    </html>
  );
}
