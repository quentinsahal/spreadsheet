import { useState } from "react";

import "./Spreadsheet.css";
import { SpreadsheetCompute } from "./SpreadsheetCompute";
import { ActiveUsers } from "./ActiveUsers";
import { useSpreadsheet } from "./SpreadsheetProvider";

export const SpreadsheetMenu = () => {
  const [name, setName] = useState<string>("Feuille de calcul sans titre");
  return (
    <div className="header-menu-wrapper">
      <div>
        <input
          type="text"
          name="spreadsheet-name"
          className="header-menu-input"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
      </div>
      <div className="header-menu"></div>
      <div className="header-menu-compute"></div>
    </div>
  );
};

export const SpreadsheetHeader = () => {
  const { activeUsers } = useSpreadsheet();
  return (
    <>
      <div className="header">
        <div className="header-logo">
          <img src="/vite.svg" alt="Logo" />
        </div>
        <SpreadsheetMenu />
        <div className="header-actions">
          <ActiveUsers users={activeUsers} maxVisible={3} />
        </div>
      </div>
      <SpreadsheetCompute />
    </>
  );
};
